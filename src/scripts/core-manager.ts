// CoreManager — centralized event delegation (Mizuki pattern)
// Extracted from CoreManager.astro is:inline script.

const ANIM_DURATION = 100;
let settingsOpen = false;
let tocOpen = false;
let tocObserver: MutationObserver | null = null;
let tocScrollTicking = false;
let wpVisHandler: (() => void) | null = null;
let wpCarouselTimers: ReturnType<typeof setInterval>[] = [];

// ==================== UTILITY ====================
function syncCSSVars(): void {
  const s = document.documentElement.style;
  const op = localStorage.getItem("overlay-opacity");
  const bl = localStorage.getItem("overlay-blur");
  const co = localStorage.getItem("overlay-card-opacity");
  if (op) s.setProperty("--wallpaper-opacity", String(Number(op) / 100));
  if (bl) s.setProperty("--wallpaper-blur", bl + "px");
  if (co) s.setProperty("--card-transparent-opacity", String(Number(co) / 100));
}

function syncBodyClass(): void {
  const mode = localStorage.getItem("wallpaper-mode");
  if (mode === "banner" || mode === "fullscreen" || mode === "overlay") {
    document.body.classList.add("wallpaper-transparent");
  }
}

// ==================== SETTINGS PANEL ANIMATION ====================
function animateIn(el: HTMLElement): void {
  const html = document.documentElement;
  if (html.classList.contains("is-theme-transitioning")) {
    el.classList.remove("float-panel-closed");
    el.style.opacity = "1";
    el.style.transform = "scale(1) translateY(0)";
    el.style.pointerEvents = "auto";
    return;
  }
  el.classList.remove("float-panel-closed");
  el.style.opacity = "0";
  el.style.transform = "scale(0.95) translateY(-8px)";
  el.style.pointerEvents = "none";
  el.style.transition = "all " + ANIM_DURATION + "ms ease-out";
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      el.style.opacity = "1";
      el.style.transform = "scale(1) translateY(0)";
      el.style.pointerEvents = "auto";
      setTimeout(function () {
        el.style.transition = "";
      }, ANIM_DURATION);
    });
  });
}

function animateOut(el: HTMLElement): void {
  const html = document.documentElement;
  if (html.classList.contains("is-theme-transitioning")) {
    el.classList.add("float-panel-closed");
    el.style.opacity = "";
    el.style.transform = "";
    el.style.pointerEvents = "";
    return;
  }
  el.style.transition = "all " + ANIM_DURATION + "ms ease-out";
  el.style.pointerEvents = "none";
  el.style.opacity = "0";
  el.style.transform = "scale(0.95) translateY(-8px)";
  setTimeout(function () {
    el.classList.add("float-panel-closed");
    el.style.transition = "";
    el.style.opacity = "";
    el.style.transform = "";
    el.style.pointerEvents = "";
  }, ANIM_DURATION);
}

function openSettings(): void {
  const panel = document.getElementById("settings-panel");
  if (!panel) return;
  settingsOpen = true;
  animateIn(panel);
}

function closeSettings(): void {
  const panel = document.getElementById("settings-panel");
  if (!panel) return;
  settingsOpen = false;
  animateOut(panel);
}

