/* Build script for Vercel (or any static host). Writes the site to dist/.

   1. Copies the static files.
   2. Pre-renders everything main.js would fill in (packages, prices, terms,
      FAQ, delivery wording) into dist/index.html, using the same data.js and
      render.js the browser uses. Crawlers that do not run JavaScript, which
      includes most AI assistants, then see the full page.
   3. Writes rental pages with their own titles, FAQ and Product offers.
   4. Adds JSON-LD structured data (LocalBusiness, offers, FAQ).
   5. Generates robots.txt, sitemap.xml and llms.txt. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const OUT = "dist";
const COPY = [
  "index.html",
  "css",
  "js",
  "assets",
  "favicon.svg",
  "favicon-32.png",
  "apple-touch-icon.png",
  "logo-512.png",
];

/* ── load the same data the browser uses ── */
const sandbox = {};
vm.createContext(sandbox);
const { BUSINESS, ITEMS, PACKAGES, POLICY, FAQ, INSTAGRAM_PHOTOS, SPACE, KIDS_AGE_NOTE, R } = vm.runInContext(
  ["js/data.js", "js/render.js"].map(f => fs.readFileSync(f, "utf8")).join("\n;\n") +
    "\n;({ BUSINESS, ITEMS, PACKAGES, POLICY, FAQ, INSTAGRAM_PHOTOS, SPACE, KIDS_AGE_NOTE, R: HelloMayaRender })",
  sandbox
);
const SITE = BUSINESS.site;
const today = new Date().toISOString().slice(0, 10);
const FONT_HREF = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Jost:wght@300;400;500;600&display=swap";
const SAME_AS = "https://instagram.com/hellomaya_dxb";
const ALLOWED_PRICES = new Set([...ITEMS.map(i => i.price), ...PACKAGES.map(p => p.price)]);

/* ── pre-render ── */
function fillId(html, id, inner) {
  const re = new RegExp(`(<(\\w+)[^>]*\\bid="${id}"[^>]*>)(?:\\s*<!--[^]*?-->\\s*)?(</\\2>)`);
  if (!re.test(html)) throw new Error(`prerender: #${id} not found or not empty`);
  return html.replace(re, (_, open, _tag, close) => open + inner + close);
}
function fillAttr(html, attr, text) {
  const re = new RegExp(`(<(\\w+)[^>]*\\b${attr}\\b[^>]*>)(</\\2>)`, "g");
  return html.replace(re, (_, open, _tag, close) => open + text + close);
}

function prerender(html) {
  html = fillAttr(html, "data-delivery-copy", BUSINESS.deliveryRule);
  html = fillAttr(html, "data-rental-copy", BUSINESS.rentalNote);
  html = fillAttr(html, "data-vat-copy", BUSINESS.vatNote);
  html = fillAttr(html, "data-response-copy", BUSINESS.responseNote);
  html = fillId(html, "heroFromPrice", R.AED(R.adultFrom()));
  html = fillId(html, "wallSpace", SPACE.flowerWall);
  html = fillId(html, "packagesGrid", PACKAGES.filter(p => !p.children).map(R.packageCard).join(""));
  html = fillId(html, "kidsGrid", PACKAGES.filter(p => p.children).map(R.packageCard).join(""));
  html = fillId(html, "igTrack", R.igTiles());
  html = fillId(html, "faqList", R.faqMarkup());
  html = fillId(html, "termsBody", R.termsMarkup());
  html = fillId(html, "year", String(new Date().getFullYear()));
  return html;
}

/* ── structured data ── */
const abs = p => new URL(p, SITE).href;
const strip = s => s.replace(/<[^>]+>/g, "");
const esc = s => String(s)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

function itemById(id) {
  const item = ITEMS.find(i => i.id === id);
  if (!item) throw new Error("Missing item " + id);
  return item;
}
function pkgById(id) {
  const pkg = PACKAGES.find(p => p.id === id);
  if (!pkg) throw new Error("Missing package " + id);
  return pkg;
}

function priceRange() {
  const min = Math.min(...ITEMS.map(i => i.price), ...PACKAGES.map(p => p.price));
  const max = Math.max(...ITEMS.map(i => i.price), ...PACKAGES.map(p => p.price));
  return `AED ${min.toLocaleString("en-US")}–${max.toLocaleString("en-US")}`;
}

