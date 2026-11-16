/* Holiday closure. Dates are calendar dates, compared as YYYY-MM-DD
   strings from the date picker. Dubai "today" uses Asia/Dubai. */
(function (root) {
  "use strict";

  const MESSAGE = "We are closed from 28 December 2026 to 10 January 2027. We cannot take bookings or deliver on those dates. We are happy to help with any other date.";
  const START = "2026-12-28";
  const END = "2027-01-10";

  function isIsoDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  function isClosureDate(isoDate) {
    if (!isIsoDate(isoDate)) return false;
    return isoDate >= START && isoDate <= END;
  }

  /* Show the notice on and before the last closed day. */
  function closureNoticeVisible(todayIso) {
    if (!isIsoDate(todayIso)) return false;
    return todayIso <= END;
  }

  function dubaiDateString(date) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dubai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const get = type => parts.find(part => part.type === type).value;
    return get("year") + "-" + get("month") + "-" + get("day");
  }

  const api = { MESSAGE, START, END, isClosureDate, closureNoticeVisible, dubaiDateString };
  root.HelloMayaClosure = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