// ==================== SETTINGS UI SYNC ====================
function syncSettingsUI(): void {
  const hueSlider = document.getElementById("hue-slider") as HTMLInputElement | null;
  const storedHue = localStorage.getItem("theme-hue");
  if (hueSlider && storedHue) {
    hueSlider.value = storedHue;
    document.documentElement.style.setProperty("--hue", storedHue);
  }

  const storedMode = localStorage.getItem("wallpaper-mode") || "banner";
  document.querySelectorAll<HTMLElement>(".settings-mode-btn").forEach(function (b) {
    b.classList.toggle("active", b.dataset.mode === storedMode);
  });
  const overlaySettings = document.getElementById("overlay-settings");
  if (overlaySettings) {
    overlaySettings.style.display = storedMode === "overlay" ? "block" : "none";
  }

  const op = localStorage.getItem("overlay-opacity") || "80";
  const bl = localStorage.getItem("overlay-blur") || "1.5";
  const co = localStorage.getItem("overlay-card-opacity") || "80";
  const opSlider = document.getElementById("overlay-opacity") as HTMLInputElement | null;
  const blSlider = document.getElementById("overlay-blur") as HTMLInputElement | null;
  const coSlider = document.getElementById("overlay-card-opacity") as HTMLInputElement | null;
  if (opSlider) opSlider.value = op;
  if (blSlider) blSlider.value = bl;
  if (coSlider) coSlider.value = co;
  const opVal = document.getElementById("overlay-opacity-val");
  const blVal = document.getElementById("overlay-blur-val");
  const coVal = document.getElementById("overlay-card-opacity-val");
  if (opVal) opVal.textContent = op + "%";
  if (blVal) blVal.textContent = bl + "px";
  if (coVal) coVal.textContent = co + "%";

  const sakuraBtn = document.getElementById("sakura-toggle");
  if (sakuraBtn) {
    sakuraBtn.classList.toggle("active", localStorage.getItem("sakura-enabled") === "true");
  }

  syncCSSVars();
}

// ==================== FLOATING TOC ====================
function getHeadings(): NodeListOf<HTMLElement> | null {
  const prose = document.querySelector(".prose, .markdown-section, article");
  return prose ? prose.querySelectorAll<HTMLElement>("h1, h2, h3") : null;
}

function findActiveIndex(headings: NodeListOf<HTMLElement>): number {
  let active = 0;
  const sy = window.scrollY + 100;
  headings.forEach(function (h, i) {
    if (h.offsetTop <= sy) active = i;
  });
  return active;
}

function updateActiveHeading(): void {
  if (tocOpen) return;
  const content = document.getElementById("floating-toc-content");
  if (!content) return;
  const headings = getHeadings();
  if (!headings) return;
  const activeIndex = findActiveIndex(headings);
  const items = content.querySelectorAll<HTMLElement>(".floating-toc-item");
  items.forEach(function (item, i) {
    item.classList.toggle("active", i === activeIndex);
  });
  if (items[activeIndex]) {
    items[activeIndex].scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

function generateTOC(): void {
  const content = document.getElementById("floating-toc-content");
  const wrapper = document.getElementById("floating-toc-wrapper");
  if (!content || !wrapper) return;

  const headings = getHeadings();
  if (!headings || !headings.length) {
    wrapper.style.display = "none";
    return;
  }
  wrapper.style.display = "block";

  let html = "";
  headings.forEach(function (h, i) {
    const tag = h.tagName.toLowerCase();
    const id = h.id || "ftoc-" + i;
    if (!h.id) h.id = id;

    const indent =
      tag === "h3"
        ? ' style="padding-left: 24px; font-size: 0.75rem;"'
        : tag === "h2"
          ? ' style="padding-left: 4px;"'
          : "";
    const dotOrBadge =
      tag === "h1"
        ? '<span class="floating-toc-badge">' + (i + 1) + "</span>"
        : '<span class="floating-toc-dot"></span>';

    html +=
      '<a role="button" tabindex="0" class="floating-toc-item" data-target="' +
      id +
      '"' +
      indent +
      ">" +
      dotOrBadge +
      '<span class="floating-toc-text">' +
      (h.textContent ? h.textContent.trim() : "") +
      "</span>" +
      "</a>";
  });
  content.innerHTML = html;
  updateActiveHeading();
}

function openTOC(): void {
  tocOpen = true;
  const panel = document.getElementById("floating-toc-panel");
  if (panel) {
    panel.classList.remove("float-panel-closed");
    panel.classList.add("show");
  }
}

function closeTOC(): void {
  tocOpen = false;
  const panel = document.getElementById("floating-toc-panel");
  if (panel) {
    panel.classList.add("float-panel-closed");
    panel.classList.remove("show");
  }
}

function setupTocObserver(): void {
  if (tocObserver) {
    tocObserver.disconnect();
    tocObserver = null;
  }
  const target = document.querySelector(".prose, .markdown-section, article");
  if (target) {
    tocObserver = new MutationObserver(function () {
      setTimeout(generateTOC, 300);
    });
    tocObserver.observe(target, { childList: true, subtree: true });
  }
}

// ==================== WALLPAPER ====================
function applyWallpaperMode(mode: string): void {
  const el = document.getElementById("fullscreen-wallpaper");
  if (!el) return;
  if (mode === "fullscreen" || mode === "overlay") {
    el.style.display = "block";
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.style.opacity = "var(--wallpaper-opacity, 0.8)";
      });
    });
  } else {
    el.style.opacity = "0";
    setTimeout(function () {
      el.style.display = "none";
    }, 500);
  }
}