function businessNode() {
  return {
    "@type": "LocalBusiness",
    "@id": SITE + "#business",
    name: BUSINESS.name,
    description: "Flower wall, Chiavari chair and table rental with delivery, setup and collection for parties and events in Dubai.",
    url: SITE,
    logo: abs("logo-512.png"),
    image: INSTAGRAM_PHOTOS.map(p => abs(p.src)),
    telephone: "+" + BUSINESS.whatsapp,
    priceRange: priceRange(),
    currenciesAccepted: "AED",
    address: { "@type": "PostalAddress", addressLocality: "Dubai", addressRegion: "Dubai", addressCountry: "AE" },
    areaServed: [
      { "@type": "City", name: "Dubai" },
      { "@type": "Place", name: "Damac Hills 2, Dubai" },
    ],
    sameAs: [SAME_AS],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: "+" + BUSINESS.whatsapp,
      url: `https://wa.me/${BUSINESS.whatsapp}`,
      availableLanguage: ["English"],
      areaServed: "AE",
    },
    knowsAbout: ["Flower wall rental", "Chiavari chair rental", "Party table rental", "Kids party furniture rental", "Event styling"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Party rentals",
      itemListElement: [
        ...PACKAGES.map(p => ({
          "@type": "Offer",
          price: p.price,
          priceCurrency: "AED",
          availability: "https://schema.org/InStock",
          itemOffered: {
            "@type": "Service",
            name: `${p.name} collection`,
            description: p.items.map(strip).join("; "),
            areaServed: { "@type": "City", name: "Dubai" },
          },
        })),
        ...ITEMS.map(i => ({
          "@type": "Offer",
          price: i.price,
          priceCurrency: "AED",
          availability: "https://schema.org/InStock",
          itemOffered: { "@type": "Product", name: i.name, description: i.detail || i.spaceNote || i.name },
        })),
      ],
    },
  };
}

function faqNode(faqs, id) {
  return {
    "@type": "FAQPage",
    "@id": id,
    mainEntity: faqs.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: strip(f.a) },
    })),
  };
}

function offerNode(name, description, price, pageUrl, image, id) {
  if (!ALLOWED_PRICES.has(price)) throw new Error("Refusing price that is not on the site: " + price);
  return {
    "@type": "Product",
    "@id": id,
    name,
    description,
    image: abs(image),
    brand: { "@type": "Brand", name: BUSINESS.name },
    url: pageUrl,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: "AED",
      availability: "https://schema.org/InStock",
      url: pageUrl,
      areaServed: { "@type": "City", name: "Dubai" },
      seller: { "@id": SITE + "#business" },
    },
  };
}

function itemProduct(item, pageUrl, image) {
  return offerNode(
    item.name,
    [item.detail, item.spaceNote].filter(Boolean).join(" ") || item.name,
    item.price,
    pageUrl,
    image,
    `${SITE}#product-${item.id}`
  );
}

function packageProduct(pkg, pageUrl, image) {
  return offerNode(
    pkg.name,
    pkg.items.map(strip).join("; "),
    pkg.price,
    pageUrl,
    image,
    `${SITE}#product-${pkg.id}`
  );
}

function jsonLd(graph) {
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 1)
    .replace(/</g, "\\u003c");
  const parsed = JSON.parse(json);
  if (!parsed["@context"] || !Array.isArray(parsed["@graph"])) throw new Error("JSON-LD did not parse");
  return { html: `<script type="application/ld+json">\n${json}\n</script>`, data: parsed };
}

function structuredData() {
  const website = {
    "@type": "WebSite",
    "@id": SITE + "#website",
    url: SITE,
    name: BUSINESS.name,
    inLanguage: "en-AE",
    publisher: { "@id": SITE + "#business" },
  };
  return jsonLd([
    businessNode(),
    website,
    faqNode(FAQ, SITE + "#faq"),
  ]).html;
}

/* ── rental pages ── */
const IMG = {
  setup: { src: "/assets/img/setup-flowerwall-table.jpg", webp: "/assets/img/setup-flowerwall-table.webp", alt: "Blush flower wall behind a styled party table with white Chiavari chairs in Dubai", width: 372, height: 505 },
  blush: { src: "/assets/img/wall-blush.jpg", webp: "/assets/img/wall-blush.webp", alt: "Blush Pink flower wall backdrop for rent in Dubai", width: 372, height: 420 },
  white: { src: "/assets/img/wall-whiterose.jpg", webp: "/assets/img/wall-whiterose.webp", alt: "White Rose Garden flower wall with ivory roses and greenery", width: 384, height: 420 },
  blue: { src: "/assets/img/setup-blue-runner.jpg", webp: "/assets/img/setup-blue-runner.webp", alt: "Long table with a blue runner and white Chiavari chairs", width: 380, height: 570 },
  kidsPink: { src: "/assets/img/setup-kids-pink.jpg", webp: "/assets/img/setup-kids-pink.webp", alt: "Pink children's party table with kids' Chiavari chairs", width: 372, height: 488 },
  kidsSafari: { src: "/assets/img/setup-kids-safari.jpg", webp: "/assets/img/setup-kids-safari.webp", alt: "Safari-themed children's party table setup", width: 380, height: 488 },
};

function picture(img, lazy) {
  const extra = lazy ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"';
  return `<picture>
        <source srcset="${img.webp}" type="image/webp">
        <img src="${img.src}" alt="${esc(img.alt)}" width="${img.width}" height="${img.height}"${extra}>
      </picture>`;
}

