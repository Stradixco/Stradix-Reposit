// Copies ZORA 360 marketing media (read-only source: PROJECT ZORA/apps/public-site/src/media)
// into assets/zora/, and generates the flowing "wave lines" background used on light sections.
// Run: node zora-assets.mjs
import sharp from "sharp";
import { mkdir, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = "C:/Users/Lenovo/Documents/PROJECT ZORA/apps/public-site/src/media";
const OUT = path.join(root, "assets", "zora");
await mkdir(OUT, { recursive: true });

// Real ZORA app screens (English) — 1: cockpit, 2: live map, 3: requests/dispatch, 4: approvals,
// 5: current trip, 6: execution proof, 7: custody & expenses, 8: client portal, 9: oil center, 10: alerts
for (let i = 1; i <= 10; i++) {
  const n = String(i).padStart(2, "0");
  for (const w of [360, 560]) await copyFile(`${SRC}/shots/en/phone-${n}-${w}.webp`, path.join(OUT, `phone-${n}-${w}.webp`));
}
for (const w of [480, 1100]) await copyFile(`${SRC}/shots/en/tablet-01-${w}.webp`, path.join(OUT, `tablet-01-${w}.webp`));
for (const f of ["logo-light.webp", "logo-dark.webp", "icon-256.webp"]) await copyFile(`${SRC}/brand/${f}`, path.join(OUT, f));
for (const f of ["poster-en-720.webp", "poster-en-360.webp", "zora-preview-en.mp4"]) await copyFile(`${SRC}/video/${f}`, path.join(OUT, f));
for (const w of [800, 1400]) await copyFile(`${SRC}/banner/en/banner-${w}.webp`, path.join(OUT, `banner-${w}.webp`));
await sharp(`${SRC}/og/og-en.png`).resize({ width: 1200 }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, "og-zora.jpg"));

// Flowing wave-lines background (ZORA visual language), tinted for light sections
function waves({ w = 1600, h = 900, lines = 34, colors = ["#14b8a6", "#2f80d6", "#7c3aed"], opacity = 0.16 }) {
  const paths = [];
  for (let i = 0; i < lines; i++) {
    const t = i / (lines - 1);
    const y0 = h * (0.08 + t * 0.9);
    const amp = 40 + 70 * Math.sin(t * Math.PI);
    const phase = t * 2.4;
    let d = `M0 ${y0.toFixed(1)}`;
    for (let x = 0; x <= w; x += 40) {
      const y = y0 + amp * Math.sin((x / w) * Math.PI * 2 + phase) * 0.6 + amp * 0.4 * Math.sin((x / w) * Math.PI * 4.5 - phase);
      d += ` L${x} ${y.toFixed(1)}`;
    }
    const c = colors[Math.min(colors.length - 1, Math.floor(t * colors.length))];
    paths.push(`<path d="${d}" stroke="${c}" stroke-opacity="${(opacity * (0.55 + 0.45 * Math.sin(t * Math.PI))).toFixed(3)}" fill="none" stroke-width="1.2"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">${paths.join("")}</svg>`;
}
await writeFile(path.join(root, "assets", "img", "waves-light.svg"), waves({}));
await writeFile(path.join(root, "assets", "img", "waves-dark.svg"), waves({ colors: ["#2dd4bf", "#4fb1ec", "#a78bfa"], opacity: 0.32 }));
console.log("ZORA assets copied to assets/zora and wave backgrounds generated.");