function initWallpaperSingle(): void {
  const container = document.getElementById("wallpaper-single-container");
  if (!container || container.children.length > 0) return;

  let desktopImages: string[] = [];
  let mobileImages: string[] = [];
  let positionClass = "object-center";
  try {
    desktopImages = JSON.parse(container.getAttribute("data-wallpaper-desktop") || "[]");
    mobileImages = JSON.parse(container.getAttribute("data-wallpaper-mobile") || "[]");
    positionClass = container.getAttribute("data-wallpaper-position") || "object-center";
  } catch (e) {
    return;
  }

  function getRandom(images: string[], key: string): string | null {
    if (!images.length) return null;
    if (images.length === 1) return images[0];
    const last = sessionStorage.getItem(key);
    let idx: number;
    do {
      idx = Math.floor(Math.random() * images.length);
    } while (idx === parseInt(last || "-1"));
    sessionStorage.setItem(key, String(idx));
    return images[idx];
  }

  const dSrc = getRandom(desktopImages, "wp_desktop_idx");
  const mSrc = getRandom(mobileImages, "wp_mobile_idx");

  if (dSrc) {
    const dd = document.createElement("div");
    dd.className = "hidden md:block w-full h-full relative";
    dd.style.transform = "translateZ(0)";
    dd.innerHTML =
      '<img src="' +
      dSrc +
      '" alt="wallpaper" class="absolute inset-0 w-full h-full object-cover ' +
      positionClass +
      '" style="transform:translateZ(0);backface-visibility:hidden;opacity:1" decoding="async" loading="eager" />';
    container.appendChild(dd);
  }
  if (mSrc) {
    const md = document.createElement("div");
    md.className = "block md:hidden w-full h-full relative";
    md.style.transform = "translateZ(0)";
    md.innerHTML =
      '<img src="' +
      mSrc +
      '" alt="wallpaper" class="absolute inset-0 w-full h-full object-cover ' +
      positionClass +
      '" style="transform:translateZ(0);backface-visibility:hidden;opacity:1" decoding="async" loading="eager" />';
    container.appendChild(md);
  }
}

