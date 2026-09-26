/* ─── Hello Maya Events — nav, packages, booking ─── */
(function () {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const R = HelloMayaRender;
  const AED = R.AED;
  const catalog = { packages: PACKAGES, items: ITEMS, business: BUSINESS };

  /* ── nav burger ── */
  const burger = $("#burger");
  const navLinks = $("#navLinks");
  burger.addEventListener("click", () => {
    burger.setAttribute("aria-expanded", navLinks.classList.toggle("open"));
  });
  navLinks.addEventListener("click", e => {
    if (e.target.tagName !== "A") return;
    navLinks.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  });

  $("#year").textContent = new Date().getFullYear();

  /* ── shared wording, so the delivery rule cannot drift ── */
  document.querySelectorAll("[data-delivery-copy]").forEach(el => {
    el.textContent = BUSINESS.deliveryRule;
  });
  document.querySelectorAll("[data-rental-copy]").forEach(el => {
    el.textContent = BUSINESS.rentalNote;
  });
  document.querySelectorAll("[data-vat-copy]").forEach(el => {
    el.textContent = BUSINESS.vatNote;
  });
  document.querySelectorAll("[data-response-copy]").forEach(el => {
    el.textContent = BUSINESS.responseNote;
  });
  document.querySelectorAll('a[href^="https://wa.me/"]').forEach(link => {
    const extra = link.search || "";
    link.href = `https://wa.me/${BUSINESS.whatsapp}${extra}`;
  });
  document.querySelectorAll("[data-whatsapp-display]").forEach(el => {
    el.textContent = BUSINESS.whatsappDisplay;
  });
  const heroFrom = $("#heroFromPrice");
  if (heroFrom) heroFrom.textContent = AED(R.adultFrom());

  /* ── instagram carousel ── */
  const igTrack = $("#igTrack");
  if (INSTAGRAM_POSTS.length) {
    igTrack.classList.add("ig__track--embeds");
    igTrack.innerHTML = INSTAGRAM_POSTS.map(url => {
      const clean = url.split("?")[0].replace(/\/?$/, "/");
      return `<div class="ig__tile ig__tile--embed">
        <iframe src="${clean}embed/" loading="lazy" frameborder="0" scrolling="no" allowtransparency="true" title="Instagram post"></iframe>
      </div>`;
    }).join("");
  } else {
    igTrack.innerHTML = R.igTiles();
  }
  const igStep = () => {
    const tile = igTrack.querySelector(".ig__tile");
    return tile ? tile.getBoundingClientRect().width + 16 : 300;
  };
  $("#igPrev").addEventListener("click", () => igTrack.scrollBy({ left: -igStep(), behavior: "smooth" }));
  $("#igNext").addEventListener("click", () => igTrack.scrollBy({ left: igStep(), behavior: "smooth" }));

  /* ── flower wall space notes ── */
  const wallSpace = $("#wallSpace");
  if (wallSpace) wallSpace.textContent = SPACE.flowerWall;

  /* ── rental terms (page + dialog share one source) and FAQ ── */
  $("#termsBody").innerHTML = R.termsMarkup();
  $("#termsDialogBody").innerHTML = R.termsMarkup();
  $("#faqList").innerHTML = R.faqMarkup();
  const termsDialog = $("#termsDialog");
  function openTerms() {
    if (typeof termsDialog.showModal === "function") termsDialog.showModal();
  }
  document.querySelectorAll("[data-open-terms]").forEach(el => {
    el.addEventListener("click", event => {
      event.preventDefault();
      openTerms();
    });
  });

  /* ── yes / no dialog for a second flower wall ── */
  const confirmDialog = $("#confirmDialog");
  const confirmText = $("#confirmText");
  function askYesNo(message) {
    confirmText.textContent = message;
    const yesBtn = $("#confirmYes");
    const noBtn = $("#confirmNo");
    return new Promise(resolve => {
      let settled = false;
      const finish = value => {
        if (settled) return;
        settled = true;
        yesBtn.removeEventListener("click", onYes);
        noBtn.removeEventListener("click", onNo);
        confirmDialog.removeEventListener("cancel", onCancel);
        if (confirmDialog.open) confirmDialog.close();
        resolve(value);
      };
      const onYes = () => finish(true);
      const onNo = () => finish(false);
      const onCancel = event => {
        event.preventDefault();
        finish(false);
      };
      yesBtn.addEventListener("click", onYes);
      noBtn.addEventListener("click", onNo);
      confirmDialog.addEventListener("cancel", onCancel);
      confirmDialog.showModal();
    });
  }

  /* ── package cards ── */
  const grid = $("#packagesGrid");
  const kidsGrid = $("#kidsGrid");
  grid.innerHTML = PACKAGES.filter(p => !p.children).map(R.packageCard).join("");
  kidsGrid.innerHTML = PACKAGES.filter(p => p.children).map(R.packageCard).join("");

  function onPackagePick(event) {
    const btn = event.target.closest("[data-pick-pkg]");
    if (!btn) return;
    setPackage(btn.dataset.pickPkg);
    document.getElementById("book").scrollIntoView({ behavior: "smooth" });
  }
  grid.addEventListener("click", onPackagePick);
  kidsGrid.addEventListener("click", onPackagePick);

  /* ── booking state ──
     qty is add-ons on top of the selected package, not the pieces
     already inside it. wallColour is the one wall a package includes. */
  const state = {
    packageId: null,
    wallColour: null,
    extraWallConfirmed: false,
    notice: "",
    qty: Object.fromEntries(ITEMS.map(i => [i.id, 0])),
  };

  const itemsBox = $("#bookingItems");
  const wallChoices = ITEMS.filter(i => i.unit === "wall");

  itemsBox.innerHTML = `
    <p class="bk-delivery">${BUSINESS.rentalNote} ${BUSINESS.vatNote}</p>
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
               <div class="bk-pkg__detail">${p.summary}</div></div>
          <span class="bk-pkg__price">${AED(p.price)}</span>
        </label>`).join("")}
    </div>
    <div class="bk-wall" id="bkWallChoice" hidden>
      <h4>Included flower wall</h4>
      <p>This collection includes one wall. Choose the colour — it is not charged again. The other colour can be added below only as an extra.</p>
      ${wallChoices.map(wall => `
        <label>
          <input type="radio" name="wallColour" value="${wall.id}">
          <span>${wall.name.replace("Flower Wall — ", "")}</span>
        </label>`).join("")}
    </div>
    <div class="bk-group">
      <h4>Individual pieces and add-ons</h4>
      <p class="bk-hint">Pieces already in your collection aren't charged twice, so use these rows for extras only.</p>
      ${ITEMS.map(i => `
        <div class="bk-row">
          <div class="bk-row__info">
            <div class="bk-row__name">${i.name}</div>
            <div class="bk-row__price">${AED(i.price)} / ${i.unit}</div>
            ${i.detail ? `<div class="bk-row__note">${i.detail}</div>` : ""}
            ${i.spaceNote ? `<div class="bk-row__note">${i.spaceNote}</div>` : ""}
          </div>
          <div class="bk-qty">
            <button type="button" data-dec="${i.id}" aria-label="Less ${i.name}">−</button>
            <input type="number" id="qty-${i.id}" data-qty="${i.id}" value="0" min="0" max="${i.max}" inputmode="numeric">
            <button type="button" data-inc="${i.id}" aria-label="More ${i.name}">+</button>
          </div>
        </div>`).join("")}
    </div>`;

  function currentPackage() {
    return PACKAGES.find(p => p.id === state.packageId) || null;
  }
  function packageIncludesWall() {
    return HelloMayaPricing.wallCredit(currentPackage()) > 0;
  }
  function itemById(id) {
    return ITEMS.find(i => i.id === id);
  }

  function syncQtyInputs() {
    ITEMS.forEach(i => {
      const input = $(`#qty-${i.id}`);
      if (input) input.value = state.qty[i.id];
    });
  }
  function syncWallChoice() {
    const box = $("#bkWallChoice");
    box.hidden = !packageIncludesWall();
    box.querySelectorAll('input[name="wallColour"]').forEach(input => {
      input.checked = input.value === state.wallColour;
    });
  }
  function syncPackageUI() {
    itemsBox.querySelectorAll(".bk-pkg").forEach(el => {
      const match = (el.dataset.pkg || "") === (state.packageId || "");
      el.classList.toggle("selected", match);
      el.querySelector("input").checked = match;
    });
    syncWallChoice();
  }
  function showNotice(text) {
    state.notice = text || "";
    const note = $("#bookingNotice");
    note.hidden = !state.notice;
    note.textContent = state.notice;
  }

  function releaseIncludedWall() {
    const pkg = currentPackage();
    if (!pkg || !HelloMayaPricing.wallCredit(pkg) || !state.wallColour) return;
    const item = itemById(state.wallColour);
    state.qty[state.wallColour] = Math.min(item.max, (state.qty[state.wallColour] || 0) + 1);
    state.wallColour = null;
    state.extraWallConfirmed = false;
  }

  async function absorbIncludedWall() {
    const pkg = currentPackage();
    if (!pkg || !HelloMayaPricing.wallCredit(pkg)) {
      state.wallColour = null;
      state.extraWallConfirmed = false;
      return;
    }
    const held = ITEMS.filter(i => i.unit === "wall" && state.qty[i.id] > 0);
    if (!held.length) return;
    const included = held[0];
    state.wallColour = included.id;
    state.qty[included.id] = Math.max(0, state.qty[included.id] - 1);
    const extras = ITEMS.filter(i => i.unit === "wall" && state.qty[i.id] > 0);
    if (!extras.length) {
      state.extraWallConfirmed = false;
      return;
    }
    const amount = extras.reduce((sum, i) => sum + state.qty[i.id] * i.price, 0);
    const names = extras.map(i => i.name).join(" and ");
    const ok = await askYesNo(
      `${pkg.name} already includes one flower wall (${included.name}). Add ${names} as an extra for ${AED(amount)}?`
    );
    if (!ok) extras.forEach(i => { state.qty[i.id] = 0; });
    state.extraWallConfirmed = ok;
  }

  let choosing = false;

  async function setPackage(pkgId) {
    const nextId = pkgId || null;
    if (nextId === state.packageId) {
      syncPackageUI();
      renderSummary();
      return;
    }
    if (choosing) return;
    choosing = true;
    try {
      releaseIncludedWall();
      state.packageId = nextId;
      state.extraWallConfirmed = false;
      await absorbIncludedWall();
      syncPackageUI();
      syncQtyInputs();
      renderSummary();
    } finally {
      choosing = false;
    }
  }

  async function setQty(id, desired) {
    if (choosing) {
      syncQtyInputs();
      return;
    }
    const item = itemById(id);
    let next = parseInt(desired, 10);
    if (isNaN(next) || next < 0) next = 0;
    next = Math.min(item.max, next);
    const prev = state.qty[id];
    if (next === prev) {
      syncQtyInputs();
      return;
    }

    if (item.unit === "wall" && next > prev && packageIncludesWall()) {
      choosing = true;
      const pkg = currentPackage();
      try {
        if (!state.wallColour) {
          state.wallColour = id;
          syncWallChoice();
          showNotice(`${item.name} is the wall included in ${pkg.name}, so it is not added to the total.`);
          syncQtyInputs();
          renderSummary();
          return;
        }
        if (state.wallColour === id) {
          showNotice(`${item.name} is already included in ${pkg.name}. Only one of each wall is available — you can add the other colour as an extra.`);
          syncQtyInputs();
          return;
        }
        if (!state.extraWallConfirmed) {
          const ok = await askYesNo(
            `${pkg.name} already includes one flower wall. Add the ${item.name} as an extra for ${AED(item.price)}?`
          );
          if (!ok) {
            syncQtyInputs();
            return;
          }
          state.extraWallConfirmed = true;
        }
      } finally {
        choosing = false;
      }
    }

    state.qty[id] = next;
    if (item.unit === "wall" && !ITEMS.some(i => i.unit === "wall" && state.qty[i.id] > 0)) {
      state.extraWallConfirmed = false;
    }
    syncQtyInputs();
    renderSummary();
  }

  itemsBox.addEventListener("click", event => {
    const inc = event.target.closest("[data-inc]");
    const dec = event.target.closest("[data-dec]");
    if (inc) setQty(inc.dataset.inc, state.qty[inc.dataset.inc] + 1);
    if (dec) setQty(dec.dataset.dec, state.qty[dec.dataset.dec] - 1);
  });
  itemsBox.addEventListener("change", event => {
    if (event.target.name === "bkPkg") setPackage(event.target.value || null);
    if (event.target.name === "wallColour") {
      const id = event.target.value;
      if (state.qty[id] > 0) {
        showNotice("That colour is already an extra. Remove it below, or keep it as the paid wall and choose the other colour as the one included.");
        syncWallChoice();
        return;
      }
      state.wallColour = id;
      showNotice("");
      renderSummary();
    }
  });
  itemsBox.addEventListener("input", event => {
    const id = event.target.dataset ? event.target.dataset.qty : null;
    if (!id) return;
    setQty(id, event.target.value);
  });
  itemsBox.addEventListener("focusout", event => {
    const id = event.target.dataset ? event.target.dataset.qty : null;
    if (id) event.target.value = state.qty[id];
  });
  itemsBox.addEventListener("focusin", event => {
    if (event.target.dataset && event.target.dataset.qty) event.target.select();
  });

  /* Visualizer counts are everything in the design, including pieces
     the package already contains. Convert them to add-ons first. */
  window.applyVisualizerCounts = async function (counts) {
    if (choosing) return;
    choosing = true;
    try {
    const plan = HelloMayaPricing.designToExtras(catalog, state.packageId, counts, state.wallColour);
    const pkg = currentPackage();
    if (plan.extraWalls.length && pkg) {
      const includedName = plan.wallColour ? itemById(plan.wallColour).name : "one flower wall";
      const extraLabel = plan.extraWalls.map(wall => wall.name).join(" and ");
      const amount = plan.extraWalls.reduce((sum, wall) => sum + wall.amount, 0);
      const ok = await askYesNo(
        `${pkg.name} already includes one flower wall (${includedName}). Your design also has ${extraLabel}. Add it as an extra for ${AED(amount)}? If you choose no, only the included wall is kept.`
      );
      if (ok) {
        plan.extraWalls.forEach(wall => { plan.extras[wall.id] = wall.qty; });
        state.extraWallConfirmed = true;
      } else {
        state.extraWallConfirmed = false;
      }
    } else {
      state.extraWallConfirmed = plan.extraWalls.length > 0;
    }
    if (plan.wallColour) state.wallColour = plan.wallColour;
    ITEMS.forEach(i => {
      state.qty[i.id] = Math.min(i.max, plan.extras[i.id] || 0);
    });
    const notes = [];
    if (pkg && HelloMayaPricing.wallCredit(pkg)) {
      notes.push(`Pieces already in ${pkg.name} are not charged again.`);
    }
    plan.capped.forEach(entry => {
      notes.push(`Only ${entry.kept} × ${entry.name} can be reserved, so duplicates in the design were counted once.`);
    });
    showNotice(notes.join(" "));
    syncPackageUI();
    syncQtyInputs();
    renderSummary();
    document.getElementById("book").scrollIntoView({ behavior: "smooth" });
    } finally {
      choosing = false;
    }
  };

  /* ── summary & total ── */
  const summaryBox = $("#bookingSummary");
  const locationSel = $("#bkLocation");
  locationSel.options[0].text = "Damac Hills 2 — free delivery and collection";
  locationSel.options[1].text = `Elsewhere in Dubai — ${AED(BUSINESS.deliveryFeeDubai)} delivery and collection`;
  locationSel.addEventListener("change", renderSummary);

  function selectionForQuote() {
    return {
      packageId: state.packageId,
      counts: state.qty,
      countMode: "extras",
      wallColour: state.wallColour,
      extraWallConfirmed: state.extraWallConfirmed,
      location: locationSel.value,
    };
  }

  function renderSummary() {
    const quote = HelloMayaPricing.buildQuote(catalog, selectionForQuote());
    const hasSelection = quote.lines.length > 0;
    if (!hasSelection) {
      summaryBox.innerHTML = `<span class="empty">Nothing selected yet — choose a collection or pieces above.</span>`;
      return;
    }
    const deliveryText = quote.delivery
      ? AED(quote.delivery)
      : "Free";
    const deliveryWhere = quote.delivery ? "Elsewhere in Dubai" : "Damac Hills 2";
    summaryBox.innerHTML = `
      <ul>
        ${quote.lines.map(line => `
          <li class="${line.kind === "included" ? "is-included" : ""}">
            <span>${line.label}</span>
            <span>${line.amount ? AED(line.amount) : "Included"}</span>
          </li>`).join("")}
        <li><span>Delivery and collection — ${deliveryWhere}</span><span>${deliveryText}</span></li>
      </ul>
      <div class="total"><span>Estimated total</span><span>${AED(quote.total)}</span></div>
      <p class="booking__fine">${BUSINESS.vatNote}</p>`;
  }
  renderSummary();

  /* ── date min = today ── */
  $("#bkDate").min = new Date().toISOString().split("T")[0];

  /* ── submit → WhatsApp enquiry. This does not reserve the date. ── */
  $("#bookingForm").addEventListener("submit", event => {
    event.preventDefault();
    const quote = HelloMayaPricing.buildQuote(catalog, selectionForQuote());
    if (!quote.lines.length) {
      alert("Please choose a package or at least one item first.");
      return;
    }
    if (packageIncludesWall() && !state.wallColour) {
      alert("Please choose the flower wall colour included in your collection.");
      $("#bkWallChoice").scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const dateStr = new Date($("#bkDate").value + "T00:00:00")
      .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const guests = $("#bkGuests").value.trim();

    const msg = [
      `Hi ${BUSINESS.name}! I'd like to check availability for my event.`,
      ``,
      ...quote.lines.map(line => `• ${line.label} — ${line.amount ? AED(line.amount) : "Included"}`),
      `• Delivery and collection: ${quote.delivery ? AED(quote.delivery) + " (elsewhere in Dubai)" : "Free (Damac Hills 2)"}`,
      `Estimated total: ${AED(quote.total)}`,
      BUSINESS.vatNote,
      ``,
      `Date: ${dateStr}`,
      `Start time: ${$("#bkTime").value}`,
      `Duration: ${$("#bkDuration").value}`,
      BUSINESS.rentalNote,
      `Event type: ${$("#bkType").value}`,
      guests ? `Guest count: ${guests}` : null,
      `Location: ${locationSel.options[locationSel.selectedIndex].text}${$("#bkAddress").value ? " — " + $("#bkAddress").value : ""}`,
      ``,
      `Name: ${$("#bkName").value}`,
      `Phone: ${$("#bkPhone").value}`,
      $("#bkNotes").value ? `Notes: ${$("#bkNotes").value}` : null,
      ``,
      `Next step I expect: a confirmed quote, then a deposit, then booking confirmation.`,
    ].filter(line => line !== null).join("\n");

    window.open(`https://wa.me/${BUSINESS.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  });
})();
