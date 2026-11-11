// Takes a screenshot of each screen into docs/screenshots, for the README.
// Usage: node scripts/screenshots.js

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { findChrome, launchChrome, serveApp } from "../tests/browser.js";

const OUT = resolve(import.meta.dirname, "..", "docs", "screenshots");
const chromePath = findChrome();
if (!chromePath) throw new Error("Chrome is not installed. Set CHROME_PATH.");

const app = await serveApp();
const chrome = await launchChrome(chromePath);
const page = await chrome.newPage({ width: 1180, height: 940 });

async function shoot(name) {
  await new Promise((r) => setTimeout(r, 400));
  await page.eval("document.querySelectorAll('.toast').forEach((t) => t.remove()), true");
  const box = await page.eval("(() => { const r = document.querySelector('.phone').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()");
  const { data } = await page.send("Page.captureScreenshot", { format: "png", clip: { ...box, scale: 1 } });
  writeFileSync(resolve(OUT, `${name}.png`), Buffer.from(data, "base64"));
  console.log(`docs/screenshots/${name}.png`);
}

try {
  await page.goto(app.url);
  await shoot("login");
  await page.goto(`${app.url}#/cadastro`);
  await shoot("cadastro");
  await page.goto(app.url);
  await page.clickText("#app button", "conta de demonstração");
  await page.waitFor("document.querySelector('.counter-badge')");
  await shoot("home");
  await page.click(".swipe-bus");
  await page.waitFor("document.querySelector('.confirmed')");
  await shoot("home-confirmado");
  for (const [route, name] of [["horarios", "horarios"], ["dados", "dados"], ["config", "configuracao"]]) {
    await page.goto(`${app.url}#/${route}`);
    await shoot(name);
  }
  // Leave the demo account ready for the next run.
  await page.goto(`${app.url}#/home`);
  await page.clickText("#app button", "Cancelar presença");
} finally {
  page.close();
  await chrome.close();
  app.server.close();
}
