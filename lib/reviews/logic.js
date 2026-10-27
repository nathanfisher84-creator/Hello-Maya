/* Pure review state. Pending items stay out of the public list until approved. */

const HOUR_MS = 60 * 60 * 1000;
const SUBMIT_LIMIT = 3;
const LOGIN_LIMIT = 8;
const MAX_PENDING = 100;
const MAX_TOTAL = 400;
const PUBLIC_LIMIT = 60;
const NAME_MIN = 2;
const NAME_MAX = 80;
const TEXT_MIN = 12;
const TEXT_MAX = 800;

function emptyState() {
  return { reviews: [], limits: {} };
}

function clean(value) {
  return String(value == null ? "" : value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(value) {
  if (value == null || value === "") return { value: null };
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: "Enter the event date as a calendar date, or leave it blank." };
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return { error: "Enter the event date as a calendar date, or leave it blank." };
  }
  const today = new Date();
  const min = Date.UTC(2018, 0, 1);
  const max = Date.UTC(today.getUTCFullYear() + 2, today.getUTCMonth(), today.getUTCDate());
  const time = date.getTime();
  if (time < min || time > max) {
    return { error: "Enter an event date from 2018 through two years ahead, or leave it blank." };
  }
  return { value };
}

function validateReview(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Please check the form and try again." };
  }
  const name = clean(body.name);
  const text = clean(body.text);
  if (name.length < NAME_MIN || name.length > NAME_MAX || /[<>]/.test(name)) {
    return { error: "Add your name, up to 80 characters." };
  }
  if (text.length < TEXT_MIN || text.length > TEXT_MAX || /[<>]/.test(text)) {
    return { error: "Write a review of at least 12 characters, up to 800." };
  }
  let rating = body.rating;
  if (typeof rating === "string" && /^[1-5]$/.test(rating)) rating = Number(rating);
  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Choose a rating from 1 to 5." };
  }
  const eventDate = parseDate(body.eventDate);
  if (eventDate.error) return eventDate;
  return { value: { name, text, rating, eventDate: eventDate.value } };
}

function honeypotTripped(body) {
  if (!body || typeof body !== "object") return false;
  const value = body.hm_leave_blank;
  if (typeof value === "string") return value.trim() !== "";
  return value != null && value !== "";
}

function isReview(review) {
  return Boolean(
    review &&
    typeof review.id === "string" &&
    (review.status === "pending" || review.status === "approved") &&
    typeof review.name === "string" &&
    typeof review.text === "string" &&
    Number.isInteger(review.rating) &&
    review.rating >= 1 &&
    review.rating <= 5
  );
}

function normalizeState(data) {
  if (!data || typeof data !== "object" || Array.isArray(data) || !Array.isArray(data.reviews)) {
    const error = new Error("Reviews store is unreadable");
    error.code = "CORRUPT";
    throw error;
  }
  const limits = {};
  if (data.limits && typeof data.limits === "object" && !Array.isArray(data.limits)) {
    for (const [key, stamps] of Object.entries(data.limits)) {
      if (!Array.isArray(stamps)) continue;
      const fresh = stamps.filter(stamp => typeof stamp === "number" && Number.isFinite(stamp));
      if (fresh.length) limits[key] = fresh;
    }
  }
  return {
    reviews: data.reviews.filter(isReview),
    limits,
  };
}

function cloneState(state) {
  return {
    reviews: state.reviews.map(review => ({ ...review })),
    limits: Object.fromEntries(Object.entries(state.limits).map(([key, stamps]) => [key, stamps.slice()])),
  };
}

function pruneLimits(limits, now) {
  const next = {};
  for (const [key, stamps] of Object.entries(limits)) {
    const fresh = stamps.filter(stamp => now - stamp < HOUR_MS);
    if (fresh.length) next[key] = fresh;
  }
  return next;
}

function publicReviews(state) {
  return state.reviews
    .filter(review => review.status === "approved")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(0, PUBLIC_LIMIT)
    .map(review => ({
      name: review.name,
      rating: review.rating,
      text: review.text,
      eventDate: review.eventDate || null,
    }));
}

function adminReviews(state) {
  const view = review => ({
    id: review.id,
    name: review.name,
    rating: review.rating,
    text: review.text,
    eventDate: review.eventDate || null,
    status: review.status,
    createdAt: review.createdAt,
  });
  const byCreated = (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0);
  return {
    pending: state.reviews.filter(review => review.status === "pending").sort(byCreated).map(view),
    approved: state.reviews.filter(review => review.status === "approved").sort((a, b) => -byCreated(a, b)).map(view),
  };
}

function submitReview(state, review, ipHash, now) {
  const next = cloneState(state);
  next.limits = pruneLimits(next.limits, now);
  const key = "s:" + ipHash;
  const stamps = (next.limits[key] || []).slice();
  if (stamps.length >= SUBMIT_LIMIT) {
    return { state: next, code: "rate", write: JSON.stringify(next.limits) !== JSON.stringify(state.limits) };
  }
  const pending = next.reviews.filter(item => item.status === "pending").length;
  if (pending >= MAX_PENDING || next.reviews.length >= MAX_TOTAL) {
    return { state: next, code: "full", write: JSON.stringify(next.limits) !== JSON.stringify(state.limits) };
  }
  stamps.push(now);
  next.limits[key] = stamps;
  next.reviews.push(review);
  return { state: next, code: "ok", write: true };
}

function loginBlocked(state, ipHash, now) {
  const stamps = pruneLimits({ key: state.limits["l:" + ipHash] || [] }, now).key || [];
  return stamps.length >= LOGIN_LIMIT;
}

function recordLoginFailure(state, ipHash, now) {
  const next = cloneState(state);
  next.limits = pruneLimits(next.limits, now);
  const key = "l:" + ipHash;
  const stamps = (next.limits[key] || []).slice();
  stamps.push(now);
  next.limits[key] = stamps;
  return { state: next, write: true };
}

function moderateReview(state, id, action, now) {
  const next = cloneState(state);
  const index = next.reviews.findIndex(review => review.id === id);
  if (index < 0) return { state: next, code: "missing", write: false };
  if (action === "approve") {
    if (next.reviews[index].status !== "pending") return { state: next, code: "missing", write: false };
    next.reviews[index] = {
      ...next.reviews[index],
      status: "approved",
      decidedAt: new Date(now).toISOString(),
    };
    return { state: next, code: "ok", write: true };
  }
  if (action === "reject") {
    next.reviews.splice(index, 1);
    return { state: next, code: "ok", write: true };
  }
  return { state: next, code: "bad", write: false };
}

module.exports = {
  HOUR_MS,
  SUBMIT_LIMIT,
  LOGIN_LIMIT,
  emptyState,
  validateReview,
  honeypotTripped,
  normalizeState,
  publicReviews,
  adminReviews,
  submitReview,
  loginBlocked,
  recordLoginFailure,
  moderateReview,
};
