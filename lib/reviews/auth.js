const crypto = require("crypto");

const COOKIE = "__Host-hm_reviews";
const MAX_AGE_SECONDS = 12 * 60 * 60;

function adminPassword() {
  const value = process.env.REVIEWS_ADMIN_PASSWORD;
  return typeof value === "string" ? value : "";
}

function passwordConfigured() {
  return adminPassword().length >= 8;
}

function passwordMatches(given) {
  const expected = adminPassword();
  const attempt = typeof given === "string" ? given : "";
  const a = crypto.createHash("sha256").update(attempt, "utf8").digest();
  const b = crypto.createHash("sha256").update(expected, "utf8").digest();
  const same = crypto.timingSafeEqual(a, b);
  return passwordConfigured() && attempt.length > 0 && attempt.length <= 200 && same;
}

function signSession(now) {
  const payload = Buffer.from(JSON.stringify({
    p: "reviews-admin",
    e: now + MAX_AGE_SECONDS * 1000,
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", adminPassword()).update(payload).digest("base64url");
  return payload + "." + signature;
}

function readCookie(header, name) {
  if (typeof header !== "string" || !header) return "";
  const parts = header.split(";");
  for (const part of parts) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return "";
}

function sessionValid(cookieHeader, now) {
  if (!passwordConfigured()) return false;
  const raw = readCookie(cookieHeader, COOKIE);
  const parts = raw.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  const expected = crypto.createHmac("sha256", adminPassword()).update(parts[0]).digest("base64url");
  const actual = Buffer.from(parts[1]);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !crypto.timingSafeEqual(actual, wanted)) return false;
  try {
    const data = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    return data.p === "reviews-admin" && typeof data.e === "number" && data.e > now;
  } catch {
    return false;
  }
}

function sessionCookie(token) {
  return [
    COOKIE + "=" + token,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=" + MAX_AGE_SECONDS,
  ].join("; ");
}

function clearCookie() {
  return [
    COOKIE + "=",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=0",
  ].join("; ");
}

function ipHash(ip) {
  return crypto.createHash("sha256").update(adminPassword() + "|" + String(ip || "")).digest("hex").slice(0, 32);
}

module.exports = {
  COOKIE,
  MAX_AGE_SECONDS,
  passwordConfigured,
  passwordMatches,
  signSession,
  sessionValid,
  sessionCookie,
  clearCookie,
  ipHash,
};
