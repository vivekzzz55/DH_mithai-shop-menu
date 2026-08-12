<div align="center">

  <img src="src/logo-clean.png" alt="Dayal House Logo" width="120" />

  # 🍧 Dayal House — Digital Menu

  **A modern, lightning-fast digital price list & interactive menu for Dayal House Mithai Shop.**

  [![Live Demo](https://img.shields.io/badge/Live_Site-dh--mithai--shop--menu.vercel.app-E31825?style=for-the-badge&logo=vercel&logoColor=white)](https://dh-mithai-shop-menu.vercel.app)
  [![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge)](https://dh-mithai-shop-menu.vercel.app)
  [![Veg Status](https://img.shields.io/badge/Dietary-100%25_Pure_Veg-00875A?style=for-the-badge)](https://dh-mithai-shop-menu.vercel.app)
  [![Items Count](https://img.shields.io/badge/Menu_Items-600%2B_Products-FFAB00?style=for-the-badge)](#features)

  *Bantalab Road, Barnai, Jammu &middot; Contact: +91 95960 04999*

</div>

---

## 📌 Overview

**Dayal House Digital Menu** is an ultra-lightweight, high-performance web application designed for instant customer access in-store via QR code scanning or online browsing. 

Built with **zero external dependencies** (Vanilla HTML5, CSS3, and ES Modules), the site loads instantaneously, operates smoothly on all mobile devices, and provides a premium digital menu experience without requiring heavy frameworks or build toolchains.

---

## ✨ Key Features

- ⚡ **Instant Search:** Real-time client-side search across 600+ items, categories, sections, variants, and units.
- 📱 **Mobile-First & Responsive:** Crafted for seamless one-handed smartphone browsing.
- 🏷️ **6 Curated Categories:** Sweets/Mithai, Ice Cream, Cakes & Pastries, Frozen Favourites, Bakery & Snacks, and Assorted Gift Boxes.
- 📷 **In-App Dynamic QR Code Generator:** Generates high-res vector QR code with custom logo overlay for table tents and instant sharing.
- 📞 **Direct One-Tap Contact Bar:** Floating Call & WhatsApp buttons pre-loaded with shop query messages.
- ❄️ **Seasonal Item Badges:** Dynamic visual indicators for seasonal delicacies (e.g. Gajar Halwa).
- 🔀 **Smart Sorting:** Filter items by price (Low to High / High to Low) or alphabetically.
- 🔒 **Zero Third-Party CDN Calls:** 100% self-contained and offline-capable after initial load.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Markup** | HTML5 | Clean semantic layout structure |
| **Styling** | Vanilla CSS3 | Custom variables, glassmorphism, responsive grid & typography |
| **Application Logic** | JavaScript (ES6+) | Frameworkless state management & rendering pipeline |
| **Database** | JSON (`src/menu-data.json`) | Lightweight static menu schema for instant data retrieval |
| **QR Code Engine** | `src/qrcode.min.js` | Bundled standalone QR canvas generator |
| **Typography** | Google Fonts | *Playfair Display*, *Outfit*, *Plus Jakarta Sans* |
| **Automated Testing** | Playwright | Headless integration suite (`scripts/verify-site.mjs`) |
| **Hosting & CI/CD** | Vercel Edge Network | Instant automated deployment on push |

---

## 📂 Project Architecture

```
.
├── index.html              # Main application page shell
├── src/
│   ├── main.js             # Application controller (rendering, search, QR, contact actions)
│   ├── styles.css          # Design system, CSS variables, and layout styles
│   ├── menu-data.json      # Structured menu database (604 items)
│   ├── qrcode.min.js       # Bundled QR code generator engine
│   └── logo-clean.png      # Transparent shop brand asset
├── scripts/
│   └── verify-site.mjs     # Playwright automated test & visual regression script
└── artifacts/              # Automated verification screenshots
```

---

## 🚀 Quick Start (Local Development)

Because this project relies strictly on native browser web standards, **no build step or `npm install` is required**.

### Run Local HTTP Server

Serve the root directory using any static web server:

```bash
# Option 1: Python 3
python3 -m http.server 8791

# Option 2: Node.js static server
npx serve .
```

Open `http://localhost:8791` in your web browser.

---

## ⚙️ Configuration & Maintenance

### 1. Shop Contact Settings
Store phone numbers and action buttons are controlled at the top of [`src/main.js`](file:///Volumes/Crucial%20X6/Dev%20Projects/mithai%20shop%20online%20menu%20/src/main.js):

```js
const PHONE = "9596004999";       // Shop contact phone number (10 digits)
const CTA_MODE = "both";           // Options: "none" | "call" | "whatsapp" | "both"
const SHOW_VEG_BADGE = true;       // Toggle 100% Pure Veg badge visibility
```

### 2. Updating Menu Items & Prices
Modify [`src/menu-data.json`](file:///Volumes/Crucial%20X6/Dev%20Projects/mithai%20shop%20online%20menu%20/src/menu-data.json) directly:

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

* **Seasonal Badging:** Append `(seasonal)` to any item name (e.g. `"Gajar Halwa (seasonal)"`) to render the shimmering seasonal badge automatically.
* **Dual Pricing:** Supply `secondaryPrice` and `secondaryLabel` for products with two sizing options (e.g. per scoop vs per kg).

---

## 🧪 Automated Testing

Run the Playwright smoke test suite to verify search performance, sort logic, QR canvas rendering, contact links, and generate UI snapshot artifacts:

```bash
node scripts/verify-site.mjs
```

---

## 🌐 Deployment

The repository is linked to **Vercel** for automatic deployment whenever changes are pushed to the `main` branch.

```bash
# Manual production deploy command (optional)
vercel deploy --prod
```

---

<div align="center">

  **Dayal House Mithai Shop**  
  *Bantalab Road, Barnai, Jammu, J&K — 180018*  
  ☎️ **Call / WhatsApp:** +91 95960 04999

</div>
