// Usage: node qa-menu.mjs <baseUrl> <screenshot.png>
// Opens the mobile menu on every public page (phone size, iPhone-like UA) and checks it covers the screen and is opaque.
import { chromium, devices } from "playwright-core";
const base = process.argv[2];
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctx = await b.newContext({ ...devices["iPhone 13"] });
await ctx.route(/tidio/, (r) => r.abort());
const p = await ctx.newPage();
let bad = 0;
for (const pg of ["index.html", "services.html", "liquid-waste.html", "solid-waste.html", "fresh-food.html", "zora.html", "about-us.html", "gallery.html", "contact.html"]) {
  for (const scrolled of [false, true]) {
    await p.goto(`${base}/${pg}`, { waitUntil: "networkidle" });
    if (scrolled) { await p.evaluate(() => scrollTo({ top: 900, behavior: "instant" })); await p.waitForTimeout(300); await p.evaluate(() => scrollTo({ top: 820, behavior: "instant" })); await p.waitForTimeout(500); }
    await p.tap(".menu-toggle");
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => { const n = document.getElementById("mobile-nav"); const b = n.getBoundingClientRect(); const s = getComputedStyle(n); const h = getComputedStyle(document.querySelector(".site-header")); return { h: Math.round(b.height), need: innerHeight - 90, op: s.opacity, bg: s.backgroundColor, bf: h.backdropFilter }; });
    const ok = r.h >= r.need && r.op === "1" && !/rgba\(.*, 0\)/.test(r.bg);
    if (!ok) bad++;
    console.log(`${ok ? "✓" : "✗"} ${pg.padEnd(18)} ${scrolled ? "scrolled" : "top     "} menu=${r.h}px/${r.need}px opacity=${r.op} headerFilter=${r.bf}`);
    if (pg === "services.html" && !scrolled) await p.screenshot({ path: process.argv[3] });
  }
}
await b.close();
console.log(bad ? `${bad} failing case(s)` : "Menu covers the screen on every page.");
