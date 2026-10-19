// Generates responsive, compressed images in /assets/img from the original
// uploads in /img (originals are kept untouched so nothing is lost).
// Run: npm run images  (from the _dev folder)
import sharp from "sharp";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => path.join(root, "img", p);
const out = (p) => path.join(root, "assets", "img", p);

// [source, output base name, widths]
const PHOTOS = [
  ["carousel-03v1.jpg", "hero-port-operations", [640, 1100, 1660]],
  ["carousel-02v2.jpg", "hero-environmental-fleet", [640, 1100, 1659]],
  ["carousel-01v1.jpg", "hero-workforce", [640, 1100, 1600]],
  ["img-11v1.jpg", "environmental-facility", [640, 1000]],
  ["img-12v1.jpg", "office-port-view", [640, 1000]],
  ["img-01v1.jpg", "headquarters", [640, 1024]],
  ["img-07v1.jpg", "manpower-offshore-crew", [640, 1000]],
  ["img-06v1.jpg", "material-supply", [640, 1000]],
  ["img-09v1.jpg", "food-supply", [640, 1000]],
  ["img-10v1.jpg", "environmental-tanker", [640, 1000]],
  ["img-08v1.jpg", "shopia-ecommerce", [640, 1000]],
  ["img-04v1.jpg", "leadership-team", [480, 914]],
  ["portfolio/thumb-01v1.jpg", "work-offshore-crew", [640, 1000]],
  ["portfolio/thumb-02v1.jpg", "work-video-2", [640, 1000]],
  ["portfolio/thumb-03v1.jpg", "work-hazmat-transport", [640, 1000]],
  ["portfolio/thumb-05v1.jpg", "work-technician-training", [640, 1000]],
  ["portfolio/thumb-06v1.jpg", "work-construction-site", [640, 1000]],
  ["portfolio/thumb-07v1.jpg", "work-spare-parts-store", [640, 1000]],
  ["portfolio/thumb-08v1.jpg", "work-safety-store", [640, 1000]],
  ["portfolio/thumb-09v1.jpg", "work-sewer-cleaning-fleet", [640, 1000]],
  ["team-01v1.jpg", "team-ahmed-alkhaldi", [400]],
  ["team-02v1.jpg", "team-fahd-hamad", [400]],
  ["team-03v1.jpg", "team-ahmed-soliman", [400]],
  ["team-04v1.jpg", "team-mohamed-elsawy", [400]],
  ["team-05v2.jpg", "team-mohamed-badawi", [400]],
  ["team-06v1.jpg", "team-hoda-hassan", [400]],
];

const BADGES = [
  ["MAWAN.jpg", "cert-mawan"],
  ["PME.jpg", "cert-pme"],
  ["9001.jpg", "cert-iso-9001"],
  ["14001.jpg", "cert-iso-14001"],
  ["45001.jpg", "cert-iso-45001"],
];

// Detail crops of the company's own environmental photos: [source, name, {left, top, width, height}]
const CROPS = [
  ["carousel-03v1.jpg", "env-waste-water", { left: 110, top: 300, width: 500, height: 330 }],
  ["carousel-03v1.jpg", "env-sewer-cleaning", { left: 190, top: 425, width: 450, height: 300 }],
  ["carousel-03v1.jpg", "env-liquid-waste", { left: 890, top: 330, width: 480, height: 320 }],
  ["carousel-03v1.jpg", "env-recycling", { left: 1080, top: 640, width: 400, height: 265 }],
  ["carousel-03v1.jpg", "env-waste-skip", { left: 770, top: 470, width: 420, height: 280 }],
  ["carousel-03v1.jpg", "env-waste-management", { left: 60, top: 570, width: 520, height: 345 }],
  ["carousel-02v2.jpg", "env-vacuum-truck", { left: 660, top: 400, width: 440, height: 290 }],
  ["carousel-02v2.jpg", "env-response-crew", { left: 1220, top: 330, width: 430, height: 285 }],
];

async function crop([file, name, area]) {
  await sharp(src(file)).extract(area).webp({ quality: 80, effort: 5 }).toFile(out(`${name}.webp`));
}

async function photo([file, name, widths]) {
  const meta = await sharp(src(file)).metadata();
  for (const w of widths) {
    const width = Math.min(w, meta.width);
    await sharp(src(file))
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 74, effort: 5 })
      .toFile(out(`${name}-${w}.webp`));
  }
  // One JPEG for social cards / legacy fallback
  await sharp(src(file))
    .resize({ width: Math.min(1200, meta.width) })
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(out(`${name}.jpg`));
}

async function main() {
  await mkdir(out(""), { recursive: true });
  await Promise.all(PHOTOS.map(photo));
  await Promise.all(CROPS.map(crop));

  for (const [file, name] of BADGES) {
    await sharp(src(file)).resize({ width: 130 }).webp({ quality: 85 }).toFile(out(`${name}.webp`));
  }

  // Brand mark: crop the "S" symbol from the transparent master logo
  const cropped = await sharp(src("1.png")).extract({ left: 225, top: 185, width: 480, height: 470 }).png().toBuffer();
  const markBuf = await sharp(cropped).trim().png().toBuffer();
  await sharp(markBuf).resize({ height: 96 }).webp({ quality: 90 }).toFile(out("brand-mark.webp"));
  await sharp(markBuf).resize({ height: 96 }).png({ compressionLevel: 9 }).toFile(out("brand-mark.png"));

  // Favicons / app icons from the master logo mark on transparent background
  const square = (size, pad = 0.1) =>
    sharp(markBuf)
      .resize({ width: Math.round(size * (1 - pad * 2)), height: Math.round(size * (1 - pad * 2)), fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({ top: Math.round(size * pad), bottom: Math.round(size * pad), left: Math.round(size * pad), right: Math.round(size * pad), background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize(size, size);
  await square(32, 0.02).png().toFile(path.join(root, "favicon-32.png"));
  await square(192).png().toFile(out("icon-192.png"));
  await square(512).png().toFile(out("icon-512.png"));
  // Apple touch icon needs an opaque background
  await sharp(await square(180, 0.14).png().toBuffer()).flatten({ background: "#0a1a2b" }).png().toFile(path.join(root, "apple-touch-icon.png"));

  // Social sharing card (1200x630) built from the hero photo
  await sharp(src("carousel-03v1.jpg")).resize(1200, 630, { fit: "cover", position: "centre" }).jpeg({ quality: 80, mozjpeg: true }).toFile(out("og-card.jpg"));

  const s = await stat(out("hero-port-operations-1660.webp"));
  console.log(`Images written to assets/img (hero 1660w = ${(s.size / 1024).toFixed(0)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
