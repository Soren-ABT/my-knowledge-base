/**
 * Now Playing — sidebar mini-player that mirrors window.__musicPlayer state.
 * Drives the #np-* elements rendered in the homepage sidebar.
 */
(function () {
  'use strict';

  var el = {
    cover:  document.getElementById('np-cover'),
    title:  document.getElementById('np-title'),
    artist: document.getElementById('np-artist'),
    playBtn: document.getElementById('np-play'),
    prevBtn: document.getElementById('np-prev'),
    nextBtn: document.getElementById('np-next'),
    progress: document.getElementById('np-progress-fill'),
    time: document.getElementById('np-time'),
    noMusic: document.getElementById('np-no-music'),
    body: document.getElementById('np-body'),
  };

  if (!el.cover && !el.title) return; // not on a page with now-playing

  var rafId = null;
  var mp = null;

  function resolvePlayer() {
    if (mp) return mp;
    mp = window.__musicPlayer;
    if (!mp) return null;
    return mp;
  }

  function setCover(src) {
    if (!el.cover) return;
    if (src) {
      el.cover.src = src;
      el.cover.style.display = '';
    } else {
      el.cover.style.display = 'none';
    }
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function fmtTime(s) {
    if (!s || s === Infinity || isNaN(s)) return '--:--';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return pad(m) + ':' + pad(sec);
  }

  function updateProgress() {
    var p = resolvePlayer();
    if (!p) { rafId = null; return; }
    var state = p.getState();
    if (!state.currentSong || !state.isPlaying) { rafId = null; return; }
    var cur = state.currentTime || 0;
    var dur = state.duration || 0;
    var pct = dur > 0 ? (cur / dur) * 100 : 0;
    if (el.progress) el.progress.style.width = pct + '%';
    if (el.time) el.time.textContent = fmtTime(cur) + ' / ' + fmtTime(dur);
    rafId = requestAnimationFrame(updateProgress);
  }

  function applyState(state) {
    var hasSong = state && state.currentSong && state.currentSong.title;
    if (hasSong) {
      if (el.body) el.body.style.display = '';
      if (el.noMusic) el.noMusic.style.display = 'none';
      if (el.title) el.title.textContent = state.currentSong.title;
      if (el.artist) el.artist.textContent = state.currentSong.artist || '';
      setCover(state.currentSong.cover || '');
      if (el.playBtn) {
        el.playBtn.setAttribute('data-playing', state.isPlaying ? '1' : '0');
      }
    } else {
      if (el.body) el.body.style.display = 'none';
      if (el.noMusic) el.noMusic.style.display = '';
    }
  }

  function handleState(e) {
    applyState(e.detail);
    // Start RAF when music begins playing
    if (e.detail && e.detail.currentSong && e.detail.isPlaying && !rafId) {
      rafId = requestAnimationFrame(updateProgress);
    }
    // Stop RAF when music stops
    if (e.detail && (!e.detail.currentSong || !e.detail.isPlaying) && rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // ---- button handlers ----
  if (el.playBtn) {
    el.playBtn.addEventListener('click', function () {
      var p = resolvePlayer();
      if (p) p.toggle();
    });
  }
  if (el.prevBtn) {
    el.prevBtn.addEventListener('click', function () {
      var p = resolvePlayer();
      if (p) p.prev();
    });
  }
  if (el.nextBtn) {
    el.nextBtn.addEventListener('click', function () {
      var p = resolvePlayer();
      if (p) p.next();
    });
  }

  // Click cover to open the full player panel
  if (el.cover) {
    el.cover.parentElement && el.cover.parentElement.addEventListener('click', function (e) {
      if (e.target === el.cover || e.target.closest('#np-cover-wrap')) {
        var p = resolvePlayer();
        if (p) p.toggleExpanded();
      }
    });
  }

  // ---- init ----
  window.addEventListener('music-player:state', handleState);

  // Try to grab current state (player might have initialised before this script)
  var p = resolvePlayer();
  if (p) {
    applyState(p.getState());
    // Start RAF only if a song is already playing
    var state = p.getState();
    if (state && state.currentSong && state.isPlaying) {
      rafId = requestAnimationFrame(updateProgress);
    }
  } else {
    // Player not ready yet — show idle state
    if (el.body) el.body.style.display = 'none';
    if (el.noMusic) el.noMusic.style.display = '';
  }
})();