function startCarousel(): void {
  const container = document.getElementById("fullscreen-wallpaper");
  if (!container) return;
  const interval = parseInt(container.getAttribute("data-carousel-interval") || "5");

  if (wpVisHandler) {
    document.removeEventListener("visibilitychange", wpVisHandler);
    wpVisHandler = null;
  }
  wpCarouselTimers.forEach(function (t) {
    clearInterval(t);
  });
  wpCarouselTimers = [];

  const desktopItems = container.querySelectorAll<HTMLElement>(
    ".hidden.md\\:block [data-carousel-item]",
  );
  const mobileItems = container.querySelectorAll<HTMLElement>(
    ".block.md\\:hidden [data-carousel-item-mobile]",
  );

  const savedIdx = parseInt(sessionStorage.getItem("wp_carousel_idx") || "0");

  const groups: {
    items: NodeListOf<HTMLElement>;
    current: number;
    timer: ReturnType<typeof setInterval> | null;
    active: boolean;
  }[] = [
    {
      items: desktopItems,
      current: savedIdx < desktopItems.length ? savedIdx : 0,
      timer: null,
      active: desktopItems.length > 1,
    },
    {
      items: mobileItems,
      current: savedIdx < mobileItems.length ? savedIdx : 0,
      timer: null,
      active: mobileItems.length > 1,
    },
  ];

  groups.forEach(function (g) {
    if (!g.active) return;
    for (let i = 0; i < g.items.length; i++) {
      g.items[i].style.opacity = i === g.current ? "1" : "0";
    }
  });

  function next(g: (typeof groups)[0]): void {
    const nxt = (g.current + 1) % g.items.length;
    g.items[g.current].style.opacity = "0";
    g.items[nxt].style.opacity = "1";
    g.current = nxt;
    sessionStorage.setItem("wp_carousel_idx", String(nxt));
  }

  function start(): void {
    groups.forEach(function (g) {
      if (g.active && !g.timer) {
        g.timer = setInterval(function () {
          if (!document.body.contains(g.items[0])) {
            stop();
            return;
          }
          next(g);
        }, interval * 1000);
      }
    });
  }

  function stop(): void {
    groups.forEach(function (g) {
      if (g.timer) {
        clearInterval(g.timer);
        g.timer = null;
      }
    });
  }

  wpVisHandler = function () {
    if (document.hidden) stop();
    else {
      const exists = groups.some(function (g) {
        return g.items.length > 0 && document.body.contains(g.items[0]);
      });
      if (exists) start();
    }
  };

  start();
  document.addEventListener("visibilitychange", wpVisHandler);
}

function initWallpaper(): void {
  const el = document.getElementById("fullscreen-wallpaper");
  if (!el) return;

  const mode = localStorage.getItem("wallpaper-mode") || "banner";
  if (mode === "fullscreen" || mode === "overlay") {
    el.style.display = "block";
    el.style.opacity = "var(--wallpaper-opacity, 0.8)";
  } else {
    el.style.display = "none";
    el.style.opacity = "0";
  }

  if (document.getElementById("wallpaper-single-container")) {
    initWallpaperSingle();
  }
  if (el.hasAttribute("data-carousel-interval")) {
    startCarousel();
  }
}

// ==================== THEME TRANSITION GUARDS ====================
let isThemeTransitioning = false;

