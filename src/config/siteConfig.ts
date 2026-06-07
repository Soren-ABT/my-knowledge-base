import type { SiteConfig } from "../types/config";

export const SITE_LANG = "zh-CN";

export const siteConfig: SiteConfig = {
  title: "Soren's Blog",
  subtitle: "记录思考 · 沉淀技术 · 无限突破",
  siteURL: "https://soren-abt.github.io",
  lang: SITE_LANG,
  themeColor: {
    hue: 250,
    fixed: false,
  },
  banner: {
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
    waves: {
      enable: true,
    },
    homeText: {
      enable: true,
      title: "Soren's Blog",
      subtitle: ["记录思考 · 沉淀技术 · 无限突破"],
    },
    credit: {
      enable: false,
      text: "",
      url: "",
    },
    navbar: {
      transparentMode: "semifull",
    },
  },
  wallpaperMode: {
    defaultMode: "banner",
  },
  pageProgressBar: {
    enable: true,
    height: 3,
    duration: 6000,
  },
  showLastModified: true,
  generateOgImages: true,
  postListLayout: {
    defaultMode: "list",
    enable: true,
  },
  toc: {
    enable: true,
    desktopSidebar: true,
    floating: true,
    depth: 2,
  },
  card: {
    border: true,
  },
  font: {
    asciiFont: {
      fontFamily: "JetBrains Mono Variable",
      fontWeight: "400",
    },
  },
};
