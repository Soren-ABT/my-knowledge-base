/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

declare global {
  interface Window {
    __appInitialized?: boolean;
    __disposeApp?: () => void;
    __waveAnimId?: number | null;
    __hideLoader?: () => void;
    __animateWave?: (fillColor: string, onComplete?: () => void) => void;
    __freezeTransitions?: (el: HTMLElement) => void;
    __searchSelectedIdx?: number;
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
    _mathjaxReady?: boolean;
  }
}

export {};
