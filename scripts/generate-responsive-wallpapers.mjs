/**
 * Generate responsive wallpaper variants using sharp.
 * Run before build: `node scripts/generate-responsive-wallpapers.mjs`
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WALLPAPER_DIR = path.resolve(__dirname, "..", "public", "assets", "wallpaper");
const OUTPUT_DIR = path.join(WALLPAPER_DIR, "_responsive");

const SIZES = {
  desktop: [400, 800, 1200, 1920],
  mobile: [400, 800],
};

function getBaseName(filename) {
  return path.basename(filename, path.extname(filename));
}

function isMobile(file) {
  return path.basename(file).startsWith("m");
}

async function generateVariants() {
  const files = fs.readdirSync(WALLPAPER_DIR).filter((f) => /\.(webp|jpg|jpeg|png)$/i.test(f));

  if (files.length === 0) {
    console.log("No wallpaper images found.");
    return;
  }

  // Create output directory if needed
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let generated = 0;

  for (const file of files) {
    const filePath = path.join(WALLPAPER_DIR, file);
    const base = getBaseName(file);
    const sizes = isMobile(file) ? SIZES.mobile : SIZES.desktop;

    for (const width of sizes) {
      const outName = `${base}-${width}w.webp`;
      const outPath = path.join(OUTPUT_DIR, outName);

      // Skip if already generated and newer than source
      if (fs.existsSync(outPath)) {
        const srcStat = fs.statSync(filePath);
        const outStat = fs.statSync(outPath);
        if (outStat.mtimeMs > srcStat.mtimeMs) continue;
      }

      await sharp(filePath)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(outPath);

      generated++;
    }
  }

  console.log(`Generated ${generated} responsive wallpaper variants in _responsive/`);
}

generateVariants().catch((err) => {
  console.error("Error generating responsive wallpapers:", err);
  process.exit(1);
});
