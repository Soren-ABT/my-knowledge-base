(() => {
  if (window.__mermaidInitialized) return;
  window.__mermaidInitialized = true;

  let currentTheme = null;
  let isRendering = false;

  function getTheme() {
    return document.documentElement.classList.contains("dark") ? "dark" : "default";
  }

  async function waitForMermaid(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (window.mermaid?.initialize) resolve(window.mermaid);
        else if (Date.now() - start > timeout) reject(new Error("Mermaid load timeout"));
        else setTimeout(check, 100);
      };
      check();
    });
  }

  async function renderMermaidDiagrams() {
    if (isRendering || !window.mermaid?.render) return;
    isRendering = true;

    try {
      const elements = document.querySelectorAll(".mermaid[data-mermaid-code]");
      if (elements.length === 0) { isRendering = false; return; }

      const theme = getTheme();
      currentTheme = theme;

      window.mermaid.initialize({
        startOnLoad: false,
        theme,
        themeVariables: { fontFamily: "inherit", fontSize: "16px" },
        securityLevel: "loose",
      });

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        const code = el.getAttribute("data-mermaid-code");
        if (!code) continue;
        try {
          const { svg } = await window.mermaid.render(`mermaid-${i}-${Date.now()}`, code);
          el.innerHTML = svg;
          const svgEl = el.querySelector("svg");
          if (svgEl) {
            svgEl.setAttribute("width", "100%");
            svgEl.removeAttribute("height");
            svgEl.style.maxWidth = "100%";
            svgEl.style.height = "auto";
          }
        } catch (err) {
          el.innerHTML = `<div class="mermaid-error">图表渲染失败: ${err.message}</div>`;
        }
      }
    } finally {
      isRendering = false;
    }
  }

  function loadMermaid() {
    if (window.mermaid) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
      script.onload = () => resolve();
      script.onerror = () => {
        const fallback = document.createElement("script");
        fallback.src = "https://unpkg.com/mermaid@11/dist/mermaid.min.js";
        fallback.onload = () => resolve();
        fallback.onerror = () => reject(new Error("Failed to load Mermaid"));
        document.head.appendChild(fallback);
      };
      document.head.appendChild(script);
    });
  }

  async function init() {
    try {
      await loadMermaid();
      await renderMermaidDiagrams();

      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === "attributes" && m.attributeName === "class") {
            const newTheme = getTheme();
            if (currentTheme !== newTheme) {
              setTimeout(() => renderMermaidDiagrams(), 150);
            }
          }
        }
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

      document.addEventListener("astro:after-swap", () => {
        currentTheme = null;
        setTimeout(() => renderMermaidDiagrams(), 200);
      });
    } catch (err) {
      console.error("Mermaid init failed:", err);
    }
  }

  window.renderMermaidDiagrams = renderMermaidDiagrams;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
