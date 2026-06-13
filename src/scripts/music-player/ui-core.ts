// MusicPlayer UI core — extracted from MusicPlayer.astro is:inline script
// Binds DOM elements to the music player engine via pubsub.

import { createVolumeSlider } from "../music/volume-slider";
import { createProgressBar } from "./progress-bar";

declare global {
  interface Window {
    __musicPlayer?: {
      toggle: () => void;
      prev: () => void;
      next: () => void;
      toggleShuffle: () => void;
      toggleRepeat: () => void;
      toggleMute: () => void;
      setVolume: (v: number) => void;
      getState: () => MusicPlayerState;
      subscribe: (fn: (s: MusicPlayerState) => void) => () => void;
      getAnalyserNode: () => AnalyserNode | null;
      getDspChain: () => DspChainResult | null;
      hideError: () => void;
      playIndex: (i: number) => void;
      seek: (t: number) => void;
      scanAndRefresh: () => Promise<ScanResult>;
      _decoder?: {
        applyDspPreset: (name: string) => void;
        DSP_PRESETS: Record<string, DspPreset>;
      };
      _immersive?: {
        open: () => void;
        close: () => void;
        toggle: () => void;
        isOpen: () => boolean;
      };
    };
    __musicPlayerUI?: MusicPlayerUI;
  }
}

interface MusicPlayerState {
  currentSong: {
    title?: string;
    artist?: string;
    cover?: string;
    album?: string;
    year?: number;
    qualityBadge?: string;
    qualityTier?: string;
    qualityLabel?: string;
    codecName?: string;
    codec?: string;
    sampleRate?: number;
    bitsPerSample?: number;
  };
  isPlaying: boolean;
  isMuted: boolean;
  isShuffled: boolean;
  isRepeating: number;
  currentTime: number;
  duration: number;
  volume: number;
  currentIndex: number;
  showError: boolean;
  errorMessage: string;
}

interface DspChainResult {
  nodes: string[];
  path: string;
  activeCount: number;
}

interface DspPreset {
  name: string;
  description: string;
}

interface ScanResult {
  success: boolean;
  added?: number;
  error?: string;
}

interface MusicPlayerUI {
  _cleanupFns: (() => void)[];
}

// Guard: only run once even with Astro page swaps
if (window.__musicPlayerUI) {
  console.log("[MusicPlayer UI] already initialized, skipping");
  // But still need to rebind after SPA navigation
}

const _ui: MusicPlayerUI = { _cleanupFns: [] };
window.__musicPlayerUI = _ui;

// --- Format helpers ---
function formatTime(s: number): string {
  s = Math.floor(s || 0);
  return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
}

// --- Collect DOM refs ---
function collectRefs() {
  const fab = document.getElementById("music-fab");
  if (!fab) return null; // player not rendered on this page

  return {
    fab,
    panel: document.getElementById("music-panel")!,
    cover: document.getElementById("music-cover") as HTMLImageElement | null,
    titleEl: document.getElementById("music-title")!,
    artistEl: document.getElementById("music-artist")!,
    progressBar: document.getElementById("music-progress-bar")!,
    progressFill: document.getElementById("music-progress-fill")!,
    progressThumb: document.getElementById("music-progress-thumb")!,
    progressTooltip: document.getElementById("music-progress-tooltip")!,
    spectrumCanvas: document.getElementById("music-spectrum-canvas") as HTMLCanvasElement | null,
    currentTimeEl: document.getElementById("music-current-time")!,
    durationEl: document.getElementById("music-duration")!,
    volumeSlider: document.getElementById("music-volume-slider")!,
    volumeFill: document.getElementById("music-volume-fill")!,
    playlistEl: document.getElementById("music-playlist")!,
    errorEl: document.getElementById("music-error")!,
    errorMsg: document.getElementById("music-error-msg")!,
    errorClose: document.getElementById("music-error-close")!,
    fabDot: document.getElementById("music-fab-dot")!,
    iconPlay: document.getElementById("music-icon-play")!,
    iconPause: document.getElementById("music-icon-pause")!,
    iconVolume: document.getElementById("music-icon-volume")!,
    iconMute: document.getElementById("music-icon-mute")!,
    repeatOne: document.getElementById("music-repeat-one")!,
    decoderBadge: document.getElementById("music-decoder-badge")!,
    decoderCodec: document.getElementById("music-decoder-codec")!,
    dspIndicator: document.getElementById("music-panel-dsp")!,
    dspPath: document.getElementById("music-dsp-path")!,
  };
}

