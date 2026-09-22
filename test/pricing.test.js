/* Pricing regressions for the booking form and visualizer.
   Repro that must stay fixed:
   Select The Grand, add one White Rose wall in the visualizer, choose
   "Elsewhere in Dubai", then "Check availability for this design".
   Previously the estimate was Grand + wall + delivery
   (AED 999 + 675 + 150 = 1,824). The wall is already in The Grand,
   so it must not be charged again. At the test prices that total is
   AED 1,199 + 150 = 1,349. A second wall is billed only when confirmed. */
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync("js/data.js", "utf8") + "\n" + fs.readFileSync("js/pricing.js", "utf8"),
  sandbox
);
const { PACKAGES, ITEMS, BUSINESS, HelloMayaPricing } = vm.runInContext(
  "({ PACKAGES, ITEMS, BUSINESS, HelloMayaPricing })",
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
assert.strictEqual(byId("pkg3").price, 649, "Signature test price");
assert.strictEqual(byId("pkg4").price, 1199, "Grand test price");
assert.strictEqual(item("wall-blush").price, 675);
assert.strictEqual(item("wall-white").price, 675);
assert.strictEqual(item("chair-adult").price, 15);
assert.strictEqual(item("chair-kids").price, 10);
assert.strictEqual(item("table-adult").price, 75);
assert.strictEqual(item("table-kids").price, 55);

assert.strictEqual(byId("pkg-kids-4").price, 55 + 4 * 10, "Little Gathering is inventory sum");
assert.strictEqual(byId("pkg-kids-8").price, 2 * 55 + 8 * 10, "Little Celebration is inventory sum");
assert.strictEqual(byId("pkg-kids-4").seats, 4);
assert.strictEqual(byId("pkg-kids-8").seats, 8);
assert.ok(byId("pkg-kids-4").ageNote && byId("pkg-kids-8").ageNote);

assert.ok(BUSINESS.deliveryRule.includes("Damac Hills 2"));
assert.ok(BUSINESS.deliveryRule.includes("AED 150"));
assert.ok(/collection/i.test(BUSINESS.deliveryRule));
assert.strictEqual(BUSINESS.deliveryFeeDubai, 150);

/* Repro: Grand + one White Rose wall + Dubai delivery. */
const repro = quoteDesign("pkg4", { "wall-white": 1 }, "dubai", false);
assert.strictEqual(repro.total, 1199 + 150, "included wall is not charged again");
assert.strictEqual(repro.delivery, 150);
assert.strictEqual(chargedWall(repro).length, 0);
assert.ok(repro.lines.some(line => line.kind === "included" && /White Rose/.test(line.label)));
assert.strictEqual(repro.unconfirmedWalls.length, 0);
assert.notStrictEqual(repro.total, 1199 + 675 + 150, "old double-count total must not return");

/* Same design in Damac Hills 2 is free delivery, still no wall charge. */
const reproHome = quoteDesign("pkg4", { "wall-white": 1 }, "damac", false);
assert.strictEqual(reproHome.total, 1199);
assert.strictEqual(reproHome.delivery, 0);

/* A full Grand design (furniture + the included wall) is the package price only. */
const fullDesign = quoteDesign("pkg4", {
  "chair-adult": 16,
  "table-adult": 2,
  "wall-white": 1,
}, "dubai", false);
assert.strictEqual(fullDesign.total, 1199 + 150);
assert.ok(!fullDesign.lines.some(line => line.kind === "item" || line.kind === "addon"));

/* Chairs above the 16 included are add-ons at the unit price. */
const extraChairs = quoteDesign("pkg4", { "chair-adult": 18, "wall-blush": 1 }, "damac", false);
assert.strictEqual(extraChairs.total, 1199 + 2 * 15);

/* Second wall: held until confirmed, then charged once. */
const twoWalls = quoteDesign("pkg4", { "wall-blush": 1, "wall-white": 1 }, "dubai", false);
assert.strictEqual(twoWalls.total, 1199 + 150);
assert.strictEqual(twoWalls.unconfirmedWalls.length, 1);
assert.strictEqual(twoWalls.unconfirmedWalls[0].amount, 675);

/* If White Rose was already the included colour, it stays included and Blush is the extra. */
const preferred = buildQuote(catalog, {
  packageId: "pkg4",
  counts: { "wall-blush": 1, "wall-white": 1 },
  countMode: "design",
  location: "dubai",
  extraWallConfirmed: false,
  wallColour: "wall-white",
});
assert.ok(preferred.lines.some(line => line.kind === "included" && /White Rose/.test(line.label)));
assert.strictEqual(preferred.unconfirmedWalls[0].id, "wall-blush");
assert.strictEqual(preferred.total, 1199 + 150);

const twoWallsYes = quoteDesign("pkg4", { "wall-blush": 1, "wall-white": 1 }, "dubai", true);
assert.strictEqual(twoWallsYes.total, 1199 + 675 + 150);
assert.strictEqual(twoWallsYes.unconfirmedWalls.length, 0);
assert.strictEqual(chargedWall(twoWallsYes).length, 1);

/* Duplicate of the same wall cannot sell a second copy — only one exists. */
const duplicate = quoteDesign("pkg4", { "wall-white": 2 }, "dubai", true);
assert.strictEqual(duplicate.total, 1199 + 150);
assert.strictEqual(duplicate.capped.length, 1);
assert.strictEqual(duplicate.capped[0].kept, 1);

/* Packages without a wall still charge a standalone wall. */
const styledPlusWall = quoteDesign("pkg2", { "wall-white": 1 }, "dubai", false);
assert.strictEqual(styledPlusWall.total, 449 + 675 + 150);

/* No package: the wall is the product, not an inclusion. */
const wallOnly = quoteDesign(null, { "wall-white": 1 }, "dubai", false);
assert.strictEqual(wallOnly.total, 675 + 150);

/* Children's package inclusions are not charged again. */
const kidsExact = quoteDesign("pkg-kids-4", { "table-kids": 1, "chair-kids": 4 }, "damac", false);
assert.strictEqual(kidsExact.total, 55 + 40);
const kidsExtra = quoteDesign("pkg-kids-4", { "table-kids": 1, "chair-kids": 6 }, "dubai", false);
assert.strictEqual(kidsExtra.total, 55 + 40 + 2 * 10 + 150);

/* Extras mode matches the form: included colour is not a quantity. */
const fromForm = buildQuote(catalog, {
  packageId: "pkg4",
  countMode: "extras",
  counts: { "wall-white": 0, "wall-blush": 0, "chair-adult": 0 },
  wallColour: "wall-white",
  location: "dubai",
});
assert.strictEqual(fromForm.total, 1199 + 150);

const page = fs.readFileSync("index.html", "utf8");
const main = fs.readFileSync("js/main.js", "utf8");
assert.ok(!/right away/i.test(page + main), "no instant-availability promise");
assert.ok(!page.includes("AED 299") && !page.includes("AED 999"));
assert.ok(!/includes delivery/i.test(page + main));
assert.ok(page.includes("data-delivery-copy"));
assert.ok(page.includes('id="terms"'));
assert.ok(page.includes('id="children"'));
assert.ok(main.includes("BUSINESS.deliveryRule"));
assert.ok(main.includes("designToExtras"));
assert.ok(/Check availability/.test(page));

console.log("pricing tests passed");
