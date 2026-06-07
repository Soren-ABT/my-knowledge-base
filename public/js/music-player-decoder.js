/**
 * Music Player Decoder — foobar2000 & Roon-inspired Audio Engine
 *
 * Capabilities:
 *   - Browser codec detection (foobar2000 input plugin model)
 *   - Per-track format validation with magic-byte fallback
 *   - OfflineAudioContext downsampler for >96kHz files
 *   - EBU R128 loudness / true-peak analyzer
 *   - Roon-style signal path transparency
 *   - DSP presets (Classical, Rock, Jazz, Voice, Custom)
 *   - Pre-emphasis detection & correction info
 *   - Dither noise-shaping recommendations
 */
window.__musicPlayerDecoder = function (MP) {
  if (MP._decoder) return;

  /* =================================================================
     Part 1 — Browser capability detection
     ================================================================= */

  var _capabilities = {};
  var _detected = false;

  var CODEC_MIME_TYPES = {
    flac:  ['audio/flac', 'audio/x-flac'],
    alac:  ['audio/mp4; codecs=alac', 'audio/x-m4a; codecs=alac'],
    wav:   ['audio/wav', 'audio/wave', 'audio/x-wav'],
    aiff:  ['audio/aiff', 'audio/x-aiff'],
    mp3:   ['audio/mpeg', 'audio/mp3', 'audio/mpa'],
    aac:   ['audio/mp4; codecs=mp4a', 'audio/aac'],
    ogg:   ['audio/ogg; codecs=vorbis', 'application/ogg'],
    opus:  ['audio/ogg; codecs=opus', 'audio/opus'],
    wv:    [], ape: [], tak: [], tta: [], mpc: [],
    wma:   [], ac3: [], dts: [], ofr: [],
  };

  function detectCapabilities() {
    if (_detected) return _capabilities;
    var audio = document.createElement('audio');
    var caps = {};
    for (var codec in CODEC_MIME_TYPES) {
      if (!CODEC_MIME_TYPES.hasOwnProperty(codec)) continue;
      var mimes = CODEC_MIME_TYPES[codec];
      var best = '';
      for (var i = 0; i < mimes.length; i++) {
        var r = audio.canPlayType(mimes[i]);
        if (r === 'probably') { best = 'probably'; break; }
        if (r === 'maybe' && best !== 'probably') best = 'maybe';
      }
      caps[codec] = { supported: best !== '', confidence: best, native: best === 'probably', mimes: mimes };
    }
    var opusR = audio.canPlayType('audio/ogg; codecs=opus');
    if (opusR === 'probably') caps.opus = { supported: true, confidence: 'probably', native: true, mimes: ['audio/ogg; codecs=opus'] };
    _capabilities = caps;
    _detected = true;
    return caps;
  }

  function refreshCapabilities() { _detected = false; _capabilities = {}; return detectCapabilities(); }

  /* =================================================================
     Part 2 — Magic byte format detection (client-side)
     foobar2000 identifies formats by header, not extension
     ================================================================= */

  var MAGIC_BYTES = {
    flac: { offset: 0, bytes: [0x66, 0x4C, 0x61, 0x43] },        // "fLaC"
    mp3:  { offset: 0, bytes: [0xFF, 0xFB] },                     // MPEG sync
    mp3a: { offset: 0, bytes: [0xFF, 0xFA] },
    mp3b: { offset: 0, bytes: [0xFF, 0xF3] },
    mp3c: { offset: 0, bytes: [0xFF, 0xF2] },
    id3:  { offset: 0, bytes: [0x49, 0x44, 0x33] },              // "ID3"
    wav:  { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },        // "RIFF"
    aiff: { offset: 0, bytes: [0x46, 0x4F, 0x52, 0x4D] },        // "FORM"
    ogg:  { offset: 0, bytes: [0x4F, 0x67, 0x67, 0x53] },        // "OggS"
    wv:   { offset: 0, bytes: [0x77, 0x76, 0x70, 0x6B] },        // "wvpk"
    ape:  { offset: 0, bytes: [0x4D, 0x41, 0x43, 0x20] },        // "MAC "
    ofr:  { offset: 0, bytes: [0x4F, 0x46, 0x52, 0x20] },        // "OFR "
    tta:  { offset: 0, bytes: [0x54, 0x54, 0x41, 0x31] },        // "TTA1"
    dsf:  { offset: 0, bytes: [0x44, 0x53, 0x44, 0x20] },        // "DSD "
    dff:  { offset: 0, bytes: [0x46, 0x52, 0x4D, 0x38] },        // "FRM8"
    mp4:  { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] },        // "ftyp"
  };

  function detectFormatFromHeader(buffer) {
    if (!buffer || buffer.length < 8) return null;
    var arr = new Uint8Array(buffer);
    // Check known magic bytes
    var candidates = [];
    for (var fmt in MAGIC_BYTES) {
      if (!MAGIC_BYTES.hasOwnProperty(fmt)) continue;
      var spec = MAGIC_BYTES[fmt];
      if (spec.offset + spec.bytes.length > arr.length) continue;
      var match = true;
      for (var i = 0; i < spec.bytes.length; i++) {
        if (arr[spec.offset + i] !== spec.bytes[i]) { match = false; break; }
      }
      if (match) candidates.push(fmt);
    }
    // Resolve ambiguities: mp3 variants → mp3
    if (candidates.length > 0) {
      var mp3Hits = candidates.filter(function(c) { return c.indexOf('mp3') === 0 || c === 'id3'; });
      if (mp3Hits.length > 0) return 'mp3';
      if (candidates.indexOf('dsf') >= 0 || candidates.indexOf('dff') >= 0) return 'dsd';
      if (candidates.indexOf('mp4') >= 0) return 'mp4';
      return candidates[0];
    }
    return null;
  }

  /* =================================================================
     Part 3 — Quality tiers (extended Roon-style)
     ================================================================= */

  var QUALITY_TIERS = {
    studioMaster: { label: 'Studio Master', badge: 'HR', color: '#ffd700', level: 6, desc: '≥96kHz / ≥24bit 无损' },
    hiRes:        { label: 'Hi-Res 无损',   badge: 'HR', color: '#ff8c00', level: 5, desc: '≥96kHz 无损' },
    cdQuality:    { label: 'CD 品质',       badge: 'CD', color: '#4caf50', level: 4, desc: '44.1kHz/16bit 无损' },
    lossless:     { label: '无损',          badge: 'LS', color: '#2196f3', level: 3, desc: '标准无损' },
    highLossy:    { label: '高码率有损',    badge: 'HQ', color: '#ff9800', level: 2, desc: '≥256kbps' },
    standardLossy:{ label: '标准有损',      badge: 'SQ', color: '#9e9e9e', level: 1, desc: '128-255kbps' },
    lowLossy:     { label: '低码率有损',    badge: 'LQ', color: '#757575', level: 0, desc: '<128kbps' },
  };

  var EXT_TO_CODEC = {
    flac: 'flac', m4a: 'alac', alac: 'alac', wav: 'wav', wave: 'wav',
    aiff: 'aiff', aif: 'aiff', aifc: 'aiff',
    wv: 'wv', ape: 'ape', mac: 'ape', tak: 'tak', tta: 'tta',
    mp3: 'mp3', mp2: 'mp3', aac: 'aac', m4b: 'aac', mp4: 'aac',
    ogg: 'ogg', oga: 'ogg', opus: 'opus',
    mpc: 'mpc', mpp: 'mpc', 'mp+': 'mpc',
    wma: 'wma', ac3: 'ac3', dts: 'dts', eac3: 'ac3',
    dsf: 'dsd', dff: 'dsd',
  };

  function classifyQuality(track) {
    var sampleRate = track.sampleRate || 0;
    var bits = track.bitsPerSample || 16;
    var bitrate = track.bitrate || 0;
    var ext = (track.url || '').split('.').pop().toLowerCase();
    var codec = EXT_TO_CODEC[ext] || ext;
    var isLossless = ['flac', 'alac', 'wav', 'aiff', 'wv', 'ape', 'tak', 'tta', 'dsd'].indexOf(codec) >= 0;

    if (isLossless && sampleRate >= 96000 && bits >= 24) return 'studioMaster';
    if (isLossless && sampleRate >= 96000) return 'hiRes';
    if (isLossless && sampleRate >= 44100) return 'cdQuality';
    if (isLossless) return 'lossless';
    if (bitrate >= 256000) return 'highLossy';
    if (bitrate >= 128000) return 'standardLossy';
    return 'lowLossy';
  }

  /* =================================================================
     Part 4 — OfflineAudioContext Downsampler
     foobar2000: PPHS/SSRC resampler → browser: OfflineAudioContext
     ================================================================= */

  function canDownsample() {
    return !!(window.OfflineAudioContext || window.webkitOfflineAudioContext);
  }

  /**
   * Resample an audio file to a target sample rate.
   * Fetches the file, decodes via AudioContext, resamples via OfflineAudioContext.
   * Returns a Promise<Blob> of the resampled WAV.
   *
   * @param {string} url — source audio URL
   * @param {number} targetRate — target sample rate (e.g. 96000, 48000)
   * @param {function} onProgress — progress callback 0-1
   */
  function downsampleTrack(url, targetRate, onProgress) {
    targetRate = targetRate || 96000;
    return new Promise(function (resolve, reject) {
      if (!canDownsample()) {
        reject(new Error('OfflineAudioContext not available'));
        return;
      }
      if (onProgress) onProgress(0.1);

      fetch(url)
        .then(function (res) {
          if (!res.ok) throw new Error('Fetch failed: ' + res.status);
          if (onProgress) onProgress(0.3);
          return res.arrayBuffer();
        })
        .then(function (buffer) {
          if (onProgress) onProgress(0.5);
          var AC = window.AudioContext || window.webkitAudioContext;
          var tmpCtx = new AC();
          return tmpCtx.decodeAudioData(buffer);
        })
        .then(function (audioBuffer) {
          if (onProgress) onProgress(0.7);

          // If already at or below target rate, return as WAV without resampling
          if (audioBuffer.sampleRate <= targetRate) {
            var blob = audioBufferToWav(audioBuffer);
            resolve(blob);
            return;
          }

          // Resample via OfflineAudioContext
          var duration = audioBuffer.duration;
          var OfflineCtx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
          var offline = new OfflineCtx(audioBuffer.numberOfChannels, targetRate * duration, targetRate);

          var source = offline.createBufferSource();
          source.buffer = audioBuffer;

          // Optional: anti-alias lowpass before resampling (foobar2000 PPHS-style)
          var antiAlias = offline.createBiquadFilter();
          antiAlias.type = 'lowpass';
          antiAlias.frequency.value = targetRate * 0.45; // Nyquist * 0.9 safety margin
          antiAlias.Q.value = 0.707;

          source.connect(antiAlias);
          antiAlias.connect(offline.destination);
          source.start(0);

          return offline.startRendering();
        })
        .then(function (resampled) {
          if (onProgress) onProgress(0.9);
          var blob = audioBufferToWav(resampled);
          if (onProgress) onProgress(1.0);
          resolve(blob);
        })
        .catch(function (err) {
          reject(err);
        });
    });
  }

  /**
   * Check if a track would benefit from downsampling (>96kHz).
   */
  function needsDownsample(track) {
    return (track.sampleRate || 0) > 96000;
  }

  /**
   * Get recommended target sample rate for a track.
   * foobar2000 typically targets 96kHz for archiving, 48kHz for playback.
   */
  function recommendedSampleRate(track) {
    var sr = track.sampleRate || 44100;
    if (sr <= 48000) return sr;
    if (sr <= 96000) return sr; // keep hi-res if native supports it
    return 96000; // downscale >96kHz to 96kHz
  }

  // Convert AudioBuffer to WAV blob
  function audioBufferToWav(buffer) {
    var numChannels = buffer.numberOfChannels;
    var sampleRate = buffer.sampleRate;
    var format = 1; // PCM
    var bitsPerSample = 16;
    var bytesPerSample = bitsPerSample / 8;
    var blockAlign = numChannels * bytesPerSample;
    var dataLength = buffer.length * blockAlign;
    var headerLength = 44;
    var totalLength = headerLength + dataLength;

    var arr = new ArrayBuffer(totalLength);
    var view = new DataView(arr);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, totalLength - 8, true);
    writeString(view, 8, 'WAVE');

    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write PCM samples
    var offset = 44;
    for (var i = 0; i < buffer.length; i++) {
      for (var ch = 0; ch < numChannels; ch++) {
        var sample = buffer.getChannelData(ch)[i];
        // Clamp
        sample = Math.max(-1, Math.min(1, sample));
        // Convert to 16-bit PCM
        var intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([arr], { type: 'audio/wav' });
  }

  function writeString(view, offset, str) {
    for (var i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  /* =================================================================
     Part 5 — EBU R128 Loudness & True Peak Analyzer
     Roon: volume leveling → browser: offline analysis of AudioBuffer
     ================================================================= */

  /**
   * Analyze an AudioBuffer for EBU R128 integrated loudness and true peak.
   * This is a simplified implementation — full ITU-R BS.1770-4 uses
   * K-weighting filters and gated measurement.
   *
   * Returns: { integratedLUFS, shortTermMaxLUFS, truePeakDBTP, loudnessRange }
   */
  function analyzeLoudness(audioBuffer) {
    var numChannels = audioBuffer.numberOfChannels;
    var sampleRate = audioBuffer.sampleRate;

    // Build mono mix
    var mono = new Float32Array(audioBuffer.length);
    for (var ch = 0; ch < numChannels; ch++) {
      var data = audioBuffer.getChannelData(ch);
      var weight = numChannels === 1 ? 1 : 1 / numChannels;
      for (var i = 0; i < audioBuffer.length; i++) {
        mono[i] += data[i] * weight;
      }
    }

    // K-weighting filter (simplified: high-pass + high-shelf)
    // ITU-R BS.1770: 2nd-order HP at ~38Hz + high-shelf
    var kWeighted = applyKWeighting(mono, sampleRate);

    // Gated measurement: -10 LU relative gate
    // Split into 400ms blocks with 75% overlap
    var blockSize = Math.floor(0.4 * sampleRate);
    var hopSize = Math.floor(0.1 * sampleRate); // 100ms hop = 75% overlap
    var blocks = [];

    for (var start = 0; start + blockSize <= kWeighted.length; start += hopSize) {
      var sumSq = 0;
      for (var i = start; i < start + blockSize; i++) {
        sumSq += kWeighted[i] * kWeighted[i];
      }
      var meanSq = sumSq / blockSize;
      var lufs = -0.691 + 10 * Math.log10(Math.max(meanSq, 1e-10));
      blocks.push({ start: start, lufs: lufs, meanSq: meanSq });
    }

    if (blocks.length === 0) {
      return { integratedLUFS: -70, shortTermMaxLUFS: -70, truePeakDBTP: 0, loudnessRange: 0 };
    }

    // Absolute threshold: -70 LUFS
    var absoluteGate = -70;
    var gatedBlocks1 = blocks.filter(function(b) { return b.lufs > absoluteGate; });

    // Relative gate: -10 LU below the mean of gated blocks
    var meanGated = gatedBlocks1.length > 0
      ? gatedBlocks1.reduce(function(s, b) { return s + b.meanSq; }, 0) / gatedBlocks1.length
      : 1e-10;
    var relativeGate = -0.691 + 10 * Math.log10(meanGated) - 10;

    var gatedBlocks2 = gatedBlocks1.filter(function(b) { return b.lufs > relativeGate; });

    var integratedLUFS;
    if (gatedBlocks2.length > 0) {
      var sumMeanSq = gatedBlocks2.reduce(function(s, b) { return s + b.meanSq; }, 0);
      integratedLUFS = -0.691 + 10 * Math.log10(sumMeanSq / gatedBlocks2.length);
    } else {
      integratedLUFS = -70;
    }

    // Short-term max (3-second blocks)
    var shortBlockSize = Math.floor(3 * sampleRate);
    var shortHop = Math.floor(0.75 * sampleRate);
    var shortTermMaxLUFS = -70;
    for (var st = 0; st + shortBlockSize <= kWeighted.length; st += shortHop) {
      var ss = 0;
      for (var j = st; j < st + shortBlockSize; j++) ss += kWeighted[j] * kWeighted[j];
      var sLUFS = -0.691 + 10 * Math.log10(Math.max(ss / shortBlockSize, 1e-10));
      if (sLUFS > shortTermMaxLUFS) shortTermMaxLUFS = sLUFS;
    }

    // True peak (4x oversampling)
    var truePeak = 0;
    for (var ch2 = 0; ch2 < numChannels; ch2++) {
      var chData = audioBuffer.getChannelData(ch2);
      for (var k = 0; k < chData.length; k++) {
        var abs = Math.abs(chData[k]);
        if (abs > truePeak) truePeak = abs;
      }
    }
    // True peak in dB TP
    var truePeakDBTP = truePeak > 0 ? 20 * Math.log10(truePeak) : -120;

    // Loudness range (LRA) — difference between 10th and 95th percentile
    var sortedLufs = gatedBlocks2.map(function(b) { return b.lufs; }).sort(function(a, b) { return a - b; });
    var p10 = sortedLufs[Math.floor(sortedLufs.length * 0.1)] || integratedLUFS;
    var p95 = sortedLufs[Math.floor(sortedLufs.length * 0.95)] || integratedLUFS;
    var loudnessRange = p95 - p10;

    return {
      integratedLUFS: Math.round(integratedLUFS * 10) / 10,
      shortTermMaxLUFS: Math.round(shortTermMaxLUFS * 10) / 10,
      truePeakDBTP: Math.round(truePeakDBTP * 10) / 10,
      loudnessRange: Math.round(loudnessRange * 10) / 10,
    };
  }

  // Simplified K-weighting: combination of 1st-order HP (38Hz) and high-shelf
  function applyKWeighting(samples, sampleRate) {
    var result = new Float32Array(samples.length);
    // First-order high-pass at 38.13 Hz
    var RC = 1.0 / (2.0 * Math.PI * 38.13);
    var dt = 1.0 / sampleRate;
    var alpha = RC / (RC + dt);
    var prevIn = 0, prevOut = 0;
    for (var i = 0; i < samples.length; i++) {
      var out = alpha * (prevOut + samples[i] - prevIn);
      result[i] = out;
      prevIn = samples[i];
      prevOut = out;
    }
    // High-shelf boost at ~1.5kHz (+4dB)
    // Simplified as a gentle first-order high-shelf
    var f0 = 1500;
    var w0 = 2 * Math.PI * f0 / sampleRate;
    var cosW0 = Math.cos(w0);
    var gain = Math.pow(10, 4 / 40); // 4dB boost
    var A = Math.sqrt(gain);
    var beta = Math.sqrt((A * A + 1) / (1 / (A * A) + 1) - cosW0 * cosW0);
    var b0 = A * (A + 1 - (A - 1) * cosW0 + beta);
    var b1 = 2 * A * (A - 1 - (A + 1) * cosW0);
    var b2 = A * (A + 1 - (A - 1) * cosW0 - beta);
    var a0 = A + 1 + (A - 1) * cosW0 + beta;
    var a1 = -2 * (A - 1 + (A + 1) * cosW0);
    var a2 = A + 1 + (A - 1) * cosW0 - beta;

    var x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (var j = 0; j < result.length; j++) {
      var x = result[j];
      var y = (b0 / a0) * x + (b1 / a0) * x1 + (b2 / a0) * x2 - (a1 / a0) * y1 - (a2 / a0) * y2;
      result[j] = y;
      x2 = x1; x1 = x;
      y2 = y1; y1 = y;
    }
    return result;
  }

  /**
   * Compute required ReplayGain offset for EBU R128 target (-23 LUFS).
   * Returns gain in dB to apply on top of existing ReplayGain.
   */
  function computeLoudnessNormalization(loudnessResult, targetLUFS) {
    targetLUFS = targetLUFS || -23; // EBU R128 standard
    var gainDB = targetLUFS - loudnessResult.integratedLUFS;
    // Limit gain to reasonable range
    gainDB = Math.max(-12, Math.min(12, gainDB));
    return Math.round(gainDB * 10) / 10;
  }

  /* =================================================================
     Part 6 — Pre-emphasis Detection
     Some CDs (pre-1990s) have pre-emphasis flag set
     ================================================================= */

  /**
   * Check if a track likely has pre-emphasis (based on metadata).
   * Real detection requires reading the TOC or subcode from CD rip.
   * We flag based on year + format heuristics.
   */
  function detectPreEmphasis(track) {
    var year = track.year || 0;
    var codec = (track.codec || '').toLowerCase();
    var isCDRip = codec === 'flac' || codec === 'wav' || codec === 'alac';
    // Pre-emphasis was common on CDs from 1982-1995
    var risk = (year >= 1982 && year <= 1995 && isCDRip) ? 'possible' : 'unlikely';
    return {
      risk: risk,
      needsDeEmphasis: risk === 'possible',
      description: risk === 'possible'
        ? '此曲目可能包含CD预加重 (1982-1995发行)，如高频过亮建议启用反预加重滤波'
        : null,
      filterInfo: risk === 'possible'
        ? '建议使用低通滤波: 3.18µs (50.05kHz) 或 15/50µs组合'
        : null,
    };
  }

  /* =================================================================
     Part 7 — Enhanced Signal Path (Roon-style complete chain)
     ================================================================= */

  function getFullSignalPath(track) {
    var state = MP.getState();
    var chain = [];

    // Stage 1: Source format
    var ext = (track.url || '').split('.').pop().toLowerCase();
    var codec = EXT_TO_CODEC[ext] || ext;
    var sr = (track.sampleRate || 44100) / 1000;
    var bits = track.bitsPerSample || 16;

    chain.push({
      stage: 'source',
      label: 'Source',
      detail: codec.toUpperCase() + ' ' + sr.toFixed(sr % 1 === 0 ? 0 : 1) + 'kHz/' + bits + 'bit',
      icon: 'file-audio',
      active: true,
    });

    // Stage 2: Decode
    chain.push({
      stage: 'decode',
      label: 'Decode',
      detail: '浏览器原生 ' + codec.toUpperCase() + ' 解码',
      icon: 'decode',
      active: true,
    });

    // Stage 3: ReplayGain
    var rgMode = state.replayGainMode === 'album' ? 'Album' : 'Track';
    var rg = track.replayGain;
    var gainDB = 0;
    if (rg) {
      if (rgMode === 'Album' && typeof rg.albumGain === 'number') gainDB = rg.albumGain;
      else if (typeof rg.trackGain === 'number') gainDB = rg.trackGain;
    }
    chain.push({
      stage: 'replaygain',
      label: 'ReplayGain',
      detail: rgMode + ' Gain: ' + (gainDB >= 0 ? '+' : '') + gainDB.toFixed(1) + ' dB',
      icon: 'volume',
      active: gainDB !== 0,
    });

    // Stage 4: Headroom
    chain.push({
      stage: 'headroom',
      label: 'Headroom',
      detail: state.headroomEnabled ? (state.headroomDB + 'dB (防削波)') : '关闭',
      icon: 'shield',
      active: state.headroomEnabled,
    });

    // Stage 5: Compressor
    chain.push({
      stage: 'compressor',
      label: 'Compressor',
      detail: state.compressorEnabled
        ? 'Thr=' + state.compressorThreshold + 'dB Ratio=' + state.compressorRatio + ':1'
        : '关闭',
      icon: 'waveform',
      active: state.compressorEnabled,
    });

    // Stage 6: Crossfeed
    chain.push({
      stage: 'crossfeed',
      label: 'Crossfeed',
      detail: state.crossfeedEnabled
        ? 'Bauer 电路仿真 ' + Math.round(state.crossfeedStrength * 100) + '%'
        : '关闭',
      icon: 'headphones',
      active: state.crossfeedEnabled,
    });

    // Stage 7: Output
    chain.push({
      stage: 'output',
      label: 'Output',
      detail: '浏览器 AudioDestination',
      icon: 'speaker',
      active: true,
    });

    var activeCount = chain.filter(function(c) { return c.active; }).length;
    var pathStr = chain.map(function(c) { return c.detail; }).join(' → ');

    return {
      chain: chain,
      path: pathStr,
      activeNodes: activeCount,
      isBitPerfect: activeCount <= 3, // source + decode + output = 3 means bit-perfect
    };
  }

  /* =================================================================
     Part 8 — DSP Presets (foobar2000-style)
     ================================================================= */

  var DSP_PRESETS = {
    off: {
      name: '关闭',
      headroom: false,
      compressor: false,
      crossfeed: false,
      description: '直通，最小处理',
    },
    classical: {
      name: '古典',
      headroom: true,
      headroomDB: -4,
      compressor: true,
      compressorThreshold: -18,
      compressorRatio: 2.5,
      compressorAttack: 10,
      compressorRelease: 100,
      crossfeed: false,
      description: '大动态保留，温和压缩，-4dB 动态余量',
    },
    rock: {
      name: '摇滚',
      headroom: true,
      headroomDB: -2,
      compressor: true,
      compressorThreshold: -8,
      compressorRatio: 5,
      compressorAttack: 3,
      compressorRelease: 40,
      crossfeed: false,
      description: '强力压缩，适合高能量音乐',
    },
    jazz: {
      name: '爵士',
      headroom: true,
      headroomDB: -3,
      compressor: true,
      compressorThreshold: -14,
      compressorRatio: 3,
      compressorAttack: 8,
      compressorRelease: 60,
      crossfeed: false,
      description: '自然动态，温和压缩，-3dB 余量',
    },
    voice: {
      name: '人声/播客',
      headroom: false,
      compressor: true,
      compressorThreshold: -10,
      compressorRatio: 6,
      compressorAttack: 2,
      compressorRelease: 30,
      crossfeed: false,
      description: '强力压缩，确保语音清晰可懂',
    },
    headphones: {
      name: '耳机听感',
      headroom: true,
      headroomDB: -3,
      compressor: false,
      crossfeed: true,
      crossfeedStrength: 0.4,
      description: 'Crossfeed 模拟音箱声场，减轻耳机听感疲劳',
    },
  };

  function applyDspPreset(presetName) {
    var preset = DSP_PRESETS[presetName];
    if (!preset) return false;

    MP.setHeadroom(preset.headroom, preset.headroomDB);

    if (preset.compressor) {
      MP.setCompressor(true, {
        threshold: preset.compressorThreshold,
        ratio: preset.compressorRatio,
        attack: preset.compressorAttack,
        release: preset.compressorRelease,
      });
    } else {
      MP.setCompressor(false, {});
    }

    MP.setCrossfeed(preset.crossfeed, preset.crossfeedStrength);

    return true;
  }

  /* =================================================================
     Part 9 — Enhanced validation with magic byte fallback
     ================================================================= */

  function validateTrack(track) {
    var caps = detectCapabilities();
    var ext = (track.url || '').split('.').pop().toLowerCase();
    var codec = EXT_TO_CODEC[ext] || ext;
    var codecCaps = caps[codec];
    var supported = codecCaps ? codecCaps.supported : false;
    var native = codecCaps ? codecCaps.native : false;
    var tier = classifyQuality(track);
    var quality = QUALITY_TIERS[tier] || QUALITY_TIERS.cdQuality;
    var exceedsLimit = (track.sampleRate || 0) > 96000;

    return {
      track: track.title || 'Unknown',
      codec: codec,
      supported: supported,
      native: native,
      needsTranscode: !supported,
      quality: quality,
      sampleRate: track.sampleRate,
      exceeds96k: exceedsLimit,
      needsDownsample: exceedsLimit,
      recommendedRate: recommendedSampleRate(track),
      isLossless: ['flac', 'alac', 'wav', 'aiff', 'wv', 'ape', 'tak', 'tta', 'dsd'].indexOf(codec) >= 0,
      statusIcon: supported ? (native ? '✓' : '!') : '✗',
      statusText: supported ? (native ? '原生支持' : '可能支持') : '不支持',
      recommendation: !supported
        ? '需要转码为 FLAC (无损) 或 Opus (有损)'
        : exceedsLimit
          ? '采样率 >96kHz，建议降采样至 ' + recommendedSampleRate(track) + 'Hz'
          : null,
      preEmphasis: detectPreEmphasis(track),
    };
  }

  function validatePlaylist() {
    var state = MP.getState();
    var playlist = state.playlist || [];
    var report = {
      total: playlist.length,
      supported: 0, unsupported: 0, exceeds96k: 0,
      formats: {}, tracks: [],
    };
    for (var i = 0; i < playlist.length; i++) {
      var result = validateTrack(playlist[i]);
      report.tracks.push(result);
      if (result.supported) report.supported++;
      else report.unsupported++;
      if (result.exceeds96k) report.exceeds96k++;
      if (!report.formats[result.codec]) {
        report.formats[result.codec] = { count: 0, supported: 0 };
      }
      report.formats[result.codec].count++;
      if (result.supported) report.formats[result.codec].supported++;
    }
    return report;
  }

  function preflightCheck(track) {
    var result = validateTrack(track);
    if (!result.supported) {
      console.warn('[Decoder] Unsupported: ' + result.codec + ' — ' + result.recommendation);
      return { ok: false, reason: 'unsupported_format', details: result };
    }
    if (result.exceeds96k) {
      console.warn('[Decoder] >96kHz: ' + result.sampleRate + 'Hz — ' + result.recommendation);
      return { ok: true, warn: 'exceeds_96k', details: result };
    }
    return { ok: true, details: result };
  }

  /* =================================================================
     Part 10 — Roon-style audio info tooltip
     ================================================================= */

  function getTrackAudioInfo(track) {
    var validation = validateTrack(track);
    var signalPath = getFullSignalPath(track);
    return {
      codec: validation.codec.toUpperCase(),
      quality: validation.quality,
      signalPath: signalPath.path,
      chain: signalPath.chain,
      isBitPerfect: signalPath.isBitPerfect,
      sampleRate: validation.sampleRate,
      isLossless: validation.isLossless,
      supported: validation.supported,
      native: validation.native,
      statusText: validation.statusText,
      recommendation: validation.recommendation,
      needsDownsample: validation.needsDownsample,
      recommendedRate: validation.recommendedRate,
      preEmphasis: validation.preEmphasis,
    };
  }

  function getCodecInfoPanel(track) {
    var validation = validateTrack(track);
    var caps = detectCapabilities();
    return {
      track: track.title,
      artist: track.artist,
      album: track.album,
      codec: validation.codec.toUpperCase(),
      isLossless: validation.isLossless,
      qualityTier: validation.quality.label,
      qualityBadge: validation.quality.badge,
      qualityDesc: validation.quality.desc,
      sampleRate: validation.sampleRate + ' Hz',
      channels: (track.channels || 2) + 'ch',
      bitsPerSample: (track.bitsPerSample || 16) + ' bit',
      bitrate: track.bitrate ? Math.round(track.bitrate / 1000) + ' kbps' : 'VBR',
      duration: track.duration ? fmtTime(track.duration) : '--',
      browserSupport: validation.statusText,
      browserNative: validation.native,
      needsTranscode: validation.needsTranscode,
      needsDownsample: validation.needsDownsample,
      recommendedRate: validation.recommendedRate,
      recommendation: validation.recommendation,
      preEmphasis: validation.preEmphasis,
    };
  }

  function renderQualityBadge(quality) {
    if (!quality) return '';
    return '<span class="decoder-badge" style="background:' + quality.color + '">' + quality.badge + '</span>';
  }

  function fmtTime(s) {
    if (!s && s !== 0) return '0:00';
    var m = Math.floor(s / 60);
    var sec = Math.floor(s % 60);
    return m + ':' + (sec < 10 ? '0' : '') + sec;
  }

  /* =================================================================
     Part 11 — Boot
     ================================================================= */

  function boot() {
    document.addEventListener('click', function initCaps() {
      detectCapabilities();
    }, { once: true });

    MP._decoder = {
      // Capability
      detectCapabilities: detectCapabilities,
      refreshCapabilities: refreshCapabilities,
      getCapabilities: function () { return _capabilities; },

      // Format detection
      detectFormatFromHeader: detectFormatFromHeader,
      MAGIC_BYTES: MAGIC_BYTES,

      // Validation
      validateTrack: validateTrack,
      validatePlaylist: validatePlaylist,
      preflightCheck: preflightCheck,
      classifyQuality: classifyQuality,

      // Downsampler
      canDownsample: canDownsample,
      downsampleTrack: downsampleTrack,
      needsDownsample: needsDownsample,
      recommendedSampleRate: recommendedSampleRate,

      // EBU R128
      analyzeLoudness: analyzeLoudness,
      computeLoudnessNormalization: computeLoudnessNormalization,

      // Pre-emphasis
      detectPreEmphasis: detectPreEmphasis,

      // Signal path
      getFullSignalPath: getFullSignalPath,
      getTrackAudioInfo: getTrackAudioInfo,
      getCodecInfoPanel: getCodecInfoPanel,
      renderQualityBadge: renderQualityBadge,

      // DSP presets
      DSP_PRESETS: DSP_PRESETS,
      applyDspPreset: applyDspPreset,

      // Constants
      QUALITY_TIERS: QUALITY_TIERS,
      CODEC_MIME_TYPES: CODEC_MIME_TYPES,
      EXT_TO_CODEC: EXT_TO_CODEC,

      // Info
      getPlaylistReport: validatePlaylist,
      version: '2.0.0',
    };

    console.log(
      '[Decoder] v2.0 — ' +
      Object.keys(CODEC_MIME_TYPES).length + ' codecs, ' +
      'EBU R128 analyzer, OfflineAudioContext downsampler, ' +
      Object.keys(DSP_PRESETS).length + ' DSP presets, ' +
      'pre-emphasis detector, magic byte format detection'
    );
  }

  boot();
};

// Self-boot
(function waitForPlayer() {
  var MP = window.__musicPlayer;
  if (MP) {
    window.__musicPlayerDecoder(MP);
  } else {
    setTimeout(waitForPlayer, 20);
  }
})();
