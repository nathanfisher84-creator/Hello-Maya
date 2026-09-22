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
- Packages, flower wall showcase, services, gallery — all styled to the brand
  (blush pink / cream, elegant serif typography).
- Fully responsive (mobile-first booking + touch-friendly visualizer).
- 100 % static — no build step, no server. Works on GitHub Pages.

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
