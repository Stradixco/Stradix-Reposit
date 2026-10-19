// Static integrity checks for the public pages: every local href/src/srcset target
// exists, every in-page #anchor exists, each page has one <h1>, a title,
// a meta description, a canonical URL and alt attributes on all images.
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PAGES = ["index.html", "services.html", "zora.html", "about-us.html", "gallery.html", "contact.html", "404.html"];
const problems = [];
const exists = (p) => access(p).then(() => true, () => false);
const cache = new Map();
const load = async (p) => { if (!cache.has(p)) cache.set(p, await readFile(path.join(root, p), "utf8")); return cache.get(p); };

for (const page of PAGES) {
  const html = await load(page);
  const refs = new Set();
  for (const m of html.matchAll(/\b(?:href|src|data-src|data-full|data-video|data-poster)="([^"]+)"/g)) refs.add(m[1]);
  for (const m of html.matchAll(/\b(?:data-)?srcset="([^"]+)"/g)) m[1].split(",").forEach((s) => refs.add(s.trim().split(/\s+/)[0]));
  for (const m of html.matchAll(/imagesrcset="([^"]+)"/g)) m[1].split(",").forEach((s) => refs.add(s.trim().split(/\s+/)[0]));

  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:)/.test(ref)) continue;
    const [p, hash] = ref.split("#");
    const clean = p.split("?")[0].replace(/^\//, "");
    if (clean) {
      if (!(await exists(path.join(root, clean)))) problems.push(`${page}: missing file → ${ref}`);
      else if (hash && clean.endsWith(".html")) {
        const target = await load(clean);
        if (!target.includes(`id="${hash}"`)) problems.push(`${page}: missing anchor → ${ref}`);
      }
    } else if (hash && !html.includes(`id="${hash}"`)) problems.push(`${page}: missing in-page anchor → #${hash}`);
  }

  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) problems.push(`${page}: expected 1 <h1>, found ${h1}`);
  if (!/<title>[^<]{10,}<\/title>/.test(html)) problems.push(`${page}: missing/short <title>`);
  if (page !== "404.html") {
    if (!/<meta name="description" content="[^"]{50,}"/.test(html)) problems.push(`${page}: missing meta description`);
    if (!/<link rel="canonical" href="https:\/\/www\.s-tradix\.com\//.test(html)) problems.push(`${page}: missing canonical`);
  }
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\balt="/.test(m[0])) problems.push(`${page}: <img> without alt → ${m[0].slice(0, 80)}`);
    if (!/\bwidth="\d+"/.test(m[0]) || !/\bheight="\d+"/.test(m[0])) problems.push(`${page}: <img> without width/height → ${m[0].slice(0, 80)}`);
  }
  if (/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/.test(html)) problems.push(`${page}: inline <script> would be blocked by CSP`);
  if (/\son[a-z]+="/i.test(html)) problems.push(`${page}: inline event handler would be blocked by CSP`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dup.length) problems.push(`${page}: duplicate ids → ${[...new Set(dup)].join(", ")}`);
}

for (const m of (await load("sitemap.xml")).matchAll(/<loc>https:\/\/www\.s-tradix\.com\/([^<]*)<\/loc>/g)) {
  if (!(await exists(path.join(root, m[1] || "index.html")))) problems.push(`sitemap.xml: missing page → ${m[1]}`);
}

if (problems.length) { console.error(problems.join("\n")); console.error(`\n${problems.length} problem(s) found.`); process.exit(1); }
console.log(`Site check passed: ${PAGES.length} pages, links, anchors, images and metadata OK.`);
