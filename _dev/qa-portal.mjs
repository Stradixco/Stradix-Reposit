// Functional regression test for the internal portal pages.
// The Firebase guard is replaced by a no-op and the agreement-generator API is
// stubbed, so nothing leaves the machine. Prints one line per check and a JSON
// summary that can be diffed between runs (e.g. before/after a redesign).
// Usage: node qa-portal.mjs <baseUrl> <outFile.json> [screenshotDir]
import { chromium } from "playwright-core";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || "http://localhost:8080";
const outFile = process.argv[3] || "portal-results.json";
const shots = process.argv[4];
if (shots) await mkdir(shots, { recursive: true });

const CUSTOMERS = [
  { client_id: "CUST-11001", client_name_ar: "شركة الاختبار", client_name_en: "Test Co", client_cr: "1010101010", client_vat: "300000000000003", client_address_ar: "الخبر", client_address_en: "Al Khobar", country: "السعودية", phone: "0500000000", email: "t@example.com", type: "Corporate" },
  { client_id: "CUST-11002", client_name_ar: "مؤسسة ثانية", client_name_en: "Second Est", client_cr: "2020202020", client_vat: "311111111111113", client_address_ar: "الدمام", client_address_en: "Dammam", country: "السعودية", phone: "0511111111", email: "s@example.com", type: "Corporate" },
];

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const results = {};
const posted = [];