function between(html, start, end) {
  const i = html.indexOf(start);
  const j = html.indexOf(end);
  if (i < 0 || j < 0 || j <= i) throw new Error("Missing marker " + start);
  return html.slice(i + start.length, j).trim();
}

function facts(rows) {
  return `<ul class="facts">${rows.map(([title, body]) => `<li><strong>${esc(title)}</strong>${esc(body)}</li>`).join("")}</ul>`;
}

function faqHtml(faqs) {
  return faqs.map(item => `
      <details class="faq__item">
        <summary><h3>${esc(item.q)}</h3></summary>
        <p>${esc(item.a)}</p>
      </details>`).join("");
}

const PAGE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/flower-walls/", label: "Flower walls" },
  { href: "/chiavari-chairs/", label: "Chiavari chairs" },
  { href: "/tables/", label: "Tables" },
  { href: "/kids-party-rentals/", label: "Kids' party rentals" },
  { href: "/#packages", label: "Packages" },
  { href: "/#book", label: "Check availability" },
];

function related(current) {
  return `<nav class="page-links" aria-label="More rentals">${PAGE_LINKS.map(link => {
    const here = link.href === current ? ' aria-current="page"' : "";
    return `<a href="${link.href}"${here}>${esc(link.label)}</a>`;
  }).join("")}</nav>`;
}

