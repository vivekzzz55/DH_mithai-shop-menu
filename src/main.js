const rupeeFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

const PHONE = "9596004999";
const CTA_MODE = "both"; // "none" | "call" | "whatsapp" | "both"
const SHOW_VEG_BADGE = true;

const categoryBlurbs = {
  Mithai: "Traditional Indian sweets — burfi, laddoo, bites and more, made fresh daily.",
  "Ice Cream": "Hand-scooped flavours, kulfi, sundaes, shakes and tubs.",
  "Cakes and Pastries": "Custom cakes and fresh pastries for every occasion.",
  Frozen: "Ready-to-cook momos, chutneys and frozen favourites.",
  Bakery: "Fresh bakes, namkeen, snacks, biscuits and pickles.",
  "Assorted Boxes": "Curated sweet boxes, ready to gift.",
};

const state = {
  data: null,
  error: null,
  activeCategory: "All",
  query: "",
  sort: "default",
};

const el = {
  editionBadge: document.querySelector("#edition-badge"),
  vegBadge: document.querySelector(".veg-badge"),
  tabs: document.querySelector("#category-tabs"),
  search: document.querySelector("#menu-search"),
  searchBox: document.querySelector("#search-box"),
  clearSearch: document.querySelector("#clear-search"),
  sortSelect: document.querySelector("#sort-select"),
  resultsLabel: document.querySelector("#results-label"),
  categoryBlurb: document.querySelector("#category-blurb"),
  feed: document.querySelector("#menu-feed"),
  qrBtn: document.querySelector("#qr-btn"),
  qrOverlay: document.querySelector("#qr-overlay"),
  qrCloseBtn: document.querySelector("#qr-close-btn"),
  qrCanvas: document.querySelector("#qr-canvas"),
  qrPrintBtn: document.querySelector("#qr-print-btn"),
  callBtn: document.querySelector("#call-btn"),
  whatsappBtn: document.querySelector("#whatsapp-btn"),
  ctaBar: document.querySelector("#cta-bar"),
  footerPhone: document.querySelector("#footer-phone"),
};

init();

async function init() {
  setupContact();
  if (!SHOW_VEG_BADGE) el.vegBadge.hidden = true;
  bindEvents();

  try {
    const response = await fetch("./src/menu-data.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.data = await response.json();
    onDataReady();
  } catch (err) {
    state.error = String(err);
    console.error("Error loading menu data:", err);
    renderMenu();
  }
}

function setupContact() {
  const digits = String(PHONE).replace(/\D/g, "");
  const withCountry = digits.length === 10 ? "91" + digits : digits;

  el.callBtn.href = "tel:+" + withCountry;
  el.whatsappBtn.href =
    "https://wa.me/" + withCountry + "?text=" + encodeURIComponent("Hi Dayal House! I'd like to ask about your menu.");

  el.footerPhone.textContent =
    withCountry.length === 12
      ? "+" + withCountry.slice(0, 2) + " " + withCountry.slice(2, 7) + " " + withCountry.slice(7)
      : PHONE;

  const showCall = CTA_MODE === "call" || CTA_MODE === "both";
  const showWhatsapp = CTA_MODE === "whatsapp" || CTA_MODE === "both";
  el.callBtn.hidden = !showCall;
  el.whatsappBtn.hidden = !showWhatsapp;
  el.ctaBar.hidden = !(showCall || showWhatsapp);
}

function onDataReady() {
  if (state.data.updatedFor) {
    el.editionBadge.textContent = state.data.updatedFor;
    el.editionBadge.hidden = false;
  }
  renderTabs();
  renderMenu();
}

function bindEvents() {
  el.search.addEventListener("input", (e) => {
    state.query = e.target.value;
    el.clearSearch.hidden = !state.query;
    renderMenu();
  });

  el.clearSearch.addEventListener("click", () => {
    el.search.value = "";
    state.query = "";
    el.clearSearch.hidden = true;
    el.search.focus();
    renderMenu();
  });

  el.sortSelect.addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderMenu();
  });

  el.qrBtn.addEventListener("click", () => {
    el.qrOverlay.hidden = false;
    drawQr();
  });

  el.qrCloseBtn.addEventListener("click", closeQr);
  el.qrOverlay.addEventListener("click", (e) => {
    if (e.target === el.qrOverlay) closeQr();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.qrOverlay.hidden) closeQr();
  });

  el.qrPrintBtn.addEventListener("click", () => window.print());
}

function closeQr() {
  el.qrOverlay.hidden = true;
}

function drawQr() {
  if (typeof QRCode === "undefined") return;
  QRCode.toCanvas(
    el.qrCanvas,
    window.location.href,
    { width: 220, margin: 1, errorCorrectionLevel: "H", color: { dark: "#14183C", light: "#FFFFFF" } },
    (err) => {
      if (err) return;
      const ctx = el.qrCanvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        const w = 64;
        const h = w * (img.height / img.width);
        const x = (el.qrCanvas.width - w) / 2;
        const y = (el.qrCanvas.height - h) / 2;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(x - 7, y - 7, w + 14, h + 14);
        ctx.drawImage(img, x, y, w, h);
      };
      img.src = "./src/logo-clean.png";
    },
  );
}

