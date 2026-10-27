/* Reviews stay private until an admin approves them. No sample reviews. */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

process.env.REVIEWS_ADMIN_PASSWORD = "test-admin-password";
delete process.env.BLOB_READ_WRITE_TOKEN;
delete process.env.BLOB_STORE_ID;

const { handleReviews, handleSession, handleAdminReviews } = require("../lib/reviews/handlers");
const { createBlobStore, blobConfigured } = require("../lib/reviews/store");
const { HOUR_MS, SUBMIT_LIMIT, LOGIN_LIMIT } = require("../lib/reviews/logic");
const { sessionValid } = require("../lib/reviews/auth");

const NOW = Date.UTC(2026, 9, 27, 12, 0, 0);
const IP = "203.0.113.44";

function memoryStore() {
  let state = { reviews: [], limits: {} };
  let etag = null;
  let failSaves = 0;
  return {
    setFailSaves(count) { failSaves = count; },
    snapshot() { return JSON.parse(JSON.stringify(state)); },
    async load() { return { state: JSON.parse(JSON.stringify(state)), etag }; },
    async save(next, expected) {
      if (failSaves > 0) {
        failSaves -= 1;
        const error = new Error("conflict");
        error.code = "CONFLICT";
        throw error;
      }
      if (expected !== etag) {
        const error = new Error("conflict");
        error.code = "CONFLICT";
        throw error;
      }
      state = JSON.parse(JSON.stringify(next));
      etag = etag == null ? "1" : String(Number(etag) + 1);
    },
  };
}

function mockRes() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(payload) { this.body = payload == null ? "" : String(payload); },
  };
}

function mockReq(method, body, headers) {
  return {
    method,
    body,
    headers: Object.assign({
      host: "preview.example.com",
      "content-type": "application/json",
      "x-real-ip": IP,
    }, headers || {}),
  };
}

function parsed(res) {
  return JSON.parse(res.body || "null");
}

function reviewBody(overrides) {
  return Object.assign({
    name: "Layla",
    eventDate: "2026-06-01",
    rating: "5",
    text: "The flower wall and chairs were lovely.",
    hm_leave_blank: "",
  }, overrides || {});
}

async function postReview(store, body, headers, now) {
  const res = mockRes();
  await handleReviews(mockReq("POST", body, headers), res, store, now == null ? NOW : now);
  return res;
}

async function signIn(store, password) {
  const res = mockRes();
  await handleSession(mockReq("POST", { password: password == null ? "test-admin-password" : password }), res, store, NOW);
  return res;
}

function cookieHeader(res) {
  const setCookie = res.headers["set-cookie"] || "";
  return { cookie: setCookie.split(";")[0] };
}

