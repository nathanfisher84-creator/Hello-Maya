/* ─────────────────────────────────────────────────────────────
   Hello Maya Events — catalogue, delivery rule, and site policy
   Edit prices, wording, children's packages, dimension
   placeholders, and rental terms here. The site reads this file.
   ───────────────────────────────────────────────────────────── */

const BUSINESS = {
  name: "Hello Maya Events",
  whatsapp: "971585256044",           // international format, no +
  whatsappDisplay: "+971 58 525 6044",
  instagram: "hellomaya_dxb",
  deliveryFeeDubai: 150,              // AED, outside Damac Hills 2
  /* One sentence, used everywhere a price is shown. Do not paraphrase
     on the page — the site copies this string into every delivery line. */
  deliveryRule: "Free delivery in Damac Hills 2. AED 150 elsewhere in Dubai. That fee covers one delivery and one collection, so collection is not charged again. We dismantle and collect at the end of the rental.",
  rentalNote: "Up to 8 hours of rental, starting once setup is complete.",
  vatNote: "Prices may exclude VAT — confirmed on your quote.",
  responseNote: "We usually reply within one business day, between 10:00 and 18:00 Gulf Standard Time. A message outside those hours is answered the next working day.",
};

/* Instagram carousel.
   To show LIVE embedded Instagram posts: open a post on instagram.com,
   copy its address (looks like https://www.instagram.com/p/ABC123xyz/)
   and paste it into INSTAGRAM_POSTS below. With one or more links there,
   the carousel switches from local photos to real Instagram embeds.
   Example:
     const INSTAGRAM_POSTS = [
       "https://www.instagram.com/p/ABC123xyz/",
       "https://www.instagram.com/p/DEF456uvw/",
     ]; */
const INSTAGRAM_POSTS = [];

/* Fallback tiles (used while INSTAGRAM_POSTS is empty) */
const INSTAGRAM_PHOTOS = [
  "assets/img/setup-flowerwall-table.jpg",
  "assets/img/wall-blush.jpg",
  "assets/img/setup-blue-runner.jpg",
  "assets/img/setup-kids-pink.jpg",
  "assets/img/wall-whiterose.jpg",
  "assets/img/setup-kids-safari.jpg",
];

/* Space notes are placeholders Nathan can edit. They are not measured
   centimetres. Replace the text once the pieces have been measured. */
const SPACE = {
  flowerWall: "Space note (placeholder — edit in js/data.js): allow clear floor for a freestanding backdrop. Exact width and height are confirmed on your quote.",
  tableAdult: "Space note (placeholder — edit in js/data.js): adult rectangle table with a white cover. Our 16-chair collections use two of these. Exact centimetres are confirmed on your quote.",
  tableKids: "Space note (placeholder — edit in js/data.js): smaller children's rectangle table with a cover. Exact size is confirmed on your quote.",
};

/* Individual à-la-carte items.
   Flower wall price stays AED 675. Chair and table unit prices stay as they
   are; children's packages below are the sum of these rates. */
const ITEMS = [
  {
    id: "wall-blush",
    name: "Flower Wall — Blush Pink",
    price: 675,
    unit: "wall",
    max: 1,
    vizKey: "wallBlush",
    spaceNote: SPACE.flowerWall,
    detail: "Dusty rose and mauve blooms. One Blush Pink wall is available.",
  },
  {
    id: "wall-white",
    name: "Flower Wall — White Rose Garden",
    price: 675,
    unit: "wall",
    max: 1,
    vizKey: "wallWhite",
    spaceNote: SPACE.flowerWall,
    detail: "Ivory roses with soft pink and greenery. One White Rose Garden wall is available.",
  },
  {
    id: "table-adult",
    name: "Rectangle table + white cover",
    price: 75,
    unit: "table",
    max: 20,
    vizKey: "table",
    spaceNote: SPACE.tableAdult,
  },
  {
    id: "chair-adult",
    name: "White Chiavari chair (adult)",
    price: 15,
    unit: "chair",
    max: 100,
    vizKey: "chair",
    detail: "Classic white Chiavari with a cushioned seat.",
  },
  {
    id: "table-kids",
    name: "Kids' table + cover",
    price: 55,
    unit: "table",
    max: 20,
    vizKey: "kidsTable",
    spaceNote: SPACE.tableKids,
  },
  {
    id: "chair-kids",
    name: "Kids' Chiavari chair",
    price: 10,
    unit: "chair",
    max: 100,
    vizKey: "kidsChair",
    detail: "Child-sized white Chiavari with a cushioned seat.",
  },
];

