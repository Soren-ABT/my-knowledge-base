/**
 * Soren's Blog — Client App Logic
 * Enterprise-grade architecture with module lifecycle, IntersectionObserver,
 * lazy initialization, and memory-efficient patterns.
 */
(function () {
  'use strict';

  // Guard: only initialize once. ClientRouter swaps body, which may re-execute
  // external scripts. All per-navigation re-init is handled via astro:after-swap.
  if (window.__appInitialized) return;
  window.__appInitialized = true;

  /* =================================================================
     Core — Config, Helpers, Dispose Registry
     ================================================================= */
  const CFG = {
    TOAST_DURATION: 2400,
    CODE_COPIED_DURATION: 2000,
    SCROLL_SAVE_DEBOUNCE: 500,
    BACK_TO_TOP_THRESHOLD: 400,
    TOC_MIN_HEADINGS: 2,
    PREVIEW_CACHE_MAX: 25,
    PREVIEW_DEBOUNCE: 350,
    PREVIEW_HIDE_DELAY: 200,
    WAVE_DURATION: 1000,
    WAVE_FREQ: 2.2,
    WAVE_MAX_AMP: 65,
    WAVE_HARMONICS: [
      { mult: 1.0, amp: 1.0 },
      { mult: 2.3, amp: 0.25 },
      { mult: 4.7, amp: 0.1 },
    ],
    READING_POSITION_KEY: 'blog_reading_pos',
  } as const;

  /* Module interface — every module registers cleanup here */
  interface Module {
    init: () => void;
    dispose: () => void;
  }

  const disposers: Array<() => void> = [];
  function onDispose(fn: () => void) {
    disposers.push(fn);
  }
  function disposeAll() {
    for (let i = disposers.length - 1; i >= 0; i--) {
      try {
        disposers[i]();
      } catch (e) {
        /* swallow cleanup errors */
      }
    }
    disposers.length = 0;
  }

  function $(id: string): HTMLElement | null {
    return document.getElementById(id);
  }

  function toast(msg: string, type?: string) {
    type = type || 'info';
    const container = $('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.remove();
    }, CFG.TOAST_DURATION);
  }

  function freezeTransitions(el: HTMLElement): () => void {
    el.classList.add('no-transition');
    return function unfreeze() {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.classList.remove('no-transition');
        });
      });
    };
  }

  function copyToClipboard(text: string, cb?: () => void) {
    const done = () => {
      if (cb) cb();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => {
        fallbackCopy(text, done);
      });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text: string, cb?: () => void) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (e) {
      /* ignore */
    }
    document.body.removeChild(ta);
    if (cb) cb();
  }

  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function randomId(): string {
    return Math.random().toString(36).substr(2, 8);
  }
  function escHTML(str: string): string {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /* Schedule non-critical work for idle periods */
  function scheduleIdle(fn: () => void, timeout?: number): number {
    if (typeof requestIdleCallback === 'function') {
      return requestIdleCallback(fn, { timeout: timeout || 1000 });
    }
    return setTimeout(fn, timeout || 200) as unknown as number;
  }

  /* =================================================================
     Wave Animation (exposed for theme toggle)
     ================================================================= */
  window.__animateWave = function (fillColor: string, onComplete?: () => void) {
    const canvas = document.getElementById('theme-wave-canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      if (onComplete) onComplete();
      return;
    }
    const ctx =
      (canvas as any).__waveCtx ||
      ((canvas as any).__waveCtx = canvas.getContext('2d', { alpha: true }));
    if (!ctx) {
      if (onComplete) onComplete();
      return;
    }
    if (window.__waveAnimId) {
      cancelAnimationFrame(window.__waveAnimId);
      window.__waveAnimId = null;
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';
    const w = canvas.width,
      h = canvas.height;
    const freq = CFG.WAVE_FREQ,
      maxAmp = CFG.WAVE_MAX_AMP,
      harmonics = CFG.WAVE_HARMONICS;
    const dur = CFG.WAVE_DURATION,
      st = performance.now();

    (function frame(now: number) {
      const raw = Math.min((now - st) / dur, 1);
      const eased = 1 - Math.pow(1 - raw, 4);
      const waveY = -maxAmp + eased * (h + maxAmp * 2);
      const ampEnvelope = Math.sin(eased * Math.PI);
      const amp = maxAmp * ampEnvelope;
      const steps = Math.max(2, Math.floor(w / 1.5));
      const ps = eased * Math.PI * 1.8;

      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w;
        const phase = (i / steps) * Math.PI * 2 * freq + ps;
        let yOff = 0;
        for (let j = 0; j < harmonics.length; j++) {
          yOff += Math.sin(phase * harmonics[j].mult) * amp * harmonics[j].amp;
        }
        ctx.lineTo(x, waveY + yOff);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.save();
      ctx.clip();
      const gT = waveY - amp - 10,
        gB = waveY + amp + 80;
      const grd = ctx.createLinearGradient(0, gT, 0, gB);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(0.3, 'rgba(0,0,0,0)');
      grd.addColorStop(0.6, 'rgba(0,0,0,0.10)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, gT, w, gB - gT);
      ctx.restore();
      ctx.beginPath();
      for (let k = 0; k <= steps; k++) {
        const x2 = (k / steps) * w;
        const p2 = (k / steps) * Math.PI * 2 * freq + ps;
        let y2 = 0;
        for (let m = 0; m < harmonics.length; m++) {
          y2 += Math.sin(p2 * harmonics[m].mult) * amp * harmonics[m].amp;
        }
        if (k === 0) ctx.moveTo(x2, waveY + y2);
        else ctx.lineTo(x2, waveY + y2);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.20)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.beginPath();
      for (let k2 = 0; k2 <= steps; k2++) {
        const x3 = (k2 / steps) * w;
        const p3 = (k2 / steps) * Math.PI * 2 * freq + ps;
        let y3 = 0;
        for (let m2 = 0; m2 < harmonics.length; m2++) {
          y3 += Math.sin(p3 * harmonics[m2].mult) * amp * harmonics[m2].amp;
        }
        if (k2 === 0) ctx.moveTo(x3, waveY + y3 - 1.0);
        else ctx.lineTo(x3, waveY + y3 - 1.0);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.38)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      if (raw < 1) {
        window.__waveAnimId = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, w, h);
        canvas.style.display = 'none';
        window.__waveAnimId = null;
        if (onComplete) onComplete();
      }
    })(performance.now());
  };

  window.__freezeTransitions = freezeTransitions;

  /* =================================================================
     Scroll-Driven: Progress Bar + Back to Top + Position Save
     ================================================================= */
  function updateProgressBar() {
    const bar = $('page-progress-bar');
    if (!bar) return;
    const dh = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width =
      dh <= 0 ? '0%' : Math.min(100, Math.max(0, (window.scrollY / dh) * 100)) + '%';
  }

  function updateBackToTop() {
    const btn = $('back-to-top');
    if (!btn) return;
    const v = window.scrollY > CFG.BACK_TO_TOP_THRESHOLD;
    btn.classList.toggle('visible', v);
    if (v) {
      const dh = document.documentElement.scrollHeight - window.innerHeight;
      btn.style.setProperty(
        '--scroll-pct',
        dh > 0 ? Math.min(100, Math.round((window.scrollY / dh) * 100)) + '%' : '0%',
      );
    }
  }

  let saveTimer: number | null = null;
  function saveReadingPosition() {
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(
          CFG.READING_POSITION_KEY,
          JSON.stringify({
            scrollY: window.scrollY,
            pageKey: window.location.pathname,
            timestamp: Date.now(),
          }),
        );
      } catch (e) {
        /* localStorage may be unavailable */
      }
    }, CFG.SCROLL_SAVE_DEBOUNCE);
  }

  function restoreReadingPosition() {
    try {
      const r = localStorage.getItem(CFG.READING_POSITION_KEY);
      if (!r) return;
      const d = JSON.parse(r);
      if (d.pageKey === window.location.pathname && typeof d.scrollY === 'number') {
        setTimeout(() => {
          window.scrollTo({ top: d.scrollY, behavior: 'instant' });
        }, 150);
      }
    } catch (e) {
      /* ignore corrupt data */
    }
  }

  let scrollRAF: number | null = null;
  function onScroll() {
    if (scrollRAF) return;
    scrollRAF = requestAnimationFrame(() => {
      scrollRAF = null;
      updateProgressBar();
      updateBackToTop();
      saveReadingPosition();
    });
  }

  /* =================================================================
     Navbar Scroll Detection
     ================================================================= */
  function NavbarModule(): Module {
    const navbar = document.getElementById('navbar');
    if (!navbar) return { init() {}, dispose() {} };
    const mode = navbar.getAttribute('data-transparent-mode');
    if (mode !== 'semifull') {
      navbar.setAttribute('data-dynamic-transparent', mode === 'full' ? 'full' : 'semi');
    }
    let ticking = false;
    function update() {
      if (mode === 'semifull') {
        const scrolled = window.scrollY > 50;
        navbar!.classList.toggle('scrolled', scrolled);
        navbar!.setAttribute('data-dynamic-transparent', scrolled ? 'semi' : 'semifull');
      }
      ticking = false;
    }
    const boundScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener('scroll', boundScroll, { passive: true });
    update();
    return {
      init() {},
      dispose() {
        window.removeEventListener('scroll', boundScroll);
      },
    };
  }

  /* =================================================================
     Code Block Enhancement (lazy)
     ================================================================= */
  function CodeBlockModule(): Module {
    let done = false;

    function enhance() {
      if (done) return;
      done = true;
      populateCodeHeaders();
      document.querySelectorAll('.prose pre').forEach(wrapPre);
      document.querySelectorAll('.code-block-wrapper pre').forEach(addLineNums);
      addCollapsible();
    }

    const LANG_NAMES: Record<string, string> = {
      apache: 'Apache', bash: 'Bash', c: 'C', 'c++': 'C++', cpp: 'C++', csharp: 'C#',
      css: 'CSS', dart: 'Dart', diff: 'Diff', dockerfile: 'Dockerfile', elixir: 'Elixir',
      go: 'Go', graphql: 'GraphQL', haskell: 'Haskell', html: 'HTML', ini: 'INI',
      java: 'Java', javascript: 'JavaScript', js: 'JavaScript', json: 'JSON', jsx: 'JSX',
      kotlin: 'Kotlin', lua: 'Lua', makefile: 'Makefile', markdown: 'Markdown', md: 'Markdown',
      mdx: 'MDX', mysql: 'MySQL', nginx: 'Nginx', perl: 'Perl', php: 'PHP',
      powershell: 'PowerShell', python: 'Python', r: 'R', ruby: 'Ruby', rust: 'Rust',
      scala: 'Scala', scss: 'SCSS', sh: 'Shell', shell: 'Shell', sql: 'SQL',
      svg: 'SVG', swift: 'Swift', toml: 'TOML', ts: 'TypeScript', tsx: 'TSX',
      typescript: 'TypeScript', xml: 'XML', yaml: 'YAML', yml: 'YAML',
    };

    function populateCodeHeaders() {
      document.querySelectorAll('.frame pre[data-language]').forEach((pre) => {
        const frame = pre.closest('.frame');
        if (!frame) return;
        const header = frame.querySelector('.header');
        if (!header || header.textContent!.trim()) return;
        const lang = pre.getAttribute('data-language') || '';
        const name = LANG_NAMES[lang.toLowerCase()] || lang;
        header.textContent = name;
      });
    }

    function wrapPre(pre: Element) {
      if (pre.parentNode && (pre.parentNode as Element).classList?.contains('code-block-wrapper'))
        return;
      if (pre.closest('.expressive-code')) return;
      const code = pre.querySelector('code');
      let lang = '';
      if (code && code.className) {
        const m = code.className.match(/lang(?:uage)?-(\w+)/);
        if (m) lang = m[1];
      }
      const w = document.createElement('div');
      w.className = 'code-block-wrapper';
      const tb = document.createElement('div');
      tb.className = 'code-toolbar';
      tb.innerHTML = '<span class="code-lang">' + (lang || 'code') + '</span>';
      const btn = document.createElement('button');
      btn.className = 'code-copy-btn';
      btn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
      btn.addEventListener('click', () => {
        copyToClipboard(pre.textContent || '', () => {
          btn.classList.add('copied');
          btn.innerHTML = '&#10003; Copied';
          toast('代码已复制', 'success');
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML =
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
          }, CFG.CODE_COPIED_DURATION);
        });
      });
      tb.appendChild(btn);
      w.appendChild(tb);
      pre.parentNode!.insertBefore(w, pre);
      w.appendChild(pre);
    }

    function addLineNums(pre: Element) {
      if (pre.querySelector('.code-line-numbers')) return;
      const code = pre.querySelector('code');
      if (!code) return;
      const lines = (code.textContent || '').split('\n');
      if (lines.length > 1 && lines[lines.length - 1].trim() === '') lines.pop();
      let h = '';
      for (let i = 0; i < lines.length; i++) h += '<span>' + (i + 1) + '</span>';
      const ln = document.createElement('div');
      ln.className = 'code-line-numbers';
      ln.innerHTML = h;
      pre.insertBefore(ln, pre.firstChild);
    }

    function addCollapsible() {
      const THRESHOLD = 280;
      document.querySelectorAll('.code-block-wrapper').forEach((wrapper) => {
        if (wrapper.querySelector('.code-expand-btn')) return;
        const pre = wrapper.querySelector('pre');
        if (!pre || pre.scrollHeight <= THRESHOLD) return;
        wrapper.classList.add('collapsed');
        const btn = document.createElement('button');
        btn.className = 'code-expand-btn';
        btn.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg> 展开代码';
        btn.addEventListener('click', () => {
          const collapsed = wrapper.classList.toggle('collapsed');
          btn.classList.toggle('expanded', !collapsed);
          btn.innerHTML = collapsed
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg> 展开代码'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg> 收起代码';
        });
        wrapper.appendChild(btn);
      });
    }

    return {
      init() {
        scheduleIdle(enhance, 300);
      },
      dispose() {
        done = true;
      },
    };
  }

  /* =================================================================
     Heading Anchors (lazy)
     ================================================================= */
  function HeadingAnchorModule(): Module {
    function add() {
      const c = document.querySelector('.prose') || document.querySelector('.markdown-section');
      if (!c) return;
      c.querySelectorAll('h1,h2,h3,h4').forEach((h) => {
        if (h.querySelector('.heading-anchor')) return;
        if (!h.id) h.id = 'h-' + randomId();
        const a = document.createElement('a');
        a.className = 'heading-anchor';
        a.innerHTML = '#';
        a.title = '复制链接';
        a.href = 'javascript:void(0)';
        a.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          copyToClipboard(
            window.location.origin + window.location.pathname + '#' + h.id,
            () => {
              toast('链接已复制', 'success');
            },
          );
        });
        h.appendChild(a);
      });
    }
    return { init() { scheduleIdle(add, 500); }, dispose() {} };
  }

  /* =================================================================
     TOC Generation + IntersectionObserver Highlighting
     ================================================================= */
  function TOCModule(): Module {
    let observer: IntersectionObserver | null = null;
    let links: HTMLAnchorElement[] = [];

    function generate() {
      const container = document.getElementById('toc-container');
      if (!container) return;
      const c = document.querySelector('.prose') || document.querySelector('.markdown-section');
      if (!c) {
        container.innerHTML = '';
        return;
      }
      const hs = c.querySelectorAll('h1,h2,h3');
      if (hs.length < CFG.TOC_MIN_HEADINGS) {
        container.innerHTML = '';
        return;
      }
      let html =
        '<div class="font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2 px-2">目录</div>';
      hs.forEach((h, i) => {
        if (!h.id) h.id = 'toc-' + i;
        const levelClass = 'toc-' + h.tagName.toLowerCase();
        html +=
          '<a href="#' +
          h.id +
          '" class="toc-link ' +
          levelClass +
          '" data-target="' +
          h.id +
          '">' +
          h.textContent!.trim() +
          '</a>';
      });
      container.innerHTML = html;
      links = [];
      container.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          const t = document.getElementById(a.getAttribute('data-target') || '');
          if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        links.push(a);
      });
      observe();
    }

    function observe() {
      if (observer) observer.disconnect();
      if (!links.length) return;
      const headingMap: Record<string, HTMLAnchorElement> = {};
      links.forEach((a) => {
        const id = a.getAttribute('data-target');
        if (id) headingMap[id] = a;
      });
      const visible: Record<string, boolean> = {};
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            visible[entry.target.id] = entry.isIntersecting;
          });
          let activeId: string | null = null;
          for (let i = 0; i < links.length; i++) {
            const id = links[i].getAttribute('data-target');
            if (id && visible[id]) {
              activeId = id;
              break;
            }
          }
          links.forEach((a) => {
            a.classList.toggle('active', a.getAttribute('data-target') === activeId);
          });
        },
        { rootMargin: '-80px 0px -60% 0px' },
      );

      Object.keys(headingMap).forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer!.observe(el);
      });
    }

    return {
      init() {
        scheduleIdle(generate, 200);
      },
      dispose() {
        if (observer) {
          observer.disconnect();
          observer = null;
        }
      },
    };
  }

  /* =================================================================
     Image Lightbox
     ================================================================= */
  function LightboxModule(): Module {
    const lb = $('img-lightbox');
    if (!lb) return { init() {}, dispose() {} };
    const lbImg = lb.querySelector('img')!;
    const lbClose = lb.querySelector('.lb-close') as HTMLElement | null;
    let escHandler: ((e: KeyboardEvent) => void) | undefined;
    let clickHandler: ((e: MouseEvent) => void) | undefined;

    function open(src: string, alt: string) {
      lbImg.src = src;
      lbImg.alt = alt || '';
      lb.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      lb.classList.remove('active');
      document.body.style.overflow = '';
    }

    return {
      init() {
        escHandler = (e) => {
          if (e.key === 'Escape' && lb.classList.contains('active')) close();
        };
        clickHandler = (e) => {
          if (e.target === lb || e.target === lbClose) close();
        };
        lb.addEventListener('click', clickHandler);
        if (lbClose) lbClose.addEventListener('click', close);
        document.addEventListener('keydown', escHandler);
        document.querySelectorAll('.prose img').forEach((img) => {
          if (img.hasAttribute('data-lb')) return;
          img.setAttribute('data-lb', '1');
          img.addEventListener('click', (e) => {
            e.preventDefault();
            open((img as HTMLImageElement).src, (img as HTMLImageElement).alt || '');
          });
        });
      },
      dispose() {
        if (clickHandler) lb.removeEventListener('click', clickHandler);
        if (lbClose) lbClose.removeEventListener('click', close);
        if (escHandler) document.removeEventListener('keydown', escHandler);
      },
    };
  }

  /* =================================================================
     Link Preview — delegated, memory-bounded
     ================================================================= */
  function LinkPreviewModule(): Module {
    const cache = new Map<string, { title: string; excerpt: string; words: number }>();
    let activeHref: string | null = null;
    let hoverTimer: number | null = null;
    let hideTimer: number | null = null;
    let boundOver: ((e: MouseEvent) => void) | undefined;
    let boundOut: ((e: MouseEvent) => void) | undefined;

    function scheduleHide() {
      if (hoverTimer !== null) clearTimeout(hoverTimer);
      if (hideTimer !== null) clearTimeout(hideTimer);
      activeHref = null;
      hideTimer = setTimeout(hide, CFG.PREVIEW_HIDE_DELAY);
    }

    function hide() {
      const card = $('linkPreviewCard');
      if (card) card.style.display = 'none';
      activeHref = null;
    }

    function resolveUrl(h: string): string {
      return new URL(h, window.location.href).href;
    }

    function show(anchor: HTMLAnchorElement, href: string) {
      const card = $('linkPreviewCard');
      if (!card) return;
      if (cache.has(href)) {
        render(anchor, cache.get(href)!);
        return;
      }
      showLoader(anchor);
      fetch(resolveUrl(href))
        .then((r) => {
          if (!r.ok) throw Error('404');
          return r.text();
        })
        .then((text) => {
          let title = '',
            excerpt = '';
          const t1 = text.match(/<title[^>]*>([^<]*)<\/title>/i);
          if (t1) title = t1[1].trim();
          const h1 = text.match(/<h1[^>]*>([^<]*)<\/h1>/i);
          if (h1) title = h1[1].trim();
          const p = text.match(/<p[^>]*>([^<]{20,})<\/p>/i);
          if (p)
            excerpt = p[1]
              .trim()
              .replace(/<[^>]+>/g, '')
              .substring(0, 200);
          const result = {
            title: title || 'Untitled',
            excerpt: excerpt || 'No preview',
            words: (title + ' ' + excerpt).length,
          };
          cache.set(href, result);
          if (cache.size > CFG.PREVIEW_CACHE_MAX) cache.delete(cache.keys().next().value!);
          if (activeHref === href) render(anchor, result);
        })
        .catch(() => {
          if (activeHref === href) hide();
        });
    }

    function showLoader(a: HTMLAnchorElement) {
      const card = $('linkPreviewCard');
      if (!card) return;
      card.innerHTML = '<div class="lp-loader">Loading preview...</div>';
      position(card, a);
      card.style.display = 'block';
    }

    function render(a: HTMLAnchorElement, p: { title: string; excerpt: string; words: number }) {
      const card = $('linkPreviewCard');
      if (!card) return;
      card.innerHTML =
        '<div class="lp-title">' +
        escHTML(p.title) +
        '</div><div class="lp-excerpt">' +
        escHTML(p.excerpt) +
        '</div><div class="lp-meta"><span>' +
        p.words +
        ' chars</span></div>';
      position(card, a);
      card.style.display = 'block';
    }

    function position(card: HTMLElement, a: HTMLElement) {
      const r = a.getBoundingClientRect(),
        l = r.left,
        t = r.bottom + 8;
      const cw = window.innerWidth < 768 ? 280 : 380;
      let left = l;
      if (left + cw > window.innerWidth - 16) left = window.innerWidth - cw - 16;
      if (left < 16) left = 16;
      let top = t;
      if (top + 120 > window.innerHeight - 16) top = Math.max(16, r.top - 128);
      card.style.left = left + 'px';
      card.style.top = top + 'px';
      card.style.maxWidth = cw + 'px';
    }

    function shouldPreview(href: string): boolean {
      if (!href || href.startsWith('http') || href.startsWith('#') || href === 'javascript:void(0)')
        return false;
      if (
        href.endsWith('.md') ||
        href.endsWith('.markdown') ||
        href.endsWith('.html') ||
        href.endsWith('.htm')
      )
        return true;
      if (href.indexOf('.') === -1) return true;
      return false;
    }

    return {
      init() {
        boundOver = (e) => {
          const a = (e.target as Element).closest('a') as HTMLAnchorElement | null;
          if (!a) {
            scheduleHide();
            return;
          }
          const href = a.getAttribute('href') || '';
          if (!shouldPreview(href)) {
            scheduleHide();
            return;
          }
          activeHref = href;
          if (hoverTimer !== null) clearTimeout(hoverTimer);
          if (hideTimer !== null) clearTimeout(hideTimer);
          hoverTimer = setTimeout(() => {
            show(a, href);
          }, CFG.PREVIEW_DEBOUNCE);
        };
        boundOut = (e) => {
          const a = (e.target as Element).closest('a') as HTMLAnchorElement | null;
          if (!a || (a.getAttribute('href') || '') === activeHref) scheduleHide();
        };
        document.addEventListener('mouseover', boundOver, { passive: true });
        document.addEventListener('mouseout', boundOut, { passive: true });
      },
      dispose() {
        if (boundOver) document.removeEventListener('mouseover', boundOver);
        if (boundOut) document.removeEventListener('mouseout', boundOut);
        cache.clear();
        activeHref = null;
      },
    };
  }

  /* =================================================================
     Keyboard Shortcuts + Search
     ================================================================= */
  function KeyboardModule(): Module {
    let handler: ((e: KeyboardEvent) => void) | undefined;
    return {
      init() {
        handler = (e) => {
          const tag = ((e.target as HTMLElement)?.tagName || '').toLowerCase();
          const isInput =
            tag === 'input' || tag === 'textarea' || (e.target as HTMLElement)?.isContentEditable;
          if (e.key === 'Escape') {
            closeSearch();
            const sp = $('shortcuts-panel');
            if (sp) sp.classList.add('float-panel-closed');
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openSearch();
            return;
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            if (window.__theme && typeof window.__theme.toggle === 'function')
              window.__theme.toggle();
            return;
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
          }
          if (e.key === '/' && !isInput) {
            e.preventDefault();
            openSearch();
            return;
          }
          if (e.key === '?' && !isInput) {
            e.preventDefault();
            const sp = $('shortcuts-panel');
            if (sp) sp.classList.remove('float-panel-closed');
            return;
          }
        };
        document.addEventListener('keydown', handler);
      },
      dispose() {
        if (handler) document.removeEventListener('keydown', handler);
      },
    };
  }

  /* Theme change — toast notification */
  window.addEventListener('theme-change', ((e: CustomEvent) => {
    toast(e.detail.dark ? '已切换到深色模式' : '已切换到浅色模式', 'info');
    try {
      const bg =
        getComputedStyle(document.body).getPropertyValue('--page-bg').trim() ||
        getComputedStyle(document.body).getPropertyValue('--wl-bg').trim();
      if (typeof window.__animateWave === 'function') {
        window.__animateWave(bg || (e.detail.dark ? '#08080f' : '#f0ede8'));
      }
    } catch (err) {
      /* ignore */
    }
  }) as EventListener);

  /* Search */
  function openSearch() {
    const overlay = $('searchModalOverlay'),
      input = $('searchModalInput') as HTMLInputElement | null,
      results = $('searchResults');
    if (!overlay) return;
    overlay.classList.remove('float-panel-closed');
    if (input) {
      input.value = '';
      setTimeout(() => input.focus(), 100);
    }
    if (results) results.innerHTML = '<div class="search-no-results">输入关键词开始搜索...</div>';
    window.__searchSelectedIdx = -1;
  }

  function closeSearch() {
    const overlay = $('searchModalOverlay');
    if (overlay) overlay.classList.add('float-panel-closed');
    window.__searchSelectedIdx = -1;
  }

  function performSearch(kw: string) {
    const results = $('searchResults');
    if (!results) return;
    results.innerHTML = '';
    if (!kw || !kw.trim()) {
      results.innerHTML = '<div class="search-no-results">输入关键词开始搜索...</div>';
      return;
    }
    const c = document.querySelector('.prose') || document.querySelector('main');
    if (!c) {
      results.innerHTML = '<div class="search-no-results">暂无内容</div>';
      return;
    }
    const blocks = c.querySelectorAll('p,li,td,th,h1,h2,h3,h4,h5,h6');
    const esc = escapeRegex(kw),
      re = new RegExp(esc, 'gi');
    const seen = new Set<Element>();
    let count = 0;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (
        b.closest('pre') ||
        b.closest('.code-block-wrapper') ||
        b.closest('.search-modal') ||
        b.closest('.code-line-numbers')
      )
        continue;
      if (seen.has(b)) continue;
      const text = b.textContent || '';
      re.lastIndex = 0;
      if (!re.test(text)) continue;
      seen.add(b);
      count++;
      re.lastIndex = 0;
      const match = re.exec(text),
        idx = match ? match.index : 0,
        len = match ? match[0].length : 0;
      const start = Math.max(0, idx - 40),
        end = Math.min(text.length, idx + len + 40);
      const excerpt =
        (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
      const div = document.createElement('div');
      div.className = 'search-result-item';
      div.innerHTML = excerpt.replace(new RegExp(esc, 'gi'), '<mark>$&</mark>');
      div.addEventListener('click', ((block: Element) => {
        return () => {
          closeSearch();
          block.scrollIntoView({ behavior: 'smooth', block: 'center' });
        };
      })(b));
      results.appendChild(div);
    }
    if (count === 0) results.innerHTML = '<div class="search-no-results">未找到匹配内容</div>';
    window.__searchSelectedIdx = -1;
  }

  function handleSearchKb(e: KeyboardEvent) {
    const items = document.querySelectorAll('#searchResults .search-result-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      window.__searchSelectedIdx = Math.min(
        (window.__searchSelectedIdx || 0) + 1,
        items.length - 1,
      );
      selectSearchItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      window.__searchSelectedIdx = Math.max((window.__searchSelectedIdx || 0) - 1, 0);
      selectSearchItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (window.__searchSelectedIdx! >= 0 && items[window.__searchSelectedIdx!])
        (items[window.__searchSelectedIdx!] as HTMLElement).click();
    }
  }

  function selectSearchItem(items: NodeListOf<Element>) {
    for (let i = 0; i < items.length; i++) {
      items[i].classList.toggle('selected', i === window.__searchSelectedIdx);
      if (i === window.__searchSelectedIdx)
        (items[i] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  }

  /* =================================================================
     Orchestrator — lazy init, lifecycle, graceful degradation
     ================================================================= */
  const modules: Record<string, Module> = {};

  function initAll() {
    // Critical path — run immediately
    const navbar = NavbarModule();
    modules.navbar = navbar;
    navbar.init();
    onDispose(() => navbar.dispose());

    window.addEventListener('scroll', onScroll, { passive: true });

    const btt = $('back-to-top');
    if (btt) {
      btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
      onDispose(() => btt.removeEventListener('click', () => {}));
    }

    // Search UI bindings
    const searchBtn = document.getElementById('search-trigger-btn');
    if (searchBtn) searchBtn.addEventListener('click', openSearch);
    const searchClose = $('searchModalClose');
    if (searchClose) searchClose.addEventListener('click', closeSearch);
    const searchOverlay = $('searchModalOverlay');
    if (searchOverlay)
      searchOverlay.addEventListener('click', (e) => {
        if (e.target === searchOverlay) closeSearch();
      });
    const searchInput = $('searchModalInput') as HTMLInputElement | null;
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        performSearch(this.value);
      });
      searchInput.addEventListener('keydown', (e) => handleSearchKb(e));
    }
    const sp = $('shortcuts-panel');
    if (sp)
      sp.addEventListener('click', (e) => {
        if (e.target === sp) sp.classList.add('float-panel-closed');
      });

    // Keyboard shortcuts (always active)
    const kb = KeyboardModule();
    modules.kb = kb;
    kb.init();
    onDispose(() => kb.dispose());

    updateProgressBar();
    updateBackToTop();
    restoreReadingPosition();

    // Deferred — run during idle periods
    const codeBlocks = CodeBlockModule();
    modules.codeBlocks = codeBlocks;
    codeBlocks.init();

    const headingAnchors = HeadingAnchorModule();
    modules.headingAnchors = headingAnchors;
    headingAnchors.init();

    const toc = TOCModule();
    modules.toc = toc;
    toc.init();
    onDispose(() => toc.dispose());

    const lightbox = LightboxModule();
    modules.lightbox = lightbox;
    lightbox.init();
    onDispose(() => lightbox.dispose());

    const linkPreview = LinkPreviewModule();
    modules.linkPreview = linkPreview;
    linkPreview.init();
    onDispose(() => linkPreview.dispose());

    // Resize handler
    window.addEventListener('resize', () => {
      if (window.__waveAnimId) {
        const cvs = document.getElementById('theme-wave-canvas') as HTMLCanvasElement | null;
        if (cvs) {
          cvs.width = window.innerWidth;
          cvs.height = window.innerHeight;
        }
      }
    });
  }

  /* =================================================================
     Bootstrap
     ================================================================= */
  window.__disposeApp = disposeAll;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  /* Re-initialize content-dependent modules on client-side navigation */
  document.addEventListener('astro:after-swap', () => {
    if (modules.codeBlocks) {
      modules.codeBlocks.dispose();
    }
    if (modules.headingAnchors) {
      modules.headingAnchors.dispose();
    }
    if (modules.toc) {
      modules.toc.dispose();
    }
    if (modules.lightbox) {
      modules.lightbox.dispose();
    }

    modules.codeBlocks = CodeBlockModule();
    modules.codeBlocks.init();
    modules.headingAnchors = HeadingAnchorModule();
    modules.headingAnchors.init();
    modules.toc = TOCModule();
    modules.toc.init();
    onDispose(() => modules.toc.dispose());
    modules.lightbox = LightboxModule();
    modules.lightbox.init();
    onDispose(() => modules.lightbox.dispose());

    // Re-bind UI elements that are swapped by ClientRouter
    const searchBtn = document.getElementById('search-trigger-btn');
    if (searchBtn && !(searchBtn as any)._searchBound) {
      (searchBtn as any)._searchBound = true;
      searchBtn.addEventListener('click', openSearch);
    }
    const searchClose = document.getElementById('searchModalClose');
    if (searchClose && !(searchClose as any)._searchBound) {
      (searchClose as any)._searchBound = true;
      searchClose.addEventListener('click', closeSearch);
    }
    const searchOverlay = document.getElementById('searchModalOverlay');
    if (searchOverlay && !(searchOverlay as any)._overlayBound) {
      (searchOverlay as any)._overlayBound = true;
      searchOverlay.addEventListener('click', (e) => {
        if (e.target === searchOverlay) closeSearch();
      });
    }
    const searchInput = document.getElementById('searchModalInput') as HTMLInputElement | null;
    if (searchInput && !(searchInput as any)._inputBound) {
      (searchInput as any)._inputBound = true;
      searchInput.addEventListener('input', function () {
        performSearch(this.value);
      });
      searchInput.addEventListener('keydown', (e) => handleSearchKb(e));
    }
    const sp = document.getElementById('shortcuts-panel');
    if (sp && !(sp as any)._spBound) {
      (sp as any)._spBound = true;
      sp.addEventListener('click', (e) => {
        if (e.target === sp) sp.classList.add('float-panel-closed');
      });
    }

    updateProgressBar();
    updateBackToTop();
    restoreReadingPosition();
  });
})();