type Refs = NonNullable<ReturnType<typeof collectRefs>>;

// --- UI update ---
function createUpdateUI(refs: Refs) {
  return function updateUI(s: MusicPlayerState): void {
    // Cover image
    if (refs.cover) {
      refs.cover.src = s.currentSong.cover || "/favicon.ico";
    }

    refs.titleEl.textContent = s.currentSong.title || "--";
    refs.artistEl.textContent = s.currentSong.artist || "--";

    // Decoder badge
    if (s.currentSong.qualityBadge) {
      const tierColors: Record<string, string> = {
        studioMaster: "#ffd700",
        hiRes: "#ff8c00",
        cdQuality: "#4caf50",
        lossless: "#2196f3",
        highLossy: "#ff9800",
        standardLossy: "#9e9e9e",
        lowLossy: "#757575",
      };
      refs.decoderBadge.hidden = false;
      refs.decoderBadge.textContent = s.currentSong.qualityBadge;
      refs.decoderBadge.style.background = tierColors[s.currentSong.qualityTier || ""] || "#888";
      refs.decoderBadge.style.color =
        ["studioMaster", "hiRes", "highLossy"].indexOf(s.currentSong.qualityTier || "") >= 0
          ? "#000"
          : "#fff";
    } else {
      refs.decoderBadge.hidden = true;
    }

    // Codec info
    if (s.currentSong.codec || s.currentSong.sampleRate) {
      const parts: string[] = [];
      if (s.currentSong.codecName) parts.push(s.currentSong.codecName);
      else if (s.currentSong.codec) parts.push(s.currentSong.codec.toUpperCase());
      if (s.currentSong.sampleRate) {
        const kHz = s.currentSong.sampleRate / 1000;
        parts.push(kHz.toFixed(s.currentSong.sampleRate % 1000 === 0 ? 0 : 1) + "kHz");
      }
      if (s.currentSong.bitsPerSample) parts.push(s.currentSong.bitsPerSample + "bit");
      refs.decoderCodec.textContent = parts.join(" · ");
    } else {
      refs.decoderCodec.textContent = "";
    }

    // DSP chain
    if (refs.dspIndicator && refs.dspPath && window.__musicPlayer) {
      const dspChain = window.__musicPlayer.getDspChain();
      if (dspChain && dspChain.activeCount > 0) {
        refs.dspIndicator.hidden = false;
        refs.dspPath.textContent = dspChain.path;
      } else {
        refs.dspIndicator.hidden = true;
      }
    }

    // Progress
    const pct = s.duration > 0 ? (s.currentTime / s.duration) * 100 : 0;
    if (refs.progressFill) refs.progressFill.style.width = pct + "%";
    if (refs.progressThumb) refs.progressThumb.style.left = pct + "%";
    refs.currentTimeEl.textContent = formatTime(s.currentTime);
    refs.durationEl.textContent = formatTime(s.duration);

    // Play/pause
    refs.iconPlay.hidden = s.isPlaying;
    refs.iconPause.hidden = !s.isPlaying;

    // FAB state
    if (s.isPlaying) {
      refs.fab.classList.add("playing");
      refs.fabDot.hidden = false;
    } else {
      refs.fab.classList.remove("playing");
      refs.fabDot.hidden = true;
    }

    // Shuffle/Repeat
    document.getElementById("music-btn-shuffle")!.classList.toggle("active", s.isShuffled);
    const repeatBtn = document.getElementById("music-btn-repeat")!;
    repeatBtn.classList.toggle("active", s.isRepeating !== 0);
    refs.repeatOne.hidden = s.isRepeating !== 1;

    // Volume
    if (refs.volumeFill) refs.volumeFill.style.width = s.volume * 100 + "%";
    refs.iconVolume.hidden = s.isMuted || s.volume === 0;
    refs.iconMute.hidden = !s.isMuted && s.volume !== 0;

    // Playlist
    const items = refs.playlistEl.querySelectorAll(".music-playlist-item");
    items.forEach(function (item) {
      item.classList.toggle(
        "current",
        parseInt((item as HTMLElement).dataset.index || "0") === s.currentIndex,
      );
    });

    // Error
    if (s.showError) {
      refs.errorMsg.textContent = s.errorMessage;
      refs.errorEl.hidden = false;
    } else {
      refs.errorEl.hidden = true;
    }
  };
}

