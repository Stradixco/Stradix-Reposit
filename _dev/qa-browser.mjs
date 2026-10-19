// Browser QA: loads every public page at phone/tablet/desktop widths in the locally
// installed Chrome, records console errors, failed requests and horizontal overflow,
// saves full-page screenshots, and exercises the interactive components.
// Usage: node qa-browser.mjs <baseUrl> <screenshotDir>
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || "http://localhost:8080";
const outDir = process.argv[3] || "qa-shots";
await mkdir(outDir, { recursive: true });

const PAGES = ["index.html", "services.html", "liquid-waste.html", "solid-waste.html", "fresh-food.html", "zora.html", "about-us.html", "gallery.html", "contact.html", "does-not-exist.html"];
const VIEWPORTS = [{ name: "phone", width: 390, height: 844 }, { name: "tablet", width: 820, height: 1180 }, { name: "desktop", width: 1440, height: 900 }];
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const issues = [];
const note = (m) => { issues.push(m); console.log("  ✗ " + m); };

async function newPage(vp) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
  // Never contact third parties during QA: block chat widget, stub Formspree.
  await ctx.route(/tidio/, (r) => r.abort());
  await ctx.route(/formspree\.io/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' }));
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" && !/ERR_FAILED|404 \(Not Found\)/.test(m.text())) note(`[${vp.name}] ${page.url()} console: ${m.text()}`); });
  page.on("pageerror", (e) => note(`[${vp.name}] ${page.url()} pageerror: ${e.message}`));
  page.on("requestfailed", (r) => { if (!/tidio|google\.com\/maps/.test(r.url())) note(`[${vp.name}] request failed: ${r.url()} ${r.failure()?.errorText}`); });
  page.on("response", (r) => { if (r.status() >= 400 && !r.url().includes("does-not-exist")) note(`[${vp.name}] HTTP ${r.status()}: ${r.url()}`); });
  return { ctx, page };
}

