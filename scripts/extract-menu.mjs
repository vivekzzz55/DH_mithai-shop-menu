import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbookPath = "/Users/vivekviku84gmail.com/Downloads/menu dh mithai shop .xlsx";
const outputPath = new URL("../src/menu-data.json", import.meta.url);

const input = await FileBlob.load(workbookPath);
const workbook = await SpreadsheetFile.importXlsx(input);

function cleanText(value) {
  if (value == null) return "";
  return String(value)
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.)])/g, "$1")
    .trim();
}

function titleCase(value) {
  const small = new Set(["and", "or", "of", "per", "with", "no"]);
  return cleanText(value)
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      if (!word) return word;
      if (index > 0 && small.has(word)) return word;
      if (/^pcs\.?$/i.test(word)) return "Pcs.";
      if (/^pc$/i.test(word)) return "Pc";
      if (/^\d/.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .replace(/\bKg\b/g, "KG")
    .replace(/\bGm\b/g, "GM")
    .replace(/\bMl\b/g, "ml")
    .replace(/\bLtr\b/g, "Ltr")
    .replace(/\bPCS\b/g, "PCS")
    .replace(/\bFd\b/g, "FD")
    .replace(/\bAam\b/g, "AAM")
    .replace(/\bAnjeer\b/g, "Anjeer")
    .replace(/\bDayal'S\b/g, "Dayal's");
}

function parsePrice(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Math.round(value);
  const match = String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  return Math.round(Number(match[0]));
}

function cleanVariant(value) {
  const text = cleanText(value)
    .replace(/^! KG$/i, "1 KG")
    .replace(/\bPcs$/i, "Pcs.")
    .replace(/\bPc$/i, "Pc")
    .replace(/\bper pice\b/i, "per piece");
  return text ? titleCase(text) : "";
}

function addItem(items, source, section, name, options = {}) {
  const price = parsePrice(options.price);
  if (!name || price == null || price <= 0) return;

  const variant = cleanVariant(options.variant);
  const unit = cleanVariant(options.unit);
  const secondaryPrice = parsePrice(options.secondaryPrice);

  items.push({
    id: `${source}-${section}-${items.length + 1}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    source,
    section: titleCase(section),
    name: titleCase(name),
    type: options.type ? titleCase(options.type) : "",
    variant,
    unit,
    price,
    priceLabel: options.priceLabel || "MRP",
    secondaryPrice,
    secondaryLabel: options.secondaryLabel || "",
  });
}

function rowsFor(sheetName) {
  const sheet = workbook.worksheets.getItem(sheetName);
  return sheet.getUsedRange().values;
}

function parseIceCream() {
  const items = [];
  let section = "Ice Cream";
  let mode = "";

  for (const rawRow of rowsFor("ICE CREAM")) {
    const row = rawRow.map(cleanText);
    const compact = row.filter(Boolean);
    if (!compact.length) continue;

    const joined = compact.join(" ");
    if (/GALLON - Scoop/i.test(joined)) {
      section = "Gallon Scoops";
      mode = "";
      continue;
    }
    if (/GALLON FD/i.test(joined)) {
      section = "Gallon FD and Bottle";
      mode = "";
      continue;
    }
    if (/TUB - 1 Ltr/i.test(joined)) {
      section = "Tubs 1 Ltr";
      mode = "";
      continue;
    }
    if (/BRICK - 750ml/i.test(joined)) {
      section = "Bricks 750ml";
      mode = "";
      continue;
    }
    if (/110 ML CUPS/i.test(joined)) {
      section = "110 ml Cups";
      mode = "";
      continue;
    }
    if (/BOX - CONE - CANDY/i.test(joined)) {
      section = "Cones Bars and Candy";
      mode = "";
      continue;
    }
    if (/KULFI - 1x25 PCS/i.test(joined)) {
      section = "Kulfi Packs";
      mode = "";
      continue;
    }
    if (/NOVELTY/i.test(joined)) {
      section = "Novelty";
      mode = "novelty";
      continue;
    }
    if (/SUNDAES/i.test(joined)) {
      section = "Sundaes";
      mode = "sundae";
      continue;
    }
    if (/CONE/i.test(joined) && compact.length === 1) {
      section = "Cone Add-ons";
      mode = "cone";
      continue;
    }
    if (/SHAKES & BEVERAGES/i.test(joined)) {
      section = "Shakes and Beverages";
      mode = "shake";
      continue;
    }
    if (/^(S\.?No\.?|#|ITEMS|ITEM NAME|DAYAL HOUSE|Bantalab|Total Items|TOTAL \()/i.test(compact[0])) continue;
    if (/Cones ·|Stick Kulfi|product list/i.test(joined)) continue;

    if (mode === "novelty") {
      addItem(items, "Ice Cream", section, row[0], {
        variant: typeof rawRow[1] === "number" ? "Pack" : row[1],
        price: rawRow[1] ?? rawRow[2],
        secondaryPrice: rawRow[2],
        secondaryLabel: typeof rawRow[1] === "number" ? "per piece" : "",
      });
      continue;
    }
    if (mode === "sundae") {
      addItem(items, "Ice Cream", section, row[0], { variant: row[1], price: rawRow[3] });
      continue;
    }
    if (mode === "cone") {
      addItem(items, "Ice Cream", section, row[0], { variant: row[2], price: rawRow[1] });
      continue;
    }
    if (mode === "shake") {
      addItem(items, "Ice Cream", section, row[1], { unit: row[3], price: rawRow[2] });
      continue;
    }

    if (typeof rawRow[0] === "number" && row[1]) {
      addItem(items, "Ice Cream", section, row[1], {
        price: rawRow[2],
        priceLabel: /scoop/i.test(section) ? "per kg" : "MRP",
        secondaryPrice: rawRow[3],
        secondaryLabel: /scoop/i.test(section) ? "per scoop" : rawRow[3] != null ? "per piece" : "",
      });
    }
  }
  return items;
}

function parseSimpleSheet(sheetName, source, sectionSwitches = []) {
  const items = [];
  let section = source;
  let headerSeen = false;

  for (const rawRow of rowsFor(sheetName)) {
    const row = rawRow.map(cleanText);
    const compact = row.filter(Boolean);
    if (!compact.length) continue;

    const joined = compact.join(" ");
    const switchMatch = sectionSwitches.find(({ pattern }) => pattern.test(joined));
    if (switchMatch) {
      section = switchMatch.section;
      headerSeen = false;
      continue;
    }
    if (/Item Name/i.test(joined) && /MRP|Price/i.test(joined)) {
      headerSeen = true;
      continue;
    }
    if (!headerSeen) continue;
    if (/TOTAL|product list/i.test(joined)) continue;

    addItem(items, source, section, row[0], {
      variant: row[1],
      price: rawRow[2],
    });
  }
  return items;
}

function parseMithai() {
  const items = [];
  let currentName = "";
  let currentType = "";

  for (const rawRow of rowsFor("UPDATED MITHAI LIST").slice(1)) {
    const row = rawRow.map(cleanText);
    if (row[1]) currentName = row[1];
    if (row[2]) currentType = row[2];

    addItem(items, "Mithai", currentType || "Mithai", currentName, {
      type: currentType,
      variant: row[3],
      price: rawRow[4],
    });
  }
  return items;
}

function parseBakery() {
  const items = [];
  let section = "Bakery";
  let headerSeen = false;

  for (const rawRow of rowsFor("bakery")) {
    const row = rawRow.map(cleanText);
    const compact = row.filter(Boolean);
    if (!compact.length) continue;

    if (/^Group\s*:/i.test(row[1])) {
      section = row[1].replace(/^Group\s*:\s*/i, "");
      headerSeen = false;
      continue;
    }
    if (/^Name$/i.test(row[1]) && /Mrp/i.test(row[3])) {
      headerSeen = true;
      continue;
    }
    if (!headerSeen || !row[1] || /List of Items/i.test(row[1])) continue;

    addItem(items, "Bakery", section, row[1], {
      unit: row[2],
      price: rawRow[3],
    });
  }
  return items;
}

function parseAssortedBoxes() {
  const items = [];
  for (const rawRow of rowsFor("assorted sweets box").slice(1)) {
    const row = rawRow.map(cleanText);
    addItem(items, "Assorted Boxes", "Assorted Sweet Boxes", row[0], { price: rawRow[1] });
  }
  return items;
}

const categories = [
  { name: "Mithai", items: parseMithai() },
  {
    name: "Ice Cream",
    items: parseIceCream(),
  },
  {
    name: "Cakes and Pastries",
    items: parseSimpleSheet("CAKE AND PASTERIES", "Cakes and Pastries", [
      { pattern: /PASTRIES MENU/i, section: "Pastries" },
    ]).map((item) => ({
      ...item,
      section: item.section === "Cakes and Pastries" ? "Cakes" : item.section,
    })),
  },
  { name: "Frozen", items: parseSimpleSheet("frozen list", "Frozen") },
  { name: "Bakery", items: parseBakery() },
  { name: "Assorted Boxes", items: parseAssortedBoxes() },
];

const totalItems = categories.reduce((sum, category) => sum + category.items.length, 0);
const allPrices = categories.flatMap((category) => category.items.map((item) => item.price));

const data = {
  brand: "Dayal House Mithai Shop",
  location: "Bantalab Road Barnai, Jammu",
  sourceFile: workbookPath,
  updatedFor: "Price List 2026-27",
  totalItems,
  priceRange: {
    min: Math.min(...allPrices),
    max: Math.max(...allPrices),
  },
  categories,
};

await fs.mkdir(new URL("../src/", import.meta.url), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`);

console.log(`Extracted ${totalItems} items into ${outputPath.pathname}`);
for (const category of categories) {
  console.log(`${category.name}: ${category.items.length}`);
}
