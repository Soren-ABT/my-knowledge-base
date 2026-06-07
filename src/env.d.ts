/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

declare global {
  interface Window {
    __hideLoader?: () => void;
    __animateWave?: (fillColor: string) => void;
    __freezeTransitions?: (el: HTMLElement) => void;
    toggleDayNight?: () => void;
    __settingsCleanup?: (() => void) | null;
    __theme?: {
      get: () => string;
      set: (theme: string) => void;
      toggle: () => void;
      apply: (theme: string, animate?: boolean) => void;
      DARK: string;
      LIGHT: string;
    };
    MathJax?: {
      typesetPromise?: () => Promise<void>;
    };
  }
}

export {};
