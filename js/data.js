/* ─────────────────────────────────────────────────────────────
   Hello Maya Events — catalogue & business info
   Edit prices / items here; the site updates automatically.
   ───────────────────────────────────────────────────────────── */

const BUSINESS = {
  name: "Hello Maya Events",
  whatsapp: "971585256044",           // international format, no +
  instagram: "hellomaya_dxb",
  deliveryFeeDubai: 150,              // AED, outside Damac Hills 2
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

const PACKAGES = [
  {
    id: "pkg1", name: "Package 1", price: 299,
    tag: "Essentials",
    items: ["16 × white Chiavari chairs", "2 × rectangle tables with white covers"],
  },
  {
    id: "pkg2", name: "Package 2", price: 349,
    tag: "Styled",
    items: ["16 × white Chiavari chairs", "2 × rectangle tables with white covers", "Basic table decor"],
  },
  {
    id: "pkg3", name: "Package 3", price: 499,
    tag: "Most popular", featured: true,
    items: ["16 × white Chiavari chairs", "2 × rectangle tables with white covers", "Basic table decor",
            "Dinner & dessert plates", "Cutlery set", "Plastic wine cups", "Table napkins with rings"],
  },
  {
    id: "pkg4", name: "Package 4", price: 999,
    tag: "The full experience",
    items: ["16 × white Chiavari chairs", "2 × rectangle tables with white covers", "Basic table decor",
            "Dinner & dessert plates", "Cutlery set", "Plastic wine cups", "Table napkins with rings",
            "Flower wall backdrop"],
  },
];

/* Individual à-la-carte items.
   NOTE for owner: flower wall price (675) is from your flyer; the
   per-piece prices below are placeholders — change them to your real rates. */
const ITEMS = [
  { id: "wall-blush",  name: "Flower Wall — Blush Pink",        price: 675, unit: "wall",  max: 2,  vizKey: "wallBlush" },
  { id: "wall-white",  name: "Flower Wall — White Rose Garden", price: 675, unit: "wall",  max: 2,  vizKey: "wallWhite" },
  { id: "table-adult", name: "Rectangle table + white cover",   price: 75,  unit: "table", max: 20, vizKey: "table" },
  { id: "chair-adult", name: "White Chiavari chair (adult)",    price: 15,  unit: "chair", max: 100, vizKey: "chair" },
  { id: "table-kids",  name: "Kids' table + cover",             price: 55,  unit: "table", max: 20, vizKey: "kidsTable" },
  { id: "chair-kids",  name: "Kids' Chiavari chair",            price: 10,  unit: "chair", max: 100, vizKey: "kidsChair" },
];

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
