# Hello Maya Events — Website

A modern single-page website for **Hello Maya Events** (Dubai) — flower wall,
table & chair rentals for birthdays, baby showers, brunches and kids' parties.

## Features

- **Online booking** — visitors pick a package and/or individual items, choose
  their event date, start time and rental duration, and the request is sent
  straight to the business WhatsApp (056 977 3234) as a pre-filled message with
  an estimated total. No backend or payment processing needed.
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

- `PACKAGES` — the four packages and their prices (from the flyer).
- `ITEMS` — à-la-carte items. ⚠️ The flower wall price (AED 675) is from the
  flyer; **per-piece table/chair prices are placeholders** — update them to
  your real rates.
- `BUSINESS` — WhatsApp number, Instagram handle, Dubai delivery fee.

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