function rentalPages() {
  const blush = itemById("wall-blush");
  const white = itemById("wall-white");
  const adultChair = itemById("chair-adult");
  const kidsChair = itemById("chair-kids");
  const adultTable = itemById("table-adult");
  const kidsTable = itemById("table-kids");
  const grand = pkgById("pkg4");
  const essentials = pkgById("pkg1");
  const styled = pkgById("pkg2");
  const signature = pkgById("pkg3");
  const gathering = pkgById("pkg-kids-4");
  const celebration = pkgById("pkg-kids-8");
  const adultPackages = [essentials, styled, signature, grand];
  const book = "Check availability on this site. The form opens WhatsApp with your enquiry. We reply with a confirmed quote, and a 50% deposit holds the date. The balance is due on or before delivery.";

  const flowerFaqs = [
    {
      q: "How much does a flower wall cost to rent in Dubai?",
      a: `Our flower walls are ${R.AED(blush.price)} each for the event, with setup included. ${blush.name.replace("Flower Wall — ", "")} and ${white.name.replace("Flower Wall — ", "")} are the same price.`,
    },
    {
      q: "How big is the flower wall?",
      a: SPACE.flowerWall,
    },
    {
      q: "Does a package include a flower wall?",
      a: `${grand.name} is ${R.AED(grand.price)}. ${grand.notes[0]} The other wall is ${R.AED(blush.price)}.`,
    },
    {
      q: "Do you deliver the flower wall?",
      a: BUSINESS.deliveryRule + " " + BUSINESS.rentalNote,
    },
    {
      q: "How do I book a flower wall?",
      a: book,
    },
  ];

  const chairFaqs = [
    {
      q: "How much is an adult Chiavari chair?",
      a: `Adult white Chiavari chairs with a cushioned seat are ${R.AED(adultChair.price)} each.`,
    },
    {
      q: "Do children's Chiavari chairs have a cushion?",
      a: `No. Children's Chiavari chairs have no cushion. They are ${R.AED(kidsChair.price)} each.`,
    },
    {
      q: "How many chairs are in a package?",
      a: `Each adult collection includes 16 white Chiavari chairs with cushioned seats. ${gathering.name} includes 4 children's chairs for ${R.AED(gathering.price)}. ${celebration.name} includes 8 children's chairs for ${R.AED(celebration.price)}.`,
    },
    {
      q: "Do you deliver chairs in Dubai?",
      a: BUSINESS.deliveryRule + " " + BUSINESS.rentalNote,
    },
    {
      q: "How do I book chairs?",
      a: book,
    },
  ];

  const tableFaqs = [
    {
      q: "What size is the adult table?",
      a: `${SPACE.tableAdult} The price is ${R.AED(adultTable.price)} each.`,
    },
    {
      q: "What size is the children's table?",
      a: `${SPACE.tableKids} The price is ${R.AED(kidsTable.price)} each.`,
    },
    {
      q: "Which packages include tables?",
      a: adultPackages.map(p => `${p.name} is ${R.AED(p.price)} and includes 2 adult tables.`).join(" ") + ` ${gathering.name} includes 1 children's table. ${celebration.name} includes 2 children's tables.`,
    },
    {
      q: "Is tableware included?",
      a: `${signature.name} (${R.AED(signature.price)}) and ${grand.name} (${R.AED(grand.price)}) include dinner and dessert plates, cutlery, wine cups, and napkins with rings, for 16 chairs. ${essentials.name} is chairs and covered tables only.`,
    },
    {
      q: "How do I book tables?",
      a: book + " " + BUSINESS.deliveryRule,
    },
  ];

  const kidsFaqs = [
    {
      q: "How much is a kids' party rental?",
      a: `${gathering.name} is ${R.AED(gathering.price)} for ${gathering.summary}. ${celebration.name} is ${R.AED(celebration.price)} for ${celebration.summary}. Kids' chairs and tables are at their standard rates, with no bundle mark-up.`,
    },
    {
      q: "Do the children's chairs have cushions?",
      a: `No. Children's Chiavari chairs have no cushion. They are ${R.AED(kidsChair.price)} each. Adult white Chiavari chairs are the ones with a cushioned seat, at ${R.AED(adultChair.price)} each.`,
    },
    {
      q: "What size is the children's table and chair set?",
      a: SPACE.tableKids + " " + kidsChair.detail,
    },
    {
      q: "What ages are the children's chairs for?",
      a: KIDS_AGE_NOTE,
    },
    {
      q: "Do you deliver for kids' parties?",
      a: BUSINESS.deliveryRule + " " + BUSINESS.rentalNote,
    },
  ];

  return [
    {
      slug: "flower-walls",
      path: "/flower-walls/",
      title: "Flower Wall Rental in Dubai | Hello Maya Events",
      description: `Freestanding flower walls for parties in Dubai. 240 cm wide and 240 cm high. Blush Pink or White Rose Garden, ${R.AED(blush.price)}, set up for you.`,
      h1: "Flower wall rental in Dubai",
      eyebrow: "Flower wall rental · Dubai",
      image: IMG.setup,
      images: [IMG.setup, IMG.blush, IMG.white],
      faqs: flowerFaqs,
      products: [itemProduct(blush, abs("flower-walls/"), IMG.blush.webp), itemProduct(white, abs("flower-walls/"), IMG.white.webp)],
      main: `
        <p class="hero__sub">Freestanding artificial flower walls for birthdays, baby showers and photo corners. We bring the wall, set it up, and collect it after.</p>
        <div class="hero__actions">
          <a href="/#book" class="btn btn--solid">Check availability</a>
          <a href="/chiavari-chairs/" class="btn btn--ghost">See chairs</a>
        </div>`,
      body: `
        ${facts([
          ["Price", `${R.AED(blush.price)} per wall. Setup is included.`],
          ["Size", SPACE.flowerWall],
          ["Blush Pink", blush.detail],
          ["White Rose Garden", white.detail],
        ])}
        <div class="prose">
          <p>Each wall is ${R.AED(blush.price)} for the event. ${blush.detail} ${white.detail}</p>
          <p>${grand.name} is ${R.AED(grand.price)}. ${grand.summary}. ${grand.notes[0]}</p>
          <p>${BUSINESS.deliveryRule}</p>
          <p>${BUSINESS.rentalNote} ${BUSINESS.vatNote}</p>
          <p>People book a wall for birthdays, engagements, baby showers, bridal showers, christenings, cake tables, photo corners and corporate events.</p>
          <p>Pair a wall with <a href="/chiavari-chairs/">Chiavari chairs</a>, <a href="/tables/">tables</a> or <a href="/kids-party-rentals/">kids' party rentals</a>. Or go back <a href="/">home</a> and <a href="/#book">check availability</a>.</p>
        </div>
        <div class="walls">
          <figure class="wall">${picture(IMG.blush, true)}<figcaption><strong>Blush Pink</strong><span>${esc(blush.detail)} · ${esc(R.AED(blush.price))}</span></figcaption></figure>
          <figure class="wall">${picture(IMG.white, true)}<figcaption><strong>White Rose Garden</strong><span>${esc(white.detail)} · ${esc(R.AED(white.price))}</span></figcaption></figure>
        </div>
        ${related("/flower-walls/")}`,
    },
    {
      slug: "chiavari-chairs",
      path: "/chiavari-chairs/",
      title: "Chiavari Chair Rental in Dubai | Hello Maya Events",
      description: `Adult white Chiavari chairs with cushioned seats, ${R.AED(adultChair.price)} each. Children's Chiavari chairs are ${R.AED(kidsChair.price)} and have no cushion. Dubai party rental.`,
      h1: "Chiavari chair rental in Dubai",
      eyebrow: "Chiavari chairs · Dubai",
      image: IMG.blue,
      images: [IMG.blue],
      faqs: chairFaqs,
      products: [itemProduct(adultChair, abs("chiavari-chairs/"), IMG.blue.webp)],
      main: `
        <p class="hero__sub">White Chiavari chairs for parties at home or at your venue. Adult chairs have a cushioned seat. Children's chairs have no cushion.</p>
        <div class="hero__actions">
          <a href="/#book" class="btn btn--solid">Check availability</a>
          <a href="/tables/" class="btn btn--ghost">See tables</a>
        </div>`,
      body: `
        ${facts([
          ["Adult chair", `${R.AED(adultChair.price)} each. ${adultChair.detail}`],
          ["Children's chair", `${R.AED(kidsChair.price)} each. ${kidsChair.detail}`],
          ["In a collection", "Each adult collection includes 16 chairs with cushioned seats."],
          ["Rental time", BUSINESS.rentalNote],
        ])}
        <div class="prose">
          <p>${adultChair.detail} The price is ${R.AED(adultChair.price)} per chair.</p>
          <p>Children's Chiavari chairs are a smaller size. They have no cushion. The price is ${R.AED(kidsChair.price)} per chair. Sets for children are on the <a href="/kids-party-rentals/">kids' party rentals</a> page.</p>
          <p>${adultPackages.map(p => `${p.name} is ${R.AED(p.price)}. ${p.summary}.`).join(" ")}</p>
          <p>${BUSINESS.deliveryRule}</p>
          <p>${BUSINESS.vatNote}</p>
          <p>Add a <a href="/flower-walls/">flower wall</a> or <a href="/tables/">tables</a>, or <a href="/#book">check availability</a>. More packages are on the <a href="/">home page</a>.</p>
        </div>
        ${related("/chiavari-chairs/")}`,
    },
    {
      slug: "tables",
      path: "/tables/",
      title: "Party Table Rental in Dubai | Hello Maya Events",
      description: `Adult tables with a white cover, 180 x 75 cm and 75 cm high, ${R.AED(adultTable.price)}. Children's tables are 122 x 60 cm. Height adjustable to 50, 60 or 70 cm. ${R.AED(kidsTable.price)}.`,
      h1: "Table rental in Dubai",
      eyebrow: "Tables · Dubai",
      image: IMG.blue,
      images: [IMG.blue, IMG.setup],
      faqs: tableFaqs,
      products: [itemProduct(adultTable, abs("tables/"), IMG.blue.webp)],
      main: `
        <p class="hero__sub">Rectangle tables with white covers for adult parties, and a smaller children's table with an adjustable height.</p>
        <div class="hero__actions">
          <a href="/#book" class="btn btn--solid">Check availability</a>
          <a href="/chiavari-chairs/" class="btn btn--ghost">See chairs</a>
        </div>`,
      body: `
        ${facts([
          ["Adult table", `${SPACE.tableAdult} ${R.AED(adultTable.price)} each.`],
          ["Children's table", `${SPACE.tableKids} ${R.AED(kidsTable.price)} each.`],
          ["Collections", "The 16-chair collections use two adult tables."],
          ["Tableware", `${signature.name} and ${grand.name} add plates, cutlery, wine cups and napkins with rings.`],
        ])}
        <div class="prose">
          <p>${SPACE.tableAdult} It is ${R.AED(adultTable.price)} per table.</p>
          <p>${SPACE.tableKids} It is ${R.AED(kidsTable.price)} per table. Children's sets are on the <a href="/kids-party-rentals/">kids' party rentals</a> page.</p>
          <p>${styled.name} is ${R.AED(styled.price)} and adds table décor: runners, florals and finishing touches. ${signature.name} is ${R.AED(signature.price)}. ${grand.name} is ${R.AED(grand.price)}. Both add place settings for 16 chairs.</p>
          <p>${BUSINESS.deliveryRule}</p>
          <p>${BUSINESS.rentalNote} ${BUSINESS.vatNote}</p>
          <p>See <a href="/chiavari-chairs/">Chiavari chairs</a> and <a href="/flower-walls/">flower walls</a>, or <a href="/#book">check availability</a>.</p>
        </div>
        <div class="walls">
          <figure class="wall">${picture(IMG.setup, true)}<figcaption><strong>Styled table</strong><span>White cover, with chairs and a flower wall</span></figcaption></figure>
        </div>
        ${related("/tables/")}`,
    },
    {
      slug: "kids-party-rentals",
      path: "/kids-party-rentals/",
      title: "Kids' Party Rentals in Dubai | Hello Maya Events",
      description: `Kids' party rentals in Dubai. Children's Chiavari chairs have no cushion. ${gathering.name} is ${R.AED(gathering.price)} and seats 4. ${celebration.name} is ${R.AED(celebration.price)} and seats 8.`,
      h1: "Kids' party rentals in Dubai",
      eyebrow: "Kids' parties · Dubai",
      image: IMG.kidsPink,
      images: [IMG.kidsPink, IMG.kidsSafari],
      faqs: kidsFaqs,
      products: [
        itemProduct(kidsChair, abs("kids-party-rentals/"), IMG.kidsPink.webp),
        itemProduct(kidsTable, abs("kids-party-rentals/"), IMG.kidsPink.webp),
        packageProduct(gathering, abs("kids-party-rentals/"), IMG.kidsPink.webp),
        packageProduct(celebration, abs("kids-party-rentals/"), IMG.kidsSafari.webp),
      ],
      main: `
        <p class="hero__sub">Child-sized tables and Chiavari chairs for parties in Dubai. The children's chairs have no cushion. We deliver, set up and collect.</p>
        <div class="hero__actions">
          <a href="/#book" class="btn btn--solid">Check availability</a>
          <a href="/tables/" class="btn btn--ghost">Table sizes</a>
        </div>`,
      body: `
        ${facts([
          [gathering.name, `${R.AED(gathering.price)}. ${gathering.summary}.`],
          [celebration.name, `${R.AED(celebration.price)}. ${celebration.summary}.`],
          ["Children's chair", `${R.AED(kidsChair.price)} each. ${kidsChair.detail}`],
          ["Children's table", `${SPACE.tableKids} ${R.AED(kidsTable.price)} each.`],
        ])}
        <div class="prose">
          <p>Kids' chairs and tables are at their standard rates, with no bundle mark-up. ${gathering.name} is ${gathering.items.map(strip).join(", ")}. ${celebration.name} is ${celebration.items.map(strip).join(", ")}.</p>
          <p>${kidsChair.detail} Adult chairs, with a cushioned seat, are on the <a href="/chiavari-chairs/">Chiavari chairs</a> page.</p>
          <p>${KIDS_AGE_NOTE}</p>
          <p>${BUSINESS.deliveryRule}</p>
          <p>${BUSINESS.rentalNote} ${BUSINESS.vatNote}</p>
          <p>Add a <a href="/flower-walls/">flower wall</a> or adult <a href="/tables/">tables</a> if the grown-ups need a seat too. Then <a href="/#book">check availability</a>, or start from <a href="/">home</a>.</p>
        </div>
        <div class="walls">
          <figure class="wall">${picture(IMG.kidsSafari, true)}<figcaption><strong>Children's setup</strong><span>Smaller table and children's Chiavari chairs</span></figcaption></figure>
        </div>
        ${related("/kids-party-rentals/")}`,
    },
  ];
}

