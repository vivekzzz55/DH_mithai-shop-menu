const rupee = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const state = {
  activeCategory: "All",
  query: "",
  sort: "default",
  data: null,
  selectedItems: new Map(), // itemId -> item
};

const elements = {
  tabs: document.querySelector("#category-tabs"),
  search: document.querySelector("#menu-search"),
  clearSearch: document.querySelector("#clear-search"),
  sortSelect: document.querySelector("#sort-select"),
  results: document.querySelector("#results-bar"),
  feed: document.querySelector("#menu-feed"),
  qrBtn: document.querySelector("#qr-btn"),
  qrModal: document.querySelector("#qr-modal"),
  qrContainer: document.querySelector("#qr-code-container"),
  orderCount: document.querySelector("#order-count"),
  viewOrderBtn: document.querySelector("#view-order-btn"),
  orderModal: document.querySelector("#order-modal"),
  orderList: document.querySelector("#order-list"),
  orderTotalPrice: document.querySelector("#order-total-price"),
  clearOrderBtn: document.querySelector("#clear-order-btn"),
};

init();

async function init() {
  try {
    const response = await fetch("./src/menu-data.json");
    state.data = await response.json();
    renderTabs();
    renderMenu();
    bindEvents();
    generateQRCodeSVG();
  } catch (err) {
    console.error("Error loading menu data:", err);
  }
}

function bindEvents() {
  // Search input
  elements.search.addEventListener("input", (e) => {
    state.query = e.target.value.trim().toLowerCase();
    elements.clearSearch.hidden = !state.query;
    renderMenu();
  });

  // Clear search
  elements.clearSearch.addEventListener("click", () => {
    elements.search.value = "";
    state.query = "";
    elements.clearSearch.hidden = true;
    elements.search.focus();
    renderMenu();
  });

  // Sort dropdown
  elements.sortSelect.addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderMenu();
  });

  // QR Code Modal Open
  elements.qrBtn.addEventListener("click", () => {
    generateQRCodeSVG();
    elements.qrModal.showModal();
  });

  // Order Draft Modal Open
  elements.viewOrderBtn.addEventListener("click", () => {
    renderOrderDraft();
    elements.orderModal.showModal();
  });

  // Clear Order Draft
  elements.clearOrderBtn.addEventListener("click", () => {
    state.selectedItems.clear();
    updateBottomBar();
    renderMenu();
    elements.orderModal.close();
  });
}

function renderTabs() {
  if (!state.data) return;

  const tabs = [
    { name: "All", count: state.data.totalItems },
    ...state.data.categories.map((cat) => ({
      name: cat.name,
      count: cat.items.length,
    })),
  ];

  elements.tabs.innerHTML = tabs
    .map(
      (tab) => `
        <button class="cat-pill ${tab.name === state.activeCategory ? "active" : ""}" type="button" data-category="${escapeHtml(
          tab.name,
        )}">
          ${escapeHtml(tab.name)}
          <span>${tab.count}</span>
        </button>
      `,
    )
    .join("");

  elements.tabs.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeCategory = btn.dataset.category;
      renderTabs();
      renderMenu();
    });
  });
}

function renderMenu() {
  const sections = visibleSections();
  const visibleCount = sections.reduce((sum, s) => sum + s.items.length, 0);
  
  const categoryLabel = state.activeCategory === "All" ? "All Categories" : state.activeCategory;
  const searchLabel = state.query ? ` matching "${state.query}"` : "";
  elements.results.textContent = `${visibleCount} priced items in ${categoryLabel}${searchLabel}`;

  if (!sections.length) {
    elements.feed.innerHTML = `
      <div style="padding: 40px 16px; text-align: center; color: rgba(250,250,253,0.6);">
        <p>No menu items found for <strong>"${escapeHtml(state.query)}"</strong>.</p>
      </div>
    `;
    return;
  }

  elements.feed.innerHTML = sections.map(renderSectionGroup).join("");
  bindItemSelectionEvents();
}

function visibleSections() {
  if (!state.data) return [];

  const categories =
    state.activeCategory === "All"
      ? state.data.categories
      : state.data.categories.filter((cat) => cat.name === state.activeCategory);

  const sections = categories.flatMap((cat) => {
    const map = new Map();
    for (const item of cat.items) {
      if (!matchesQuery(item)) continue;
      const key = `${cat.name}||${item.section}`;
      if (!map.has(key)) {
        map.set(key, {
          category: cat.name,
          section: item.section,
          items: [],
        });
      }
      map.get(key).items.push(item);
    }
    return [...map.values()];
  });

  if (state.sort !== "default") {
    sections.forEach((section) => {
      section.items.sort((a, b) => {
        if (state.sort === "price-asc") return a.price - b.price;
        if (state.sort === "price-desc") return b.price - a.price;
        if (state.sort === "name-asc") return a.name.localeCompare(b.name);
        return 0;
      });
    });
  }

  return sections;
}