function setupThemeTransitionGuard(): void {
  const observer = new MutationObserver(function (mutations) {
    for (const m of mutations) {
      if (
        m.type === "attributes" &&
        m.attributeName === "class" &&
        m.target === document.documentElement
      ) {
        const transitioning = document.documentElement.classList.contains("is-theme-transitioning");
        if (transitioning && !isThemeTransitioning) {
          isThemeTransitioning = true;
          wpCarouselTimers.forEach(function (t) {
            clearInterval(t);
          });
          const sakura = document.getElementById("sakura-canvas");
          if (sakura) sakura.style.display = "none";
        } else if (!transitioning && isThemeTransitioning) {
          isThemeTransitioning = false;
          const el = document.getElementById("fullscreen-wallpaper");
          if (el && el.hasAttribute("data-carousel-interval")) {
            startCarousel();
          }
          const sakura2 = document.getElementById("sakura-canvas");
          if (sakura2 && localStorage.getItem("sakura-enabled") === "true") {
            sakura2.style.display = "";
          }
        }
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
}

// ==================== LINK PRELOADING ====================
function setupLinkPreloading(): void {
  const preloaded: Record<string, boolean> = {};
  let prefetchTimer: ReturnType<typeof setTimeout> | null = null;
  const prefetchQueue: string[] = [];

  function flushPrefetch(): void {
    const hrefs = prefetchQueue.splice(0);
    hrefs.forEach(function (href) {
      if (preloaded[href]) return;
      preloaded[href] = true;
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = href;
      link.as = "document";
      document.head.appendChild(link);
    });
  }

  function queuePrefetch(href: string): void {
    if (preloaded[href] || prefetchQueue.indexOf(href) !== -1) return;
    prefetchQueue.push(href);
    clearTimeout(prefetchTimer!);
    prefetchTimer = setTimeout(flushPrefetch, 150);
  }

  function isInternalPath(href: string): boolean {
    if (
      !href ||
      href.startsWith("http") ||
      href.startsWith("//") ||
      href.startsWith("#") ||
      href.startsWith("javascript:")
    )
      return false;
    if (href.startsWith("/")) return true;
    return href.indexOf(".") === -1 || href.endsWith(".html") || href.endsWith(".htm");
  }

  const preloadObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && (entry.target as HTMLAnchorElement).href) {
          queuePrefetch((entry.target as HTMLAnchorElement).href);
          preloadObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "200px" },
  );

  function observeLinks(): void {
    const links = document.querySelectorAll<HTMLAnchorElement>("a[href]");
    for (let i = 0; i < links.length; i++) {
      if (isInternalPath(links[i].getAttribute("href") || "")) {
        preloadObserver.observe(links[i]);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeLinks);
  } else {
    observeLinks();
  }

  document.addEventListener("astro:after-swap", function () {
    setTimeout(observeLinks, 200);
  });
}

// ==================== EVENT DELEGATION ====================
function setupEventDelegation(): void {
  // Click delegation
  document.addEventListener("click", function (e) {
    const target = e.target as HTMLElement;

    // Settings FAB
    const fab = target.closest("#settings-fab");
    if (fab) {
      e.stopPropagation();
      if (tocOpen) closeTOC();
      settingsOpen ? closeSettings() : openSettings();
      return;
    }

    // Settings close
    if (target.closest("#settings-close")) {
      closeSettings();
      return;
    }

    // Settings mode buttons
    const modeBtn = target.closest(".settings-mode-btn") as HTMLElement | null;
    if (modeBtn) {
      const mode = modeBtn.dataset.mode!;
      document.querySelectorAll(".settings-mode-btn").forEach(function (b) {
        b.classList.toggle("active", (b as HTMLElement).dataset.mode === mode);
      });
      const overlaySettings = document.getElementById("overlay-settings");
      if (overlaySettings) overlaySettings.style.display = mode === "overlay" ? "block" : "none";

      document.body.classList.remove("wallpaper-transparent", "no-banner-mode");
      if (mode === "banner" || mode === "fullscreen" || mode === "overlay") {
        document.body.classList.add("wallpaper-transparent");
      }
      localStorage.setItem("wallpaper-mode", mode);
      window.dispatchEvent(new CustomEvent("wallpaper-mode-change", { detail: { mode } }));
      return;
    }

    // Sakura toggle
    const sakuraBtn = target.closest("#sakura-toggle");
    if (sakuraBtn) {
      const enabled = !sakuraBtn.classList.contains("active");
      sakuraBtn.classList.toggle("active", enabled);
      localStorage.setItem("sakura-enabled", String(enabled));
      window.dispatchEvent(new CustomEvent("sakura-toggle", { detail: { enabled } }));
      return;
    }

    // Theme toggle
    if (target.closest("#theme-toggle-btn")) {
      if (window.__theme && typeof window.__theme.toggle === "function") {
        window.__theme.toggle();
      }
      return;
    }

    // Floating TOC
    const tocBtn = target.closest("#floating-toc-btn");
    if (tocBtn) {
      if (settingsOpen) closeSettings();
      if (tocOpen) closeTOC();
      else {
        generateTOC();
        openTOC();
      }
      return;
    }

    if (target.closest("#floating-toc-close")) {
      closeTOC();
      return;
    }

    const tocItem = target.closest(".floating-toc-item") as HTMLElement | null;
    if (tocItem) {
      const tgt = document.getElementById(tocItem.dataset.target || "");
      if (tgt) {
        const top = tgt.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: "smooth" });
      }
      closeTOC();
      return;
    }

    // Click outside to close float panels
    const openPanels = document.querySelectorAll<HTMLElement>(
      ".float-panel:not(.float-panel-closed)",
    );
    for (let i = 0; i < openPanels.length; i++) {
      const panel = openPanels[i];
      const trigger = (panel as any).__floatTrigger as HTMLElement | undefined;
      if (
        !panel.contains(target) &&
        (!trigger || !trigger.contains(target)) &&
        !target.closest("#settings-fab") &&
        !target.closest("#floating-toc-btn")
      ) {
        if (panel.id === "settings-panel") closeSettings();
        if (panel.id === "floating-toc-panel") closeTOC();
        panel.classList.add("float-panel-closed");
      }
    }
  });

  // Input delegation
  document.addEventListener("input", function (e) {
    const t = e.target as HTMLInputElement;

    if (t.id === "hue-slider") {
      document.documentElement.style.setProperty("--hue", t.value);
      localStorage.setItem("theme-hue", t.value);
      return;
    }
    if (t.id === "overlay-opacity") {
      const valEl = document.getElementById("overlay-opacity-val");
      if (valEl) valEl.textContent = t.value + "%";
      document.documentElement.style.setProperty(
        "--wallpaper-opacity",
        String(Number(t.value) / 100),
      );
      localStorage.setItem("overlay-opacity", t.value);
      return;
    }
    if (t.id === "overlay-blur") {
      const valEl = document.getElementById("overlay-blur-val");
      if (valEl) valEl.textContent = t.value + "px";
      document.documentElement.style.setProperty("--wallpaper-blur", t.value + "px");
      localStorage.setItem("overlay-blur", t.value);
      return;
    }
    if (t.id === "overlay-card-opacity") {
      const valEl = document.getElementById("overlay-card-opacity-val");
      if (valEl) valEl.textContent = t.value + "%";
      document.documentElement.style.setProperty(
        "--card-transparent-opacity",
        String(Number(t.value) / 100),
      );
      localStorage.setItem("overlay-card-opacity", t.value);
      return;
    }
  });

  // Keyboard: Esc
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (settingsOpen) {
      closeSettings();
      return;
    }
    if (tocOpen) {
      closeTOC();
      return;
    }
  });

  // Scroll: TOC tracking
  window.addEventListener(
    "scroll",
    function () {
      if (tocScrollTicking) return;
      tocScrollTicking = true;
      requestAnimationFrame(function () {
        const wrapper = document.getElementById("floating-toc-wrapper");
        if (wrapper && wrapper.style.display !== "none") updateActiveHeading();
        tocScrollTicking = false;
      });
    },
    { passive: true },
  );

  // Wallpaper mode change
  window.addEventListener("wallpaper-mode-change", function (e: Event) {
    applyWallpaperMode((e as CustomEvent).detail.mode);
  });
}

// ==================== ASTRO AFTER SWAP ====================
document.addEventListener("astro:after-swap", function () {
  syncCSSVars();
  syncBodyClass();
  syncSettingsUI();
  generateTOC();
  setupTocObserver();
  initWallpaper();
  document.documentElement.style.setProperty("--content-delay", "0ms");
});

// ==================== INITIALIZATION ====================
syncCSSVars();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    syncBodyClass();
    syncSettingsUI();
    setTimeout(generateTOC, 600);
    setupTocObserver();
    initWallpaper();
  });
} else {
  syncBodyClass();
  syncSettingsUI();
  setTimeout(generateTOC, 600);
  setupTocObserver();
  initWallpaper();
}

setupEventDelegation();
setupThemeTransitionGuard();
setupLinkPreloading();

interface Window {
  __theme?: {
    toggle: () => void;
  };
}
