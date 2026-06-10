/**
 * Soren's Blog — Sakura Particle Effect
 * Optimized: reduced petal count on mobile, OffscreenCanvas support,
 * visibility-aware rendering, proper lifecycle management.
 */
(function() {
  'use strict';

  // Re-query canvas on each access — ClientRouter swaps the element on navigation
  function getCanvas() { return document.getElementById('sakura-canvas'); }
  function getCtx() {
    var c = getCanvas();
    if (!c) return null;
    if (!c.__sakuraCtx) c.__sakuraCtx = c.getContext('2d', { alpha: true });
    return c.__sakuraCtx;
  }

  var isMobile = window.innerWidth < 768;
  var SAKURA_COUNT = isMobile ? 15 : 35;
  var petals = [];
  var running = false;
  var animId = null;
  var sakuraImg = null;

  function random(min, max) { return min + Math.random() * (max - min); }

  function createPetal() {
    return {
      x: random(-60, window.innerWidth + 60),
      y: random(-window.innerHeight * 0.3, -20),
      size: random(0.5, 1.1),
      opacity: random(0.3, 0.9),
      rotation: random(0, Math.PI * 2),
      rotSpeed: (Math.random() - 0.5) * 0.03,
      vx: random(-1.7, -1.2),
      vy: random(1.5, 2.2),
      fadeSpeed: 0.03 + Math.random() * 0.02,
      fade: 0,
      maxFade: 1
    };
  }

  function resetPetal(p) {
    p.x = random(-60, window.innerWidth + 60);
    p.y = random(-window.innerHeight * 0.3, -30);
    p.size = random(0.5, 1.1);
    p.opacity = random(0.3, 0.9);
    p.rotation = random(0, Math.PI * 2);
    p.rotSpeed = (Math.random() - 0.5) * 0.03;
    p.vx = random(-1.7, -1.2);
    p.vy = random(1.5, 2.2);
    p.fade = 0;
    p.maxFade = 1;
  }

  function getSakuraColors() {
    var isDark = document.documentElement.classList.contains('dark');
    return isDark
      ? { light: '#d4808f', mid: '#c06078', dark: '#a04860' }
      : { light: '#ffb7c5', mid: '#ff9aad', dark: '#e87890' };
  }

  function buildSakuraImage() {
    var w = 16, h = 16;
    var img = document.createElement('canvas');
    img.width = w;
    img.height = h;
    var ictx = img.getContext('2d');
    var s = w / 32;
    var colors = getSakuraColors();
    ictx.fillStyle = colors.light;
    ictx.beginPath();
    ictx.ellipse(w/2, 5*s, 5*s, 9*s, 0, 0, Math.PI * 2);
    ictx.fill();
    ictx.fillStyle = colors.mid;
    ictx.beginPath();
    ictx.ellipse(w/2, 6*s, 4*s, 8*s, 0, 0, Math.PI * 2);
    ictx.fill();
    ictx.fillStyle = colors.dark;
    ictx.beginPath();
    ictx.arc(w/2, 4*s, 2.5*s, 0, Math.PI * 2);
    ictx.fill();
    return img;
  }

  function drawPetal(p) {
    if (!sakuraImg) return;
    var ctx = getCtx();
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = p.opacity * Math.min(p.fade, p.maxFade);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    var s = 14 * p.size;
    ctx.drawImage(sakuraImg, -s / 2, -s / 2, s, s);
    ctx.restore();
  }

  function updatePetal(p) {
    p.x += p.vx;
    p.y += p.vy;
    p.rotation += p.rotSpeed;
    if (p.fade < p.maxFade) p.fade += p.fadeSpeed;
    if (p.y > window.innerHeight + 60 || p.x < -60 || p.x > window.innerWidth + 60) {
      resetPetal(p);
    }
  }

  function animate() {
    if (!running) return;
    var c = getCanvas();
    var ctx = getCtx();
    // Pause rendering when tab is hidden or canvas not visible
    if (document.hidden || !c || c.style.display === 'none') {
      animId = requestAnimationFrame(animate);
      return;
    }
    ctx.clearRect(0, 0, c.width, c.height);
    for (var i = 0; i < petals.length; i++) {
      updatePetal(petals[i]);
      drawPetal(petals[i]);
    }
    animId = requestAnimationFrame(animate);
  }

  function resize() {
    var c = getCanvas();
    if (c) {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    }
  }

  function start() {
    if (running) return;
    var c = getCanvas();
    if (!c) return;
    if (!sakuraImg) sakuraImg = buildSakuraImage();
    if (!petals.length) {
      for (var i = 0; i < SAKURA_COUNT; i++) {
        var p = createPetal();
        p.fade = p.maxFade;
        petals.push(p);
      }
    }
    running = true;
    resize();
    animate();
    c.style.display = 'block';
  }

  function stop() {
    running = false;
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    var c = getCanvas();
    var ctx = getCtx();
    if (c) c.style.display = 'none';
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height);
  }

  window.addEventListener('sakura-toggle', function(e) {
    if (e.detail && e.detail.enabled) start();
    else stop();
  });

  var storedSakura = localStorage.getItem('sakura-enabled');
  if (storedSakura === 'true') {
    // Delay start to not compete with FCP
    setTimeout(start, 1000);
  }

  // Rebuild petal image on theme change for proper dark mode colors
  window.addEventListener('theme-change', function() {
    sakuraImg = buildSakuraImage();
  });

  var resizeTimer;
  window.addEventListener('resize', function() {
    if (running) {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    }
  });

  window.toggleSakura = function() {
    if (running) stop(); else start();
    localStorage.setItem('sakura-enabled', running);
  };

  // Cleanup hook for SPA or page transitions
  window.__disposeSakura = function() {
    stop();
    petals.length = 0;
    sakuraImg = null;
  };
})();