function pageDocument(page, sourceHtml) {
  let header = between(sourceHtml, "<!-- site-header:start -->", "<!-- site-header:end -->")
    .replace(/href="#/g, 'href="/#');
  let footer = between(sourceHtml, "<!-- site-footer:start -->", "<!-- site-footer:end -->")
    .replace(/href="#/g, 'href="/#');
  const here = `href="${page.path}"`;
  header = header.replaceAll(here, `${here} aria-current="page"`);
  footer = footer.replaceAll(here, `${here} aria-current="page"`);
  const url = abs(page.path);
  const graph = jsonLd([
    businessNode(),
    faqNode(page.faqs, url + "#faq"),
    ...page.products,
  ]);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#faf8f4">
<meta name="geo.region" content="AE-DU">
<meta name="geo.placename" content="Dubai">
<meta property="og:site_name" content="${esc(BUSINESS.name)}">
<meta property="og:locale" content="en_AE">
<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:image" content="${abs("assets/img/og-image.jpg")}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Hello Maya Events blush flower wall with a styled table and Chiavari chairs">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(page.title)}">
<meta name="twitter:description" content="${esc(page.description)}">
<meta name="twitter:image" content="${abs("assets/img/og-image.jpg")}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" as="image" href="${page.image.webp}" type="image/webp" fetchpriority="high">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT_HREF}" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="${FONT_HREF}"></noscript>
<link rel="stylesheet" href="/css/style.css">
${graph.html}
</head>
<body>
${header}
<main>
<section class="hero">
  <div class="hero__inner">
    <p class="hero__eyebrow">${esc(page.eyebrow)}</p>
    <h1>${esc(page.h1)}</h1>
    ${page.main}
  </div>
  <div class="hero__img">
    ${picture(page.image, false)}
  </div>
</section>
<section class="section">
  <p class="section__eyebrow">${esc(page.eyebrow)}</p>
  <h2 class="section__title">Sizes and prices</h2>
  ${page.body}
</section>
<section class="section section--tint" id="faq">
  <p class="section__eyebrow">Questions</p>
  <h2 class="section__title">Frequently asked questions</h2>
  <div class="faq">
    ${faqHtml(page.faqs)}
  </div>
</section>
</main>
${footer}
<script src="/js/nav.js" defer></script>
</body>
</html>
`;
}

/* ── robots.txt, sitemap.xml, llms.txt ── */
const AI_BOTS = [
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-SearchBot", "Claude-User",
  "PerplexityBot", "Perplexity-User",
  "Google-Extended", "Applebot", "Applebot-Extended",
  "Bingbot", "DuckAssistBot", "meta-externalagent", "CCBot",
];
function robots() {
  return [
    "# Search engines and AI assistants are welcome to read and cite this site.",
    "User-agent: *",
    "Allow: /",
    "",
    ...AI_BOTS.flatMap(bot => [`User-agent: ${bot}`, "Allow: /", ""]),
    `Sitemap: ${abs("sitemap.xml")}`,
    "",
  ].join("\n");
}

function sitemap(pages) {
  const homeImages = INSTAGRAM_PHOTOS.map(p => p.src).filter((src, i, all) => all.indexOf(src) === i);
  const urls = [
    { loc: SITE, images: homeImages },
    ...pages.map(page => ({
      loc: abs(page.path),
      images: page.images.map(img => img.webp),
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.map(url => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${today}</lastmod>
${url.images.map(src => `    <image:image><image:loc>${abs(src)}</image:loc></image:image>`).join("\n")}
  </url>`).join("\n")}
