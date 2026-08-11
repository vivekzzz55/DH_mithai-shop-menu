# Dayal House — Digital Menu

A fast, static digital price list for **Dayal House Mithai Shop** (Bantalab Road, Barnai, Jammu). Built as a single-page app with no framework and no build step — just HTML, CSS, and vanilla JS.

**Live site:** https://dh-mithai-shop-menu.vercel.app

## Features

- **603 items** across 6 categories (Mithai, Ice Cream, Cakes and Pastries, Frozen, Bakery, Assorted Boxes), grouped into sections
- **Instant search** across item name, section, type, and variant
- **Sort** by price (low/high) or name
- **Category tabs** with live item counts
- **Seasonal badges** for items only available part of the year
- **Scannable QR code** (generated client-side, no external service) linking back to the page, with the shop logo overlaid
- **Call / WhatsApp** shortcuts pre-filled with the shop's number
- Fully responsive, print-friendly QR card, and works offline once loaded (no runtime CDN dependencies)

## Tech stack

Plain HTML/CSS/JS. No build tooling, no bundler, no framework.

| Concern       | Choice                                                              |
| ------------- | -------------------------------------------------------------------- |
| Markup        | `index.html`                                                        |
| Styling       | `src/styles.css` (CSS variables, no preprocessor)                   |
| Behavior      | `src/main.js` (ES module, no dependencies)                          |
| Data          | `src/menu-data.json` (static export of the current price list)      |
| QR generation | `src/qrcode.min.js` — [`qrcode`](https://www.npmjs.com/package/qrcode) bundled for the browser with esbuild, vendored so the page has zero third-party runtime calls |
| Fonts         | Google Fonts (Playfair Display, Outfit, Plus Jakarta Sans)          |

## Project structure

```
.
├── index.html              Page shell
├── src/
│   ├── styles.css          All styling
│   ├── main.js              App logic (render, search, sort, QR, contact links)
│   ├── menu-data.json       Menu data (brand, categories, items, prices)
│   ├── qrcode.min.js        Vendored QR code generator (browser build)
│   └── logo-clean.png       Shop logo (transparent background)
├── scripts/
│   └── verify-site.mjs      Playwright smoke test (see below)
└── artifacts/                Generated screenshots from the verify script (gitignored)
```

## Running locally

No dependencies to install — any static file server works:

```bash
python3 -m http.server 8791
```

Then open http://localhost:8791. (`.claude/launch.json` already wires this up if you're using the Claude Code browser preview.)

## Updating the menu

Edit `src/menu-data.json` directly. Each item has:

```json
{
  "id": "mithai-sweets-1",
  "source": "Mithai",
  "section": "Sweets",
  "name": "AAM Papad Delight",
  "type": "Sweets",
  "variant": "200 GM",
  "unit": "",
  "price": 170,
  "priceLabel": "MRP",
  "secondaryPrice": null,
  "secondaryLabel": ""
}
```

- Items sharing the same `section` within a category are grouped into one card.
- Wrap seasonal item names in `(seasonal)` (e.g. `"Gajar Halwa (seasonal)"`) to get the shimmering "Seasonal" badge — the suffix is stripped from the displayed name automatically.
- `secondaryPrice` / `secondaryLabel` are used for items sold by two units (e.g. ice cream priced per kg and per scoop).

## Updating shop contact info

`src/main.js` has three constants at the top:

```js
const PHONE = "9596004999";
const CTA_MODE = "both"; // "none" | "call" | "whatsapp" | "both"
const SHOW_VEG_BADGE = true;
```

Change these and the Call/WhatsApp buttons, footer phone display, and QR-code target all update automatically.

## Verifying changes

A Playwright smoke test spins up a local static server, exercises search/sort/category filters, checks the QR canvas actually renders, verifies the Call/WhatsApp links, and screenshots desktop + mobile layouts:

```bash
node scripts/verify-site.mjs
```

Screenshots are written to `artifacts/` (gitignored — regenerate as needed).

## Deployment

The `main` branch is connected to Vercel — every push deploys automatically. No build command is needed (it's a static site served as-is).

```bash
vercel deploy --prod   # manual deploy, if ever needed
```
