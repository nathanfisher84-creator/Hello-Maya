/* Shared menu toggle for the homepage and the rental pages. */
(function () {
  "use strict";

  const yearEl = document.getElementById("year");
  if (yearEl && !yearEl.textContent) yearEl.textContent = String(new Date().getFullYear());

  const burger = document.getElementById("burger");
  const navLinks = document.getElementById("navLinks");
  if (!burger || !navLinks) return;

  burger.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  });
  navLinks.addEventListener("click", event => {
    if (event.target.tagName !== "A") return;
    navLinks.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  });
})();
