import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const screenshotDir = path.join(root, "artifacts");
await fs.mkdir(screenshotDir, { recursive: true });

const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.join(root, urlPath === "/" ? "/index.html" : urlPath);
  try {
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}`;

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForSelector(".item-row");

  const menuData = JSON.parse(await fs.readFile(path.join(root, "src/menu-data.json"), "utf8"));
  const expectedTotal = menuData.totalItems;

  const total = await page.locator(".item-row").count();
  if (total <= 0) throw new Error("no menu items rendered");

  const totalLabel = await page.locator("#results-label").innerText();
  if (!new RegExp(`${expectedTotal}\\s+items`, "i").test(totalLabel)) {
    throw new Error(`expected ${expectedTotal} items in results label, got "${totalLabel}"`);
  }

  await page.fill("#menu-search", "kulfi");
  await page.waitForTimeout(200);
  const filtered = await page.locator(".item-row").count();
  if (filtered <= 0) throw new Error("kulfi search returned no items");
  if (filtered >= total) throw new Error("kulfi search did not reduce visible items");

  await page.click("#clear-search");
  await page.waitForTimeout(200);

  await page.click('.cat-pill[data-category="Mithai"]');
  await page.waitForTimeout(200);
  const mithaiCount = await page.locator(".item-row").count();
  if (mithaiCount <= 0 || mithaiCount >= total) throw new Error("Mithai category filter did not work as expected");

  const sweetsHeading = await page.locator(".section-title", { hasText: "Sweets" }).count();
  if (sweetsHeading <= 0) throw new Error('expected a "Sweets" section (renamed from "Other Sweets")');
  const oldHeading = await page.locator(".section-title", { hasText: "Other Sweets" }).count();
  if (oldHeading > 0) throw new Error('found stale "Other Sweets" section title');

  await page.click('.cat-pill[data-category="All"]');
  await page.waitForTimeout(200);

  await page.click("#qr-btn");
  await page.waitForSelector("#qr-overlay:not([hidden])");
  await page.waitForTimeout(200);
  const canvasPixels = await page.evaluate(() => {
    const canvas = document.querySelector("#qr-canvas");
    const ctx = canvas.getContext("2d");
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let dark = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] < 128) dark += 1;
    }
    return { width: canvas.width, height: canvas.height, dark };
  });
  if (canvasPixels.width <= 0 || canvasPixels.height <= 0) {
    throw new Error(`QR canvas has no size: ${JSON.stringify(canvasPixels)}`);
  }
  if (canvasPixels.dark <= 100) {
    throw new Error(`QR canvas appears blank: ${JSON.stringify(canvasPixels)}`);
  }
  await page.click("#qr-close-btn");

  const telHref = await page.getAttribute("#call-btn", "href");
  if (!telHref || !telHref.startsWith("tel:+91")) throw new Error(`unexpected Call href: ${telHref}`);
  const waHref = await page.getAttribute("#whatsapp-btn", "href");
  if (!waHref || !waHref.startsWith("https://wa.me/91")) throw new Error(`unexpected WhatsApp href: ${waHref}`);

  await page.screenshot({ path: path.join(screenshotDir, "site-desktop.png"), fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 900 }, isMobile: true });
  await mobile.goto(baseUrl, { waitUntil: "networkidle" });
  await mobile.waitForSelector(".item-row");
  const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  if (mobileOverflow) throw new Error("mobile layout has horizontal overflow");
  await mobile.screenshot({ path: path.join(screenshotDir, "site-mobile.png"), fullPage: true });
  await mobile.close();

  if (consoleErrors.length) {
    throw new Error(`console errors detected:\n${consoleErrors.join("\n")}`);
  }

  console.log(
    `Verified ${total} items, "Sweets" rename, category filter (${mithaiCount} Mithai items), search filter (${filtered} kulfi matches), QR canvas, contact links, and mobile layout — no console errors.`,
  );
} finally {
  await browser.close();
  server.close();
}