// --- Panel open/close ---
function createPanelControl(refs: Refs) {
  let expanded = false;

  function openPanel(): void {
    expanded = true;
    refs.panel.style.display = "";
    refs.panel.classList.remove("float-panel-closed");
  }

  function closePanel(): void {
    expanded = false;
    refs.panel.classList.add("float-panel-closed");
    setTimeout(function () {
      if (!expanded) refs.panel.style.display = "none";
    }, 300);
  }

  return {
    openPanel,
    closePanel,
    get expanded() {
      return expanded;
    },
  };
}

// --- Main setup ---
function setup(player: NonNullable<typeof window.__musicPlayer>): void {
  const refs = collectRefs();
  if (!refs) return;

  const { openPanel, closePanel, expanded } = createPanelControl(refs);
  const updateUI = createUpdateUI(refs);

  // FAB click
  refs.fab.addEventListener("click", function (e) {
    e.stopPropagation();
    expanded ? closePanel() : openPanel();
  });

  // Play/pause
  document.getElementById("music-btn-play")!.addEventListener("click", function () {
    player.toggle();
  });

  // Prev/next
  document.getElementById("music-btn-prev")!.addEventListener("click", function () {
    player.prev();
  });
  document.getElementById("music-btn-next")!.addEventListener("click", function () {
    player.next();
  });

  // Shuffle/Repeat
  document.getElementById("music-btn-shuffle")!.addEventListener("click", function () {
    player.toggleShuffle();
  });
  document.getElementById("music-btn-repeat")!.addEventListener("click", function () {
    player.toggleRepeat();
  });

  // Playlist
  document.getElementById("music-btn-list")!.addEventListener("click", function (e) {
    e.stopPropagation();
    refs.playlistEl.hidden = !refs.playlistEl.hidden;
  });

  // Feature buttons
  function onFeature(id: string, action: string): void {
    const btn = document.getElementById(id);
    if (btn)
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent("music-player:" + action));
      });
  }
  onFeature("music-btn-library", "toggle-library");

  function bindClose(id: string, action: string): void {
    const btn = document.getElementById(id);
    if (btn)
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent("music-player:" + action));
      });
  }
  bindClose("music-lib-close", "close-library");

  // Playlist item click
  refs.playlistEl.addEventListener("click", function (e) {
    const item = (e.target as HTMLElement).closest(".music-playlist-item") as HTMLElement | null;
    if (item) player.playIndex(parseInt(item.dataset.index || "0"));
  });

  // Volume button
  document.getElementById("music-btn-volume")!.addEventListener("click", function () {
    player.toggleMute();
  });

  // Volume slider (shared module)
  const volumeSliderInstance = createVolumeSlider({
    sliderEl: refs.volumeSlider,
    fillEl: refs.volumeFill,
    onVolumeChange: (v: number) => player.setVolume(v),
  });
  _ui._cleanupFns.push(() => volumeSliderInstance.destroy());

  // Progress bar (shared module)
  const progressBarInstance = createProgressBar({
    barEl: refs.progressBar,
    fillEl: refs.progressFill,
    thumbEl: refs.progressThumb,
    tooltipEl: refs.progressTooltip,
    getDuration: () => player.getState().duration,
    onSeek: (t: number) => player.seek(t),
    formatTime,
  });
  _ui._cleanupFns.push(() => progressBarInstance.destroy());

  // Spectrum visualization (panel)
  setupPanelSpectrum(player, refs);

  // Error close
  refs.errorClose.addEventListener("click", function () {
    player.hideError();
  });

  // Refresh library
  let refreshTimeout: ReturnType<typeof setTimeout>;
  const refreshBtn = document.getElementById("music-lib-refresh");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      if (refreshBtn.classList.contains("scanning")) return;
      refreshBtn.classList.add("scanning");
      player.scanAndRefresh().then(function (result) {
        refreshBtn.classList.remove("scanning");
        if (result.success) {
          refreshBtn.title = result.added
            ? "已添加 " + result.added + " 首新曲目"
            : "音乐库已是最新";
        } else {
          refreshBtn.title = "刷新失败: " + (result.error || "未知错误");
        }
        clearTimeout(refreshTimeout);
        refreshTimeout = setTimeout(function () {
          refreshBtn.title = "刷新音乐库";
        }, 3000);
      });
    });
  }

  // Outside click
  function onOutsideClick(e: MouseEvent): void {
    if (
      expanded &&
      !refs!.panel.contains(e.target as Node) &&
      e.target !== refs!.fab &&
      !refs!.fab.contains(e.target as Node)
    ) {
      closePanel();
    }
  }
  document.addEventListener("click", onOutsideClick);
  _ui._cleanupFns.push(function () {
    document.removeEventListener("click", onOutsideClick);
  });

  // Subscribe
  const unsub = player.subscribe(updateUI);
  _ui._cleanupFns.push(function () {
    unsub();
  });
  updateUI(player.getState());

  // DSP preset keyboard shortcut
  const dspPresetKeys = ["off", "classical", "rock", "jazz", "headphones", "voice"];
  let dspPresetIdx = 0;
  function onDspKeydown(e: KeyboardEvent): void {
    if (e.ctrlKey && e.shiftKey && e.key === "D") {
      e.preventDefault();
      dspPresetIdx = (dspPresetIdx + 1) % dspPresetKeys.length;
      const presetName = dspPresetKeys[dspPresetIdx];
      if (window.__musicPlayer && window.__musicPlayer._decoder) {
        window.__musicPlayer._decoder.applyDspPreset(presetName);
        const preset = window.__musicPlayer._decoder.DSP_PRESETS[presetName];
        console.log("[DSP] Preset: " + preset.name + " — " + preset.description);
      }
    }
  }
  document.addEventListener("keydown", onDspKeydown);
  _ui._cleanupFns.push(function () {
    document.removeEventListener("keydown", onDspKeydown);
  });

  // Immersive playback
  setupImmersivePlayback(player);
}

