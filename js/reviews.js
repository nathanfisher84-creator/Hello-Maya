/* Loads approved reviews after the page, so the static HTML stays small. */
(function () {
  "use strict";

  const list = document.getElementById("reviewsList");
  const form = document.getElementById("reviewForm");
  const heading = document.getElementById("reviewsHeading");
  const lead = document.getElementById("reviewsLead");
  const formTitle = document.getElementById("reviewsFormTitle");
  const status = document.getElementById("reviewsStatus");
  if (!list || !form || !heading || !lead || !status) return;

  const EMPTY_HEADING = "Be the first to leave a review";
  const EMPTY_LEAD = "Tell us about the day, and we will share it here after we have read it.";
  const HAS_HEADING = "Guest reviews";
  const HAS_LEAD = "A note from your party helps the next host. We read each one before it is shown here.";

  function setStatus(message, isError) {
    status.textContent = message || "";
    status.classList.toggle("is-error", Boolean(isError));
  }

  function formatDate(value) {
    if (!value) return "";
    const parts = value.split("-");
    if (parts.length !== 3) return "";
    const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
  }

  function render(reviews) {
    list.replaceChildren();
    const hasReviews = Array.isArray(reviews) && reviews.length > 0;
    heading.textContent = hasReviews ? HAS_HEADING : EMPTY_HEADING;
    lead.textContent = hasReviews ? HAS_LEAD : EMPTY_LEAD;
    if (formTitle) formTitle.hidden = !hasReviews;
    if (!hasReviews) return;
    reviews.forEach(review => {
      const card = document.createElement("article");
      card.className = "review";
      const who = document.createElement("p");
      who.className = "review__who";
      who.textContent = review.name || "";
      const meta = document.createElement("p");
      meta.className = "review__meta";
      const score = document.createElement("span");
      score.className = "review__score";
      const bar = document.createElement("span");
      bar.className = "review__bar";
      bar.setAttribute("aria-hidden", "true");
      const fill = document.createElement("span");
      const rating = Number(review.rating);
      fill.style.width = (Math.min(5, Math.max(1, rating)) * 20) + "%";
      bar.appendChild(fill);
      const label = document.createElement("span");
      label.textContent = rating + " of 5";
      score.append(bar, label);
      const date = formatDate(review.eventDate);
      meta.append(score);
      if (date) {
        meta.append(document.createTextNode(" · " + date));
      }
      const text = document.createElement("p");
      text.textContent = review.text || "";
      card.append(who, meta, text);
      list.appendChild(card);
    });
  }

  function showPrompt() {
    heading.textContent = EMPTY_HEADING;
    lead.textContent = EMPTY_LEAD;
    if (formTitle) formTitle.hidden = true;
  }

  function showUnavailable() {
    heading.textContent = HAS_HEADING;
    lead.textContent = "Reviews will appear here once we can load them. You can still send one below.";
    if (formTitle) formTitle.hidden = false;
  }

  fetch("/api/reviews", { headers: { Accept: "application/json" }, cache: "no-store" })
    .then(response => response.json().then(body => ({ ok: response.ok, body })))
    .then(result => {
      if (!result.ok || !result.body || !Array.isArray(result.body.reviews)) {
        showUnavailable();
        return;
      }
      render(result.body.reviews);
    })
    .catch(() => {
      showUnavailable();
    });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(form);
    const payload = {
      name: data.get("name"),
      eventDate: data.get("eventDate") || "",
      rating: data.get("rating"),
      text: data.get("text"),
      hm_leave_blank: data.get("hm_leave_blank") || "",
    };
    const button = document.getElementById("reviewSubmit");
    if (button) button.disabled = true;
    setStatus("Sending…", false);
    fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    })
      .then(response => response.json().then(body => ({ status: response.status, body })).catch(() => ({ status: response.status, body: {} })))
      .then(result => {
        if (result.status === 200 && result.body && result.body.ok) {
          form.reset();
          setStatus("Thank you. Your review is waiting to be read and is not on the page yet.", false);
          return;
        }
        setStatus((result.body && result.body.error) || "We could not send that review. Please try again.", true);
      })
      .catch(() => {
        setStatus("We could not send that review. Please try again.", true);
      })
      .finally(() => {
        if (button) button.disabled = false;
      });
  });
})();
