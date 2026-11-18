/* Pricing regressions for the booking form and visualizer.
   A wall already inside The Photo Corner is not charged again.
   A wall added to chairs or tables is the seating-order add-on.
   A wall on its own stays at the standalone price. */
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync("js/data.js", "utf8") + "\n" + fs.readFileSync("js/pricing.js", "utf8"),
  sandbox
);
const { PACKAGES, ITEMS, BUSINESS, CONFIRMATION, DELIVERY_ZONES, HelloMayaPricing } = vm.runInContext(
  "({ PACKAGES, ITEMS, BUSINESS, CONFIRMATION, DELIVERY_ZONES, HelloMayaPricing })",
  sandbox
);
const { buildQuote } = HelloMayaPricing;
const catalog = { packages: PACKAGES, items: ITEMS, business: BUSINESS };

function quoteDesign(packageId, counts, location, extraWallConfirmed) {
  return buildQuote(catalog, {
    packageId,
    counts,
    countMode: "design",
    location,
    extraWallConfirmed: !!extraWallConfirmed,
  });
}

function chargedWall(quote) {
  return quote.lines.filter(line => line.kind === "addon" || (line.kind === "item" && /Flower Wall/.test(line.label)));
}

const byId = id => PACKAGES.find(p => p.id === id);
const item = id => ITEMS.find(i => i.id === id);

assert.strictEqual(byId("pkg1").price, 349, "Essentials test price");
assert.strictEqual(byId("pkg2").price, 449, "Styled test price");
assert.strictEqual(byId("pkg3").price, 849, "Signature test price");
assert.strictEqual(byId("pkg-photo").price, 749, "Photo Corner test price");
assert.strictEqual(byId("pkg-kids-4").price, 95);
assert.strictEqual(byId("pkg-kids-8").price, 190);
for (const id of ["pkg-essentials-wall", "pkg-styled-wall", "pkg4", "pkg-kids-backdrop"]) {
  assert.strictEqual(byId(id).paused, true, id + " stays paused");
  assert.strictEqual(byId(id).price, undefined, id + " has no published price");
}
assert.ok(!/cushioned/i.test(byId("pkg-kids-8").items.join(" ")));
assert.ok(byId("pkg-kids-8").items.some(line => /no seat cushion/.test(line)));
assert.strictEqual(item("wall-blush").price, 675);
assert.strictEqual(item("wall-white").price, 675);
assert.strictEqual(item("wall-blush").addonPrice, 395);
assert.strictEqual(item("wall-white").addonPrice, 395);
assert.strictEqual(item("chair-adult").price, 15);
assert.strictEqual(item("chair-kids").price, 10);
assert.strictEqual(item("table-adult").price, 75);
assert.strictEqual(item("table-kids").price, 55);

assert.strictEqual(DELIVERY_ZONES.map(zone => zone.fee).join(","), "0,150,250,250");
assert.strictEqual(DELIVERY_ZONES.find(zone => zone.id === "far").fee, 250);
assert.strictEqual(DELIVERY_ZONES.find(zone => zone.id === "local").minimum, 350);
assert.strictEqual(DELIVERY_ZONES.find(zone => zone.id === "central").minimum, 500);
assert.ok(DELIVERY_ZONES.find(zone => zone.id === "nearby").communities.includes("Arabian Ranches 1, 2 and 3 (including Mira, Reem and the other Ranches villages)"));
assert.ok(DELIVERY_ZONES.find(zone => zone.id === "central").communities.includes("Downtown Dubai"));
assert.ok(DELIVERY_ZONES.find(zone => zone.id === "far").communities.includes("Palm Jumeirah"));
assert.ok(BUSINESS.deliveryRule.includes("AED 150 for nearby communities"));
assert.ok(BUSINESS.deliveryRule.includes("AED 250 for central Dubai"));
assert.ok(BUSINESS.deliveryRule.includes("AED 250 for the far side of Dubai"));
assert.ok(BUSINESS.minimumOrder.includes("AED 350"));
assert.ok(BUSINESS.minimumOrder.includes("AED 500"));
assert.ok(BUSINESS.wallOffer.includes("AED 395"));
assert.ok(BUSINESS.wallOffer.includes("14 January 2027"));

/* Photo Corner's included wall is not charged again. */
const repro = quoteDesign("pkg-photo", { "wall-white": 1, "table-adult": 1 }, "nearby", false);
assert.strictEqual(repro.total, 749 + 150, "included wall is not charged again");
assert.strictEqual(repro.delivery, 150);
assert.strictEqual(chargedWall(repro).length, 0);
assert.ok(repro.lines.some(line => line.kind === "included" && /White Rose/.test(line.label)));

const reproHome = quoteDesign("pkg-photo", { "wall-white": 1, "table-adult": 1 }, "local", false);
assert.strictEqual(reproHome.total, 749);
assert.strictEqual(reproHome.delivery, 0);