async function main() {
  assert.strictEqual(blobConfigured(), false);
  assert.strictEqual(createBlobStore(), null);

  const files = [
    "lib/reviews/logic.js",
    "lib/reviews/auth.js",
    "lib/reviews/store.js",
    "lib/reviews/handlers.js",
    "api/reviews.js",
    "api/admin/session.js",
    "api/admin/reviews.js",
    "js/reviews.js",
    "js/admin-reviews.js",
    "admin/reviews/index.html",
  ];
  for (const file of files) {
    const text = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    assert.doesNotMatch(text, /Licensed/i, file);
    assert.doesNotMatch(text, /\bVAT\b/, file);
    assert.doesNotMatch(text, /aggregateRating/, file);
    assert.doesNotMatch(text, /"@type"\s*:\s*"Review"/, file);
    assert.strictEqual(/\p{Extended_Pictographic}/u.test(text), false, file);
  }
  const client = fs.readFileSync(path.join(__dirname, "..", "js/reviews.js"), "utf8");
  assert.ok(client.includes("Be the first to leave a review"));

  const store = memoryStore();
  const empty = mockRes();
  await handleReviews(mockReq("GET"), empty, store, NOW);
  assert.strictEqual(empty.statusCode, 200);
  assert.deepStrictEqual(parsed(empty).reviews, []);

  const missing = await postReview(store, reviewBody({ name: "A", text: "Too short" }));
  assert.strictEqual(missing.statusCode, 400);

  const badDate = await postReview(store, reviewBody({ eventDate: "2026-02-31" }));
  assert.strictEqual(badDate.statusCode, 400);

  const badRating = await postReview(store, reviewBody({ rating: 6 }));
  assert.strictEqual(badRating.statusCode, 400);

  const tagged = await postReview(store, reviewBody({ name: "<b>No</b>" }));
  assert.strictEqual(tagged.statusCode, 400);

  const crossSite = await postReview(store, reviewBody(), { origin: "https://evil.example" });
  assert.strictEqual(crossSite.statusCode, 403);

  const honeypot = await postReview(store, reviewBody({ hm_leave_blank: "https://spam.example" }));
  assert.strictEqual(honeypot.statusCode, 200);
  assert.strictEqual(honeypot.body.includes("ok"), true);
  assert.strictEqual(store.snapshot().reviews.length, 0);

  const created = await postReview(store, reviewBody());
  assert.strictEqual(created.statusCode, 200);
  assert.deepStrictEqual(parsed(created), { ok: true });
  const saved = store.snapshot();
  assert.strictEqual(saved.reviews.length, 1);
  assert.strictEqual(saved.reviews[0].status, "pending");
  assert.strictEqual(JSON.stringify(saved).includes(IP), false);

  const hidden = mockRes();
  await handleReviews(mockReq("GET"), hidden, store, NOW);
  assert.deepStrictEqual(parsed(hidden).reviews, []);
  assert.strictEqual(hidden.body.includes("lovely"), false);

  const anonymous = mockRes();
  await handleAdminReviews(mockReq("GET"), anonymous, store, NOW);
  assert.strictEqual(anonymous.statusCode, 401);

  const wrong = await signIn(store, "not-the-password");
  assert.strictEqual(wrong.statusCode, 401);
  assert.strictEqual(wrong.headers["set-cookie"], undefined);

  const signed = await signIn(store);
  assert.strictEqual(signed.statusCode, 200);
  const setCookie = signed.headers["set-cookie"];
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=Lax/);
  assert.match(setCookie, /Path=\//);
  assert.doesNotMatch(setCookie, /test-admin-password/);
  assert.strictEqual(sessionValid(cookieHeader(signed).cookie, NOW), true);
  assert.strictEqual(sessionValid(cookieHeader(signed).cookie + "tampered", NOW), false);

  const queue = mockRes();
  await handleAdminReviews(mockReq("GET", null, cookieHeader(signed)), queue, store, NOW);
  assert.strictEqual(queue.statusCode, 200);
  assert.strictEqual(parsed(queue).pending.length, 1);
  assert.strictEqual(parsed(queue).approved.length, 0);
  const id = parsed(queue).pending[0].id;

  const approved = mockRes();
  await handleAdminReviews(mockReq("POST", { id, action: "approve" }, cookieHeader(signed)), approved, store, NOW);
  assert.strictEqual(approved.statusCode, 200);
  assert.strictEqual(parsed(approved).pending.length, 0);
  assert.strictEqual(parsed(approved).approved.length, 1);

  const live = mockRes();
  await handleReviews(mockReq("GET"), live, store, NOW);
  assert.deepStrictEqual(parsed(live).reviews, [{
    name: "Layla",
    rating: 5,
    text: "The flower wall and chairs were lovely.",
    eventDate: "2026-06-01",
  }]);
  assert.strictEqual(Object.hasOwn(parsed(live).reviews[0], "id"), false);
  assert.strictEqual(Object.hasOwn(parsed(live).reviews[0], "status"), false);

  const removed = mockRes();
  await handleAdminReviews(mockReq("POST", { id, action: "reject" }, cookieHeader(signed)), removed, store, NOW);
  assert.strictEqual(removed.statusCode, 200);
  assert.strictEqual(parsed(removed).approved.length, 0);
  const gone = mockRes();
  await handleReviews(mockReq("GET"), gone, store, NOW);
  assert.deepStrictEqual(parsed(gone).reviews, []);
  assert.strictEqual(store.snapshot().reviews.length, 0);

  const limited = memoryStore();
  for (let i = 0; i < SUBMIT_LIMIT; i += 1) {
    const ok = await postReview(limited, reviewBody({ text: "A real note number " + i + " from the party." }));
    assert.strictEqual(ok.statusCode, 200, "submission " + i);
  }
  const blocked = await postReview(limited, reviewBody({ text: "This fourth note should wait an hour." }));
  assert.strictEqual(blocked.statusCode, 429);
  assert.strictEqual(limited.snapshot().reviews.length, SUBMIT_LIMIT);
  const later = await postReview(limited, reviewBody({ text: "An hour later this note can be sent." }), {}, NOW + HOUR_MS + 1);
  assert.strictEqual(later.statusCode, 200);
  const otherIp = await postReview(
    limited,
    reviewBody({ text: "A different address can still send a note." }),
    { "x-real-ip": "203.0.113.99" },
    NOW
  );
  assert.strictEqual(otherIp.statusCode, 200);
  const fresh = memoryStore();
  const firstAddress = await postReview(fresh, reviewBody());
  assert.strictEqual(firstAddress.statusCode, 200);
  const secondAddress = await postReview(fresh, reviewBody({ name: "Noor", text: "Another guest from another network." }), { "x-real-ip": "198.51.100.8" });
  assert.strictEqual(secondAddress.statusCode, 200);

  const lock = memoryStore();
  for (let i = 0; i < LOGIN_LIMIT; i += 1) {
    const attempt = await signIn(lock, "wrong-password");
    assert.strictEqual(attempt.statusCode, 401);
  }
  const locked = await signIn(lock, "wrong-password");
  assert.strictEqual(locked.statusCode, 429);
  const stillLocked = await signIn(lock, "test-admin-password");
  assert.strictEqual(stillLocked.statusCode, 429);

  const retry = memoryStore();
  retry.setFailSaves(1);
  const retried = await postReview(retry, reviewBody({ name: "Hana", text: "Saved after one conflicting write." }));
  assert.strictEqual(retried.statusCode, 200);
  assert.strictEqual(retry.snapshot().reviews.length, 1);

  const offline = await postReview(null, reviewBody());
  assert.strictEqual(offline.statusCode, 503);
  const trapOffline = await postReview(null, reviewBody({ hm_leave_blank: "bot" }));
  assert.strictEqual(trapOffline.statusCode, 200);
  const offlineList = mockRes();
  await handleReviews(mockReq("GET"), offlineList, null, NOW);
  assert.strictEqual(offlineList.statusCode, 503);

  const previous = process.env.REVIEWS_ADMIN_PASSWORD;
  process.env.REVIEWS_ADMIN_PASSWORD = "short";
  const unset = mockRes();
  await handleSession(mockReq("POST", { password: "short" }), unset, memoryStore(), NOW);
  assert.strictEqual(unset.statusCode, 503);
  process.env.REVIEWS_ADMIN_PASSWORD = previous;

  console.log("reviews tests passed");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