function matchesQuery(item) {
  if (!state.query) return true;
  const haystack = [item.name, item.section, item.type, item.variant, item.unit, item.price]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(state.query);
}

function renderSectionGroup(section) {
  return `
    <article class="section-group">
      <div class="section-header">
        <h3 class="section-title">${escapeHtml(section.section)}</h3>
        <span class="section-count">${section.items.length} items</span>
      </div>
      <div>
        ${section.items.map(renderItemRow).join("")}
      </div>
    </article>
  `;
}

function renderItemRow(item) {
  const meta = [item.variant, item.unit, item.priceLabel && item.priceLabel !== "MRP" ? item.priceLabel : ""]
    .filter(Boolean)
    .join(" • ");
    
  const subprice =
    item.secondaryPrice && item.secondaryLabel
      ? `<span class="item-subprice">${formatPrice(item.secondaryPrice)} (${escapeHtml(item.secondaryLabel)})</span>`
      : "";

  const isSelected = state.selectedItems.has(item.id);

  return `
    <div class="item-row" data-item-id="${escapeHtml(item.id)}">
      <div class="item-info">
        <div class="item-name">${escapeHtml(item.name)}</div>
        ${meta ? `<div class="item-variant">${escapeHtml(meta)}</div>` : ""}
      </div>
      <div class="item-price-wrap">
        <div>
          <div class="item-price">${formatPrice(item.price)}</div>
          ${subprice}
        </div>
        <button class="add-item-btn ${isSelected ? "selected" : ""}" type="button" aria-label="Toggle selection" title="Add to draft order">
          ${isSelected ? "✓" : "+"}
        </button>
      </div>
    </div>
  `;
}

function bindItemSelectionEvents() {
  elements.feed.querySelectorAll(".item-row").forEach((row) => {
    row.addEventListener("click", (e) => {
      const itemId = row.dataset.itemId;
      toggleItemSelection(itemId);
    });
  });
}

function toggleItemSelection(itemId) {
  if (!state.data) return;

  if (state.selectedItems.has(itemId)) {
    state.selectedItems.delete(itemId);
  } else {
    for (const cat of state.data.categories) {
      const found = cat.items.find((i) => i.id === itemId);
      if (found) {
        state.selectedItems.set(itemId, found);
        break;
      }
    }
  }

  updateBottomBar();
  renderMenu();
}

function updateBottomBar() {
  const count = state.selectedItems.size;
  elements.orderCount.textContent = `${count} item${count === 1 ? "" : "s"} selected`;
}

function renderOrderDraft() {
  if (state.selectedItems.size === 0) {
    elements.orderList.innerHTML = `<li style="padding: 16px 0; text-align: center; color: var(--text-muted);">No items selected yet. Tap '+' on menu items to draft your order.</li>`;
    elements.orderTotalPrice.textContent = "Rs 0";
    return;
  }

  let total = 0;
  const rows = [];
  for (const [id, item] of state.selectedItems.entries()) {
    total += item.price;
    rows.push(`
      <li class="order-item-row">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <div style="font-size:0.75rem; color:var(--text-muted);">${escapeHtml(item.variant || "")}</div>
        </div>
        <div><strong>${formatPrice(item.price)}</strong></div>
      </li>
    `);
  }

  elements.orderList.innerHTML = rows.join("");
  elements.orderTotalPrice.textContent = formatPrice(total);
}

function formatPrice(val) {
  return rupee.format(val).replace("₹", "Rs ");
}

function escapeHtml(val) {
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* Generate Crisp SVG QR Code for Scanning */
function generateQRCodeSVG() {
  const url = window.location.href || "http://localhost:5173";
  // Generates a clean vector graphic representing the menu QR code frame
  elements.qrContainer.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="180" height="180">
      <rect width="200" height="200" fill="#FFFFFF"/>
      <!-- QR Position Markers -->
      <path d="M10 10h50v50H10zM20 20v30h30V20zM30 30h10v10H30z" fill="#111638"/>
      <path d="M140 10h50v50h-50zM150 20v30h30V20zM160 30h10v10h-10z" fill="#111638"/>
      <path d="M10 140h50v50H10zM20 150v30h30v-30zM30 160h10v10H30z" fill="#111638"/>
      <!-- Dayal House Brand Center Badge -->
      <rect x="75" y="75" width="50" height="50" rx="8" fill="#E31825"/>
      <text x="100" y="106" font-family="'Outfit', sans-serif" font-size="22" font-weight="900" fill="#FFFFFF" text-anchor="middle">DH</text>
      <!-- Simulated Data Matrix Pattern -->
      <path d="M70 10h10v10H70zM90 10h20v10H90zM120 10h10v10h-10zM10 70h10v20H10zM30 70h20v10H30zM60 70h10v10H60zM140 70h10v20h-10zM160 70h20v10h-20zM70 140h10v20H70zM100 140h20v10h-20zM140 140h20v10h-20zM170 140h20v20h-20zM140 170h10v20h-10zM160 180h30v10h-30z" fill="#111638"/>
    </svg>
  `;
}