function priceFromIncludes(includes) {
  return Object.entries(includes).reduce((sum, [id, qty]) => {
    const item = ITEMS.find(i => i.id === id);
    if (!item) throw new Error("Unknown item in package: " + id);
    return sum + item.price * qty;
  }, 0);
}

const LITTLE_GATHERING_INCLUDES = { "table-kids": 1, "chair-kids": 4 };
const LITTLE_CELEBRATION_INCLUDES = { "table-kids": 2, "chair-kids": 8 };

/* Shared furniture inside every adult collection. Décor and tableware are
   described in the card copy; they are not separate catalogue items. */
const ADULT_FURNITURE = { "chair-adult": 16, "table-adult": 2 };

const KIDS_AGE_NOTE = "Age suitability (placeholder — edit in js/data.js): child-sized Chiavari chairs and a lower table. Tell us the children's ages when you enquire and we will confirm the fit before you pay a deposit.";

const TABLE_DECOR = "Table décor for both tables: runners, florals and finishing touches, curated to your palette and theme.";
const TABLE_DECOR_NOTE = "Décor is the runners, florals and finishing touches from our styling service. It is not a separate product list. Share a palette or theme (for example blush or ivory) and we confirm what we can match on the quote.";
const PLACE_SETTINGS = "Dinner and dessert plates, cutlery, wine cups, and napkins with rings, set for this collection's 16 chairs.";
const PLACE_SETTINGS_NOTE = "Place settings follow the 16 chairs already in the collection. Need more covers, or a different mix? Ask in the enquiry and we will quote them. Materials are the plates, cutlery, cups and ringed napkins we already style with — exact pieces are confirmed on the quote.";

const PACKAGES = [
  {
    id: "pkg1",
    name: "The Essentials",
    price: 349,
    includes: { ...ADULT_FURNITURE },
    summary: "16 adult chairs · 2 covered tables",
    items: [
      "16 × white Chiavari chairs with cushioned seats",
      "2 × adult rectangle tables with crisp white covers",
    ],
    notes: [SPACE.tableAdult],
  },
  {
    id: "pkg2",
    name: "The Styled",
    price: 449,
    includes: { ...ADULT_FURNITURE },
    summary: "Essentials, plus table décor for both tables",
    items: [
      "16 × white Chiavari chairs with cushioned seats",
      "2 × adult rectangle tables with crisp white covers",
      TABLE_DECOR,
    ],
    notes: [TABLE_DECOR_NOTE, SPACE.tableAdult],
  },
  {
    id: "pkg3",
    name: "The Signature",
    price: 649,
    tag: "Most requested",
    featured: true,
    includes: { ...ADULT_FURNITURE },
    summary: "Styled, plus plates, cutlery, wine cups and napkins",
    items: [
      "16 × white Chiavari chairs with cushioned seats",
      "2 × adult rectangle tables with crisp white covers",
      TABLE_DECOR,
      PLACE_SETTINGS,
    ],
    notes: [TABLE_DECOR_NOTE, PLACE_SETTINGS_NOTE, SPACE.tableAdult],
  },
  {
    id: "pkg4",
    name: "The Grand",
    price: 1199,
    tag: "With flower wall",
    includes: { ...ADULT_FURNITURE, "flower-wall": 1 },
    summary: "Signature, plus one flower wall (you choose the colour)",
    items: [
      "16 × white Chiavari chairs with cushioned seats",
      "2 × adult rectangle tables with crisp white covers",
      TABLE_DECOR,
      PLACE_SETTINGS,
      "One flower wall — Blush Pink or White Rose Garden",
    ],
    notes: [
      "The wall included here is one backdrop, in the colour you choose. A second wall is not included. If you want both colours, we ask before adding the other at the standalone wall price.",
      TABLE_DECOR_NOTE,
      PLACE_SETTINGS_NOTE,
      SPACE.flowerWall,
      SPACE.tableAdult,
    ],
  },
  {
    id: "pkg-kids-4",
    name: "Little Gathering",
    children: true,
    tag: "Children",
    price: priceFromIncludes(LITTLE_GATHERING_INCLUDES),
    includes: { ...LITTLE_GATHERING_INCLUDES },
    seats: 4,
    ageNote: KIDS_AGE_NOTE,
    summary: "1 children's table · 4 children's chairs · seats 4",
    items: [
      "1 × children's table with cover",
      "4 × children's Chiavari chairs with cushioned seats",
      "Seats 4 children (one chair each — edit the chair count in js/data.js if the table should be set differently)",
    ],
    notes: [KIDS_AGE_NOTE, SPACE.tableKids],
  },
  {
    id: "pkg-kids-8",
    name: "Little Celebration",
    children: true,
    tag: "Children",
    price: priceFromIncludes(LITTLE_CELEBRATION_INCLUDES),
    includes: { ...LITTLE_CELEBRATION_INCLUDES },
    seats: 8,
    ageNote: KIDS_AGE_NOTE,
    summary: "2 children's tables · 8 children's chairs · seats 8",
    items: [
      "2 × children's tables with covers",
      "8 × children's Chiavari chairs with cushioned seats",
      "Seats 8 children (one chair each — edit the chair count in js/data.js if the tables should be set differently)",
    ],
    notes: [
      KIDS_AGE_NOTE,
      SPACE.tableKids,
      "Priced as our children's chair and table rates added together, with the same delivery rule as every other collection.",
    ],
  },
];

