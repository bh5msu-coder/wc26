// Headless driver for WB26WC. Launches the built/preview site, exercises the
// key flows, and writes screenshots. Uses the globally-installed Playwright.
//
//   node .claude/skills/run-wb26wc/driver.mjs [baseURL] [outDir]
//
// Defaults: http://localhost:4173  ./shots
import pw from "/opt/node22/lib/node_modules/playwright/index.js";
import { mkdirSync } from "node:fs";
const { chromium } = pw;

const base = process.argv[2] || "http://localhost:4173";
const outDir = process.argv[3] || new URL("./shots/", import.meta.url).pathname;
mkdirSync(outDir, { recursive: true });

const shot = async (page, name) => { await page.screenshot({ path: outDir + "/" + name + ".png" }); console.log("shot:", name); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 402, height: 860 }, deviceScaleFactor: 2 });
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));

// 1) Table (default route)
await page.goto(base + "/#/table", { waitUntil: "networkidle" });
await page.waitForSelector(".standrow", { timeout: 8000 });
const rows = await page.$$eval(".standrow .who .name", (els) => els.map((e) => e.textContent));
console.log("standings:", rows.join(", "));
await shot(page, "01-table");

// 2) Draft — should show the real seeded board (ESP/BRA/... and ZD on the clock)
await page.goto(base + "/#/draft", { waitUntil: "networkidle" });
await page.waitForSelector(".draftgrid");
const onClock = await page.textContent(".card .spread div b, .card div b").catch(() => null);
const cells = await page.$$eval(".draftcell .code", (els) => els.map((e) => e.textContent));
console.log("draft codes (first 8):", cells.slice(0, 8).join(" "));
await shot(page, "02-draft");

// 3) Enter a result via the Fixtures flow, observe standings react
await page.goto(base + "/#/fixtures", { waitUntil: "networkidle" });
await page.waitForSelector(".fxrow");
await page.click(".fxrow");
await page.waitForSelector(".modal input");
await page.fill(".modal input >> nth=0", "3");
await page.fill(".modal input >> nth=1", "0");
await page.waitForSelector(".preview");
await shot(page, "03-result-entry");
await page.click(".modal .btn.primary");
await page.waitForTimeout(400);

// 4) Projections — run the Monte-Carlo worker
await page.goto(base + "/#/proj", { waitUntil: "networkidle" });
await page.click(".btn.primary");
await page.waitForSelector(".projrow", { timeout: 20000 });
const stamp = await page.textContent(".muted.center");
console.log("projections:", stamp);
await shot(page, "04-projections");

// 5) Scoring
await page.goto(base + "/#/scoring", { waitUntil: "networkidle" });
await page.waitForSelector(".payrow");
await shot(page, "05-scoring");

console.log(errors.length ? "CONSOLE ERRORS:\n" + errors.join("\n") : "no console errors");
await browser.close();
