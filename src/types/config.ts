export interface SiteConfig {
  title: string;
  subtitle: string;
  siteURL: string;
  lang: string;
  themeColor: {
    hue: number;
    fixed: boolean;
  };
  banner: {
    enable: boolean;
    src: string | string[] | { desktop: string[]; mobile: string[] };
    position?: "top" | "center" | "bottom";
    carousel?: {
      enable: boolean;
      interval: number;
    };
    waves?: {
      enable: boolean;
    };
    homeText?: {
      enable: boolean;
      title?: string;
      subtitle?: string[];
    };
    credit?: {
      enable: boolean;
      text: string;
      url: string;
    };
    navbar?: {
      transparentMode: "semi" | "full" | "semifull";
    };
  };
  wallpaperMode: {
    defaultMode: "banner" | "fullscreen" | "none";
  };
  pageProgressBar: {
    enable: boolean;
    height: number;
    duration: number;
  };
  showLastModified: boolean;
  generateOgImages: boolean;
  postListLayout?: {
    defaultMode: "list" | "grid";
    enable: boolean;
  };
  toc?: {
    enable: boolean;
    desktopSidebar: boolean;
    floating: boolean;
    depth: number;
  };
  card?: {
    border: boolean;
  };
  font?: {
    asciiFont?: { fontFamily: string; fontWeight?: string };
  };
}

export interface ProfileConfig {
  name: string;
  bio: string;
  avatar: string;
  links: {
    name: string;
    icon: string;
    url: string;
  }[];
}

export interface LicenseConfig {
  enable: boolean;
  name: string;
  url: string;
}

export interface FooterConfig {
  enable: boolean;
  customHtml: string;
}

export interface FullscreenWallpaperConfig {
  enable: boolean;
  src: {
    desktop: string[];
    mobile: string[];
  };
  position: string;
  carousel: {
    enable: boolean;
    interval: number;
  };
  zIndex: number;
  opacity: number;
  blur: number;
  switchable: boolean;
  overlay: {
    opacity: number;
    blur: number;
    cardOpacity: number;
  };
}

export interface SidebarConfig {
  enable: boolean;
  position: "left" | "right";
  docs: {
    enable: boolean;
    defaultOpen: boolean;
  };
}

export interface NavBarConfig {
  search: boolean;
  themeToggle: boolean;
  rss: boolean;
}

export interface MusicTrack {
  title: string;
  artist: string;
  cover: string;
  url: string;
  duration?: number;
  albumArtist?: string;
  album?: string;
  year?: number;
  genre?: string;
  tags?: string[];
  lrc?: string;
  isHiRes?: boolean;
  sampleRate?: number;
  bitsPerSample?: number;
  channels?: number;
  bitrate?: number;
  track?: { no: number; of: number };
  composer?: string;
  codec?: string;
  codecName?: string;
  qualityTier?: string;
  qualityLabel?: string;
  qualityBadge?: string;
  artistRaw?: string;
  featuredArtists?: string[];
  replayGain?: {
    trackGain?: number;
    trackPeak?: number;
    albumGain?: number;
    albumPeak?: number;
  };
}

export interface EQPreset {
  name: string;
  label: string;
  gains: number[];
}

export interface MusicPlayerConfig {
  enable: boolean;
  showFloatingPlayer: boolean;
  autoplay: boolean;
  playlist: MusicTrack[];
}

export interface OgImageConfig {
  enabled: boolean;
  width: number;
  height: number;
}
