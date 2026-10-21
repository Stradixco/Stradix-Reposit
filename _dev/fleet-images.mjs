// Optimises the fleet & fresh-food photo library (kept outside the repo because the
// originals are ~80 MB of PNG) into assets/img/fleet/ as responsive WebP.
// Source folder: "../صور الاسطول" next to the repository. Run: node fleet-images.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.resolve(root, "..", "صور الاسطول");
const FOOD = path.join(SRC, "توريد  مواد الطعام الطازج");
const SOLID = path.join(SRC, "خدمات نقل النفايات الصلبة بالحاويات");
const LIQUID = path.join(SRC, "خدمة نقل النفايات السائلة بالصهريج");
const OUT = path.join(root, "assets", "img", "fleet");

// [folder, file, output name]
const MAP = [
  [FOOD, "Aerial Harvest Rows and Crates.png", "food-harvest-aerial"],
  [FOOD, "Egypt to Saudi Fresh Food Supply Chain.png", "food-supply-chain"],
  [FOOD, "Egypt-to-Saudi Fresh Produce Journey.png", "food-produce-journey"],
  [FOOD, "Fresh Produce Export to Saudi Arabia.png", "food-export-ksa"],
  [FOOD, "Golden Harvest at Sunrise.png", "food-harvest-sunrise"],
  [FOOD, "Golden Harvest at the Farm.png", "food-harvest-farm"],
  [FOOD, "Golden Hour Harvest Bounty.png", "food-harvest-bounty"],
  [FOOD, "Vibrant Harvest Field in Full Swing.png", "food-harvest-field"],
  [FOOD, "S-TRADIX Fresh Produce Port Loading.png", "food-port-loading-new"],
  [FOOD, "S-TRADIX Food Supply Warehouse.png", "food-warehouse"],
  [FOOD, "S-TRADIX Fresh Produce Warehouse.png", "food-veg-warehouse"],
  [FOOD, "S-Tradix Fresh Fruit Warehouse.png", "food-fruit-warehouse"],
  [FOOD, "Fresh Produce Delivery in Riyadh.png", "food-delivery-riyadh"],
  [FOOD, "Egypt’s Fresh Produce Export Network.png", "food-export-network"],
  [FOOD, "S-TRADIX Egypt Logistics at Sunset.png", "food-egypt-logistics"],
  [FOOD, "S‑TRADIX Cold-Chain Distribution at Sunset.png", "food-coldchain-sunset"],
  [FOOD, "Golden Harbor Produce Export.png", "food-harbor-export"],
  [FOOD, "Abundant Fresh Fruit Market Display.png", "food-fruit-display"],
  [FOOD, "Bountiful Farm Harvest Display.png", "food-veg-display"],
  [FOOD, "Vibrant Farmstand Harvest with Palm Trees.png", "food-farmstand"],
  [FOOD, "Fresh Market Vegetable Crate.png", "food-veg-crate"],
  [FOOD, "Rustic Spice Market Bounty.png", "food-spice-bounty"],
  [FOOD, "Rustic Spice Market Still Life.png", "food-spice-still"],
  [FOOD, "Spice Export at the Harbor.png", "food-spice-harbor"],
  [FOOD, "Spice Delivery in Riyadh.png", "food-spice-delivery"],
  [FOOD, "Egyptian Spice Market by the Nile.png", "food-spice-nile"],
  [FOOD, "Nile Market Panorama with Egyptian Landmarks.png", "food-nile-panorama"],
  [FOOD, "Egyptian Freshness_ From Fields to Markets-2.png", "food-fields-to-markets"],
  [SOLID, "Branded Stradix Containers in Industrial Yard.png", "solid-containers-yard"],
  [SOLID, "STRADIX Fleet Showcase Collage1.png", "solid-hooklift-green"],
  [SOLID, "STRADIX Fleet Showcase Collage2.png", "solid-hooklift-line"],
  [SOLID, "STRADIX Fleet in Motion1.png", "solid-hooklift-yellow"],
  [SOLID, "STRADIX Fleet in Motion2.png", "solid-hooklift-duo"],
  [SOLID, "STRADIX Fleet in Motion3.png", "solid-yellow-fleet"],
  [SOLID, "STRADIX Industrial Container Yard.png", "solid-skips-stacked"],
  [SOLID, "STRADIX Industrial Fleet Showcase1.png", "solid-skiploader-fleet"],
  [SOLID, "STRADIX Industrial Fleet Showcase3.png", "solid-skiploader-duo"],
  [SOLID, "STRADIX Industrial Fleet Showcase4.png", "solid-skiploader-blue"],
  [SOLID, "STRADIX Sunset Roll-Off Truck.png", "solid-rolloff-sunset"],
  [SOLID, "STRADIX Truck at Golden Hour.png", "solid-hooklift-tipping"],
  [SOLID, "Stradix Blue Skip-Loader Truck.png", "solid-skiploader-yard"],
  [LIQUID, "IMG_4732.PNG", "liquid-tanker-mono"],
  [LIQUID, "IMG_4748.PNG", "liquid-wastewater-port"],
  [LIQUID, "IMG_4753.PNG", "liquid-wastewater-tanker"],
  [LIQUID, "IMG_4757.PNG", "liquid-storage-tanks"],
  [LIQUID, "IMG_5141.PNG", "liquid-vacuum-truck"],
  [LIQUID, "Stradix Tanker at Sunset.png", "liquid-tanker-sunset"],
  [LIQUID, "Stradix Water Tanker at Sunset.png", "liquid-water-tanker"],
];
const WIDTHS = [640, 1200, 1800];