/* Site policy Nathan can edit. Working defaults for a small Dubai rental,
   not legal advice. Shown before an enquiry is sent. */
const POLICY = {
  heading: "Rental terms",
  editableNote: "Site policy — edit this text in js/data.js. These are working defaults for a small Dubai rental business, not legal advice.",
  points: [
    {
      title: "How a date is held",
      body: "Checking availability is an enquiry. It does not reserve the date. We hold the date only after we send a confirmed quote and we receive the deposit.",
    },
    {
      title: "Deposit",
      body: "A 50% deposit of the confirmed quote holds the date and the pieces. The balance is due on or before delivery. Until the deposit arrives, the date stays open to other enquiries.",
    },
    {
      title: "Cancellation",
      body: "Cancel 7 or more days before the event and the deposit is refunded in full. Cancel within 7 days and the deposit is retained for the date we held. Cancel within 48 hours of the event, or on the day, and the confirmed quote is payable if we cannot rebook the same pieces.",
    },
    {
      title: "Rescheduling",
      body: "You may move the event once, with at least 7 days' notice, at no extra charge, if we have the date free. A change with less notice is treated as a cancellation, and the new date is a new booking.",
    },
    {
      title: "Damage and loss",
      body: "Pieces arrive clean and in good condition. Ordinary use is included. Breakages, stains we cannot remove, or anything missing at collection are charged at replacement cost, which we confirm with you. Please point out damage when we collect.",
    },
    {
      title: "Delivery, rental time and collection",
      body: BUSINESS.deliveryRule + " " + BUSINESS.rentalNote + " We agree the collection time when the booking is confirmed.",
    },
    {
      title: "Prices and VAT",
      body: BUSINESS.vatNote + " The estimate in the enquiry form is not the final invoice.",
    },
  ],
};

/* Visualizer sticker definitions.
   width = default width as a fraction of canvas width. */
const VIZ_STICKERS = [
  { key: "wallBlush", label: "Blush Pink wall",  src: "assets/stickers/wall-blush.jpg",     width: 0.42, itemId: "wall-blush" },
  { key: "wallWhite", label: "White Rose wall",  src: "assets/stickers/wall-whiterose.jpg", width: 0.42, itemId: "wall-white" },
  { key: "table",     label: "Table",            src: "assets/stickers/table.svg",          width: 0.30, itemId: "table-adult" },
  { key: "chair",     label: "Chiavari chair",   src: "assets/stickers/chair.svg",          width: 0.10, itemId: "chair-adult" },
  { key: "kidsTable", label: "Kids' table",      src: "assets/stickers/table.svg",          width: 0.22, itemId: "table-kids" },
  { key: "kidsChair", label: "Kids' chair",      src: "assets/stickers/chair.svg",          width: 0.075, itemId: "chair-kids" },
];
