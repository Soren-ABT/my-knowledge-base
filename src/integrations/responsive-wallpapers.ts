import type { AstroIntegration } from "astro";
import type { ViteDevServer } from "vite";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const WALLPAPER_DIR = path.resolve("public", "assets", "wallpaper");
const OUTPUT_DIR = path.join(WALLPAPER_DIR, "_responsive");

const SIZES = {
  desktop: [400, 800, 1200, 1920],
  mobile: [400, 800],
} as const;

function isMobile(file: string): boolean {
  return path.basename(file).startsWith("m");
}

function getBaseName(filename: string): string {
  return path.basename(filename, path.extname(filename));
}

async function generateVariants(): Promise<number> {
  if (!fs.existsSync(WALLPAPER_DIR)) return 0;

  const files = fs
    .readdirSync(WALLPAPER_DIR)
    .filter((f) => /\.(webp|jpg|jpeg|png)$/i.test(f));
  if (files.length === 0) return 0;

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
  return generated;
}

async function runGeneration(): Promise<void> {
  try {
    const count = await generateVariants();
    if (count > 0) {
      console.log(`[responsive-wallpapers] Generated ${count} variant${count !== 1 ? "s" : ""}`);
    }
  } catch (err) {
    console.error("[responsive-wallpapers] Error:", err);
  }
}

function isWallpaperFile(filePath: string): boolean {
  const abs = path.resolve(filePath);
  return abs.startsWith(WALLPAPER_DIR) && /\.(webp|jpg|jpeg|png)$/i.test(abs);
}

function setupWatcher(server: ViteDevServer): void {
  server.watcher.add(WALLPAPER_DIR);
  server.watcher.on("add", (file) => {
    if (isWallpaperFile(file)) runGeneration();
  });
  server.watcher.on("change", (file) => {
    if (isWallpaperFile(file)) runGeneration();
  });
}

export function responsiveWallpapers(): AstroIntegration {
  return {
    name: "responsive-wallpapers",
    hooks: {
      "astro:server:setup": async ({ server }) => {
        await runGeneration();
        setupWatcher(server);
      },
      "astro:build:start": runGeneration,
    },
  };
}