await mkdir(OUT, { recursive: true });
const report = [];
for (const [dir, file, name] of MAP) {
  const src = path.join(dir, file);
  const meta = await sharp(src).metadata();
  for (const w of WIDTHS) {
    if (w > meta.width && w !== WIDTHS[0]) continue; // no upscaling beyond the smallest size
    await sharp(src).resize({ width: Math.min(w, meta.width), withoutEnlargement: true }).webp({ quality: 74, effort: 5 }).toFile(path.join(OUT, `${name}-${w}.webp`));
  }
  report.push(`${name} ${meta.width}x${meta.height}`);
}
// S-TRADIX Food Supply logo (transparent, from the brochure design source)
const LOGO_DIR = path.join(FOOD, "S-TRADIX Premium Brochure", "_design-source", "img");
await sharp(path.join(LOGO_DIR, "logo_wordmark.png")).trim().resize({ width: 520 }).webp({ quality: 90 }).toFile(path.join(OUT, "food-logo-wordmark.webp"));
await sharp(path.join(LOGO_DIR, "logo_stacked.png")).trim().resize({ width: 420 }).webp({ quality: 90 }).toFile(path.join(OUT, "food-logo-stacked.webp"));
// Full-width hero versions
for (const [dir, file, name] of [[LIQUID, "Stradix Tanker at Sunset.png", "liquid-tanker-sunset"], [SOLID, "STRADIX Sunset Roll-Off Truck.png", "solid-rolloff-sunset"], [SOLID, "STRADIX Truck at Golden Hour.png", "solid-hooklift-tipping"], [FOOD, "Golden Hour Harvest Bounty.png", "food-harvest-bounty"], [FOOD, "S‑TRADIX Cold-Chain Distribution at Sunset.png", "food-coldchain-sunset"], [FOOD, "Vibrant Farmstand Harvest with Palm Trees.png", "food-farmstand"]]) {
  await sharp(path.join(dir, file)).webp({ quality: 72, effort: 5 }).toFile(path.join(OUT, `${name}-1536.webp`));
}
// Social-card JPEGs for the new pages
for (const [file, dir, name] of [["S‑TRADIX Cold-Chain Distribution at Sunset.png", FOOD, "og-fresh-food"], ["STRADIX Truck at Golden Hour.png", SOLID, "og-solid-waste"], ["Stradix Tanker at Sunset.png", LIQUID, "og-liquid-waste"]]) {
  await sharp(path.join(dir, file)).resize(1200, 630, { fit: "cover" }).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, `${name}.jpg`));
}
console.log(report.join("\n"));