</urlset>
`;
}

function llms(pages) {
  const pkgLine = p => `- ${p.name}: ${R.AED(p.price)} per event. ${p.items.map(i => strip(i).replace(/\.$/, "")).join("; ")}.`;
  return `# ${BUSINESS.name}

> ${BUSINESS.name} rents flower wall backdrops, white Chiavari chairs and dressed tables for parties and events in Dubai, UAE, with delivery, setup and collection included. Enquiries and bookings are by WhatsApp.

- Website: ${SITE}
- WhatsApp: ${BUSINESS.whatsappDisplay} (https://wa.me/${BUSINESS.whatsapp})
- Instagram: ${SAME_AS}
- Area served: Dubai, UAE. ${BUSINESS.deliveryRule}
- Rental time: ${BUSINESS.rentalNote}
- ${BUSINESS.vatNote}

## Pages

${pages.map(page => `- ${page.h1}: ${abs(page.path)}`).join("\n")}

## Sizes

- Flower wall: ${SPACE.flowerWall}
- Adult table: ${SPACE.tableAdult}
- Children's table: ${SPACE.tableKids}
- Adult chair: ${itemById("chair-adult").detail}
- Children's chair: ${itemById("chair-kids").detail}

## Flower walls

${ITEMS.filter(i => i.unit === "wall").map(i => `- ${i.name.replace("Flower Wall — ", "")}: ${R.AED(i.price)}. ${i.detail} ${i.spaceNote}`).join("\n")}

## Adult party collections (16 guests)

${PACKAGES.filter(p => !p.children).map(pkgLine).join("\n")}

## Children's collections

${PACKAGES.filter(p => p.children).map(pkgLine).join("\n")}

## Individual pieces

${ITEMS.filter(i => i.unit !== "wall").map(i => `- ${i.name}: ${R.AED(i.price)} per ${i.unit}.${i.detail ? " " + i.detail : ""}${i.spaceNote ? " " + i.spaceNote : ""}`).join("\n")}

## How booking works

1. Send an enquiry from the availability form (${SITE}#book). It opens WhatsApp.
2. ${BUSINESS.name} replies with a confirmed quote. ${BUSINESS.responseNote}
3. A 50% deposit holds the date. The balance is due on or before delivery.
4. Booking confirmation follows once the deposit arrives.

## FAQ

${FAQ.map(f => `### ${f.q}\n\n${strip(f.a)}`).join("\n\n")}

## Rental terms

${POLICY.points.map(p => `- ${p.title}: ${p.body}`).join("\n")}
`;
}

function assertPage(html, page) {
  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) throw new Error(`${page.path} should have one H1, found ${h1s.length}`);
  const url = abs(page.path);
  if (!html.includes(`<link rel="canonical" href="${url}">`)) throw new Error("Bad canonical on " + page.path);
  if (!html.includes(`property="og:url" content="${url}"`)) throw new Error("Bad og:url on " + page.path);
  if (!html.includes(`<title>${esc(page.title)}</title>`)) throw new Error("Missing title on " + page.path);
  for (const link of PAGE_LINKS) {
    if (!html.includes(`href="${link.href}"`)) throw new Error(`${page.path} missing link ${link.href}`);
  }
  for (const faq of page.faqs) {
    if (!html.includes(esc(faq.q)) || !html.includes(esc(faq.a))) {
      throw new Error(`${page.path} FAQ is not visible: ${faq.q}`);
    }
  }
  assertJson(html, page.path, page.faqs);
  assertKidsLanguage(html, page.path);
  if (/Licensed/i.test(html)) throw new Error(page.path + " must not say Licensed");
}

function assertJson(html, label, faqs) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!blocks.length) throw new Error(label + " missing JSON-LD");
  for (const block of blocks) {
    const data = JSON.parse(block[1]);
    const graph = data["@graph"] || [data];
    const business = graph.find(node => node["@type"] === "LocalBusiness");
    if (label === SITE || label.startsWith("/")) {
      if (!business) throw new Error(label + " missing LocalBusiness");
      if (business.name !== BUSINESS.name) throw new Error("Bad business name");
      if (business.url !== SITE) throw new Error("Bad business url");
      if (business.telephone !== "+" + BUSINESS.whatsapp) throw new Error("Bad telephone");
      if (!JSON.stringify(business.areaServed).includes("Dubai")) throw new Error("areaServed must include Dubai");
      if (!business.sameAs.includes(SAME_AS)) throw new Error("Bad sameAs");
      if (!String(business.priceRange).startsWith("AED ")) throw new Error("Bad priceRange");
    }
    walkOffers(graph);
    if (faqs) {
      const faq = graph.find(node => node["@type"] === "FAQPage");
      if (!faq) throw new Error(label + " missing FAQPage");
      if (faq.mainEntity.length !== faqs.length) throw new Error(label + " FAQ count mismatch");
      faqs.forEach((item, index) => {
        if (faq.mainEntity[index].name !== item.q) throw new Error("FAQ question mismatch: " + item.q);
        if (faq.mainEntity[index].acceptedAnswer.text !== item.a) throw new Error("FAQ answer mismatch: " + item.q);
      });
      const products = graph.filter(node => node["@type"] === "Product");
      if (!products.length) throw new Error(label + " missing Product");
      for (const product of products) {
        if (!product.offers || product.offers.priceCurrency !== "AED") throw new Error("Product offer must be AED");
        if (typeof product.offers.price !== "number") throw new Error("Product price must be a number");
      }
    }
  }
}

function walkOffers(node) {
  if (!node || typeof node !== "object") return;
  if (node["@type"] === "Offer") {
    if (node.priceCurrency !== "AED") throw new Error("Offer is not AED");
    if (!ALLOWED_PRICES.has(node.price)) throw new Error("Offer price is not a site price: " + node.price);
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(walkOffers);
    else if (value && typeof value === "object") walkOffers(value);
  }
}

function assertKidsLanguage(html, label) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  const hit = text.match(/(?:child(?:ren)?(?:'s)?|kids?)(?:[^<.]{0,80})cushioned|cushioned(?:[^<.]{0,80})(?:child(?:ren)?(?:'s)?|kids?)/i);
  if (hit) throw new Error(label + " calls children's chairs cushioned: " + hit[0]);
}

function assertHome(html) {
  if (!html.includes('<link rel="canonical" href="https://www.hellomayaevents.com/">')) {
    throw new Error("Homepage canonical is wrong");
  }
  if (!html.includes('<meta name="google-site-verification" content="c_GFryfM8bx7_b9fe0jbGrCc37t-oktB08i5UzRjyy4" />')) {
    throw new Error("Homepage verification tag is missing");
  }
  for (const href of ["/flower-walls/", "/chiavari-chairs/", "/tables/", "/kids-party-rentals/"]) {
    if (!html.includes(`href="${href}"`)) throw new Error("Homepage missing link " + href);
  }
  assertJson(html, SITE, null);
  assertKidsLanguage(html, "home");
  const homeFaq = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const faq = homeFaq["@graph"].find(node => node["@type"] === "FAQPage");
  if (!faq || faq.mainEntity.length !== FAQ.length) throw new Error("Homepage FAQPage does not match FAQ");
  FAQ.forEach((item, index) => {
    if (faq.mainEntity[index].name !== item.q) throw new Error("Homepage FAQ mismatch");
    if (faq.mainEntity[index].acceptedAnswer.text !== strip(item.a)) throw new Error("Homepage FAQ answer mismatch");
  });
}

/* ── build ── */
fs.rmSync(OUT, { recursive: true, force: true });
for (const rel of COPY) {
  if (!fs.existsSync(rel)) throw new Error(`Missing file: ${rel}`);
  fs.cpSync(rel, path.join(OUT, rel), { recursive: true });
}
let html = fs.readFileSync("index.html", "utf8");
html = prerender(html);
if (!html.includes("<!-- structured-data -->")) throw new Error("structured-data marker missing from index.html");
html = html.replace("<!-- structured-data -->", structuredData());
assertHome(html);
fs.writeFileSync(path.join(OUT, "index.html"), html);

const pages = rentalPages();
const titles = new Set([html.match(/<title>([^<]*)<\/title>/)[1]]);
for (const page of pages) {
  if (titles.has(page.title)) throw new Error("Duplicate title: " + page.title);
  titles.add(page.title);
  const pageHtml = pageDocument(page, html);
  assertPage(pageHtml, page);
  fs.mkdirSync(path.join(OUT, page.slug), { recursive: true });
  fs.writeFileSync(path.join(OUT, page.slug, "index.html"), pageHtml);
}

const robotsTxt = robots();
const sitemapXml = sitemap(pages);
if (!robotsTxt.includes("User-agent: *\nAllow: /")) throw new Error("robots.txt must allow all");
if (!robotsTxt.includes("Sitemap: https://www.hellomayaevents.com/sitemap.xml")) {
  throw new Error("robots.txt sitemap URL is wrong");
}
for (const loc of [SITE, ...pages.map(page => abs(page.path))]) {
  if (!sitemapXml.includes(`<loc>${loc}</loc>`)) throw new Error("sitemap missing " + loc);
  if (!sitemapXml.includes("<lastmod>")) throw new Error("sitemap missing lastmod");
}
fs.writeFileSync(path.join(OUT, "robots.txt"), robotsTxt);
fs.writeFileSync(path.join(OUT, "sitemap.xml"), sitemapXml);
fs.writeFileSync(path.join(OUT, "llms.txt"), llms(pages));
console.log("Built to", OUT);
console.log(pages.map(page => abs(page.path)).join("\n"));
