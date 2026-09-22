/* Quote math shared by the booking form, the visualizer, and node tests.
   Package inclusions are credited before anything is charged.
   A flower wall inside a package (The Grand includes one) is not billed
   again. A further wall is an add-on only after the customer confirms. */
(function (root) {
  "use strict";

  function isWallItem(item) {
    return item.unit === "wall";
  }

  function packageById(packages, id) {
    if (!id) return null;
    return packages.find(p => p.id === id) || null;
  }

  function wallCredit(pkg) {
    return (pkg && pkg.includes && pkg.includes["flower-wall"]) || 0;
  }

  /**
   * Turn a visualizer design (absolute sticker counts) into add-on
   * quantities. Pieces already inside the selected package become zero
   * add-ons. Wall inventory is capped at each item's max (one of each).
   *
   * extraWalls are walls beyond the package's included wall. They are not
   * copied into extras until the customer confirms them.
   */
  function designToExtras(catalog, packageId, designCounts, preferredWallId) {
    const pkg = packageById(catalog.packages, packageId);
    const includes = Object.assign({}, (pkg && pkg.includes) || {});
    let credit = wallCredit(pkg);
    const extras = {};
    const capped = [];
    let wallColour = null;
    const extraWalls = [];
    const wallRows = [];

    catalog.items.forEach(item => {
      const requested = Math.max(0, designCounts[item.id] || 0);
      const kept = Math.min(requested, item.max);
      if (requested > kept) {
        capped.push({
          id: item.id,
          name: item.name,
          requested,
          kept,
        });
      }

      if (isWallItem(item)) {
        extras[item.id] = 0;
        wallRows.push({ item, kept });
        return;
      }

      const covered = Math.min(kept, includes[item.id] || 0);
      extras[item.id] = kept - covered;
    });

    /* Prefer the colour already chosen on the package, then catalogue order. */
    const ordered = [];
    if (preferredWallId) {
      const preferred = wallRows.find(row => row.item.id === preferredWallId && row.kept > 0);
      if (preferred) ordered.push(preferred);
    }
    wallRows.forEach(row => {
      if (!ordered.includes(row)) ordered.push(row);
    });

    ordered.forEach(({ item, kept }) => {
      const covered = Math.min(kept, credit);
      credit -= covered;
      if (covered && !wallColour) wallColour = item.id;
      const remainder = kept - covered;
      /* A further wall is held for confirmation only when the package
         already includes one. Otherwise the wall is a normal product. */
      if (wallCredit(pkg) > 0) {
        if (remainder > 0) {
          extraWalls.push({
            id: item.id,
            qty: remainder,
            name: item.name,
            amount: remainder * item.price,
          });
        }
      } else {
        extras[item.id] = remainder;
      }
    });

    return { extras, wallColour, extraWalls, capped };
  }

  /**
   * selection.countMode "extras": counts are add-ons on top of the package.
   * selection.countMode "design": counts are absolute design quantities.
   * selection.extraWallConfirmed: bill walls beyond the included one.
   * selection.wallColour: included wall item id (extras mode).
   * selection.location: "damac" (free) or "dubai" (delivery fee).
   */
  function buildQuote(catalog, selection) {
    const mode = selection.countMode || "extras";
    if (mode === "design") {
      const plan = designToExtras(
        catalog,
        selection.packageId,
        selection.counts || {},
        selection.wallColour
      );
      const counts = Object.assign({}, plan.extras);
      if (selection.extraWallConfirmed) {
        plan.extraWalls.forEach(wall => {
          counts[wall.id] = (counts[wall.id] || 0) + wall.qty;
        });
      }
      const quote = buildQuote(catalog, {
        packageId: selection.packageId,
        counts,
        countMode: "extras",
        wallColour: selection.wallColour || plan.wallColour,
        location: selection.location,
        extraWallConfirmed: !!selection.extraWallConfirmed,
      });
      quote.unconfirmedWalls = selection.extraWallConfirmed ? [] : plan.extraWalls;
      quote.capped = plan.capped;
      return quote;
    }

    const pkg = packageById(catalog.packages, selection.packageId);
    const lines = [];
    if (pkg) lines.push({ label: pkg.name, amount: pkg.price, kind: "package" });

    if (wallCredit(pkg)) {
      const colour = catalog.items.find(item => item.id === selection.wallColour);
      lines.push({
        label: colour
          ? `${colour.name} (included in ${pkg.name})`
          : `Flower wall (included in ${pkg.name} — choose Blush Pink or White Rose Garden)`,
        amount: 0,
        kind: "included",
      });
    }

    catalog.items.forEach(item => {
      const qty = selection.counts[item.id] || 0;
      if (qty <= 0) return;
      const additionalWall = isWallItem(item) && wallCredit(pkg) > 0;
      lines.push({
        label: `${qty} × ${item.name}${additionalWall ? " (additional wall)" : ""}`,
        amount: qty * item.price,
        kind: additionalWall ? "addon" : "item",
      });
    });

    const delivery = selection.location === "dubai" ? catalog.business.deliveryFeeDubai : 0;
    const total = lines.reduce((sum, line) => sum + line.amount, 0) + delivery;
    return {
      lines,
      delivery,
      total,
      unconfirmedWalls: [],
      capped: [],
    };
  }

  const api = { buildQuote, designToExtras, isWallItem, wallCredit };
  root.HelloMayaPricing = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
