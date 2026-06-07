/**
 * Soren's Blog — Client App Logic
 * Enterprise-grade architecture with module lifecycle, IntersectionObserver,
 * lazy initialization, and memory-efficient patterns.
 */
(function() {
  'use strict';

  // Guard: only initialize once. ClientRouter swaps body, which may re-execute
  // external scripts. All per-navigation re-init is handled via astro:after-swap.
  if (window.__appInitialized) return;
  window.__appInitialized = true;

  /* =================================================================
     Core — Config, Helpers, Dispose Registry
     ================================================================= */
  var CFG = {
    TOAST_DURATION: 2400,
    CODE_COPIED_DURATION: 2000,
    SCROLL_SAVE_DEBOUNCE: 500,
    BACK_TO_TOP_THRESHOLD: 400,
    TOC_MIN_HEADINGS: 2,
    WAVE_DURATION: 1000,
    WAVE_FREQ: 2.2,
    WAVE_MAX_AMP: 65,
    WAVE_HARMONICS: [{mult:1.0,amp:1.0},{mult:2.3,amp:0.25},{mult:4.7,amp:0.1}],
    PREVIEW_CACHE_MAX: 25,
    PREVIEW_DEBOUNCE: 350,
    PREVIEW_HIDE_DELAY: 200,
    READING_POSITION_KEY: 'blog_reading_pos'
  };

  /* Dispose registry — every module registers cleanup here */
  var disposers = [];
  function onDispose(fn) { disposers.push(fn); }
  function disposeAll() {
    for (var i = disposers.length - 1; i >= 0; i--) {
      try { disposers[i](); } catch(e) {}
    }
    disposers.length = 0;
  }

  function $(id) { return document.getElementById(id); }

  function toast(msg, type) {
    type = type || 'info';
    var container = $('toast-container');
    if (!container) return;
    var el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(function() { if (el.parentNode) el.remove(); }, CFG.TOAST_DURATION);
  }

  function freezeTransitions(el) {
    el.classList.add('no-transition');
    return function unfreeze() {
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          el.classList.remove('no-transition');
        });
      });
    };
  }

  function copyToClipboard(text, cb) {
    var done = function() { if (cb) cb(); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function() { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, cb) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(ta);
    if (cb) cb();
  }

  function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function randomId() { return Math.random().toString(36).substr(2, 8); }
  function escHTML(str) { var d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

  /* Schedule non-critical work for idle periods */
  function scheduleIdle(fn, timeout) {
    if (typeof requestIdleCallback === 'function') {
      return requestIdleCallback(fn, { timeout: timeout || 1000 });
    }
    return setTimeout(fn, timeout || 200);
  }

  /* =================================================================
     Wave Animation (exposed for theme toggle)
     ================================================================= */
  window.__animateWave = function(fillColor, onComplete) {
    // Re-query on every call — ClientRouter swaps the canvas element on navigation
    var canvas = document.getElementById('theme-wave-canvas');
    if (!canvas) { if (onComplete) onComplete(); return; }
    var ctx = canvas.__waveCtx || (canvas.__waveCtx = canvas.getContext('2d', { alpha: true }));
    if (!ctx) { if (onComplete) onComplete(); return; }
    if (window.__waveAnimId) { cancelAnimationFrame(window.__waveAnimId); window.__waveAnimId = null; }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.display = 'block';
    var w = canvas.width, h = canvas.height;
    var freq = CFG.WAVE_FREQ, maxAmp = CFG.WAVE_MAX_AMP, harmonics = CFG.WAVE_HARMONICS;
    var dur = CFG.WAVE_DURATION, st = performance.now();

    (function frame(now) {
      var raw = Math.min((now - st) / dur, 1);
      var eased = 1 - Math.pow(1 - raw, 4);
      var waveY = -maxAmp + eased * (h + maxAmp * 2);
      var ampEnvelope = Math.sin(eased * Math.PI);
      var amp = maxAmp * ampEnvelope;
      var steps = Math.max(2, Math.floor(w / 1.5));
      var ps = eased * Math.PI * 1.8;

      ctx.clearRect(0, 0, w, h);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (var i = 0; i <= steps; i++) {
        var x = (i / steps) * w;
        var phase = (i / steps) * Math.PI * 2 * freq + ps;
        var yOff = 0;
        for (var j = 0; j < harmonics.length; j++) {
          yOff += Math.sin(phase * harmonics[j].mult) * amp * harmonics[j].amp;
        }
        ctx.lineTo(x, waveY + yOff);
      }
      ctx.lineTo(w, h); ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.save();
      ctx.clip();
      var gT = waveY - amp - 10, gB = waveY + amp + 80;
      var grd = ctx.createLinearGradient(0, gT, 0, gB);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(0.3, 'rgba(0,0,0,0)');
      grd.addColorStop(0.6, 'rgba(0,0,0,0.10)');
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, gT, w, gB - gT);
      ctx.restore();
      ctx.beginPath();
      for (var k = 0; k <= steps; k++) {
        var x2 = (k / steps) * w;
        var p2 = (k / steps) * Math.PI * 2 * freq + ps;
        var y2 = 0;
        for (var m = 0; m < harmonics.length; m++) { y2 += Math.sin(p2 * harmonics[m].mult) * amp * harmonics[m].amp; }
        if (k === 0) ctx.moveTo(x2, waveY + y2); else ctx.lineTo(x2, waveY + y2);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.20)'; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath();
      for (var k2 = 0; k2 <= steps; k2++) {
        var x3 = (k2 / steps) * w;
        var p3 = (k2 / steps) * Math.PI * 2 * freq + ps;
        var y3 = 0;
        for (var m2 = 0; m2 < harmonics.length; m2++) { y3 += Math.sin(p3 * harmonics[m2].mult) * amp * harmonics[m2].amp; }
        if (k2 === 0) ctx.moveTo(x3, waveY + y3 - 1.0); else ctx.lineTo(x3, waveY + y3 - 1.0);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.38)'; ctx.lineWidth = 0.5; ctx.stroke();

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
    var bar = $('page-progress-bar');
    if (!bar) return;
    var dh = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = dh <= 0 ? '0%' : Math.min(100, Math.max(0, (window.scrollY / dh) * 100)) + '%';
  }

  function updateBackToTop() {
    var btn = $('back-to-top');
    if (!btn) return;
    var v = window.scrollY > CFG.BACK_TO_TOP_THRESHOLD;
    btn.classList.toggle('visible', v);
    if (v) {
      var dh = document.documentElement.scrollHeight - window.innerHeight;
      btn.style.setProperty('--scroll-pct', dh > 0 ? Math.min(100, Math.round((window.scrollY / dh) * 100)) + '%' : '0%');
    }
  }

  var saveTimer = null;
  function saveReadingPosition() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function() {
      try {
        localStorage.setItem(CFG.READING_POSITION_KEY, JSON.stringify({
          scrollY: window.scrollY, pageKey: window.location.pathname, timestamp: Date.now()
        }));
      } catch(e) {}
    }, CFG.SCROLL_SAVE_DEBOUNCE);
  }

  function restoreReadingPosition() {
    try {
      var r = localStorage.getItem(CFG.READING_POSITION_KEY);
      if (!r) return;
      var d = JSON.parse(r);
      if (d.pageKey === window.location.pathname && typeof d.scrollY === 'number') {
        setTimeout(function() { window.scrollTo({ top: d.scrollY, behavior: 'instant' }); }, 150);
      }
    } catch(e) {}
  }

  /* Unified scroll handler — only progress bar, back-to-top, position save.
     TOC highlighting is handled by IntersectionObserver (zero scroll cost). */
  var scrollRAF = null;
  function onScroll() {
    if (scrollRAF) return;
    scrollRAF = requestAnimationFrame(function() {
      scrollRAF = null;
      updateProgressBar();
      updateBackToTop();
      saveReadingPosition();
    });
  }

  /* =================================================================
     Navbar Scroll Detection
     ================================================================= */
  function NavbarModule() {
    var navbar = document.getElementById('navbar');
    if (!navbar) return { init: function(){}, dispose: function(){} };
    var mode = navbar.getAttribute('data-transparent-mode');
    if (mode !== 'semifull') {
      navbar.setAttribute('data-dynamic-transparent', mode === 'full' ? 'full' : 'semi');
    }
    var ticking = false;
    function update() {
      if (mode === 'semifull') {
        var scrolled = window.scrollY > 50;
        navbar.classList.toggle('scrolled', scrolled);
        navbar.setAttribute('data-dynamic-transparent', scrolled ? 'semi' : 'semifull');
      }
      ticking = false;
    }
    var boundScroll = function() {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    };
    window.addEventListener('scroll', boundScroll, { passive: true });
    update();
    return {
      init: function() {},
      dispose: function() { window.removeEventListener('scroll', boundScroll); }
    };
  }

  /* =================================================================
     Code Block Enhancement (lazy)
     ================================================================= */
  function CodeBlockModule() {
    var done = false;

    function enhance() {
      if (done) return;
      done = true;
      populateCodeHeaders();
      document.querySelectorAll('.prose pre').forEach(wrapPre);
      document.querySelectorAll('.code-block-wrapper pre').forEach(addLineNums);
      addCollapsible();
    }

    var LANG_NAMES = {
      'apache': 'Apache', 'bash': 'Bash', 'c': 'C', 'c++': 'C++', 'cpp': 'C++', 'csharp': 'C#',
      'css': 'CSS', 'dart': 'Dart', 'diff': 'Diff', 'dockerfile': 'Dockerfile', 'elixir': 'Elixir',
      'go': 'Go', 'graphql': 'GraphQL', 'haskell': 'Haskell', 'html': 'HTML', 'ini': 'INI',
      'java': 'Java', 'javascript': 'JavaScript', 'js': 'JavaScript', 'json': 'JSON', 'jsx': 'JSX',
      'kotlin': 'Kotlin', 'lua': 'Lua', 'makefile': 'Makefile', 'markdown': 'Markdown', 'md': 'Markdown',
      'mdx': 'MDX', 'mysql': 'MySQL', 'nginx': 'Nginx', 'perl': 'Perl', 'php': 'PHP',
      'powershell': 'PowerShell', 'python': 'Python', 'r': 'R', 'ruby': 'Ruby', 'rust': 'Rust',
      'scala': 'Scala', 'scss': 'SCSS', 'sh': 'Shell', 'shell': 'Shell', 'sql': 'SQL',
      'svg': 'SVG', 'swift': 'Swift', 'toml': 'TOML', 'ts': 'TypeScript', 'tsx': 'TSX',
      'typescript': 'TypeScript', 'xml': 'XML', 'yaml': 'YAML', 'yml': 'YAML'
    };

    function populateCodeHeaders() {
      document.querySelectorAll('.frame pre[data-language]').forEach(function(pre) {
        var frame = pre.closest('.frame');
        if (!frame) return;
        var header = frame.querySelector('.header');
        if (!header || header.textContent.trim()) return;
        var lang = pre.getAttribute('data-language');
        var name = LANG_NAMES[lang.toLowerCase()] || lang;
        header.textContent = name;
      });
    }

    function wrapPre(pre) {
      if (pre.parentNode.classList.contains('code-block-wrapper')) return;
      if (pre.closest('.expressive-code')) return;
      var code = pre.querySelector('code'), lang = '';
      if (code && code.className) {
        var m = code.className.match(/lang(?:uage)?-(\w+)/);
        if (m) lang = m[1];
      }
      var w = document.createElement('div');
      w.className = 'code-block-wrapper';
      var tb = document.createElement('div');
      tb.className = 'code-toolbar';
      tb.innerHTML = '<span class="code-lang">' + (lang || 'code') + '</span>';
      var btn = document.createElement('button');
      btn.className = 'code-copy-btn';
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
      btn.addEventListener('click', function() {
        copyToClipboard(pre.textContent || '', function() {
          btn.classList.add('copied');
          btn.innerHTML = '&#10003; Copied';
          toast('代码已复制', 'success');
          setTimeout(function() {
            btn.classList.remove('copied');
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy';
          }, CFG.CODE_COPIED_DURATION);
        });
      });
      tb.appendChild(btn);
      w.appendChild(tb);
      pre.parentNode.insertBefore(w, pre);
      w.appendChild(pre);
    }

    function addLineNums(pre) {
      if (pre.querySelector('.code-line-numbers')) return;
      var code = pre.querySelector('code');
      if (!code) return;
      var lines = (code.textContent || '').split('\n');
      if (lines.length > 1 && lines[lines.length - 1].trim() === '') lines.pop();
      var h = '';
      for (var i = 0; i < lines.length; i++) h += '<span>' + (i + 1) + '</span>';
      var ln = document.createElement('div');
      ln.className = 'code-line-numbers';
      ln.innerHTML = h;
      pre.insertBefore(ln, pre.firstChild);
    }

    function addCollapsible() {
      var THRESHOLD = 280;
      document.querySelectorAll('.code-block-wrapper').forEach(function(wrapper) {
        if (wrapper.querySelector('.code-expand-btn')) return;
        var pre = wrapper.querySelector('pre');
        if (!pre || pre.scrollHeight <= THRESHOLD) return;
        wrapper.classList.add('collapsed');
        var btn = document.createElement('button');
        btn.className = 'code-expand-btn';
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg> 展开代码';
        btn.addEventListener('click', function() {
          var collapsed = wrapper.classList.toggle('collapsed');
          btn.classList.toggle('expanded', !collapsed);
          btn.innerHTML = collapsed
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg> 展开代码'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg> 收起代码';
        });
        wrapper.appendChild(btn);
      });
    }

    return {
      init: function() {
        scheduleIdle(enhance, 300);
      },
      dispose: function() { done = true; }
    };
  }

  /* =================================================================
     Heading Anchors (lazy)
     ================================================================= */
  function HeadingAnchorModule() {
    function add() {
      var c = document.querySelector('.prose') || document.querySelector('.markdown-section');
      if (!c) return;
      c.querySelectorAll('h1,h2,h3,h4').forEach(function(h) {
        if (h.querySelector('.heading-anchor')) return;
        if (!h.id) h.id = 'h-' + randomId();
        var a = document.createElement('a');
        a.className = 'heading-anchor';
        a.innerHTML = '#';
        a.title = '复制链接';
        a.href = 'javascript:void(0)';
        a.addEventListener('click', function(e) {
          e.preventDefault(); e.stopPropagation();
          copyToClipboard(window.location.origin + window.location.pathname + '#' + h.id, function() {
            toast('链接已复制', 'success');
          });
        });
        h.appendChild(a);
      });
    }
    return { init: function() { scheduleIdle(add, 500); }, dispose: function() {} };
  }

  /* =================================================================
     TOC Generation + IntersectionObserver Highlighting
     ================================================================= */
  function TOCModule() {
    var observer = null;
    var links = [];

    function generate() {
      var container = document.getElementById('toc-container');
      if (!container) return;
      var c = document.querySelector('.prose') || document.querySelector('.markdown-section');
      if (!c) { container.innerHTML = ''; return; }
      var hs = c.querySelectorAll('h1,h2,h3');
      if (hs.length < CFG.TOC_MIN_HEADINGS) { container.innerHTML = ''; return; }
      var html = '<div class="font-semibold text-xs uppercase tracking-wider text-[var(--text-muted)] mb-2 px-2">目录</div>';
      hs.forEach(function(h, i) {
        if (!h.id) h.id = 'toc-' + i;
        var levelClass = 'toc-' + h.tagName.toLowerCase();
        html += '<a href="#' + h.id + '" class="toc-link ' + levelClass + '" data-target="' + h.id + '">' + h.textContent.trim() + '</a>';
      });
      container.innerHTML = html;
      links = [];
      container.querySelectorAll('a').forEach(function(a) {
        a.addEventListener('click', function(e) {
          e.preventDefault();
          var t = document.getElementById(a.getAttribute('data-target'));
          if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        links.push(a);
      });
      observe();
    }

    function observe() {
      if (observer) observer.disconnect();
      if (!links.length) return;
      var headingMap = {};
      links.forEach(function(a) {
        var id = a.getAttribute('data-target');
        if (id) headingMap[id] = a;
      });
      var visible = {};
      observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          visible[entry.target.id] = entry.isIntersecting;
        });
        // Find the first visible heading (top-down)
        var activeId = null;
        for (var i = 0; i < links.length; i++) {
          var id = links[i].getAttribute('data-target');
          if (visible[id]) { activeId = id; break; }
        }
        links.forEach(function(a) {
          a.classList.toggle('active', a.getAttribute('data-target') === activeId);
        });
      }, { rootMargin: '-80px 0px -60% 0px' });

      Object.keys(headingMap).forEach(function(id) {
        var el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }

    return {
      init: function() { scheduleIdle(generate, 200); },
      dispose: function() { if (observer) { observer.disconnect(); observer = null; } }
    };
  }

  /* =================================================================
     Image Lightbox
     ================================================================= */
  function LightboxModule() {
    var lb = $('img-lightbox');
    if (!lb) return { init: function(){}, dispose: function(){} };
    var lbImg = lb.querySelector('img');
    var lbClose = lb.querySelector('.lb-close');
    var escHandler, clickHandler;

    function open(src, alt) {
      if (!lbImg) return;
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
      init: function() {
        escHandler = function(e) { if (e.key === 'Escape' && lb.classList.contains('active')) close(); };
        clickHandler = function(e) {
          if (e.target === lb || e.target === lbClose) close();
        };
        lb.addEventListener('click', clickHandler);
        if (lbClose) lbClose.addEventListener('click', close);
        document.addEventListener('keydown', escHandler);
        document.querySelectorAll('.prose img').forEach(function(img) {
          if (img.hasAttribute('data-lb')) return;
          img.setAttribute('data-lb', '1');
          img.addEventListener('click', function(e) { e.preventDefault(); open(img.src, img.alt || ''); });
        });
      },
      dispose: function() {
        lb.removeEventListener('click', clickHandler);
        if (lbClose) lbClose.removeEventListener('click', close);
        if (escHandler) document.removeEventListener('keydown', escHandler);
      }
    };
  }

  /* =================================================================
     Link Preview — delegated, memory-bounded
     ================================================================= */
  function LinkPreviewModule() {
    var cache = new Map();
    var activeHref = null;
    var hoverTimer = null;
    var hideTimer = null;
    var boundOver, boundOut;

    function scheduleHide() {
      clearTimeout(hoverTimer);
      clearTimeout(hideTimer);
      activeHref = null;
      hideTimer = setTimeout(hide, CFG.PREVIEW_HIDE_DELAY);
    }

    function hide() {
      var card = $('linkPreviewCard');
      if (card) card.style.display = 'none';
      activeHref = null;
    }

    function resolveUrl(h) { return new URL(h, window.location.href).href; }

    function show(anchor, href) {
      var card = $('linkPreviewCard');
      if (!card) return;
      if (cache.has(href)) { render(anchor, cache.get(href)); return; }
      showLoader(anchor);
      fetch(resolveUrl(href)).then(function(r) { if (!r.ok) throw Error('404'); return r.text(); })
        .then(function(text) {
          var title = '', excerpt = '';
          var t1 = text.match(/<title[^>]*>([^<]*)<\/title>/i);
          if (t1) title = t1[1].trim();
          var h1 = text.match(/<h1[^>]*>([^<]*)<\/h1>/i);
          if (h1) title = h1[1].trim();
          var p = text.match(/<p[^>]*>([^<]{20,})<\/p>/i);
          if (p) excerpt = p[1].trim().replace(/<[^>]+>/g, '').substring(0, 200);
          var result = { title: title || 'Untitled', excerpt: excerpt || 'No preview', words: (title + ' ' + excerpt).length };
          cache.set(href, result);
          if (cache.size > CFG.PREVIEW_CACHE_MAX) cache.delete(cache.keys().next().value);
          if (activeHref === href) render(anchor, result);
        }).catch(function() { if (activeHref === href) hide(); });
    }

    function showLoader(a) {
      var card = $('linkPreviewCard');
      if (!card) return;
      card.innerHTML = '<div class="lp-loader">Loading preview...</div>';
      position(card, a);
      card.style.display = 'block';
    }

    function render(a, p) {
      var card = $('linkPreviewCard');
      if (!card) return;
      card.innerHTML = '<div class="lp-title">' + escHTML(p.title) + '</div><div class="lp-excerpt">' + escHTML(p.excerpt) + '</div><div class="lp-meta"><span>' + p.words + ' chars</span></div>';
      position(card, a);
      card.style.display = 'block';
    }

    function position(card, a) {
      var r = a.getBoundingClientRect(), l = r.left, t = r.bottom + 8, cw = window.innerWidth < 768 ? 280 : 380;
      if (l + cw > window.innerWidth - 16) l = window.innerWidth - cw - 16;
      if (l < 16) l = 16;
      if (t + 120 > window.innerHeight - 16) t = Math.max(16, r.top - 128);
      card.style.left = l + 'px';
      card.style.top = t + 'px';
      card.style.maxWidth = cw + 'px';
    }

    function shouldPreview(href) {
      if (!href || href.startsWith('http') || href.startsWith('#') || href === 'javascript:void(0)') return false;
      if (href.endsWith('.md') || href.endsWith('.markdown') || href.endsWith('.html') || href.endsWith('.htm')) return true;
      if (href.indexOf('.') === -1) return true; // clean paths like /docs/foo
      return false;
    }

    return {
      init: function() {
        var self = this;
        boundOver = function(e) {
          var a = e.target.closest('a');
          if (!a) { scheduleHide(); return; }
          var href = a.getAttribute('href') || '';
          if (!shouldPreview(href)) { scheduleHide(); return; }
          activeHref = href;
          clearTimeout(hoverTimer);
          clearTimeout(hideTimer);
          hoverTimer = setTimeout(function() { show(a, href); }, CFG.PREVIEW_DEBOUNCE);
        };
        boundOut = function(e) {
          var a = e.target.closest('a');
          if (!a || (a.getAttribute('href') || '') === activeHref) scheduleHide();
        };
        document.addEventListener('mouseover', boundOver, { passive: true });
        document.addEventListener('mouseout', boundOut, { passive: true });
      },
      dispose: function() {
        document.removeEventListener('mouseover', boundOver);
        document.removeEventListener('mouseout', boundOut);
        cache.clear();
        activeHref = null;
      }
    };
  }

  /* =================================================================
     Keyboard Shortcuts + Search
     ================================================================= */
  function KeyboardModule() {
    var handler;
    return {
      init: function() {
        handler = function(e) {
          var tag = (e.target.tagName || '').toLowerCase();
          var isInput = tag === 'input' || tag === 'textarea' || e.target.isContentEditable;
          if (e.key === 'Escape') {
            closeSearch();
            var sp = $('shortcuts-panel');
            if (sp) sp.classList.remove('active');
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openSearch(); return; }
          if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); if (window.__theme && typeof window.__theme.toggle === 'function') window.__theme.toggle(); return; }
          if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowUp') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
          if (e.key === '/' && !isInput) { e.preventDefault(); openSearch(); return; }
          if (e.key === '?' && !isInput) { e.preventDefault(); var sp = $('shortcuts-panel'); if (sp) sp.classList.add('active'); return; }
        };
        document.addEventListener('keydown', handler);
      },
      dispose: function() {
        if (handler) document.removeEventListener('keydown', handler);
      }
    };
  }

  /* Theme change — wave animation + toast (theme state managed by __theme) */
  window.addEventListener('theme-change', function(e) {
    toast(e.detail.dark ? '已切换到深色模式' : '已切换到浅色模式', 'info');
    try {
      var bg = getComputedStyle(document.body).getPropertyValue('--page-bg').trim()
            || getComputedStyle(document.body).getPropertyValue('--wl-bg').trim();
      if (typeof window.__animateWave === 'function') {
        window.__animateWave(bg || (e.detail.dark ? '#08080f' : '#f0ede8'));
      }
    } catch(err) {}
  });

  /* Search */
  function openSearch() {
    var overlay = $('searchModalOverlay'), input = $('searchModalInput'), results = $('searchResults');
    if (!overlay) return;
    overlay.classList.add('active');
    if (input) { input.value = ''; setTimeout(function() { input.focus(); }, 100); }
    if (results) results.innerHTML = '<div class="search-no-results">输入关键词开始搜索...</div>';
    window.__searchSelectedIdx = -1;
  }
  function closeSearch() {
    var overlay = $('searchModalOverlay');
    if (overlay) overlay.classList.remove('active');
    window.__searchSelectedIdx = -1;
  }
  function performSearch(kw) {
    var results = $('searchResults');
    if (!results) return;
    results.innerHTML = '';
    if (!kw || !kw.trim()) { results.innerHTML = '<div class="search-no-results">输入关键词开始搜索...</div>'; return; }
    var c = document.querySelector('.prose') || document.querySelector('main');
    if (!c) { results.innerHTML = '<div class="search-no-results">暂无内容</div>'; return; }
    var blocks = c.querySelectorAll('p,li,td,th,h1,h2,h3,h4,h5,h6');
    var esc = escapeRegex(kw), re = new RegExp(esc, 'gi');
    var seen = new Set(), count = 0;
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      if (b.closest('pre') || b.closest('.code-block-wrapper') || b.closest('.search-modal') || b.closest('.code-line-numbers')) continue;
      if (seen.has(b)) continue;
      var text = b.textContent || '';
      re.lastIndex = 0;
      if (!re.test(text)) continue;
      seen.add(b);
      count++;
      re.lastIndex = 0;
      var match = re.exec(text), idx = match ? match.index : 0, len = match ? match[0].length : 0;
      var start = Math.max(0, idx - 40), end = Math.min(text.length, idx + len + 40);
      var excerpt = (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
      var div = document.createElement('div');
      div.className = 'search-result-item';
      div.innerHTML = excerpt.replace(new RegExp(esc, 'gi'), '<mark>$&</mark>');
      div.addEventListener('click', (function(block) {
        return function() { closeSearch(); block.scrollIntoView({ behavior: 'smooth', block: 'center' }); };
      })(b));
      results.appendChild(div);
    }
    if (count === 0) results.innerHTML = '<div class="search-no-results">未找到匹配内容</div>';
    window.__searchSelectedIdx = -1;
  }
  function handleSearchKb(e) {
    var items = document.querySelectorAll('#searchResults .search-result-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); window.__searchSelectedIdx = Math.min((window.__searchSelectedIdx || 0) + 1, items.length - 1); selectSearchItem(items); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); window.__searchSelectedIdx = Math.max((window.__searchSelectedIdx || 0) - 1, 0); selectSearchItem(items); }
    else if (e.key === 'Enter') { e.preventDefault(); if (window.__searchSelectedIdx >= 0 && items[window.__searchSelectedIdx]) items[window.__searchSelectedIdx].click(); }
  }
  function selectSearchItem(items) {
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('selected', i === window.__searchSelectedIdx);
      if (i === window.__searchSelectedIdx) items[i].scrollIntoView({ block: 'nearest' });
    }
  }

  /* =================================================================
     Orchestrator — lazy init, lifecycle, graceful degradation
     ================================================================= */
  var modules = {};

  function initAll() {
    // Critical path — run immediately
    var navbar = NavbarModule();
    modules.navbar = navbar;
    navbar.init();
    onDispose(function() { navbar.dispose(); });

    window.addEventListener('scroll', onScroll, { passive: true });

    var btt = $('back-to-top');
    if (btt) {
      btt.addEventListener('click', function() { window.scrollTo({ top: 0, behavior: 'smooth' }); });
      onDispose(function() { btt.removeEventListener('click', function(){}); });
    }

    // Search UI bindings
    var searchBtn = document.getElementById('search-trigger-btn');
    if (searchBtn) searchBtn.addEventListener('click', openSearch);
    var searchClose = $('searchModalClose');
    if (searchClose) searchClose.addEventListener('click', closeSearch);
    var searchOverlay = $('searchModalOverlay');
    if (searchOverlay) searchOverlay.addEventListener('click', function(e) { if (e.target === searchOverlay) closeSearch(); });
    var searchInput = $('searchModalInput');
    if (searchInput) {
      searchInput.addEventListener('input', function() { performSearch(this.value); });
      searchInput.addEventListener('keydown', function(e) { handleSearchKb(e); });
    }
    var sp = $('shortcuts-panel');
    if (sp) sp.addEventListener('click', function(e) { if (e.target === sp) sp.classList.remove('active'); });

    // Keyboard shortcuts (always active)
    var kb = KeyboardModule();
    modules.kb = kb;
    kb.init();
    onDispose(function() { kb.dispose(); });

    updateProgressBar();
    updateBackToTop();
    restoreReadingPosition();

    // Deferred — run during idle periods
    var codeBlocks = CodeBlockModule();
    modules.codeBlocks = codeBlocks;
    codeBlocks.init();

    var headingAnchors = HeadingAnchorModule();
    modules.headingAnchors = headingAnchors;
    headingAnchors.init();

    var toc = TOCModule();
    modules.toc = toc;
    toc.init();
    onDispose(function() { toc.dispose(); });

    var lightbox = LightboxModule();
    modules.lightbox = lightbox;
    lightbox.init();
    onDispose(function() { lightbox.dispose(); });

    var linkPreview = LinkPreviewModule();
    modules.linkPreview = linkPreview;
    linkPreview.init();
    onDispose(function() { linkPreview.dispose(); });

    // Resize handler — re-query canvas (ClientRouter swaps it)
    window.addEventListener('resize', function() {
      if (window.__waveAnimId) {
        var cvs = document.getElementById('theme-wave-canvas');
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
  document.addEventListener('astro:after-swap', function() {
    if (modules.codeBlocks) { modules.codeBlocks.dispose(); }
    if (modules.headingAnchors) { modules.headingAnchors.dispose(); }
    if (modules.toc) { modules.toc.dispose(); }
    if (modules.lightbox) { modules.lightbox.dispose(); }

    modules.codeBlocks = CodeBlockModule();
    modules.codeBlocks.init();
    modules.headingAnchors = HeadingAnchorModule();
    modules.headingAnchors.init();
    modules.toc = TOCModule();
    modules.toc.init();
    onDispose(function() { modules.toc.dispose(); });
    modules.lightbox = LightboxModule();
    modules.lightbox.init();
    onDispose(function() { modules.lightbox.dispose(); });

    // Re-bind UI elements that are swapped by ClientRouter
    var searchBtn = document.getElementById('search-trigger-btn');
    if (searchBtn && !searchBtn._searchBound) {
      searchBtn._searchBound = true;
      searchBtn.addEventListener('click', openSearch);
    }
    var searchClose = document.getElementById('searchModalClose');
    if (searchClose && !searchClose._searchBound) {
      searchClose._searchBound = true;
      searchClose.addEventListener('click', closeSearch);
    }
    var searchOverlay = document.getElementById('searchModalOverlay');
    if (searchOverlay && !searchOverlay._overlayBound) {
      searchOverlay._overlayBound = true;
      searchOverlay.addEventListener('click', function(e) { if (e.target === searchOverlay) closeSearch(); });
    }
    var searchInput = document.getElementById('searchModalInput');
    if (searchInput && !searchInput._inputBound) {
      searchInput._inputBound = true;
      searchInput.addEventListener('input', function() { performSearch(this.value); });
      searchInput.addEventListener('keydown', function(e) { handleSearchKb(e); });
    }
    var sp = document.getElementById('shortcuts-panel');
    if (sp && !sp._spBound) {
      sp._spBound = true;
      sp.addEventListener('click', function(e) { if (e.target === sp) sp.classList.remove('active'); });
    }

    updateProgressBar();
    updateBackToTop();
    restoreReadingPosition();
  });
})();
