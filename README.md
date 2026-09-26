# Hello Maya Events — Website

A modern single-page website for **Hello Maya Events** (Dubai) — flower wall,
table & chair rentals for birthdays, baby showers, brunches and kids' parties.

## Features

- **Availability enquiry** — visitors pick a package and/or individual items,
  choose their event date, start time and rental duration, and send a
  pre-filled WhatsApp message (+971 58 525 6044) with an estimated total. The
  message does not reserve the date: enquiry, then a confirmed quote, then a
  deposit, then booking confirmation. No payment is taken on the site.
- **Event visualizer** — visitors upload a photo of their own space (garden,
  majlis, venue) and drag flower walls, tables and chairs into it: move,
  resize, rotate, flip, duplicate and layer items, then download the design as
  an image or send the item counts straight into the booking form.
- Packages, flower wall showcase, services, FAQ — all styled to the brand
  (blush pink / cream, elegant serif typography).
- Fully responsive (mobile-first booking + touch-friendly visualizer).
- 100 % static. Opening `index.html` works; the build step only adds the
  SEO extras above.

## Editing prices & items

Everything editable lives in **`js/data.js`**:

- `PACKAGES` — adult collections and the children's collections. Adult test
  prices: Essentials 349, Styled 449, Signature 649, Grand 1,199. Children's
  prices are the kids' chair and table rates added together.
- `ITEMS` — à-la-carte items. Flower walls stay at AED 675. Chair and table
  unit prices are the rates the packages build on.
- `BUSINESS.deliveryRule` — the one delivery sentence used everywhere:
  free in Damac Hills 2, AED 150 elsewhere in Dubai, collection included.
- `SPACE` — dimension placeholders. Replace them when pieces are measured.
- `POLICY` — cancellation, deposit, damage and rescheduling terms.
- Quote math lives in `js/pricing.js` (package inclusions are not charged
  again). `npm test` covers the Grand flower-wall case.

## SEO and AI search

`npm run build` writes `dist/` and, from the same `js/data.js`:

- pre-renders packages, prices, FAQ and terms into `index.html`, so crawlers
  that do not run JavaScript (most AI assistants) see the full page;
- adds JSON-LD structured data (LocalBusiness with every price, FAQPage);
- generates `robots.txt` (search and AI crawlers allowed), `sitemap.xml`
  (with images) and `llms.txt` (a plain summary for AI assistants).

Change a price or FAQ answer in `js/data.js` and all of these update on the
next deploy. The canonical address is `https://www.hellomayaevents.com/`;
`hello-maya.vercel.app` redirects there.

## Running locally

Just open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

## Deploying on Vercel (recommended)

The repo is Vercel-ready (`vercel.json` + `build.js` are already configured):

1. Go to [vercel.com/new](https://vercel.com/new) and sign in.
2. Import the **Hello-Maya** GitHub repository.
3. Click **Deploy** — no settings needed.

Every push to the connected branch then auto-deploys. You can add a custom
domain (e.g. `hellomayaevents.com`) under Project → Settings → Domains.

## Deploying on GitHub Pages (alternative)

Repo Settings → Pages → deploy from branch → select the branch, root folder.
The site is fully static so it works out of the box.
