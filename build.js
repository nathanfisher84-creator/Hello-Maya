/* Build script for Vercel (or any static host). Writes the site to dist/.

   1. Copies the static files.
   2. Pre-renders everything main.js would fill in (packages, prices, terms,
      FAQ, delivery wording) into dist/index.html, using the same data.js and
      render.js the browser uses. Crawlers that do not run JavaScript, which
      includes most AI assistants, then see the full page.
   3. Adds JSON-LD structured data (LocalBusiness, offers, FAQ).
   4. Generates robots.txt, sitemap.xml and llms.txt. */
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
const { BUSINESS, ITEMS, PACKAGES, POLICY, FAQ, INSTAGRAM_PHOTOS, SPACE, R } = vm.runInContext(
  ["js/data.js", "js/render.js"].map(f => fs.readFileSync(f, "utf8")).join("\n;\n") +
    "\n;({ BUSINESS, ITEMS, PACKAGES, POLICY, FAQ, INSTAGRAM_PHOTOS, SPACE, R: HelloMayaRender })",
  sandbox
);
const SITE = BUSINESS.site;
const today = new Date().toISOString().slice(0, 10);

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

function structuredData() {
  const business = {
    "@type": "LocalBusiness",
    "@id": SITE + "#business",
    name: BUSINESS.name,
    description: "Flower wall, Chiavari chair and table rental with delivery, setup and collection for parties and events in Dubai.",
    url: SITE,
    logo: abs("logo-512.png"),
    image: INSTAGRAM_PHOTOS.map(p => abs(p.src)),
    telephone: "+" + BUSINESS.whatsapp,
    priceRange: `AED ${Math.min(...ITEMS.map(i => i.price))}–${Math.max(...PACKAGES.map(p => p.price)).toLocaleString("en-US")}`,
    currenciesAccepted: "AED",
    address: { "@type": "PostalAddress", addressLocality: "Dubai", addressRegion: "Dubai", addressCountry: "AE" },
    areaServed: [
      { "@type": "City", name: "Dubai" },
      { "@type": "Place", name: "Damac Hills 2, Dubai" },
    ],
    sameAs: [`https://www.instagram.com/${BUSINESS.instagram}/`],
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
  const website = {
    "@type": "WebSite",
    "@id": SITE + "#website",
    url: SITE,
    name: BUSINESS.name,
    inLanguage: "en-AE",
    publisher: { "@id": SITE + "#business" },
  };
  const faq = {
    "@type": "FAQPage",
    "@id": SITE + "#faq",
    mainEntity: FAQ.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: strip(f.a) },
    })),
  };
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": [business, website, faq] }, null, 1)
    .replace(/</g, "\\u003c");
  return `<script type="application/ld+json">\n${json}\n</script>`;
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

function sitemap() {
  const images = [
    "assets/img/setup-flowerwall-table.jpg",
    "assets/img/wall-blush.jpg",
    "assets/img/wall-whiterose.jpg",
    ...INSTAGRAM_PHOTOS.map(p => p.src),
  ].filter((src, i, all) => all.indexOf(src) === i);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${SITE}</loc>
    <lastmod>${today}</lastmod>
${images.map(src => `    <image:image><image:loc>${abs(src)}</image:loc></image:image>`).join("\n")}
  </url>
</urlset>
`;
}

function llms() {
  const pkgLine = p => `- ${p.name}: ${R.AED(p.price)} per event. ${p.items.map(i => strip(i).replace(/\.$/, "")).join("; ")}.`;
  return `# ${BUSINESS.name}

> ${BUSINESS.name} rents flower wall backdrops, white Chiavari chairs and dressed tables for parties and events in Dubai, UAE, with delivery, setup and collection included. Enquiries and bookings are by WhatsApp.

- Website: ${SITE}
- WhatsApp: ${BUSINESS.whatsappDisplay} (https://wa.me/${BUSINESS.whatsapp})
- Instagram: https://www.instagram.com/${BUSINESS.instagram}/
- Area served: Dubai, UAE. ${BUSINESS.deliveryRule}
- Rental time: ${BUSINESS.rentalNote}
- ${BUSINESS.vatNote}

## Flower walls

${ITEMS.filter(i => i.unit === "wall").map(i => `- ${i.name.replace("Flower Wall — ", "")}: ${R.AED(i.price)}. ${i.detail}`).join("\n")}

## Adult party collections (16 guests)

${PACKAGES.filter(p => !p.children).map(pkgLine).join("\n")}

## Children's collections

${PACKAGES.filter(p => p.children).map(pkgLine).join("\n")}

## Individual pieces

${ITEMS.filter(i => i.unit !== "wall").map(i => `- ${i.name}: ${R.AED(i.price)} per ${i.unit}.`).join("\n")}

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
fs.writeFileSync(path.join(OUT, "index.html"), html);
fs.writeFileSync(path.join(OUT, "robots.txt"), robots());
fs.writeFileSync(path.join(OUT, "sitemap.xml"), sitemap());
fs.writeFileSync(path.join(OUT, "llms.txt"), llms());
console.log("Built to", OUT);