for (const vp of VIEWPORTS) {
  console.log(`\n== ${vp.name} ${vp.width}px ==`);
  const { ctx, page } = await newPage(vp);
  for (const p of PAGES) {
    await page.goto(`${base}/${p}`, { waitUntil: "networkidle" });
    // Scroll through so lazy images and reveal animations settle
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { window.scrollTo({ top: y, behavior: "instant" }); await new Promise((r) => setTimeout(r, 90)); }
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" });
    });
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) note(`[${vp.name}] ${p}: horizontal overflow ${overflow}px`);
    // With normal motion: every image in <main> must have been revealed and loaded after scrolling
    await page.waitForTimeout(1200);
    const unloaded = await page.evaluate(() => [...document.querySelectorAll("main img")]
      .filter((i) => !i.closest("[hidden], dialog, .mega, .hero-slide:not(.is-active)") && !(i.complete && i.naturalWidth > 0))
      .map((i) => i.getAttribute("src")));
    if (unloaded.length) note(`[${vp.name}] ${p}: images never loaded → ${unloaded.join(", ")}`);
    const hiddenReveals = await page.evaluate(() => [...document.querySelectorAll("[data-reveal]")].filter((el) => !el.classList.contains("is-visible")).length);
    if (hiddenReveals) note(`[${vp.name}] ${p}: ${hiddenReveals} section(s) never revealed`);
    const broken = await page.evaluate(() => [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute("src")).map((i) => i.getAttribute("src")));
    if (broken.length) note(`[${vp.name}] ${p}: broken images ${broken.join(", ")}`);
    await page.screenshot({ path: path.join(outDir, `${vp.name}-${p.replace(".html", "")}.png`), fullPage: true });
    console.log(`  ✓ ${p}`);
  }

  // --- Interactions ---
  await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
  if (vp.width >= 1100) {
    await page.click(".nav-trigger");
    await page.waitForTimeout(400);
    const open = await page.locator("#mega-services").evaluate((el) => el.classList.contains("is-open"));
    if (!open) note(`[${vp.name}] mega menu did not open`);
    await page.screenshot({ path: path.join(outDir, `${vp.name}-mega.png`) });
    await page.keyboard.press("Escape");
    const closed = await page.locator("#mega-services").evaluate((el) => !el.classList.contains("is-open"));
    if (!closed) note(`[${vp.name}] mega menu did not close on Escape`);
  } else {
    await page.click(".menu-toggle");
    await page.waitForTimeout(600);
    const visible = await page.locator("#mobile-nav").isVisible();
    if (!visible) note(`[${vp.name}] mobile nav did not open`);
    // The open menu must cover the screen below the header (regression: it once collapsed to the header's height)
    const cover = await page.evaluate(() => { const r = document.getElementById("mobile-nav").getBoundingClientRect(); return { h: r.height, need: innerHeight - 90, bg: getComputedStyle(document.getElementById("mobile-nav")).backgroundColor }; });
    if (cover.h < cover.need) note(`[${vp.name}] mobile nav covers only ${Math.round(cover.h)}px of ${cover.need}px`);
    await page.screenshot({ path: path.join(outDir, `${vp.name}-menu.png`) });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(450);
    if (await page.locator("#mobile-nav").isVisible()) note(`[${vp.name}] mobile nav did not close on Escape`);
  }

  // Gallery: filter + lightbox
  await page.goto(`${base}/gallery.html`, { waitUntil: "networkidle" });
  await page.click('[data-filter="supply"]');
  const shown = await page.locator("[data-item]:not([hidden])").count();
  if (shown !== 3) note(`[${vp.name}] gallery filter expected 3 supply items, got ${shown}`);
  await page.click('[data-filter="all"]');
  await page.locator("[data-item] .work-tile").nth(1).click();
  if (!(await page.locator("#lightbox").evaluate((d) => d.open))) note(`[${vp.name}] lightbox did not open`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(outDir, `${vp.name}-lightbox.png`) });
  await page.keyboard.press("ArrowRight");
  if (!(await page.locator("#lightbox .lightbox-body > *").count())) note(`[${vp.name}] lightbox next item is empty`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  await page.locator(".work-tile[data-video]").first().click();
  if (!(await page.locator("#lightbox video").count())) note(`[${vp.name}] video tile did not open a video`);
  await page.keyboard.press("Escape");

  // Contact form: validation then (stubbed) submission
  await page.goto(`${base}/contact.html?service=environmental`, { waitUntil: "networkidle" });
  if ((await page.inputValue("#service")) !== "environmental") note(`[${vp.name}] ?service= preselect failed`);
  await page.click("#enquiry-form button[type=submit]");
  const errs = await page.locator(".field-error:not(:empty)").count();
  if (errs < 4) note(`[${vp.name}] expected 4 validation errors, got ${errs}`);
  await page.screenshot({ path: path.join(outDir, `${vp.name}-form-errors.png`), fullPage: false });
  await page.fill("#name", "QA Tester");
  await page.fill("#email", "qa@example.com");
  await page.fill("#phone", "55 309 8934");
  await page.fill("#message", "Automated local QA message — please ignore.");
  await page.click("#enquiry-form button[type=submit]");
  await page.waitForSelector('#form-status[data-state="success"]', { timeout: 5000 }).catch(() => note(`[${vp.name}] form success state not shown`));

  // Map consent
  await page.click(".map-consent button");
  if (!(await page.locator(".map-frame iframe").count())) note(`[${vp.name}] map did not load on request`);
  await ctx.close();
}

// Keyboard: first Tab reaches the skip link
{
  const { ctx, page } = await newPage(VIEWPORTS[2]);
  await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
  await page.keyboard.press("Tab");
  const cls = await page.evaluate(() => document.activeElement.className);
  if (!cls.includes("skip-link")) note(`first Tab focuses "${cls}" instead of skip link`);
  await ctx.close();
}

await browser.close();
console.log(`\n${issues.length ? issues.length + " issue(s)" : "No issues"} — screenshots in ${outDir}`);
process.exit(issues.length ? 1 : 0);
