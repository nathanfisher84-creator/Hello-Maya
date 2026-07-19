/* Build script for Vercel (or any static host).
   Copies the site into dist/. Any file not present locally (e.g. a direct
   file deploy that only shipped part of the code) is downloaded from the
   public GitHub repo at build time, so the final site serves everything
   from the host's own CDN. */
const fs = require("fs");
const path = require("path");

const OUT = "dist";
const REPO_RAW = "https://raw.githubusercontent.com/nathanfisher84-creator/Hello-Maya/claude/events-rental-customizer-xgo5np";

const FILES = [
  "index.html",
  "css/style.css",
  "js/data.js",
  "js/main.js",
  "js/visualizer.js",
  "assets/stickers/chair.svg",
  "assets/stickers/table.svg",
  "assets/img/wall-blush.jpg",
  "assets/img/wall-whiterose.jpg",
  "assets/img/setup-flowerwall-table.jpg",
  "assets/img/setup-blue-runner.jpg",
  "assets/img/setup-kids-pink.jpg",
  "assets/img/setup-kids-safari.jpg",
  "assets/stickers/wall-blush.jpg",
  "assets/stickers/wall-whiterose.jpg",
];

async function build() {
  fs.rmSync(OUT, { recursive: true, force: true });
  for (const rel of FILES) {
    const dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(rel)) {
      fs.copyFileSync(rel, dest);
    } else {
      const url = `${REPO_RAW}/${rel}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
      fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      console.log("downloaded", rel);
    }
  }
  console.log("Built to", OUT);
}

build().catch(e => { console.error(e); process.exit(1); });
