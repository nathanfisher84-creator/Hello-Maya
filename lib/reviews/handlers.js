const crypto = require("crypto");
const {
  validateReview,
  honeypotTripped,
  publicReviews,
  adminReviews,
  submitReview,
  loginBlocked,
  recordLoginFailure,
  moderateReview,
} = require("./logic");
const {
  passwordConfigured,
  passwordMatches,
  signSession,
  sessionValid,
  sessionCookie,
  clearCookie,
  ipHash,
} = require("./auth");

const MAX_BODY = 6000;

function send(res, status, body, extraHeaders) {
  const headers = Object.assign({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  }, extraHeaders || {});
  res.statusCode = status;
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(JSON.stringify(body));
}

function clientIp(req) {
  const real = req.headers["x-real-ip"];
  if (typeof real === "string" && real.trim()) return real.trim().slice(0, 80);
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim().slice(0, 80);
  return "unknown";
}

function originOk(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const hosts = [req.headers.host, req.headers["x-forwarded-host"]]
    .flatMap(value => typeof value === "string" ? value.split(",") : [])
    .map(value => value.trim())
    .filter(Boolean);
  return hosts.includes(originHost);
}

function parseJsonText(text) {
  if (text.length > MAX_BODY) {
    const error = new Error("large");
    error.code = "LARGE";
    return Promise.reject(error);
  }
  if (!text) return Promise.resolve({});
  return Promise.resolve(JSON.parse(text));
}

function readBody(req) {
  if (req.body != null && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body);
  }
  if (typeof req.body === "string") return parseJsonText(req.body);
  if (Buffer.isBuffer(req.body)) return parseJsonText(req.body.toString("utf8"));
  /* Vercel parses JSON into req.body and may already have ended the stream. */
  if (typeof req.on !== "function" || req.readableEnded || req.complete) {
    return Promise.resolve({});
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        const error = new Error("large");
        error.code = "LARGE";
        reject(error);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(text));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function jsonRequest(req) {
  const type = req.headers["content-type"];
  if (!type) return true;
  return String(type).includes("application/json");
}

async function commit(store, mutator) {
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const loaded = await store.load();
    const result = mutator(loaded.state);
    if (!result.write) return result;
    const unconditional = attempt === 4;
    try {
      await store.save(result.state, unconditional ? null : loaded.etag);
      return result;
    } catch (error) {
      lastError = error;
      if (error && error.code === "CONFLICT" && attempt < 4) continue;
      throw error;
    }
  }
  throw lastError || new Error("Reviews store changed while saving");
}

function storageFailure(res, error) {
  const message = error && error.message ? String(error.message).slice(0, 180) : "Error";
  console.error("reviews store", error && error.name ? error.name : "Error", message);
  return send(res, 503, { error: "Reviews are not available just now. Please try again later." });
}

async function handleReviews(req, res, store, now = Date.now()) {
  try {
    if (req.method === "GET") {
      if (!store) return send(res, 503, { error: "Reviews are not available just now. Please try again later." });
      const loaded = await store.load();
      return send(res, 200, { reviews: publicReviews(loaded.state) });
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return send(res, 405, { error: "Method not allowed." });
    }
    if (!originOk(req)) return send(res, 403, { error: "Please use the form on this site." });
    if (!jsonRequest(req)) return send(res, 415, { error: "Send the review as JSON." });
    const length = Number(req.headers["content-length"] || 0);
    if (Number.isFinite(length) && length > MAX_BODY) return send(res, 413, { error: "That review is too long." });
    let body;
    try {
      body = await readBody(req);
    } catch (error) {
      if (error && error.code === "LARGE") return send(res, 413, { error: "That review is too long." });
      return send(res, 400, { error: "Please check the form and try again." });
    }
    if (honeypotTripped(body)) return send(res, 200, { ok: true });
    const validated = validateReview(body);
    if (validated.error) return send(res, 400, { error: validated.error });
    if (!store) return send(res, 503, { error: "Reviews are not available just now. Please try again later." });
    const review = {
      id: crypto.randomBytes(9).toString("base64url"),
      name: validated.value.name,
      rating: validated.value.rating,
      text: validated.value.text,
      eventDate: validated.value.eventDate,
      status: "pending",
      createdAt: new Date(now).toISOString(),
    };
    const hash = ipHash(clientIp(req));
    const result = await commit(store, state => submitReview(state, review, hash, now));
    if (result.code === "rate") {
      return send(res, 429, { error: "You have sent several reviews recently. Please try again in about an hour." });
    }
    if (result.code === "full") {
      return send(res, 429, { error: "We cannot take another review right now. Please try again later." });
    }
    return send(res, 200, { ok: true });
  } catch (error) {
    return storageFailure(res, error);
  }
}

async function handleSession(req, res, store, now = Date.now()) {
  try {
    if (req.method === "DELETE") {
      return send(res, 200, { ok: true }, { "Set-Cookie": clearCookie() });
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST, DELETE");
      return send(res, 405, { error: "Method not allowed." });
    }
    if (!originOk(req)) return send(res, 403, { error: "Please use the form on this site." });
    if (!passwordConfigured()) return send(res, 503, { error: "The admin password is not set yet." });
    if (!jsonRequest(req)) return send(res, 415, { error: "Send the password as JSON." });
    let body;
    try {
      body = await readBody(req);
    } catch {
      return send(res, 400, { error: "Enter the admin password." });
    }
    const hash = ipHash(clientIp(req));
    if (passwordMatches(body && body.password)) {
      if (!store) return send(res, 503, { error: "Reviews storage is not configured yet." });
      return send(res, 200, { ok: true }, { "Set-Cookie": sessionCookie(signSession(now)) });
    }
    if (store) {
      const loaded = await store.load();
      if (loginBlocked(loaded.state, hash, now)) {
        return send(res, 429, { error: "Too many sign-in attempts. Please try again in about an hour." });
      }
      await commit(store, state => recordLoginFailure(state, hash, now));
    }
    return send(res, 401, { error: "That password is not right." });
  } catch (error) {
    return storageFailure(res, error);
  }
}

async function handleAdminReviews(req, res, store, now = Date.now()) {
  try {
    if (!passwordConfigured()) return send(res, 503, { error: "The admin password is not set yet." });
    if (!sessionValid(req.headers.cookie, now)) return send(res, 401, { error: "Sign in to review submissions." });
    if (!store) return send(res, 503, { error: "Reviews storage is not configured yet." });
    if (req.method === "GET") {
      const loaded = await store.load();
      return send(res, 200, adminReviews(loaded.state));
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return send(res, 405, { error: "Method not allowed." });
    }
    if (!originOk(req)) return send(res, 403, { error: "Please use the form on this site." });
    let body;
    try {
      body = await readBody(req);
    } catch {
      return send(res, 400, { error: "Choose a review and an action." });
    }
    const id = body && typeof body.id === "string" ? body.id : "";
    const action = body && body.action;
    if (!/^[A-Za-z0-9_-]{8,40}$/.test(id) || (action !== "approve" && action !== "reject")) {
      return send(res, 400, { error: "Choose a review and an action." });
    }
    const result = await commit(store, state => moderateReview(state, id, action, now));
    if (result.code === "missing") return send(res, 404, { error: "That review is no longer in the list." });
    if (result.code !== "ok") return send(res, 400, { error: "Choose a review and an action." });
    return send(res, 200, adminReviews(result.state));
  } catch (error) {
    return storageFailure(res, error);
  }
}

module.exports = {
  handleReviews,
  handleSession,
  handleAdminReviews,
  clientIp,
};
