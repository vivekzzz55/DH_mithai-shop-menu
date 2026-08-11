import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const screenshotDir = path.resolve("artifacts");
await fs.mkdir(screenshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await page.waitForSelector(".menu-item");

  const total = await page.locator(".menu-item").count();
  if (total !== 603) throw new Error(`expected 603 rendered menu items, got ${total}`);

  await page.fill("#menu-search", "kulfi");
  await page.waitForTimeout(250);
  const filtered = await page.locator(".menu-item").count();
  if (filtered <= 0) throw new Error("kulfi search returned no items");
  if (filtered >= total) throw new Error("kulfi search did not reduce visible items");

  await page.fill("#menu-search", "");
  await page.waitForTimeout(250);

  const canvasPixels = await page.evaluate(() => {
    const canvas = document.querySelector("#sweet-scene");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (gl) {
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let colored = 0;
      for (let index = 0; index < pixels.length; index += 16) {
        if (pixels[index] || pixels[index + 1] || pixels[index + 2] || pixels[index + 3]) colored += 1;
      }
      return { width: canvas.width, height: canvas.height, colored, mode: "webgl" };
    }

    const context = canvas.getContext("2d", { willReadFrequently: true });
    const width = Math.min(canvas.width, 260);
    const height = Math.min(canvas.height, 180);
    const pixels = context.getImageData(0, 0, width, height).data;
    let colored = 0;
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] > 0) colored += 1;
    }
    return { width: canvas.width, height: canvas.height, colored, mode: "2d" };
  });

  if (canvasPixels.width <= 0 || canvasPixels.height <= 0) {
    throw new Error(`canvas has no size: ${JSON.stringify(canvasPixels)}`);
  }
  if (canvasPixels.colored <= 100) {
    throw new Error(`canvas appears blank: ${JSON.stringify(canvasPixels)}`);
  }

  await page.screenshot({ path: path.join(screenshotDir, "site-desktop.png"), fullPage: true });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 900 }, isMobile: true });
  await mobile.goto("http://127.0.0.1:4173", { waitUntil: "networkidle" });
  await mobile.waitForSelector(".menu-item");
  const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
  if (mobileOverflow) throw new Error("mobile layout has horizontal overflow");
  await mobile.screenshot({ path: path.join(screenshotDir, "site-mobile.png"), fullPage: true });
  await mobile.close();

  console.log(
    `Verified ${total} items, search filter (${filtered} kulfi matches), ${canvasPixels.mode} canvas, and mobile layout.`,
  );
} finally {
  await browser.close();
}
