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
  ["js/data.js", "js/pricing.js", "js/render.js"].map(file => fs.readFileSync(file, "utf8")).join("\n"),
  sandbox
);
const { PACKAGES, ITEMS, BUSINESS, FAQ, WALL_ADDON_PRICE, HelloMayaPricing, HelloMayaRender } = vm.runInContext(
  "({ PACKAGES, ITEMS, BUSINESS, FAQ, WALL_ADDON_PRICE, HelloMayaPricing, HelloMayaRender })",
  sandbox
);
const { buildQuote } = HelloMayaPricing;
const catalog = { packages: PACKAGES, items: ITEMS, business: BUSINESS, wallAddonPrice: WALL_ADDON_PRICE };

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
assert.strictEqual(byId("pkg3").tag, "Most requested");
assert.strictEqual(byId("pkg4").price, 1199, "Grand test price");
assert.strictEqual(byId("pkg-photo").price, 749, "Photo Corner is a set price");
assert.strictEqual(byId("pkg-essentials-wall").price, 899);
assert.strictEqual(byId("pkg-styled-wall").price, 999);
assert.strictEqual(byId("pkg-kids-backdrop").price, 749);
assert.ok(byId("pkg-photo").price < 75 + 675, "Photo Corner is below the piece total");
assert.ok(byId("pkg-essentials-wall").price < 349 + 675);
assert.ok(byId("pkg-styled-wall").price < 449 + 675);
assert.ok(byId("pkg-kids-backdrop").price < (2 * 55 + 8 * 10) + 675);
assert.notStrictEqual(byId("pkg-photo").price, 75 + 675);
assert.notStrictEqual(byId("pkg-essentials-wall").price, 349 + 675);
assert.notStrictEqual(byId("pkg-styled-wall").price, 449 + 675);
assert.notStrictEqual(byId("pkg-kids-backdrop").price, (2 * 55 + 8 * 10) + 675);
assert.strictEqual(item("wall-blush").price, 675);
assert.strictEqual(item("wall-white").price, 675);
assert.strictEqual(WALL_ADDON_PRICE, 550);
assert.strictEqual(item("wall-blush").price - WALL_ADDON_PRICE, 125);
assert.strictEqual(item("chair-adult").price, 15);
assert.strictEqual(item("chair-kids").price, 10);
assert.strictEqual(item("table-adult").price, 75);
assert.strictEqual(item("table-kids").price, 55);

assert.deepStrictEqual([...PACKAGES].filter(p => !p.children).map(p => p.id), [
  "pkg1", "pkg2", "pkg3", "pkg-photo", "pkg-essentials-wall", "pkg-styled-wall", "pkg4",
]);
assert.deepStrictEqual([...PACKAGES].filter(p => p.children).map(p => p.id), [
  "pkg-kids-4", "pkg-kids-8", "pkg-kids-backdrop",
]);
for (const id of ["pkg-photo", "pkg-essentials-wall", "pkg-styled-wall", "pkg4", "pkg-kids-backdrop"]) {
  assert.strictEqual(byId(id).tag, "With flower wall", id);
  assert.strictEqual(byId(id).includes["flower-wall"], 1, id);
}

const photo = byId("pkg-photo");
assert.strictEqual(photo.includes["table-adult"], 1);
assert.strictEqual(photo.includes["chair-adult"], undefined);
assert.strictEqual(photo.includes["chair-kids"], undefined);
assert.match(photo.summary, /No chairs/);
assert.ok(!photo.summary.includes("16"));
assert.ok(photo.items.some(line => /does not seat 16 adults/i.test(line)));
assert.ok(photo.items.some(line => /no chairs, décor or place settings/i.test(line)));
assert.strictEqual(byId("pkg-essentials-wall").includes["chair-adult"], 16);
assert.strictEqual(byId("pkg-styled-wall").includes["chair-adult"], 16);
assert.ok(!byId("pkg-essentials-wall").items.some(line => /place setting|décor/i.test(line)));
assert.ok(byId("pkg-styled-wall").items.some(line => /décor|decor/i.test(line)));
assert.ok(!byId("pkg-styled-wall").items.some(line => /place setting/i.test(line)));

assert.strictEqual(byId("pkg-kids-4").price, 55 + 4 * 10, "Little Gathering is inventory sum");
assert.strictEqual(byId("pkg-kids-8").price, 2 * 55 + 8 * 10, "Little Celebration is inventory sum");
assert.strictEqual(byId("pkg-kids-4").seats, 4);
assert.strictEqual(byId("pkg-kids-8").seats, 8);
assert.strictEqual(byId("pkg-kids-backdrop").seats, 8);
assert.strictEqual(byId("pkg-kids-backdrop").includes["chair-kids"], 8);
assert.strictEqual(byId("pkg-kids-backdrop").includes["table-kids"], 2);
assert.ok(byId("pkg-kids-4").ageNote && byId("pkg-kids-8").ageNote && byId("pkg-kids-backdrop").ageNote);

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
assert.strictEqual(twoWalls.unconfirmedWalls[0].amount, 550);

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
assert.strictEqual(twoWallsYes.total, 1199 + 550 + 150);
assert.strictEqual(twoWallsYes.unconfirmedWalls.length, 0);
assert.strictEqual(chargedWall(twoWallsYes).length, 1);