// --- Spectrum visualization (panel) ---
function setupPanelSpectrum(player: NonNullable<typeof window.__musicPlayer>, refs: Refs): void {
  const canvas = refs.spectrumCanvas;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let animId: number | null = null;
  let freqData: Uint8Array | null = null;

  function resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas!.clientWidth;
    const h = canvas!.clientHeight;
    if (canvas!.width !== w * dpr || canvas!.height !== h * dpr) {
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
    }
  }

  function draw(): void {
    animId = requestAnimationFrame(draw);
    const a = player.getAnalyserNode();
    if (!a) return;
    if (!freqData) freqData = new Uint8Array(a.frequencyBinCount);
    resize();
    a.getByteFrequencyData(freqData as unknown as Uint8Array<ArrayBuffer>);
    const w = canvas!.width;
    const h = canvas!.height;
    ctx!.clearRect(0, 0, w, h);
    const bars = 48;
    const barW = (w / bars) * 0.65;
    const gap = (w / bars) * 0.35;
    const step = Math.floor(freqData.length / bars);
    const hue =
      getComputedStyle(document.documentElement).getPropertyValue("--hue").trim() || "220";
    for (let i = 0; i < bars; i++) {
      let max = 0;
      for (let j = 0; j < step; j++) max = Math.max(max, freqData![i * step + j]);
      const bh = (max / 255) * h * 0.9;
      const x = i * (barW + gap);
      ctx!.fillStyle = "hsla(" + hue + ", 60%, " + (48 + (max / 255) * 18) + "%, 0.55)";
      if ((ctx as CanvasRenderingContext2D & { roundRect?: Function }).roundRect) {
        ctx!.beginPath();
        (ctx as CanvasRenderingContext2D & { roundRect: Function }).roundRect(x, h - bh, barW, bh, [
          barW / 2,
          barW / 2,
          0,
          0,
        ]);
        ctx!.fill();
      } else {
        ctx!.fillRect(x, h - bh, barW, bh);
      }
    }
  }

  function start(): void {
    if (!animId) draw();
  }
  function stop(): void {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  const unsub = player.subscribe(function (s) {
    if (s.isPlaying) start();
    else stop();
  });
  _ui._cleanupFns.push(function () {
    unsub();
    stop();
  });
}

