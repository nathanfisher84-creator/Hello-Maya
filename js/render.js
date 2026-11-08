/* ─── Hello Maya Events — shared markup ───
   Used in the browser by main.js, and by build.js to pre-render the same
   HTML into dist/index.html so search engines and AI crawlers that do not
   run JavaScript still see prices, packages, terms and the FAQ. */
var HelloMayaRender = (function () {
  "use strict";

  const AED = n => `AED ${n.toLocaleString("en-US")}`;

  function packageCard(p) {
    return `
    <article class="package ${p.featured ? "package--featured" : ""} ${p.children ? "package--kids" : ""}">
      ${p.tag ? `<span class="package__tag">${p.tag}</span>` : ""}
      <h3>${p.name}</h3>
      <div class="package__price">${AED(p.price)}<small> / event</small></div>
      ${p.seats ? `<p class="package__meta">Seats ${p.seats} children</p>` : ""}
      <ul>${p.items.map(i => `<li>${i}</li>`).join("")}</ul>
      ${p.notes && p.notes.length ? `<details class="package__notes"><summary>Details</summary>${p.notes.map(n => `<p>${n}</p>`).join("")}</details>` : ""}
      <p class="package__rule">${BUSINESS.deliveryShort}</p>
      <button class="btn btn--ghost" data-pick-pkg="${p.id}">Check availability</button>
    </article>`;
  }

  function termsMarkup() {
    return `
      <div class="policy">
        ${POLICY.points.map(point => `
          <article>
            <h3>${point.title}</h3>
            <p>${point.body}</p>
          </article>`).join("")}
      </div>`;
  }

  function faqMarkup() {
    return FAQ.map(item => `
      <details class="faq__item">
        <summary><h3>${item.q}</h3></summary>
        <p>${item.a}</p>
      </details>`).join("");
  }

  function igTiles() {
    const igUrl = `https://www.instagram.com/${BUSINESS.instagram}/`;
    return INSTAGRAM_PHOTOS.map(photo => `
      <a class="ig__tile" href="${igUrl}" target="_blank" rel="noopener">
        <img src="${photo.src}" alt="${photo.alt}" loading="lazy" decoding="async" width="${photo.width || 600}" height="${photo.height || 600}">
        <span class="ig__overlay">
          <svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.7" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.3" cy="6.7" r="1.35" fill="currentColor"/></svg>
          View on Instagram
        </span>
      </a>`).join("");
  }

  const adultFrom = () => Math.min(...PACKAGES.filter(p => !p.children).map(p => p.price));

  function listJoin(items) {
    if (items.length < 2) return items.join("");
    if (items.length === 2) return items.join(" and ");
    return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
  }

  function collectionIntro() {
    const seating = PACKAGES.filter(p => !p.children && (p.includes["chair-adult"] || 0) > 0);
    const corner = PACKAGES.find(p => p.id === "pkg-photo");
    return `${listJoin(seating.map(p => p.name))} each seat 16 adults. ${corner.name} does not: it is one flower wall and one covered cake or photo table, with no chairs, décor or place settings. Prices are per event, for up to 8 hours from when setup is finished. ${wallAddonCopy()}`;
  }

  function kidsIntro() {
    const backdrop = PACKAGES.find(p => p.id === "pkg-kids-backdrop");
    return `Little Gathering and Little Celebration are the children's chair and table rates added together. ${backdrop.name} is Little Celebration plus one flower wall, and seats ${backdrop.seats} children. <a href="/kids-party-rentals/">See kids' party rentals</a>.`;
  }

  return { AED, packageCard, termsMarkup, faqMarkup, igTiles, adultFrom, collectionIntro, kidsIntro, wallAddonCopy };
})();