/* Central delivery adds 250. */
const central = quoteDesign("pkg1", {}, "central", false);
assert.strictEqual(central.delivery, 250);
assert.strictEqual(central.total, 349 + 250);

/* Seating-order wall add-on. */
assert.strictEqual(quoteDesign("pkg1", { "wall-blush": 1 }, "local", false).total, 744);
assert.strictEqual(quoteDesign("pkg3", { "wall-white": 1 }, "local", false).total, 1244);
assert.strictEqual(quoteDesign("pkg-kids-8", { "wall-white": 1 }, "local", false).total, 585);
assert.strictEqual(quoteDesign("pkg1", { "wall-blush": 1, "wall-white": 1 }, "local", false).total, 1139);
assert.strictEqual(quoteDesign(null, { "table-adult": 1, "wall-white": 1 }, "local", false).total, 470);
assert.strictEqual(quoteDesign(null, { "chair-adult": 2, "wall-blush": 1 }, "local", false).total, 30 + 395);
assert.strictEqual(quoteDesign(null, { "wall-white": 1 }, "local", false).total, 675);
assert.strictEqual(quoteDesign(null, { "wall-white": 1, "wall-blush": 1 }, "local", false).total, 675 + 675);

/* Second wall on Photo Corner is the add-on, and only after confirmation. */
const twoWalls = quoteDesign("pkg-photo", { "wall-blush": 1, "wall-white": 1, "table-adult": 1 }, "local", false);
assert.strictEqual(twoWalls.total, 749);
assert.strictEqual(twoWalls.unconfirmedWalls.length, 1);
assert.strictEqual(twoWalls.unconfirmedWalls[0].amount, 395);
const twoWallsYes = quoteDesign("pkg-photo", { "wall-blush": 1, "wall-white": 1, "table-adult": 1 }, "local", true);
assert.strictEqual(twoWallsYes.total, 749 + 395);
assert.strictEqual(twoWallsYes.unconfirmedWalls.length, 0);

const duplicate = quoteDesign("pkg-photo", { "wall-white": 2, "table-adult": 1 }, "local", true);
assert.strictEqual(duplicate.total, 749);
assert.strictEqual(duplicate.capped.length, 1);

/* Minimum order is a note, not a block. Essentials is under both minimums. */
const underLocal = quoteDesign("pkg1", {}, "local", false);
assert.strictEqual(underLocal.belowMinimum, true);
assert.strictEqual(underLocal.minimum, 350);
assert.ok(underLocal.lines.length > 0);
const underElsewhere = quoteDesign("pkg2", {}, "far", false);
assert.strictEqual(underElsewhere.belowMinimum, true);
assert.strictEqual(underElsewhere.minimum, 500);
assert.strictEqual(underElsewhere.delivery, 250);
const meets = quoteDesign("pkg3", {}, "nearby", false);
assert.strictEqual(meets.belowMinimum, false);
assert.strictEqual(meets.total, 849 + 150);

/* Children's package inclusions are not charged again. */
const kidsExact = quoteDesign("pkg-kids-4", { "table-kids": 1, "chair-kids": 4 }, "local", false);
assert.strictEqual(kidsExact.total, 95);
assert.strictEqual(kidsExact.belowMinimum, true);

const page = fs.readFileSync("index.html", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
const data = fs.readFileSync("js/data.js", "utf8");
const built = fs.readFileSync("build.js", "utf8");
const sources = page + main + data + built;
assert.ok(page.includes("packages--seating"));
assert.ok(page.includes("A flower wall can be added to a seating order for AED 395 until 14 January 2027."));
assert.ok(data.includes("There is a minimum order of AED 350 for delivery in Damac Hills 2"));
assert.ok(page.includes("data-minimum-copy"));
assert.ok(page.includes('id="deliveryZones"'));
assert.ok(page.includes('value="central"'));
assert.ok(!/AED 150 elsewhere/i.test(sources));
assert.ok(!/any booking/i.test(sources));
assert.ok(!/\b550\b/.test(data + page + main));
assert.ok(!/\b649\b/.test(data));
assert.ok(!/\b899\b/.test(data));
assert.ok(!/\b999\b/.test(data));
assert.ok(!/\b1199\b/.test(data));
assert.ok(!/\b729\b/.test(data));
assert.ok(!/Essentials with Wall|Styled with Wall|The Grand|Little Backdrop/.test(page));
assert.ok(CONFIRMATION.cancel.includes("confirmation payment is refunded in full"));
assert.ok(!/—/.test(BUSINESS.wallOffer + BUSINESS.deliveryRule + BUSINESS.minimumOrder));
assert.ok(!/\bVAT\b/.test(page + main + data));
assert.ok(!/Licensed/i.test(page + main + data));

console.log("pricing tests passed");
