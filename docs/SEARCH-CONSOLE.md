# Google Search Console

Hello Maya Events is verified by you, in Search Console, with the HTML tag method. The site does not ship a token. `index.html` has a commented-out slot for the tag Google gives you.

Canonical host: `https://www.hellomayaevents.com/`

The live site already allows every crawler in `robots.txt` and publishes `https://www.hellomayaevents.com/sitemap.xml`.

## 1. Add the URL-prefix property

1. Open [Google Search Console](https://search.google.com/search-console).
2. Open the property dropdown (top left) and choose **Add property**.
3. Choose the **URL prefix** method. Do not choose Domain.
4. Enter this address exactly, including `https://` and the trailing slash:

   `https://www.hellomayaevents.com/`

5. Click **Continue**.

## 2. Verify with the HTML tag

1. On the verification screen, open **HTML tag**.
2. Google shows a tag like this:

   `<meta name="google-site-verification" content="the-token-google-shows-you">`

3. Copy only the token inside `content="..."`. It is a long string Google creates for this property. Do not invent a token, and do not reuse an example.
4. In this repo, open `index.html`.
5. In `<head>`, find the comment labelled **Google Search Console verification**.
6. Replace `PASTE_TOKEN_HERE` with the token from step 3.
7. Remove the HTML comment markers (`<!--` and `-->`) so the meta tag is live in `<head>`. Leave the other head tags as they are.
8. The live tag should be this shape, with your real token:

   `<meta name="google-site-verification" content="the-token-google-shows-you">`

9. Commit and push to `claude/events-rental-customizer-xgo5np`. Vercel project `hello-maya` deploys that branch to `https://www.hellomayaevents.com`.
10. Wait until the homepage source shows the live meta tag. View source on `https://www.hellomayaevents.com/` and search for `google-site-verification`.
11. Back in Search Console, click **Verify**.

If verification fails, the token in the live homepage source does not match the tag Google is showing. Paste it again and redeploy. Do not switch methods unless the HTML tag is really unavailable.

## 3. Submit the sitemap

1. In this property, open **Sitemaps**.
2. Under **Add a new sitemap**, enter:

   `sitemap.xml`

3. Click **Submit**.

Search Console reads that as `https://www.hellomayaevents.com/sitemap.xml`. The file lists every public URL with a `lastmod` date. `robots.txt` also points crawlers at that same sitemap.

## 4. Request indexing

Open **URL inspection**. Paste one URL, press Enter, then click **Request indexing**. Repeat for each of these:

- `https://www.hellomayaevents.com/`
- `https://www.hellomayaevents.com/flower-walls/`
- `https://www.hellomayaevents.com/chiavari-chairs/`
- `https://www.hellomayaevents.com/tables/`
- `https://www.hellomayaevents.com/kids-party-rentals/`

Request indexing after the sitemap is submitted, and after the verification tag is live. Indexing is a request, not a switch. Google decides when each URL appears.
