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
- `SPACE` — measured sizes in centimetres for the flower walls and tables.
- `POLICY` — cancellation, deposit, damage and rescheduling terms.
- Quote math lives in `js/pricing.js` (package inclusions are not charged
  again). `npm test` covers the Grand flower-wall case.

## SEO and AI search

`npm run build` writes `dist/` and, from the same `js/data.js`:

- pre-renders packages, prices, FAQ and terms into `index.html`, so crawlers
  that do not run JavaScript (most AI assistants) see the full page;
- writes rental pages at `/flower-walls/`, `/chiavari-chairs/`, `/tables/`
  and `/kids-party-rentals/`;
- adds JSON-LD structured data (LocalBusiness, Product offers in AED, and a
  FAQPage on each page that matches the questions on that page);
- generates `robots.txt` (all crawlers allowed), `sitemap.xml` (every page,
  with lastmod) and `llms.txt` (a plain summary for AI assistants).

Change a price or FAQ answer in `js/data.js` and all of these update on the
next deploy. The canonical host is `https://www.hellomayaevents.com/`;
`hello-maya.vercel.app` redirects there.

Google Search Console steps are in `docs/SEARCH-CONSOLE.md`. The verification
meta tag in `index.html` stays commented out until you paste the token
Search Console gives you.

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

## Guest reviews

The home page has a review form. A submission is stored as **pending** and
is not shown on the site until you approve it. There are no sample reviews.

Storage is a **private** Vercel Blob store (one JSON file, `reviews/state.json`).
Pending reviews are not public blob URLs. The code uses `BLOB_STORE_ID` with
Vercel's short-lived OIDC token, or `BLOB_READ_WRITE_TOKEN` if you use a token
instead. Do not connect a public store.

On the Hobby plan, Blob is free within the included monthly allowance. On a
paid Vercel plan it is usage-priced. This site's file stays tiny. Upstash
Redis on the Vercel Marketplace did not offer a free plan for this team, so
that was not turned on.

### Approve or remove a review

1. In the Vercel project **hello-maya**, create a **private** Blob store and
   connect it to Production and Preview. That sets `BLOB_STORE_ID`. Redeploy.
2. Set `REVIEWS_ADMIN_PASSWORD` (at least 8 characters) as a sensitive
   environment variable for Production. Set it for Preview as well if you
   want to moderate preview deployments. Redeploy after saving it.
3. Open `/admin/reviews` on the site (for production,
   `https://www.hellomayaevents.com/admin/reviews`).
4. Enter the password. Waiting reviews have **Approve** and **Reject**.
   Approve publishes the review on the home page. Reject deletes it.
5. A review that is already public can be removed with **Remove**.
6. Sign out when you are done. The session cookie lasts 12 hours.

The form asks for a name, an optional event date, a rating from 1 to 5, and
the review. It also uses a hidden field, a limit of 3 submissions per hour
per IP address, and length checks. Those checks run on the server.

## Deploying on GitHub Pages (alternative)

Repo Settings → Pages → deploy from branch → select the branch, root folder.
The site is fully static so it works out of the box.
