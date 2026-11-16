/* Closure dates are calendar dates. 27 Dec 2026 is open, 28 Dec and
   10 Jan 2027 are closed, and 11 Jan is open again. The notice shows
   on 16 Nov 2026 and hides on 11 Jan 2027. */
const assert = require("assert");
const { isClosureDate, closureNoticeVisible, dubaiDateString, MESSAGE } = require("../js/closure.js");

assert.strictEqual(isClosureDate("2026-12-27"), false);
assert.strictEqual(isClosureDate("2026-12-28"), true);
assert.strictEqual(isClosureDate("2027-01-01"), true);
assert.strictEqual(isClosureDate("2027-01-10"), true);
assert.strictEqual(isClosureDate("2027-01-11"), false);
assert.strictEqual(isClosureDate(""), false);
assert.strictEqual(isClosureDate("2026-12-28T00:00:00"), false);

assert.strictEqual(closureNoticeVisible("2026-11-16"), true);
assert.strictEqual(closureNoticeVisible("2027-01-10"), true);
assert.strictEqual(closureNoticeVisible("2027-01-11"), false);

assert.strictEqual(dubaiDateString(new Date("2026-11-16T19:00:00Z")), "2026-11-16");
assert.strictEqual(dubaiDateString(new Date("2026-11-16T20:00:00Z")), "2026-11-17");
assert.strictEqual(dubaiDateString(new Date("2027-01-10T19:30:00Z")), "2027-01-10");
assert.strictEqual(dubaiDateString(new Date("2027-01-10T20:30:00Z")), "2027-01-11");

assert.ok(MESSAGE.includes("28 December 2026"));
assert.ok(MESSAGE.includes("10 January 2027"));
assert.ok(!MESSAGE.includes("—"));
assert.ok(!/\bVAT\b/.test(MESSAGE));
assert.ok(!/Licensed/i.test(MESSAGE));

console.log("closure tests passed");