/* Duplicate of the same wall cannot sell a second copy — only one exists. */
const duplicate = quoteDesign("pkg4", { "wall-white": 2 }, "dubai", true);
assert.strictEqual(duplicate.total, 1199 + 150);
assert.strictEqual(duplicate.capped.length, 1);
assert.strictEqual(duplicate.capped[0].kept, 1);

/* A wall added to a seating collection is the add-on, not the standalone price. */
const styledPlusWall = quoteDesign("pkg2", { "wall-white": 1 }, "dubai", false);
assert.strictEqual(styledPlusWall.total, 449 + 550 + 150);
assert.notStrictEqual(styledPlusWall.total, 449 + 675 + 150);

/* No package: the wall is the product, not an inclusion. */
const wallOnly = quoteDesign(null, { "wall-white": 1 }, "dubai", false);
assert.strictEqual(wallOnly.total, 675 + 150);

/* Two walls and nothing else stay at the standalone price. */
const wallsOnly = quoteDesign(null, { "wall-blush": 1, "wall-white": 1 }, "damac", false);
assert.strictEqual(wallsOnly.total, 675 + 675);

/* A wall added to any other piece is the add-on price. */
const wallAndChair = quoteDesign(null, { "wall-white": 1, "chair-adult": 1 }, "damac", false);
assert.strictEqual(wallAndChair.total, 550 + 15);

/* Wall packages credit the included wall and one table or the furniture. */
const corner = quoteDesign("pkg-photo", { "wall-white": 1, "table-adult": 1 }, "dubai", false);
assert.strictEqual(corner.total, 749 + 150);
assert.ok(corner.lines.some(line => line.kind === "included" && /White Rose/.test(line.label)));
assert.ok(!corner.lines.some(line => line.kind === "item" || line.kind === "addon"));
const cornerExtraTable = quoteDesign("pkg-photo", { "wall-white": 1, "table-adult": 2 }, "damac", false);
assert.strictEqual(cornerExtraTable.total, 749 + 75);
const cornerSecond = quoteDesign("pkg-photo", { "wall-white": 1, "wall-blush": 1, "table-adult": 1 }, "damac", true);
assert.strictEqual(cornerSecond.total, 749 + 550);
const essentialsWall = quoteDesign("pkg-essentials-wall", {
  "chair-adult": 16,
  "table-adult": 2,
  "wall-blush": 1,
}, "dubai", false);
assert.strictEqual(essentialsWall.total, 899 + 150);
const backdropExact = quoteDesign("pkg-kids-backdrop", {
  "table-kids": 2,
  "chair-kids": 8,
  "wall-blush": 1,
}, "damac", false);
assert.strictEqual(backdropExact.total, 749);
const backdropSecond = quoteDesign("pkg-kids-backdrop", {
  "table-kids": 2,
  "chair-kids": 8,
  "wall-blush": 1,
  "wall-white": 1,
}, "damac", true);
assert.strictEqual(backdropSecond.total, 749 + 550);

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
assert.ok(!page.includes("Each collection seats 16"));
assert.ok(!/includes delivery/i.test(page + main));
assert.ok(main.includes("extraWallUnit"));
assert.ok(main.includes("wallAddonPrice"));
const intro = HelloMayaRender.collectionIntro();
assert.match(intro, /The Photo Corner does not/);
assert.match(intro, /no chairs, décor or place settings/);
assert.ok(!/Each collection seats 16/.test(intro));
assert.match(intro, /each seat 16 adults/);
assert.ok(intro.includes("AED 550"));
assert.ok(intro.includes("AED 675"));
assert.ok(HelloMayaRender.wallAddonCopy().includes("AED 550"));
assert.ok(!HelloMayaRender.kidsIntro().includes("no bundle mark-up"));
assert.match(HelloMayaRender.kidsIntro(), /Little Backdrop/);
const flowerFaq = FAQ.find(entry => /flower wall/i.test(entry.q));
for (const name of ["The Photo Corner", "Essentials with Wall", "Styled with Wall", "The Grand", "Little Backdrop", "AED 550", "AED 675"]) {
  assert.ok(flowerFaq.a.includes(name), "flower FAQ missing " + name);
}
const packagesFaq = FAQ.find(entry => /party packages/i.test(entry.q));
assert.ok(packagesFaq.a.includes("The Photo Corner"));
assert.ok(packagesFaq.a.includes("does not") || packagesFaq.a.includes("No chairs") || packagesFaq.a.includes("no chairs"));
assert.ok(!/The Photo Corner \([^)]*\): [^.] *16 adult/.test(packagesFaq.a));
assert.ok(page.includes("data-delivery-copy"));
assert.ok(page.includes('id="terms"'));
assert.ok(page.includes('id="children"'));
assert.ok(main.includes("BUSINESS.deliveryRule"));
assert.ok(main.includes("designToExtras"));
assert.ok(/Check availability/.test(page));

console.log("pricing tests passed");