async function open(page, file, vp = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport: vp, acceptDownloads: true });
  await ctx.route(/portal-guard\.js/, (r) => r.fulfill({ contentType: "text/javascript", body: "/* guard disabled for QA */" }));
  await ctx.route(/onrender\.com\/customers\.json|\/customers\.json$/, (r) => r.fulfill({ contentType: "application/json", body: JSON.stringify(CUSTOMERS) }));
  await ctx.route(/onrender\.com\/(add-customer|update-customer|delete-customer|generate)/, (r) => { posted.push(r.request().url().split("/").pop()); r.fulfill({ contentType: "application/json", body: '{"message":"ok","client_id":"CUST-11003","status":"success"}' }); });
  await ctx.route(/tidio|script\.google\.com/, (r) => r.abort());
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(e.message));
  p.on("dialog", (d) => d.accept());
  await p.goto(`${base}/${file}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);
  return { ctx, p };
}
const check = (page, name, value) => { (results[page] ||= {})[name] = value; console.log(`  ${page} · ${name}: ${JSON.stringify(value)}`); };
const shot = async (p, name) => { if (shots) await p.screenshot({ path: path.join(shots, name + ".png"), fullPage: true }); };

// ---- Shell: header + sidebar injected on every page
for (const f of ["dashboard.html", "invoices.html", "add-invoice.html", "customers-list.html", "employees-cars.html", "qrmom.html", "Agreement-Creat-Cust.html", "reports.html", "setting.html", "Credit-note.html", "Customer-Create.html", "Customer-Edit.html"]) {
  const { ctx, p } = await open(p0(), f);
  check(f, "sidebarLinks", await p.$$eval("#sidebar-container a[href]", (as) => as.map((a) => a.getAttribute("href"))));
  check(f, "logoutBtn", await p.locator("#sidebar-container .logout-btn").count());
  check(f, "headerInjected", (await p.locator("#header *").count()) > 0);
  check(f, "jsErrors", p.errors);
  await shot(p, "shell-" + f.replace(".html", ""));
  await ctx.close();
}
function p0() { return null; }

// ---- Dashboard
{ const { ctx, p } = await open(null, "dashboard.html");
  check("dashboard", "stats", await p.$$eval(".cards p", (ps) => ps.map((x) => x.textContent.trim())));
  check("dashboard", "tables", await p.locator("table").count());
  await ctx.close(); }

// ---- Invoices list (seeded from localStorage)
{ const { ctx, p } = await open(null, "invoices.html");
  await p.evaluate(() => localStorage.setItem("invoices", JSON.stringify([
    { invoiceNumber: "INV-100001", clientName: "Alpha", invoiceDate: "2026-01-01", totalAmount: "115.00" },
    { invoiceNumber: "INV-100002", clientName: "Beta", invoiceDate: "2026-02-01", totalAmount: "230.00" },
  ])));
  await p.reload({ waitUntil: "networkidle" });
  check("invoices", "rows", await p.locator("#invoiceBody tr").count());
  await p.fill("#searchInput", "beta");
  check("invoices", "rowsAfterSearch", await p.locator("#invoiceBody tr").count());
  await p.fill("#searchInput", "");
  check("invoices", "pagination", await p.locator("#pagination button").count());
  await p.locator("#invoiceBody .action-button").first().click();
  await p.waitForURL(/invoice-view/);
  check("invoices", "viewNavigates", p.url().endsWith("invoice-view.html"));
  check("invoices", "selectedInvoice", await p.evaluate(() => localStorage.getItem("selectedInvoice")));
  await ctx.close(); }

// ---- Invoice generators (Mamzar + Tradix)
for (const f of ["add-invoice.html", "add-invoicestc.html"]) {
  const { ctx, p } = await open(null, f);
  check(f, "outHiddenInitially", await p.locator("#out").isHidden());
  await p.click(`button:has-text("الآن بتوقيت جهازك")`);
  check(f, "tsFilled", (await p.inputValue("#ts")).length > 10);
  await p.fill("#invoiceDigits", "12a34");
  check(f, "digitsSanitised", await p.inputValue("#invoiceDigits"));
  await p.fill("#invoiceDigits", "100123");
  await p.fill("#subtotal", "100");
  await p.click(`button:has-text("احتساب الضريبة")`);
  check(f, "vat", await p.inputValue("#vatamt"));
  check(f, "total", await p.inputValue("#total"));
  await p.click(`button:has-text("توليد QR")`);
  await p.waitForTimeout(600);
  check(f, "outVisible", await p.locator("#out").isVisible());
  check(f, "downloadVisible", await p.locator("#download").isVisible());
  check(f, "saveVisible", await p.locator("#saveButton").isVisible());
  check(f, "qrRendered", (await p.locator("#qrContainer canvas, #qrContainer img").count()) > 0);
  check(f, "b64Length", (await p.inputValue("#b64")).length > 20);
  await p.click("#saveButton");
  await p.waitForTimeout(300);
  check(f, "viewBtnVisible", await p.locator("#viewInvoiceBtn").isVisible());
  check(f, "savedToStorage", await p.evaluate(() => !!localStorage.getItem("invoiceQR")));
  await shot(p, "gen-" + f.replace(".html", ""));
  await p.click(`button:has-text("مسح الحقول")`);
  check(f, "clearedHidesOut", await p.locator("#out").isHidden());
  check(f, "jsErrors", p.errors);
  await ctx.close();
}

// ---- Invoice view (reads what the generator saved)
{ const { ctx, p } = await open(null, "invoice-view.html");
  await p.evaluate(() => { localStorage.setItem("invoiceDigits", "100123"); localStorage.setItem("invoiceTs", "2026-10-19T10:00:00+03:00"); localStorage.setItem("invoiceSubtotal", "100.00"); localStorage.setItem("invoiceVat", "15.00"); localStorage.setItem("invoiceTotal", "115.00"); });
  await p.reload({ waitUntil: "networkidle" });
  check("invoice-view", "values", await p.$$eval("#invNumber, #invDate, #invSubtotal, #invVatAmount, #invTotal", (e) => e.map((x) => x.textContent.trim())));
  check("invoice-view", "printBtn", await p.locator(".btn-print").count());
  await shot(p, "invoice-view");
  await ctx.close(); }

// ---- Credit note
{ const { ctx, p } = await open(null, "Credit-note.html");
  check("credit", "downloadHiddenInitially", await p.locator("#download").isHidden());
  await p.click(`button:has-text("التاريخ الآن")`);
  check("credit", "dateFilled", (await p.inputValue("#creditDate")).length > 10);
  await p.selectOption("#client", "Client A");
  await p.selectOption("#invoice", "INV-001");
  await p.fill("#creditNoteDigits", "100200");
  await p.fill("#subtotal", "-100");
  await p.click(`button:has-text("احسب الضريبة")`);
  check("credit", "vat", await p.inputValue("#vatamt"));
  check("credit", "total", await p.inputValue("#total"));
  await p.click(`button:has-text("توليد QR")`);
  await p.waitForTimeout(600);
  check("credit", "downloadVisible", await p.locator("#download").isVisible());
  check("credit", "qrRendered", (await p.locator("#qrContainer canvas, #qrContainer img").count()) > 0);
  check("credit", "statusClass", await p.getAttribute("#status", "class"));
  check("credit", "jsErrors", p.errors);
  await shot(p, "credit-note");
  await ctx.close(); }

// ---- Customers list (API stubbed)
{ const { ctx, p } = await open(null, "customers-list.html");
  check("customers", "rows", await p.locator("#customerTableBody tr").count());
  check("customers", "firstRow", await p.locator("#customerTableBody tr").first().innerText().catch(() => ""));
  check("customers", "jsErrors", p.errors);
  await shot(p, "customers-list");
  await ctx.close(); }

// ---- Customer create
{ const { ctx, p } = await open(null, "Customer-Create.html");
  check("customer-create", "idDisplay", await p.textContent("#customerIdDisplay"));
  check("customer-create", "fields", await p.locator("#customerForm input, #customerForm select").count());
  await shot(p, "customer-create");
  await ctx.close(); }

// ---- Customer edit (reads selected customer)
{ const { ctx, p } = await open(null, "Customer-Edit.html?id=CUST-11001");
  check("customer-edit", "values", await p.$$eval("#customerId, #nameAr, #nameEn, #vat", (e) => e.map((x) => x.value)));
  check("customer-edit", "jsErrors", p.errors);
  await shot(p, "customer-edit");
  await ctx.close(); }

// ---- Employees & cars (add row, edit popup)
{ const { ctx, p } = await open(null, "employees-cars.html");
  check("employees", "tables", await p.locator("table").count());
  check("employees", "popupHidden", await p.locator("#editPopup").isHidden());
  const before = await p.locator("#residency-table tbody tr").count();
  await p.locator(".add-row button").first().click();
  await p.waitForTimeout(300);
  check("employees", "rowAdded", (await p.locator("#residency-table tbody tr").count()) - before);
  const popupOpen = await p.locator("#editPopup").isVisible();
  check("employees", "popupAfterAdd", popupOpen);
  if (popupOpen) { await shot(p, "employees-popup"); await p.click("#editPopup .cancel-btn"); }
  check("employees", "popupClosed", await p.locator("#editPopup").isHidden());
  check("employees", "jsErrors", p.errors);
  await shot(p, "employees");
  await ctx.close(); }

// ---- QR MOM
{ const { ctx, p } = await open(null, "qrmom.html");
  await p.click(`button:has-text("إضافة صف جديد")`);
  check("qrmom", "rows", await p.locator("#momTable tbody tr").count());
  await p.fill("#momTable .code-input", "QA1");
  await p.fill("#momTable .meeting-date", "2026-10-19");
  await p.selectOption("#momTable .meeting-place", "الخبر");
  const dl = p.waitForEvent("download", { timeout: 5000 }).then((d) => d.suggestedFilename()).catch(() => null);
  await p.click("#momTable .qr-btn");
  check("qrmom", "qrDownload", await dl);
  check("qrmom", "modalHidden", await p.locator("#editModal").isHidden());
  check("qrmom", "jsErrors", p.errors);
  await shot(p, "qrmom");
  await ctx.close(); }

// ---- Agreement creation
{ const { ctx, p } = await open(null, "Agreement-Creat-Cust.html");
  check("agreement", "clientOptions", await p.locator("#client option").count());
  check("agreement", "bodyClass", await p.evaluate(() => document.body.className));
  await p.click("#mamzarBtn");
  check("agreement", "bodyClassMamzar", await p.evaluate(() => document.body.className));
  check("agreement", "mamzarActive", await p.evaluate(() => document.getElementById("mamzarBtn").classList.contains("active-btn")));
  await p.click("#tradixBtn");
  const before = await p.locator("#items-table tbody tr").count();
  await p.click(`button:has-text("Add Item")`);
  check("agreement", "itemRowAdded", (await p.locator("#items-table tbody tr").count()) - before);
  await p.selectOption("#client", { index: 1 }).catch(() => {});
  await p.waitForTimeout(200);
  check("agreement", "clientInfoFilled", ((await p.textContent("#client-info")) || "").trim().length > 0);
  check("agreement", "downloadHidden", await p.locator("#download-section").isHidden());
  check("agreement", "jsErrors", p.errors);
  await shot(p, "agreement");
  await ctx.close(); }

// ---- Reports & settings
{ const { ctx, p } = await open(null, "reports.html");
  check("reports", "cards", await p.locator(".report-card").count());
  check("reports", "filters", await p.locator("#fromDate, #toDate, #clientSelect").count());
  await shot(p, "reports");
  await ctx.close(); }
{ const { ctx, p } = await open(null, "setting.html");
  check("settings", "buttons", await p.locator(".setting-button").count());
  await shot(p, "settings");
  await ctx.close(); }

// ---- Login (UI only — no sign-in attempt)
{ const { ctx, p } = await open(null, "Login.html");
  check("login", "fields", await p.locator("#user, #pass, #msg").count());
  check("login", "msgHidden", await p.locator("#msg").isHidden());
  check("login", "protectedHidden", await p.locator("#protected").isHidden());
  check("login", "submitBtn", await p.locator(".glow-btn").count());
  await shot(p, "login");
  await ctx.close(); }

// ---- Phone width: portal pages must not scroll sideways on the shell
{ const { ctx, p } = await open(null, "dashboard.html", { width: 390, height: 844 });
  check("mobile", "dashboardOverflow", await p.evaluate(() => document.documentElement.scrollWidth - innerWidth > 1));
  await shot(p, "mobile-dashboard");
  await ctx.close(); }

check("api", "posted", posted);
await browser.close();
await writeFile(outFile, JSON.stringify(results, null, 2));
console.log(`\nSaved ${outFile}`);