function renderTabs() {
  const tabs = [
    { name: "All", count: state.data.totalItems },
    ...state.data.categories.map((cat) => ({ name: cat.name, count: cat.items.length })),
  ];

  el.tabs.innerHTML = tabs
    .map(
      (tab) => `
        <button class="cat-pill ${tab.name === state.activeCategory ? "active" : ""}" type="button" data-category="${escapeHtml(tab.name)}">
          ${escapeHtml(tab.name)}
          <span>${tab.count}</span>
        </button>
      `,
    )
    .join("");

  el.tabs.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeCategory = btn.dataset.category;
      renderTabs();
      renderMenu();
    });
  });
}

function matchesQuery(item, q) {
  if (!q) return true;
  return [item.name, item.section, item.type, item.variant, item.unit]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function parseName(raw) {
  const seasonal = /\(\s*seasonal\s*\)/i.test(raw);
  return { clean: raw.replace(/\s*\(\s*seasonal\s*\)/i, "").trim(), seasonal };
}

function formatVariant(v) {
  if (!v) return "";
  const s = v.trim();
  const packMatch = s.match(/^(\d+)\s*[xX]\s*(\d+)\s*PCS?\.?$/);
  if (packMatch) return "Pack of " + packMatch[2];
  if (/^1?\s*(pcs?|piece)\.?$/i.test(s)) return "Per piece";
  if (/^pkt\.?$/i.test(s)) return "Packet";
  return s.replace(/(\d)\s*GM\b/gi, "$1 g").replace(/(\d)\s*KG\b/gi, "$1 kg");
}

function formatPrice(n) {
  return "₹" + rupeeFmt.format(n);
}

function getVisibleSections() {
  if (!state.data) return [];
  const q = state.query.trim().toLowerCase();
  const cats =
    state.activeCategory === "All"
      ? state.data.categories
      : state.data.categories.filter((c) => c.name === state.activeCategory);

  const sections = [];
  for (const cat of cats) {
    const map = new Map();
    for (const item of cat.items) {
      if (!matchesQuery(item, q)) continue;
      const key = cat.name + "||" + item.section;
      if (!map.has(key)) map.set(key, { category: cat.name, section: item.section, items: [] });
      map.get(key).items.push(item);
    }
    sections.push(...map.values());
  }

  if (state.sort !== "default") {
    for (const s of sections) {
      s.items = [...s.items].sort((a, b) => {
        if (state.sort === "price-asc") return a.price - b.price;
        if (state.sort === "price-desc") return b.price - a.price;
        if (state.sort === "name-asc") return a.name.localeCompare(b.name);
        return 0;
      });
    }
  }

  return sections;
}

function renderMenu() {
  if (state.error) {
    el.resultsLabel.textContent = "";
    el.categoryBlurb.hidden = true;
    el.feed.innerHTML = `<div class="empty-state"><p style="color:#E31825; font-style:normal;">Could not load the menu. Please refresh the page.</p></div>`;
    return;
  }

  if (!state.data) {
    el.resultsLabel.textContent = "";
    el.categoryBlurb.hidden = true;
    el.feed.innerHTML = `<div class="empty-state"><p>Loading menu&hellip;</p></div>`;
    return;
  }

  const sections = getVisibleSections();
  const visibleCount = sections.reduce((sum, s) => sum + s.items.length, 0);

  let label = visibleCount + (visibleCount === 1 ? " item" : " items");
  label += state.activeCategory !== "All" ? " in " + state.activeCategory : " across the full menu";
  if (state.query.trim()) label += ` · matching “${state.query.trim()}”`;
  el.resultsLabel.textContent = label;

  const blurb = state.activeCategory !== "All" ? categoryBlurbs[state.activeCategory] || "" : "";
  el.categoryBlurb.textContent = blurb;
  el.categoryBlurb.hidden = !blurb;

  if (!sections.length) {
    el.feed.innerHTML = `
      <div class="empty-state">
        <p>No items match your search.</p>
        <p>Try a different term or category.</p>
      </div>
    `;
    return;
  }

  el.feed.innerHTML = sections.map((s, si) => renderSection(s, si)).join("");
}

function renderSection(section, index) {
  const delay = Math.min(index * 0.06, 0.6);
  return `
    <article class="section-card" style="animation-delay:${delay}s">
      <div class="section-header">
        <div class="section-header-row">
          <h3 class="section-title">${escapeHtml(section.section)}</h3>
          <span class="section-count">${section.items.length}${section.items.length === 1 ? " item" : " items"}</span>
        </div>
        <div class="section-underline"></div>
      </div>
      <div>
        ${section.items.map(renderItem).join("")}
      </div>
    </article>
  `;
}

function renderItem(item) {
  const { clean, seasonal } = parseName(item.name);
  const variantText = formatVariant(item.variant);
  const metaBits = [variantText, item.priceLabel && item.priceLabel !== "MRP" ? item.priceLabel : ""].filter(Boolean);
  const metaText = metaBits.join(" · ");
  const subPriceText = item.secondaryPrice
    ? formatPrice(item.secondaryPrice) + (item.secondaryLabel ? " / " + item.secondaryLabel.replace(/^per\s+/i, "") : "")
    : "";

  return `
    <div class="item-row">
      <div class="item-info">
        <div class="item-name-row">
          <span class="item-name">${escapeHtml(clean)}</span>
          ${seasonal ? `<span class="seasonal-badge">Seasonal</span>` : ""}
        </div>
        ${metaText ? `<div class="item-meta">${escapeHtml(metaText)}</div>` : ""}
      </div>
      <div class="item-price-wrap">
        <div class="item-price">${formatPrice(item.price)}</div>
        ${subPriceText ? `<div class="item-subprice">${escapeHtml(subPriceText)}</div>` : ""}
      </div>
    </div>
  `;
}

function escapeHtml(val) {
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
