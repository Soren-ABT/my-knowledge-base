import { readdirSync, existsSync } from "fs";
import { join } from "path";
import type { FullscreenWallpaperConfig } from "../types/config";

const WALLPAPER_DIR = join(process.cwd(), "public/assets/wallpaper");

function scanWallpapers(): { desktop: string[]; mobile: string[] } {
  if (!existsSync(WALLPAPER_DIR)) return { desktop: [], mobile: [] };

  const files = readdirSync(WALLPAPER_DIR);
  const desktop = files
    .filter((f) => /^\d+\.webp$/i.test(f))
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map((f) => `/assets/wallpaper/${f}`);

  const mobile = files
    .filter((f) => /^m\d+\.webp$/i.test(f))
    .sort((a, b) => parseInt(a.replace(/^m/i, "")) - parseInt(b.replace(/^m/i, "")))
    .map((f) => `/assets/wallpaper/${f}`);

  return { desktop, mobile };
}

const scanned = scanWallpapers();

export const fullscreenWallpaperConfig: FullscreenWallpaperConfig = {
  enable: true,
  src: {
    desktop: scanned.desktop,
    mobile: scanned.mobile,
  },
  position: "center",
  carousel: {
    enable: true,
    interval: 5,
  },
  zIndex: -1,
  opacity: 0.8,
  blur: 0,
  switchable: true,
  overlay: {
    opacity: 0.8,
    blur: 1.5,
    cardOpacity: 0.8,
  },
};
