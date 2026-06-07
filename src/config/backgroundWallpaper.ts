import type { FullscreenWallpaperConfig } from "../types/config";

export const fullscreenWallpaperConfig: FullscreenWallpaperConfig = {
  enable: true,
  src: {
    desktop: [
      "/assets/wallpaper/1.webp",
      "/assets/wallpaper/2.webp",
      "/assets/wallpaper/3.webp",
      "/assets/wallpaper/4.webp",
    ],
    mobile: [
      "/assets/wallpaper/m1.webp",
      "/assets/wallpaper/m2.webp",
      "/assets/wallpaper/m3.webp",
      "/assets/wallpaper/m4.webp",
    ],
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
