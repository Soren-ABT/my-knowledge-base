/**
 * Music Player Engine — vanilla JS singleton
 * Manages Audio element, playlist, state, and broadcasts changes.
 */
(function () {
  if (window.__musicPlayer) return;

  var STORAGE_KEY = "music-player-volume";

  var state = {
    playlist: [],
    currentIndex: 0,
    currentSong: { id: 0, title: "", artist: "", cover: "", url: "", duration: 0, sampleRate: 0, bitsPerSample: 0, codec: "", qualityTier: "", qualityBadge: "" },
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    isMuted: false,
    isShuffled: false,
    isRepeating: 0,
    showPlaylist: false,
    isExpanded: false,
    isHidden: false,
    errorMessage: "",
    showError: false,
    playQueue: [],
    replayGainMode: "track",
    // DSP state (foobar2000/Roon-style signal chain)
    headroomDB: -3,          // Roon: -3dB headroom before DSP
    headroomEnabled: false,
    compressorEnabled: false,
    compressorThreshold: -12, // dB
    compressorRatio: 4,
    compressorAttack: 5,     // ms
    compressorRelease: 50,   // ms
    crossfeedEnabled: false,
    crossfeedStrength: 0.35, // 0-1 (maps to filter cutoff 650-900Hz, gain -12 to -6dB)
  };

  var audio = null;
  var listeners = [];
  var errorTimer = null;
  var _initialized = false;

  function broadcast() {
    var snap = {
      playlist: state.playlist.slice(),
      currentIndex: state.currentIndex,
      currentSong: Object.assign({}, state.currentSong),
      isPlaying: state.isPlaying,
      isLoading: state.isLoading,
      currentTime: state.currentTime,
      duration: state.duration,
      volume: state.volume,
      isMuted: state.isMuted,
      isShuffled: state.isShuffled,
      isRepeating: state.isRepeating,
      showPlaylist: state.showPlaylist,
      isExpanded: state.isExpanded,
      isHidden: state.isHidden,
      replayGainMode: state.replayGainMode,
      errorMessage: state.errorMessage,
      showError: state.showError,
      playQueue: state.playQueue.slice(),
      // DSP state
      headroomEnabled: state.headroomEnabled,
      compressorEnabled: state.compressorEnabled,
      crossfeedEnabled: state.crossfeedEnabled,
      headroomDB: state.headroomDB,
    };
    listeners.forEach(function (fn) {
      fn(snap);
    });
    window.dispatchEvent(new CustomEvent("music-player:state", { detail: snap }));
  }

  function saveVolume() {
    try { localStorage.setItem(STORAGE_KEY, String(state.volume)); } catch (e) {}
  }

  function loadVolume() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      if (v !== null) {
        var n = parseFloat(v);
        if (!isNaN(n) && n >= 0 && n <= 1) {
          state.volume = n;
          state.isMuted = n === 0;
        }
      }
    } catch (e) {}
  }

  function getAssetPath(path) {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/")) return path;
    return "/" + path;
  }

  function loadSong(song, autoPlay) {
    if (!song) return;
    if (!audio) {
      setupAudio();
      if (!audio) return;
    }
    if (!song.url) return;
    var changed = song.url !== state.currentSong.url;
    state.currentSong = Object.assign({}, song);
    var shouldAutoPlay = autoPlay !== false;
    if (changed) {
      state.currentTime = 0;
      state.isLoading = true;
      broadcast();
      audio.src = getAssetPath(song.url);
      applyReplayGain(song);
      updateMediaSession(song);
      if (shouldAutoPlay) {
        ensureAudioContext();
        audio.play().catch(function () {});
      }
    } else {
      state.currentTime = audio.currentTime;
      if (shouldAutoPlay) {
        ensureAudioContext();
        audio.play().catch(function () {});
      }
    }
    state.duration = song.duration || 0;
    broadcast();
  }

  // Apply ReplayGain based on track/album gain tags
  function applyReplayGain(song) {
    if (!gainNode || !audioCtx) return;
    var rg = song.replayGain;
    if (!rg) { gainNode.gain.setValueAtTime(1, audioCtx.currentTime); return; }
    var mode = state.replayGainMode;
    var gainDB = 0;
    if (mode === "album" && typeof rg.albumGain === "number") {
      gainDB = rg.albumGain;
    } else if (typeof rg.trackGain === "number") {
      gainDB = rg.trackGain;
    }
    var gainLinear = Math.pow(10, gainDB / 20);
    gainNode.gain.setValueAtTime(gainLinear, audioCtx.currentTime);
  }

  // Media Session API for lock screen / media keys
  function updateMediaSession(song) {
    if (!("mediaSession" in navigator)) return;
    if (!song || !song.url) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title || "Unknown",
      artist: song.artist || "Unknown",
      album: song.album || "",
      artwork: song.cover ? [{ src: getAssetPath(song.cover), sizes: "512x512", type: "image/jpeg" }] : [],
    });
  }

  // ReplayGain + Visualization + DSP: Web Audio API signal path
  var audioCtx = null;
  var gainNode = null;       // ReplayGain gain
  var headroomNode = null;   // Roon-style headroom (-3dB before DSP)
  var compressorNode = null; // DynamicsCompressor — prevent clipping
  var crossfeedSplitter = null;
  var crossfeedMerger = null;
  var crossfeedLpL = null;   // lowpass for L→R crossfeed
  var crossfeedLpR = null;   // lowpass for R→L crossfeed
  var crossfeedGainL = null; // crossfeed L→R mix level
  var crossfeedGainR = null; // crossfeed R→L mix level
  var crossfeedDryL = null;  // dry L channel gain
  var crossfeedDryR = null;  // dry R channel gain
  var analyserNode = null;
  var mediaSource = null;
  var dspBypassNode = null;  // bypass when crossfeed is off

  function setupAudio() {
    if (audio) return;
    audio = new Audio();
    audio.volume = state.volume;
    audio.muted = state.isMuted;

    // Create Web Audio API context with full DSP chain
    // Signal path: source → ReplayGain → Headroom → Compressor → [Crossfeed] → Analyser → Dest
    try {
      if (window.AudioContext || window.webkitAudioContext) {
        var AC = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AC();

        // Media element source
        mediaSource = audioCtx.createMediaElementSource(audio);

        // ReplayGain gain node
        gainNode = audioCtx.createGain();
        gainNode.gain.value = 1;

        // Roon-style headroom: -3dB before DSP to prevent intersample peaks
        headroomNode = audioCtx.createGain();
        headroomNode.gain.value = 1; // bypass by default

        // Dynamics compressor — prevents clipping after ReplayGain+headroom
        compressorNode = audioCtx.createDynamicsCompressor();
        compressorNode.threshold.value = -12;
        compressorNode.knee.value = 6;
        compressorNode.ratio.value = 4;
        compressorNode.attack.value = 0.005;
        compressorNode.release.value = 0.050;

        // Crossfeed: split L/R → lowpass cross-mix → merge
        crossfeedSplitter = audioCtx.createChannelSplitter(2);
        crossfeedMerger = audioCtx.createChannelMerger(2);
        // Lowpass filters for crossfeed simulation (Bauer circuit)
        crossfeedLpL = audioCtx.createBiquadFilter();
        crossfeedLpL.type = "lowpass";
        crossfeedLpL.frequency.value = 700;
        crossfeedLpR = audioCtx.createBiquadFilter();
        crossfeedLpR.type = "lowpass";
        crossfeedLpR.frequency.value = 700;
        // Crossfeed mix levels
        crossfeedGainL = audioCtx.createGain();
        crossfeedGainL.gain.value = 0; // off by default
        crossfeedGainR = audioCtx.createGain();
        crossfeedGainR.gain.value = 0;
        // Dry channel gains
        crossfeedDryL = audioCtx.createGain();
        crossfeedDryL.gain.value = 1;
        crossfeedDryR = audioCtx.createGain();
        crossfeedDryR.gain.value = 1;
        // Bypass for when crossfeed is off (direct stereo passthrough)
        dspBypassNode = audioCtx.createGain();
        dspBypassNode.gain.value = 1;

        // Build crossfeed wiring:
        // compressorNode → splitter
        //   splitter[0](L) → crossfeedDryL → merger[0]
        //   splitter[0](L) → crossfeedLpL → crossfeedGainL → merger[1]  (L→R crossfeed)
        //   splitter[1](R) → crossfeedDryR → merger[1]
        //   splitter[1](R) → crossfeedLpR → crossfeedGainR → merger[0]  (R→L crossfeed)
        compressorNode.connect(crossfeedSplitter);
        // Left channel
        crossfeedSplitter.connect(crossfeedDryL, 0, 0);
        crossfeedDryL.connect(crossfeedMerger, 0, 0);
        crossfeedSplitter.connect(crossfeedLpL, 0, 0);
        crossfeedLpL.connect(crossfeedGainL);
        crossfeedGainL.connect(crossfeedMerger, 0, 1); // L→R
        // Right channel
        crossfeedSplitter.connect(crossfeedDryR, 1, 0);
        crossfeedDryR.connect(crossfeedMerger, 0, 1);
        crossfeedSplitter.connect(crossfeedLpR, 1, 0);
        crossfeedLpR.connect(crossfeedGainR);
        crossfeedGainR.connect(crossfeedMerger, 0, 0); // R→L

        // Bypass: compressorNode → dspBypassNode → analyser (when crossfeed off)
        compressorNode.connect(dspBypassNode);
        dspBypassNode.connect(analyserNode || audioCtx.destination);

        // Crossfeed path: merger → analyser → destination
        crossfeedMerger.connect(analyserNode || audioCtx.destination);

        // Analyser for visualization
        analyserNode = audioCtx.createAnalyser();
        analyserNode.fftSize = 256;
        analyserNode.smoothingTimeConstant = 0.7;
        analyserNode.connect(audioCtx.destination);

        // Reconnect correctly: crossfeedMerger → analyser → destination
        // And: dspBypassNode → analyser → destination
        // (We reconnect after creating analyser)
        crossfeedMerger.disconnect();
        crossfeedMerger.connect(analyserNode);
        dspBypassNode.disconnect();
        dspBypassNode.connect(analyserNode);

        // Final chain wiring (in order):
        // mediaSource → gainNode → headroomNode → compressorNode → [crossfeed|bypass] → analyserNode → destination
        mediaSource.connect(gainNode);
        gainNode.connect(headroomNode);
        headroomNode.connect(compressorNode);

        // Apply initial DSP state
        updateHeadroom();
        updateCompressor();
        updateCrossfeed();
        updateDspBypass();
      }
    } catch (e) {
      console.warn("[MusicPlayer] Web Audio API not available:", e.message);
    }

    audio.addEventListener("play", function () {
      state.isPlaying = true;
      broadcast();
    });
    audio.addEventListener("pause", function () {
      state.isPlaying = false;
      broadcast();
    });
    audio.addEventListener("timeupdate", function () {
      state.currentTime = audio.currentTime;
      broadcast();
    });
    audio.addEventListener("loadeddata", function () {
      state.isLoading = false;
      if (audio.duration && audio.duration > 1) {
        state.duration = Math.floor(audio.duration);
        state.currentSong.duration = state.duration;
      }
      broadcast();
    });
    audio.addEventListener("loadstart", function () {
      state.isLoading = true;
      broadcast();
    });
    audio.addEventListener("ended", function () {
      if (state.isRepeating === 1) {
        audio.currentTime = 0;
        ensureAudioContext();
        audio.play().catch(function () {});
      } else if (state.isRepeating === 0 && !state.isShuffled && state.currentIndex >= state.playlist.length - 1) {
        // Repeat off: stop at end of playlist (non-shuffled, on last track)
        state.isPlaying = false;
        broadcast();
      } else {
        // Repeat all (mode 2) or shuffle mode: advance to next
        next(true);
      }
    });
    audio.addEventListener("error", function () {
      state.isLoading = false;
      showError("歌曲加载失败");
      if (state.playlist.length > 1) {
        // Don't auto-advance if repeat is off and on the last track
        if (state.isRepeating === 0 && !state.isShuffled && state.currentIndex >= state.playlist.length - 1) {
          state.isPlaying = false;
        } else {
          setTimeout(function () { next(true); }, 1000);
        }
      }
      broadcast();
    });

    // Media Session API action handlers (lock screen / media keys)
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", function () {
        if (audio) audio.play().catch(function () {});
      });
      navigator.mediaSession.setActionHandler("pause", function () {
        if (audio) audio.pause();
      });
      navigator.mediaSession.setActionHandler("previoustrack", function () {
        prev();
      });
      navigator.mediaSession.setActionHandler("nexttrack", function () {
        next(true);
      });
      navigator.mediaSession.setActionHandler("seekto", function (details) {
        if (details.seekTime != null && audio) {
          audio.currentTime = details.seekTime;
          state.currentTime = details.seekTime;
          broadcast();
        }
      });
    }
  }

  function showError(msg) {
    state.errorMessage = msg;
    state.showError = true;
    broadcast();
    clearTimeout(errorTimer);
    errorTimer = setTimeout(function () {
      state.showError = false;
      broadcast();
    }, 3000);
  }

  function mapTrack(s, i) {
    return {
      id: s.id || i,
      title: s.title || "Unknown",
      artist: s.artist || "Unknown",
      artistRaw: s.artistRaw || "",
      featuredArtists: s.featuredArtists || [],
      album: s.album || "",
      albumArtist: s.albumArtist || "",
      cover: s.cover || "",
      url: s.url || "",
      duration: s.duration || 0,
      sampleRate: s.sampleRate || 0,
      bitsPerSample: s.bitsPerSample || 0,
      channels: s.channels || 2,
      bitrate: s.bitrate || 0,
      isHiRes: s.isHiRes || false,
      codec: s.codec || "",
      codecName: s.codecName || "",
      qualityTier: s.qualityTier || "",
      qualityLabel: s.qualityLabel || "",
      qualityBadge: s.qualityBadge || "",
      genre: s.genre || "",
      year: s.year || 0,
      track: s.track || null,
      composer: s.composer || "",
      tags: s.tags || [],
      lrc: s.lrc || "",
      replayGain: s.replayGain || undefined,
    };
  }

  // Public API
  function init(playlist) {
    if (!playlist || !playlist.length) return;
    var mapped = playlist.map(mapTrack);

    if (_initialized) {
      // Full sync: replace playlist with fresh data, preserving current song
      var curUrl = state.currentSong.url;
      state.playlist = mapped;
      var found = false;
      for (var k = 0; k < mapped.length; k++) {
        if (mapped[k].url === curUrl) { state.currentIndex = k; found = true; break; }
      }
      if (!found) {
        state.currentIndex = 0;
        state.currentSong = Object.assign({}, mapped[0] || state.currentSong);
        // Stop old audio and load first track of new playlist
        if (audio && mapped[0]) {
          loadSong(mapped[0], false);
        }
      } else {
        state.currentSong = Object.assign({}, mapped[state.currentIndex]);
      }
      if (!audio) { setupAudio(); loadVolume(); }
      if (!state.currentSong.url && mapped[0]) {
        loadSong(mapped[0], false);
      }
      broadcast();
      return mapped.length;
    }

    _initialized = true;
    state.playlist = mapped;
    setupAudio();
    loadVolume();
    var randomIndex = Math.floor(Math.random() * state.playlist.length);
    state.currentIndex = randomIndex;
    loadSong(state.playlist[randomIndex], false);
    broadcast();
    return mapped.length;
  }

  function ensureAudioContext() {
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(function () {});
    }
  }

  function toggle() {
    if (!audio || !state.currentSong.url) return;
    if (state.isPlaying) audio.pause();
    else {
      ensureAudioContext();
      audio.play().catch(function () {});
    }
  }

  function prev() {
    if (state.playlist.length <= 1) return;
    var idx = state.currentIndex > 0 ? state.currentIndex - 1 : state.playlist.length - 1;
    state.currentIndex = idx;
    loadSong(state.playlist[idx], true);
  }

  function next(autoPlay) {
    // Check play queue first (Apple Music "Play Next" / "Add to Queue")
    if (state.playQueue.length > 0) {
      var queued = state.playQueue.shift();
      var idx = -1;
      for (var i = 0; i < state.playlist.length; i++) {
        if (state.playlist[i].url === queued.url) { idx = i; break; }
      }
      loadSong(queued, autoPlay !== false);
      broadcast();
      return;
    }
    if (state.playlist.length <= 1) return;
    var newIdx;
    if (state.isShuffled) {
      do {
        newIdx = Math.floor(Math.random() * state.playlist.length);
      } while (newIdx === state.currentIndex && state.playlist.length > 1);
    } else {
      newIdx = state.currentIndex < state.playlist.length - 1 ? state.currentIndex + 1 : 0;
    }
    state.currentIndex = newIdx;
    loadSong(state.playlist[newIdx], autoPlay !== false);
  }

  function playIndex(index) {
    if (index < 0 || index >= state.playlist.length) return;
    state.currentIndex = index;
    loadSong(state.playlist[index], true);
  }

  function seek(time) {
    if (!audio || time < 0 || time > state.duration) return;
    audio.currentTime = time;
    state.currentTime = time;
    broadcast();
  }

  function setVolume(v) {
    var vol = Math.max(0, Math.min(1, v));
    state.volume = vol;
    state.isMuted = vol === 0;
    if (audio) {
      audio.volume = vol;
      audio.muted = state.isMuted;
    }
    saveVolume();
    broadcast();
  }

  function toggleMute() {
    state.isMuted = !state.isMuted;
    if (audio) {
      // Restore minimum audible volume when unmuting from zero-volume state
      if (!state.isMuted && audio.volume === 0) {
        var v = state.volume || 0.5;
        audio.volume = v;
        state.volume = v;
        saveVolume();
      }
      audio.muted = state.isMuted;
    }
    broadcast();
  }

  function toggleShuffle() {
    state.isShuffled = !state.isShuffled;
    if (state.isShuffled) state.isRepeating = 0;
    broadcast();
  }

  function toggleRepeat() {
    state.isRepeating = (state.isRepeating + 1) % 3;
    if (state.isRepeating !== 0) state.isShuffled = false;
    broadcast();
  }

  function togglePlaylist() {
    state.showPlaylist = !state.showPlaylist;
    broadcast();
  }

  function toggleExpanded() {
    state.isExpanded = !state.isExpanded;
    if (state.isExpanded) {
      state.showPlaylist = false;
      state.isHidden = false;
    }
    broadcast();
  }

  function toggleHidden() {
    state.isHidden = !state.isHidden;
    if (state.isHidden) {
      state.isExpanded = false;
      state.showPlaylist = false;
    }
    broadcast();
  }

  function hideError() {
    state.showError = false;
    broadcast();
  }

  // Play Queue API (Apple Music-style "Play Next" / "Add to Queue")
  function playNext(track) {
    if (!track || !track.url) return;
    state.playQueue.unshift(track);
    broadcast();
  }

  function addToQueue(track) {
    if (!track || !track.url) return;
    state.playQueue.push(track);
    broadcast();
  }

  function clearQueue() {
    state.playQueue = [];
    broadcast();
  }

  function setReplayGainMode(mode) {
    state.replayGainMode = mode === "album" ? "album" : "track";
    if (state.currentSong && state.currentSong.url) {
      applyReplayGain(state.currentSong);
    }
    broadcast();
  }

  // ===================================================================
  // DSP control functions (foobar2000/Roon-style signal chain)
  // ===================================================================

  function updateHeadroom() {
    if (!headroomNode) return;
    if (state.headroomEnabled) {
      var db = state.headroomDB || -3;
      headroomNode.gain.setValueAtTime(Math.pow(10, db / 20), audioCtx.currentTime);
    } else {
      headroomNode.gain.setValueAtTime(1, audioCtx.currentTime);
    }
  }

  function updateCompressor() {
    if (!compressorNode) return;
    if (state.compressorEnabled) {
      compressorNode.threshold.value = state.compressorThreshold;
      compressorNode.ratio.value = state.compressorRatio;
      compressorNode.attack.value = state.compressorAttack / 1000;
      compressorNode.release.value = state.compressorRelease / 1000;
    } else {
      // Soft bypass: effectively no compression
      compressorNode.threshold.value = 0;
      compressorNode.ratio.value = 1;
    }
  }

  function updateCrossfeed() {
    if (!crossfeedGainL || !crossfeedGainR || !crossfeedLpL || !crossfeedLpR) return;
    if (state.crossfeedEnabled) {
      var s = state.crossfeedStrength;
      // Strength maps: filter 650-900Hz, gain -12 to -6dB
      var freq = 650 + s * 250;
      var gainDB = -(12 - s * 6);
      var gainLin = Math.pow(10, gainDB / 20);
      crossfeedLpL.frequency.setValueAtTime(freq, audioCtx.currentTime);
      crossfeedLpR.frequency.setValueAtTime(freq, audioCtx.currentTime);
      crossfeedGainL.gain.setValueAtTime(gainLin, audioCtx.currentTime);
      crossfeedGainR.gain.setValueAtTime(gainLin, audioCtx.currentTime);
      crossfeedDryL.gain.setValueAtTime(1 - s * 0.15, audioCtx.currentTime);
      crossfeedDryR.gain.setValueAtTime(1 - s * 0.15, audioCtx.currentTime);
    } else {
      // Crossfeed off: mute the merger path entirely to avoid doubling signal with bypass
      crossfeedGainL.gain.setValueAtTime(0, audioCtx.currentTime);
      crossfeedGainR.gain.setValueAtTime(0, audioCtx.currentTime);
      crossfeedDryL.gain.setValueAtTime(0, audioCtx.currentTime);
      crossfeedDryR.gain.setValueAtTime(0, audioCtx.currentTime);
    }
    updateDspBypass();
  }

  function updateDspBypass() {
    if (!dspBypassNode || !crossfeedMerger || !analyserNode) return;
    // Route: when crossfeed is off, use bypass path (simpler/cheaper)
    // Both are connected; we mute the unused path
    if (state.crossfeedEnabled) {
      dspBypassNode.gain.setValueAtTime(0, audioCtx.currentTime);
      // crossfeedMerger is already connected to analyserNode
    } else {
      dspBypassNode.gain.setValueAtTime(1, audioCtx.currentTime);
    }
  }

  function setHeadroom(enabled, db) {
    state.headroomEnabled = !!enabled;
    if (typeof db === "number") state.headroomDB = db;
    updateHeadroom();
    broadcast();
  }

  function setCompressor(enabled, settings) {
    state.compressorEnabled = !!enabled;
    if (settings) {
      if (typeof settings.threshold === "number") state.compressorThreshold = settings.threshold;
      if (typeof settings.ratio === "number") state.compressorRatio = settings.ratio;
      if (typeof settings.attack === "number") state.compressorAttack = settings.attack;
      if (typeof settings.release === "number") state.compressorRelease = settings.release;
    }
    updateCompressor();
    broadcast();
  }

  function setCrossfeed(enabled, strength) {
    state.crossfeedEnabled = !!enabled;
    if (typeof strength === "number") state.crossfeedStrength = Math.max(0, Math.min(1, strength));
    updateCrossfeed();
    broadcast();
  }

  function getDspChain() {
    // Returns Roon-style signal path description of active DSP
    var nodes = [];
    // Source format
    var song = state.currentSong;
    if (song.codecName) nodes.push(song.codecName);
    else if (song.codec) nodes.push(song.codec.toUpperCase());
    else nodes.push("Audio");
    if (song.sampleRate) {
      nodes.push((song.sampleRate / 1000).toFixed(song.sampleRate % 1000 === 0 ? 0 : 1) + "kHz/" + (song.bitsPerSample || 16) + "bit");
    }
    // ReplayGain
    var rgMode = state.replayGainMode === "album" ? "Album Gain" : "Track Gain";
    nodes.push("RG(" + rgMode + ")");
    // Headroom
    if (state.headroomEnabled) {
      nodes.push("Headroom(" + state.headroomDB + "dB)");
    }
    // Compressor
    if (state.compressorEnabled) {
      nodes.push("Comp(" + state.compressorThreshold + "dB, " + state.compressorRatio + ":1)");
    }
    // Crossfeed
    if (state.crossfeedEnabled) {
      nodes.push("Crossfeed(" + Math.round(state.crossfeedStrength * 100) + "%)");
    }
    nodes.push("Output");
    return {
      nodes: nodes,
      path: nodes.join(" → "),
      activeCount: (state.headroomEnabled ? 1 : 0) + (state.compressorEnabled ? 1 : 0) + (state.crossfeedEnabled ? 1 : 0),
    };
  }

  /**
   * Merge new tracks from the JSON playlist (fetched from /api/music-playlist.json).
   * Tracks are matched by URL — only truly new tracks are appended.
   * Returns the number of newly added tracks.
   */
  function mergePlaylist(newTracks) {
    if (!newTracks || !newTracks.length) return 0;
    var existingUrls = {};
    for (var i = 0; i < state.playlist.length; i++) {
      existingUrls[state.playlist[i].url] = true;
    }
    var added = 0;
    for (var j = 0; j < newTracks.length; j++) {
      var t = newTracks[j];
      if (!existingUrls[t.url]) {
        state.playlist.push({
          id: state.playlist.length + j,
          title: t.title || "Unknown",
          artist: t.artist || "Unknown",
          artistRaw: t.artistRaw || "",
          featuredArtists: t.featuredArtists || [],
          album: t.album || "",
          albumArtist: t.albumArtist || "",
          cover: t.cover || "",
          url: t.url || "",
          duration: t.duration || 0,
          sampleRate: t.sampleRate || 0,
          bitsPerSample: t.bitsPerSample || 0,
          channels: t.channels || 2,
          bitrate: t.bitrate || 0,
          isHiRes: t.isHiRes || false,
          codec: t.codec || "",
          codecName: t.codecName || "",
          qualityTier: t.qualityTier || "",
          qualityLabel: t.qualityLabel || "",
          qualityBadge: t.qualityBadge || "",
          genre: t.genre || "",
          year: t.year || 0,
          track: t.track || null,
          composer: t.composer || "",
          tags: t.tags || [],
          lrc: t.lrc || "",
          replayGain: t.replayGain || undefined,
        });
        existingUrls[t.url] = true;
        added++;
      }
    }
    if (added > 0) {
      broadcast();
    }
    return added;
  }

  /**
   * Fetch the latest playlist JSON and merge new tracks.
   * Call this to pick up newly added music files without a page reload.
   */
  function refreshLibrary() {
    return fetch("/api/music-playlist.json")
      .then(function (resp) {
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        return resp.json();
      })
      .then(function (tracks) {
        var added = mergePlaylist(tracks);
        return { success: true, added: added, total: state.playlist.length };
      })
      .catch(function (err) {
        return { success: false, error: err.message };
      });
  }

  /**
   * Trigger a refresh of the playlist from the latest JSON data.
   * During dev mode with the file watcher running, the JSON is kept
   * up-to-date automatically. Falls back to direct JSON fetch.
   */
  function scanAndRefresh() {
    // First try to trigger a server-side re-scan (dev mode only)
    return fetch("/api/music/scan")
      .then(function (resp) { return resp.json(); })
      .then(function (result) {
        if (result.success) return refreshLibrary();
        return refreshLibrary();
      })
      .catch(function () {
        // API endpoint not available (production / static build)
        // Just refresh from the latest JSON directly
        return refreshLibrary();
      });
  }

  function subscribe(fn) {
    listeners.push(fn);
    fn({
      playlist: state.playlist.slice(),
      currentIndex: state.currentIndex,
      currentSong: Object.assign({}, state.currentSong),
      isPlaying: state.isPlaying,
      isLoading: state.isLoading,
      currentTime: state.currentTime,
      duration: state.duration,
      volume: state.volume,
      isMuted: state.isMuted,
      isShuffled: state.isShuffled,
      isRepeating: state.isRepeating,
      showPlaylist: state.showPlaylist,
      isExpanded: state.isExpanded,
      isHidden: state.isHidden,
      replayGainMode: state.replayGainMode,
      errorMessage: state.errorMessage,
      showError: state.showError,
      playQueue: state.playQueue.slice(),
      headroomEnabled: state.headroomEnabled,
      compressorEnabled: state.compressorEnabled,
      crossfeedEnabled: state.crossfeedEnabled,
      headroomDB: state.headroomDB,
    });
    return function () {
      var i = listeners.indexOf(fn);
      if (i > -1) listeners.splice(i, 1);
    };
  }

  function destroy() {
    if (audio) {
      audio.pause();
      audio.src = "";
      audio = null;
    }
    listeners = [];
  }

  var player = {
    init: init,
    toggle: toggle,
    prev: prev,
    next: next,
    playIndex: playIndex,
    seek: seek,
    setVolume: setVolume,
    toggleMute: toggleMute,
    toggleShuffle: toggleShuffle,
    toggleRepeat: toggleRepeat,
    togglePlaylist: togglePlaylist,
    toggleExpanded: toggleExpanded,
    toggleHidden: toggleHidden,
    hideError: hideError,
    playNext: playNext,
    addToQueue: addToQueue,
    clearQueue: clearQueue,
    setReplayGainMode: setReplayGainMode,
    subscribe: subscribe,
    destroy: destroy,
    getState: function () { return state; },
    getAnalyserNode: function () { return analyserNode; },
    // DSP controls
    setHeadroom: setHeadroom,
    setCompressor: setCompressor,
    setCrossfeed: setCrossfeed,
    getDspChain: getDspChain,
    // Auto-import / library refresh
    mergePlaylist: mergePlaylist,
    refreshLibrary: refreshLibrary,
    scanAndRefresh: scanAndRefresh,
  };

  window.__musicPlayer = player;

  // Listen for init event from config carrier
  document.addEventListener("music-player:init", function (e) {
    if (e.detail && e.detail.playlist && e.detail.playlist.length) {
      player.init(e.detail.playlist);
    }
  });

  // Re-init after page swaps: ensure audio exists and song is loaded if state persisted
  document.addEventListener("astro:after-swap", function () {
    if (!state.playlist.length) return;
    if (!audio) {
      setupAudio();
      loadVolume();
    }
    if (state.currentSong.url) {
      loadSong(state.currentSong, state.isPlaying);
    } else if (state.playlist[state.currentIndex]) {
      loadSong(state.playlist[state.currentIndex], state.isPlaying);
    }
  });
})();