// --- Immersive playback ---
let _immCleanupFns: (() => void)[] = [];

function setupImmersivePlayback(player: NonNullable<typeof window.__musicPlayer>): void {
  // Clean previous
  while (_immCleanupFns.length) {
    _immCleanupFns.pop()!();
  }

  const immOverlay = document.getElementById("music-immersive-overlay");
  if (!immOverlay) return;

  const immBgFront = document.getElementById("music-immersive-bg-front")!;
  const immBgBack = document.getElementById("music-immersive-bg-back")!;
  const immArtwork = document.getElementById("music-immersive-artwork")!;
  const immArtworkImg = immArtwork.querySelector("img")!;
  const immTitle = document.getElementById("music-immersive-title")!;
  const immArtist = document.getElementById("music-immersive-artist")!;
  const immAlbum = document.getElementById("music-immersive-album")!;
  const immQuality = document.getElementById("music-immersive-quality")!;
  const immProgressFill = document.getElementById("music-immersive-progress-fill")!;
  const immProgressThumb = document.getElementById("music-immersive-progress-thumb")!;
  const immProgressTooltip = document.getElementById("music-immersive-progress-tooltip")!;
  const immSpectrum = document.getElementById(
    "music-immersive-spectrum",
  ) as HTMLCanvasElement | null;
  const immCurrent = document.getElementById("music-immersive-current")!;
  const immDuration = document.getElementById("music-immersive-duration")!;
  const immIconPlay = document.getElementById("music-immersive-icon-play")!;
  const immIconPause = document.getElementById("music-immersive-icon-pause")!;
  const immProgressBar = document.getElementById("music-immersive-progress-bar")!;

  let immOpen = false;
  let _lastBgUrl = "";

  function crossfadeBg(url: string): void {
    if (!immBgFront || !immBgBack) return;
    if (url === _lastBgUrl) return;
    _lastBgUrl = url;
    if (!url) {
      immBgFront.style.backgroundImage = "";
      immBgBack.style.backgroundImage = "";
      return;
    }
    immBgBack.style.backgroundImage = immBgFront.style.backgroundImage;
    immBgBack.style.opacity = "1";
    immBgFront.style.backgroundImage = "url(" + url + ")";
    immBgFront.style.opacity = "0";
    // Force reflow
    void immBgFront.offsetHeight;
    immBgFront.style.opacity = "1";
    immBgBack.style.opacity = "0";
  }

  function updateImmersiveUI(s: MusicPlayerState): void {
    if (s.currentSong && s.currentSong.cover) {
      crossfadeBg(s.currentSong.cover);
    }
    if (immArtworkImg && s.currentSong && s.currentSong.cover) {
      immArtworkImg.src = s.currentSong.cover;
    }
    immTitle.textContent = s.currentSong.title || "--";
    immArtist.textContent = s.currentSong.artist || "--";
    immAlbum.textContent = s.currentSong.album
      ? s.currentSong.album + (s.currentSong.year ? " · " + s.currentSong.year : "")
      : "";
    if (s.currentSong.qualityLabel) {
      immQuality.textContent = s.currentSong.qualityLabel;
      immQuality.style.display = "inline-flex";
    } else {
      immQuality.style.display = "none";
    }

    const ipct = s.duration > 0 ? (s.currentTime / s.duration) * 100 : 0;
    immProgressFill.style.width = ipct + "%";
    if (immProgressThumb) immProgressThumb.style.left = ipct + "%";
    immCurrent.textContent = formatTime(s.currentTime);
    immDuration.textContent = formatTime(s.duration);

    immIconPlay.hidden = s.isPlaying;
    immIconPause.hidden = !s.isPlaying;

    const immShuffle = document.getElementById("music-immersive-shuffle")!;
    const immRepeat = document.getElementById("music-immersive-repeat")!;
    immShuffle.classList.toggle("active", s.isShuffled);
    immRepeat.classList.toggle("active", s.isRepeating !== 0);
  }

  function openImmersive(): void {
    immOpen = true;
    immOverlay!.style.display = "";
    immOverlay!.classList.add("open");
    updateImmersiveUI(player.getState());
    if (immArtwork) immArtwork.classList.remove("fade-out");
  }

  function closeImmersive(): void {
    immOpen = false;
    immOverlay!.classList.remove("open");
    setTimeout(function () {
      if (!immOpen && immOverlay) immOverlay!.style.display = "none";
    }, 650);
  }

  function toggleImmersive(): void {
    immOpen ? closeImmersive() : openImmersive();
  }

  // Button bindings
  document.getElementById("music-immersive-play")!.addEventListener("click", function () {
    player.toggle();
  });
  document.getElementById("music-immersive-prev")!.addEventListener("click", function () {
    player.prev();
  });
  document.getElementById("music-immersive-next")!.addEventListener("click", function () {
    player.next();
  });
  document.getElementById("music-immersive-shuffle")!.addEventListener("click", function () {
    player.toggleShuffle();
  });
  document.getElementById("music-immersive-repeat")!.addEventListener("click", function () {
    player.toggleRepeat();
    const s = player.getState();
    document
      .getElementById("music-immersive-repeat")!
      .classList.toggle("active", s.isRepeating !== 0);
  });
  document.getElementById("music-immersive-close")!.addEventListener("click", closeImmersive);

  // Immersive progress bar (shared module)
  if (immProgressBar) {
    const immProgressInstance = createProgressBar({
      barEl: immProgressBar,
      fillEl: immProgressFill,
      thumbEl: immProgressThumb,
      tooltipEl: immProgressTooltip,
      getDuration: () => player.getState().duration,
      onSeek: (t: number) => player.seek(t),
      formatTime,
    });
    _immCleanupFns.push(() => immProgressInstance.destroy());
  }

  // Immersive spectrum
  if (immSpectrum) {
    const ctx = immSpectrum.getContext("2d");
    if (ctx) {
      let animId: number | null = null;
      let freqData: Uint8Array | null = null;

      function resize(): void {
        const dpr = window.devicePixelRatio || 1;
        const w = immSpectrum!.clientWidth;
        const h = immSpectrum!.clientHeight;
        if (immSpectrum!.width !== w * dpr || immSpectrum!.height !== h * dpr) {
          immSpectrum!.width = w * dpr;
          immSpectrum!.height = h * dpr;
        }
      }

      function draw(): void {
        animId = requestAnimationFrame(draw);
        const a = player.getAnalyserNode();
        if (!a) return;
        if (!freqData) freqData = new Uint8Array(a.frequencyBinCount);
        resize();
        a.getByteFrequencyData(freqData as unknown as Uint8Array<ArrayBuffer>);
        const w = immSpectrum!.width;
        const h = immSpectrum!.height;
        ctx!.clearRect(0, 0, w, h);
        const bars = 64;
        const barW = (w / bars) * 0.6;
        const gap = (w / bars) * 0.4;
        const step = Math.floor(freqData.length / bars);
        for (let i = 0; i < bars; i++) {
          let max = 0;
          for (let j = 0; j < step; j++) max = Math.max(max, freqData![i * step + j]);
          const bh = (max / 255) * h * 0.85;
          const x = i * (barW + gap);
          ctx!.fillStyle = "rgba(255,255,255," + (0.2 + (max / 255) * 0.35) + ")";
          if ((ctx as CanvasRenderingContext2D & { roundRect?: Function }).roundRect) {
            ctx!.beginPath();
            (ctx as CanvasRenderingContext2D & { roundRect: Function }).roundRect(
              x,
              h - bh,
              barW,
              bh,
              [barW / 2, barW / 2, 0, 0],
            );
            ctx!.fill();
          } else {
            ctx!.fillRect(x, h - bh, barW, bh);
          }
        }
      }

      function start(): void {
        if (!animId) draw();
      }
      function stop(): void {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      }

      const immSpecUnsub = player.subscribe(function (s) {
        if (s.isPlaying && immOpen) start();
        else stop();
      });
      _immCleanupFns.push(function () {
        immSpecUnsub();
        stop();
      });
    }
  }

  // Keyboard: Escape to close
  function onKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape" && immOpen) closeImmersive();
  }
  document.addEventListener("keydown", onKeydown);
  _immCleanupFns.push(function () {
    document.removeEventListener("keydown", onKeydown);
  });

  // Subscribe to state updates
  const immUnsub = player.subscribe(function (s) {
    if (immOpen) updateImmersiveUI(s);
  });
  _immCleanupFns.push(immUnsub);

  // Expose on player
  window.__musicPlayer!._immersive = {
    open: openImmersive,
    close: closeImmersive,
    toggle: toggleImmersive,
    isOpen: function () {
      return immOpen;
    },
  };

  // External events
  window.addEventListener("music-player:open-immersive", openImmersive);
  window.addEventListener("music-player:close-immersive", closeImmersive);
  window.addEventListener("music-player:toggle-immersive", toggleImmersive);
  _immCleanupFns.push(function () {
    window.removeEventListener("music-player:open-immersive", openImmersive);
    window.removeEventListener("music-player:close-immersive", closeImmersive);
    window.removeEventListener("music-player:toggle-immersive", toggleImmersive);
  });
}

// --- Boot ---
function boot(): void {
  const player = window.__musicPlayer;
  if (player) {
    setup(player);
  } else {
    setTimeout(boot, 20);
  }
}

// --- SPA lifecycle ---
document.addEventListener("astro:before-swap", function () {
  while (_ui._cleanupFns.length) {
    _ui._cleanupFns.pop()!();
  }
  while (_immCleanupFns.length) {
    _immCleanupFns.pop()!();
  }
});

document.addEventListener("astro:after-swap", function () {
  // Reset and re-bind
  while (_ui._cleanupFns.length) {
    _ui._cleanupFns.pop()!();
  }
  while (_immCleanupFns.length) {
    _immCleanupFns.pop()!();
  }
  boot();
});

boot();
