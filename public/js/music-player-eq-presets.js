/**
 * Music Player EQ Presets Module — vanilla JS
 * Inspired by foobar2000's equalizer presets.
 * Applies preset EQ curves via Web Audio API BiquadFilter chain.
 * No manual sliders — just select a preset from the list.
 */
window.__musicPlayerEQPresets = function (MP) {
  if (MP._eqPresets) return;

  var audioCtx = null;
  var sourceNode = null;
  var filters = [];
  var _isOpen = false;
  var _connected = false;
  var _currentPreset = "flat";

  // 10-band ISO frequencies (adapted from foobar2000's 18-band EQ)
  var BANDS = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  var NUM_BANDS = BANDS.length;

  // Presets inspired by foobar2000, Roon, and Navidrome DSP profiles.
  // Gains in dB (-12 to +12 range), mapped to 10 ISO bands.
  var PRESETS = {
    flat:        { label: "平坦",      desc: "无调整",                         gains: [ 0,  0,  0,  0,  0,  0,  0,  0,  0,  0] },
    pop:         { label: "流行",      desc: "增强人声与节奏感",               gains: [-1,  1,  3,  2, -1, -1,  1,  2,  1,  0] },
    rock:        { label: "摇滚",      desc: "突出吉他轰鸣与鼓点冲击",         gains: [ 3,  2,  0, -1, -2,  0,  3,  4,  4,  3] },
    jazz:        { label: "爵士",      desc: "温暖饱满，保留器乐细节",         gains: [ 1,  1,  1,  0,  0,  1,  2,  3,  2,  1] },
    classical:   { label: "古典",      desc: "宽广动态，保持自然音色",         gains: [ 2,  1,  1,  0, -1, -1,  0,  1,  2,  2] },
    electronic:  { label: "电子",      desc: "深沉低音与闪耀高音",             gains: [ 4,  3,  1, -2, -3,  1,  2,  3,  4,  4] },
    vocal:       { label: "人声",      desc: "清晰人声，减少乐器遮蔽",         gains: [-2, -1, -1,  1,  4,  4,  2,  1,  0, -1] },
    bassBoost:   { label: "低音增强",  desc: "深沉有力的低频冲击",             gains: [ 6,  5,  3,  1,  0, -1, -2, -2, -2, -2] },
    trebleBoost: { label: "高音增强",  desc: "清晰透亮的高频细节",             gains: [-2, -1,  0,  0,  1,  2,  3,  5,  6,  6] },
    loudness:    { label: "等响度",    desc: "低音量下补偿高低频感知",         gains: [ 4,  3,  2,  0, -1,  0,  2,  3,  4,  4] },
    metal:       { label: "金属",      desc: "重型失真吉他与双踩底鼓",         gains: [ 4,  3,  0, -2, -3,  1,  4,  5,  5,  3] },
    acoustic:    { label: "原声",      desc: "自然温暖的原声乐器",             gains: [ 1,  1,  1,  1,  0,  0,  1,  2,  1,  0] },
    hiphop:      { label: "嘻哈",      desc: "厚重808低音与清晰人声",         gains: [ 5,  4,  2, -1,  1,  2,  0,  1,  1,  1] },
    dance:       { label: "舞曲",      desc: "强劲节拍，适合派对氛围",         gains: [ 5,  4,  2, -1, -2,  1,  3,  4,  4,  3] },
    rnb:         { label: "R&B",       desc: "丝滑低频与温暖人声",             gains: [ 3,  3,  2,  1,  2,  2,  1,  1,  1,  1] },
  };

  /* =================================================================
     Audio routing
     ================================================================= */

  function initAudioContext() {
    if (audioCtx) return;
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioCtx = new AudioContext();

    filters = [];
    var prevNode = null;

    for (var i = 0; i < NUM_BANDS; i++) {
      var filter = audioCtx.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = BANDS[i];
      filter.Q.value = 1.0;
      filter.gain.value = PRESETS.flat.gains[i];

      var bw = BANDS[i] * 0.5;
      if (i > 0) bw = Math.min(bw, (BANDS[i] - BANDS[i - 1]) * 0.8);
      if (i < NUM_BANDS - 1) bw = Math.min(bw, (BANDS[i + 1] - BANDS[i]) * 0.8);
      filter.Q.value = BANDS[i] / bw;

      if (prevNode) prevNode.connect(filter);
      prevNode = filter;
      filters.push(filter);
    }

    if (prevNode) prevNode.connect(audioCtx.destination);
  }

  function connectAudioSource(audioEl) {
    if (!audioCtx || _connected) return;
    if (!audioEl) return;
    try {
      sourceNode = audioCtx.createMediaElementSource(audioEl);
      sourceNode.connect(filters[0]);
      _connected = true;
    } catch (e) {
      console.warn("[EQ Presets] Could not connect:", e.message);
    }
  }

  function resumeContext() {
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(function () {});
    }
  }

  function applyPreset(name) {
    var preset = PRESETS[name];
    if (!preset) return;
    _currentPreset = name;
    for (var i = 0; i < NUM_BANDS; i++) {
      if (filters[i]) filters[i].gain.value = preset.gains[i];
    }
    updateActiveIndicator();
  }

  /* =================================================================
     UI Rendering
     ================================================================= */

  function getEl(id) { return document.getElementById(id); }

  function buildPresetList() {
    var container = getEl("music-eq-preset-body");
    if (!container) return;

    var names = Object.keys(PRESETS);
    var html = "";
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      var preset = PRESETS[name];
      html +=
        '<button class="music-eq-preset-item' +
        (_currentPreset === name ? " active" : "") +
        '" data-preset="' + name + '">' +
        '<span class="music-eq-preset-item-dot"></span>' +
        '<span class="music-eq-preset-item-label">' + preset.label + '</span>' +
        '<span class="music-eq-preset-item-desc">' + preset.desc + '</span>' +
        '</button>';
    }
    container.innerHTML = html;

    // Bind click events
    container.addEventListener("click", function (e) {
      var item = e.target.closest(".music-eq-preset-item");
      if (!item) return;
      var presetName = item.dataset.preset;
      if (presetName) {
        applyPreset(presetName);
        updateActiveIndicator();
      }
    });
  }

  function updateActiveIndicator() {
    var items = document.querySelectorAll(".music-eq-preset-item");
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle("active", items[i].dataset.preset === _currentPreset);
    }
  }

  /* =================================================================
     Open / Close
     ================================================================= */

  function open() {
    _isOpen = true;
    var panel = getEl("music-eq-preset-panel");
    if (panel) {
      panel.style.display = '';
      panel.classList.add("open");
    }

    initAudioContext();
    resumeContext();
    buildPresetList();
  }

  function close() {
    _isOpen = false;
    var panel = getEl("music-eq-preset-panel");
    if (panel) {
      panel.classList.remove("open");
      setTimeout(function() {
        if (!_isOpen && panel) panel.style.display = 'none';
      }, 300);
    }
  }

  function toggle() {
    _isOpen ? close() : open();
  }

  /* =================================================================
     Audio source detection
     ================================================================= */

  function findAudioElement() {
    var audioEls = document.querySelectorAll("audio");
    for (var i = 0; i < audioEls.length; i++) {
      if (audioEls[i].src) return audioEls[i];
    }
    return null;
  }

  var _connectAttempts = 0;
  function tryConnect() {
    if (_connected || _connectAttempts > 30) return;
    var audioEl = findAudioElement();
    if (audioEl && audioCtx) connectAudioSource(audioEl);
    if (!_connected) {
      _connectAttempts++;
      setTimeout(tryConnect, 1000);
    }
  }

  /* =================================================================
     Boot
     ================================================================= */

  function boot() {
    MP._eqPresets = {
      open: open,
      close: close,
      toggle: toggle,
      isOpen: function () { return _isOpen; },
      applyPreset: applyPreset,
      getCurrentPreset: function () { return _currentPreset; },
    };

    window.addEventListener("music-player:toggle-eq-preset", function () {
      toggle();
    });

    window.addEventListener("music-player:close-eq-preset", function () {
      close();
    });

    // Connect on first user interaction (browser autoplay policy)
    document.addEventListener("click", function () {
      if (!_connected && audioCtx) {
        resumeContext();
        tryConnect();
      }
    }, { once: false });
  }

  boot();
};

// Self-boot: poll for player engine (loaded with defer)
(function waitForPlayer() {
  var MP = window.__musicPlayer;
  if (MP) {
    window.__musicPlayerEQPresets(MP);
  } else {
    setTimeout(waitForPlayer, 20);
  }
})();
