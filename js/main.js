/* ─── Hello Maya Events — nav, packages, booking ─── */
(function () {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const AED = n => `AED ${n.toLocaleString("en-US")}`;

  /* ── nav burger ── */
  const burger = $("#burger");
  const navLinks = $("#navLinks");
  burger.addEventListener("click", () => navLinks.classList.toggle("open"));
  navLinks.addEventListener("click", e => { if (e.target.tagName === "A") navLinks.classList.remove("open"); });

  $("#year").textContent = new Date().getFullYear();

  /* ── instagram carousel ── */
  const igTrack = $("#igTrack");
  const igUrl = `https://www.instagram.com/${BUSINESS.instagram}/`;
  if (INSTAGRAM_POSTS.length) {
    igTrack.classList.add("ig__track--embeds");
    igTrack.innerHTML = INSTAGRAM_POSTS.map(url => {
      const clean = url.split("?")[0].replace(/\/?$/, "/");
      return `<div class="ig__tile ig__tile--embed">
        <iframe src="${clean}embed/" loading="lazy" frameborder="0" scrolling="no" allowtransparency="true" title="Instagram post"></iframe>
      </div>`;
    }).join("");
  } else {
    igTrack.innerHTML = INSTAGRAM_PHOTOS.map(src => `
      <a class="ig__tile" href="${igUrl}" target="_blank" rel="noopener" aria-label="View on Instagram">
        <img src="${src}" alt="Hello Maya Events on Instagram" loading="lazy">
        <span class="ig__overlay">
          <svg viewBox="0 0 24 24" width="30" height="30"><rect x="2" y="2" width="20" height="20" rx="5.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.7" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.3" cy="6.7" r="1.35" fill="currentColor"/></svg>
          View on Instagram
        </span>
      </a>`).join("");
  }
  const igStep = () => {
    const tile = igTrack.querySelector(".ig__tile");
    return tile ? tile.getBoundingClientRect().width + 16 : 300;
  };
  $("#igPrev").addEventListener("click", () => igTrack.scrollBy({ left: -igStep(), behavior: "smooth" }));
  $("#igNext").addEventListener("click", () => igTrack.scrollBy({ left: igStep(), behavior: "smooth" }));

  /* ── render packages section ── */
  const grid = $("#packagesGrid");
  grid.innerHTML = PACKAGES.map(p => `
    <div class="package ${p.featured ? "package--featured" : ""}">
      ${p.tag ? `<span class="package__tag">${p.tag}</span>` : ""}
      <h3>${p.name}</h3>
      <div class="package__price">${AED(p.price)}<small> / event</small></div>
      <ul>${p.items.map(i => `<li>${i}</li>`).join("")}</ul>
      <button class="btn btn--ghost" data-pick-pkg="${p.id}">Select</button>
    </div>`).join("");

  grid.addEventListener("click", e => {
    const btn = e.target.closest("[data-pick-pkg]");
    if (!btn) return;
    setPackage(btn.dataset.pickPkg);
    document.getElementById("book").scrollIntoView({ behavior: "smooth" });
  });

  /* ── booking state ── */
  const state = {
    packageId: null,
    qty: Object.fromEntries(ITEMS.map(i => [i.id, 0])),
  };

  /* ── render booking item pickers ── */
  const itemsBox = $("#bookingItems");
  itemsBox.innerHTML = `
    <div class="bk-group">
      <h4>Collections (choose one, optional)</h4>
      <label class="bk-pkg" data-pkg="">
        <input type="radio" name="bkPkg" value="" checked>
        <div><div class="bk-pkg__name">No package</div><div class="bk-pkg__detail">I'll choose individual pieces below</div></div>
      </label>
      ${PACKAGES.map(p => `
        <label class="bk-pkg" data-pkg="${p.id}">
          <input type="radio" name="bkPkg" value="${p.id}">
          <div><div class="bk-pkg__name">${p.name}</div>
               <div class="bk-pkg__detail">${p.items.slice(0, 3).join(" · ")}${p.items.length > 3 ? " + more" : ""}</div></div>
          <span class="bk-pkg__price">${AED(p.price)}</span>
        </label>`).join("")}
    </div>
    <div class="bk-group">
      <h4>Individual pieces &amp; additions</h4>
      ${ITEMS.map(i => `
        <div class="bk-row">
          <div class="bk-row__info">
            <div class="bk-row__name">${i.name}</div>
            <div class="bk-row__price">${AED(i.price)} / ${i.unit}</div>
          </div>
          <div class="bk-qty">
            <button type="button" data-dec="${i.id}" aria-label="Less">−</button>
            <input type="number" id="qty-${i.id}" value="0" min="0" max="${i.max}" readonly>
            <button type="button" data-inc="${i.id}" aria-label="More">+</button>
          </div>
        </div>`).join("")}
    </div>`;

  itemsBox.addEventListener("click", e => {
    const inc = e.target.closest("[data-inc]");
    const dec = e.target.closest("[data-dec]");
    if (inc) changeQty(inc.dataset.inc, +1);
    if (dec) changeQty(dec.dataset.dec, -1);
  });
  itemsBox.addEventListener("change", e => {
    if (e.target.name === "bkPkg") setPackage(e.target.value || null);
  });

  function changeQty(id, delta) {
    const item = ITEMS.find(i => i.id === id);
    state.qty[id] = Math.max(0, Math.min(item.max, state.qty[id] + delta));
    $(`#qty-${id}`).value = state.qty[id];
    renderSummary();
  }

  function setPackage(pkgId) {
    state.packageId = pkgId || null;
    itemsBox.querySelectorAll(".bk-pkg").forEach(el => {
      const match = (el.dataset.pkg || "") === (pkgId || "");
      el.classList.toggle("selected", match);
      el.querySelector("input").checked = match;
    });
    renderSummary();
  }

  /* Called by the visualizer's "Book the items in my design" button */
  window.applyVisualizerCounts = function (counts) {
    ITEMS.forEach(i => {
      state.qty[i.id] = Math.min(i.max, counts[i.id] || 0);
      $(`#qty-${i.id}`).value = state.qty[i.id];
    });
    renderSummary();
    document.getElementById("book").scrollIntoView({ behavior: "smooth" });
  };

  /* ── summary & total ── */
  const summaryBox = $("#bookingSummary");
  const locationSel = $("#bkLocation");
  locationSel.addEventListener("change", renderSummary);

  function currentLines() {
    const lines = [];
    if (state.packageId) {
      const p = PACKAGES.find(x => x.id === state.packageId);
      lines.push({ label: p.name, amount: p.price });
    }
    ITEMS.forEach(i => {
      const q = state.qty[i.id];
      if (q > 0) lines.push({ label: `${q} × ${i.name}`, amount: q * i.price });
    });
    return lines;
  }

  function renderSummary() {
    const lines = currentLines();
    const delivery = locationSel.value === "dubai" ? BUSINESS.deliveryFeeDubai : 0;
    if (!lines.length) {
      summaryBox.innerHTML = `<span class="empty">Nothing selected yet — choose a collection or pieces above.</span>`;
      return;
    }
    const total = lines.reduce((s, l) => s + l.amount, 0) + delivery;
    summaryBox.innerHTML = `
      <ul>
        ${lines.map(l => `<li><span>${l.label}</span><span>${AED(l.amount)}</span></li>`).join("")}
        <li><span>Delivery</span><span>${delivery ? AED(delivery) : "Free"}</span></li>
      </ul>
      <div class="total"><span>Estimated total</span><span>${AED(total)}</span></div>`;
  }
  renderSummary();

  /* ── date min = today ── */
  $("#bkDate").min = new Date().toISOString().split("T")[0];

  /* ── submit → WhatsApp ── */
  $("#bookingForm").addEventListener("submit", e => {
    e.preventDefault();
    const lines = currentLines();
    if (!lines.length) {
      alert("Please choose a package or at least one item first.");
      return;
    }
    const delivery = locationSel.value === "dubai" ? BUSINESS.deliveryFeeDubai : 0;
    const total = lines.reduce((s, l) => s + l.amount, 0) + delivery;
    const dateStr = new Date($("#bkDate").value + "T00:00:00")
      .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const msg = [
      `Hi ${BUSINESS.name}! 🌸 I'd like to book:`,
      ``,
      ...lines.map(l => `• ${l.label} — ${AED(l.amount)}`),
      `• Delivery: ${delivery ? AED(delivery) : "Free (Damac Hills 2)"}`,
      `Estimated total: ${AED(total)}`,
      ``,
      `📅 Date: ${dateStr}`,
      `🕐 Start time: ${$("#bkTime").value}`,
      `⏱ Duration: ${$("#bkDuration").value}`,
      `🎉 Event type: ${$("#bkType").value}`,
      `📍 Location: ${locationSel.options[locationSel.selectedIndex].text}${$("#bkAddress").value ? " — " + $("#bkAddress").value : ""}`,
      ``,
      `👤 Name: ${$("#bkName").value}`,
      `📞 Phone: ${$("#bkPhone").value}`,
      $("#bkNotes").value ? `📝 Notes: ${$("#bkNotes").value}` : null,
    ].filter(l => l !== null).join("\n");

    window.open(`https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  });
})();
