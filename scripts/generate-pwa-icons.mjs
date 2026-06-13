/**
 * Generate PWA icons using sharp.
 * Creates a simple gradient icon for the blog.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "..", "public", "assets");

const SIZE = 512;
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#6366f1"/>
      <stop offset="100%" style="stop-color:#a855f7"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" rx="${SIZE * 0.2}" fill="url(#bg)"/>
  <text x="${SIZE / 2}" y="${SIZE / 2 + 20}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${SIZE * 0.35}" font-weight="bold" fill="white">S</text>
</svg>`;

async function generate() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const svgBuf = Buffer.from(SVG);

  await sharp(svgBuf).resize(192, 192).png().toFile(path.join(OUTPUT_DIR, "icon-192.png"));
  console.log("Generated icon-192.png");

  await sharp(svgBuf).resize(512, 512).png().toFile(path.join(OUTPUT_DIR, "icon-512.png"));
  console.log("Generated icon-512.png");
}

generate().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});
