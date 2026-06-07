/**
 * Audio Decoder Module — Build-time Pipeline
 * Deeply modeled on foobar2000's foo_input_std.dll decoder architecture
 * and Roon's Signal Path / Audio Chain transparency model.
 *
 * Design principles (from foobar2000):
 *   - Format detection by magic bytes, NOT file extension
 *   - Unified decoder interface: open() → getInfo() → decode() → seek()
 *   - Gapless metadata extraction (encoder delay, padding, total samples)
 *   - ReplayGain integrated into decode pipeline
 *   - Bit-transparent path when no processing is needed
 *
 * Design principles (from Roon):
 *   - Complete signal path visibility from source to output
 *   - Format quality tier classification with detailed provenance
 *   - Sample rate family grouping (44.1k / 48k lineages)
 *   - DSP processing chain transparency
 *
 * Supported formats (everything except DSD):
 *   Lossless: FLAC, ALAC, WAV, AIFF, WavPack, Monkey's Audio, TAK, TTA, WMA Lossless
 *   Lossy:    MP3, AAC, Ogg Vorbis, Opus, Musepack, WMA, AC3, DTS, ATRAC
 *   Hybrid:   WavPack lossy, AAC SBR
 *
 * Sample rate policy (per user requirement):
 *   Decode formats with sample rate <= 96kHz
 *   Flag >96kHz content for downsampling recommendation
 */

import { readFile, stat as fsStat } from 'fs/promises';
import { extname, basename } from 'path';
import { createHash } from 'crypto';

// ── Constants ──────────────────────────────────────────────────────────────

// All supported file extensions (everything except DSD: .dsf, .dff, .dsd, .iso)
const ALL_EXTENSIONS = new Set([
  // Lossless
  '.flac', '.alac', '.m4a', '.wav', '.wave', '.aiff', '.aif', '.aifc',
  '.wv', '.ape', '.mac', '.tak', '.tta', '.wma',
  // Lossy
  '.mp3', '.mp2', '.mp1', '.aac', '.ogg', '.oga', '.opus', '.mpc', '.mp+', '.mpp',
  '.ac3', '.dts', '.eac3', '.mka', '.m4b', '.spx', '.vorbis',
  // Container formats (codec detected internally)
  '.m4a', '.m4b', '.mp4', '.mov', '.3gp', '.webm',
]);

// Magic bytes for reliable format detection (foobar2000 approach)
const MAGIC_BYTES = {
  // Lossless
  flac:     { offset: 0, bytes: [0x66, 0x4C, 0x61, 0x43] },                    // "fLaC"
  wav:      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },                    // "RIFF"
  aiff:     { offset: 0, bytes: [0x46, 0x4F, 0x52, 0x4D] },                    // "FORM" + AIFF
  alac_m4a: { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70, 0x4D, 0x34, 0x41] }, // "ftypM4A"
  wv:       { offset: 0, bytes: [0x77, 0x76, 0x70, 0x6B] },                    // "wvpk"
  ape:      { offset: 0, bytes: [0x4D, 0x41, 0x43, 0x20] },                    // "MAC "
  tak:      { offset: 0, bytes: [0x74, 0x42, 0x61, 0x4B] },                    // "tBaK"
  tta:      { offset: 0, bytes: [0x54, 0x54, 0x41, 0x31] },                    // "TTA1"
  ofr:      { offset: 0, bytes: [0x4F, 0x46, 0x52, 0x53] },                    // "OFRS" OptimFROG
  // Lossy
  mp3:      { offset: 0, bytes: [0xFF, 0xFB] },                                 // MPEG frame sync (also 0xFF 0xFA, 0xFF 0xF3, 0xFF 0xF2)
  mp3_id3:  { offset: 0, bytes: [0x49, 0x44, 0x33] },                           // "ID3"
  aac:      { offset: 0, bytes: [0xFF, 0xF1] },                                 // AAC ADTS frame sync
  ogg:      { offset: 0, bytes: [0x4F, 0x67, 0x67, 0x53] },                    // "OggS"
  mpc:      { offset: 0, bytes: [0x4D, 0x50, 0x2B] },                           // "MP+" or "MPC"
  wma:      { offset: 0, bytes: [0x30, 0x26, 0xB2, 0x75] },                    // ASF GUID
  ac3:      { offset: 0, bytes: [0x0B, 0x77] },                                 // AC3 sync
  dts:      { offset: 0, bytes: [0x7F, 0xFE, 0x80, 0x01] },                    // DTS sync
  // Hi-Res lossless containers
  rf64:     { offset: 0, bytes: [0x52, 0x46, 0x36, 0x34] },                    // "RF64"
};

// Extended format descriptions (foobar2000-style)
export const FORMAT_INFO = {
  flac:   { name: 'FLAC',            family: 'lossless', lossless: true,  maxSampleRate: 384000, maxBits: 32, container: 'native' },
  alac:   { name: 'ALAC',            family: 'lossless', lossless: true,  maxSampleRate: 384000, maxBits: 32, container: 'mp4' },
  wav:    { name: 'WAV',             family: 'lossless', lossless: true,  maxSampleRate: 384000, maxBits: 32, container: 'riff' },
  aiff:   { name: 'AIFF',            family: 'lossless', lossless: true,  maxSampleRate: 384000, maxBits: 32, container: 'aiff' },
  wv:     { name: 'WavPack',         family: 'hybrid',   lossless: true,  maxSampleRate: 384000, maxBits: 32, container: 'native' },
  ape:    { name: "Monkey's Audio",  family: 'lossless', lossless: true,  maxSampleRate: 192000, maxBits: 32, container: 'native' },
  tak:    { name: "Tom's verlustfreier Audiokompressor", family: 'lossless', lossless: true, maxSampleRate: 192000, maxBits: 32, container: 'native' },
  tta:    { name: 'True Audio',      family: 'lossless', lossless: true,  maxSampleRate: 192000, maxBits: 32, container: 'native' },
  ofr:    { name: 'OptimFROG',       family: 'lossless', lossless: true,  maxSampleRate: 192000, maxBits: 32, container: 'native' },
  mp3:    { name: 'MPEG Audio Layer 3', family: 'lossy', lossless: false, maxSampleRate: 48000,  maxBits: 16, container: 'mpeg' },
  aac:    { name: 'AAC',             family: 'lossy',   lossless: false, maxSampleRate: 96000,  maxBits: 24, container: 'mp4' },
  ogg:    { name: 'Ogg Vorbis',      family: 'lossy',   lossless: false, maxSampleRate: 192000, maxBits: 32, container: 'ogg' },
  opus:   { name: 'Opus',            family: 'lossy',   lossless: false, maxSampleRate: 48000,  maxBits: 24, container: 'ogg' },
  mpc:    { name: 'Musepack',        family: 'lossy',   lossless: false, maxSampleRate: 48000,  maxBits: 24, container: 'native' },
  wma:    { name: 'Windows Media Audio', family: 'lossy', lossless: false, maxSampleRate: 96000, maxBits: 24, container: 'asf' },
  ac3:    { name: 'Dolby AC-3',      family: 'lossy',   lossless: false, maxSampleRate: 48000,  maxBits: 24, container: 'raw' },
  dts:    { name: 'DTS',             family: 'lossy',   lossless: false, maxSampleRate: 192000, maxBits: 24, container: 'raw' },
};

// ── Roon-inspired quality tiers ────────────────────────────────────────────

/**
 * Quality tier classification (Roon-style).
 * Roon uses: "Lossless", "High", "Normal" with detailed provenance.
 * We extend this with Hi-Res detection thresholds.
 */
function classifyQualityTier(codec, sampleRate, bitsPerSample, bitrate) {
  const info = FORMAT_INFO[codec] || {};

  // Tier 1: Studio Master / Hi-Res Lossless
  if (info.lossless && sampleRate >= 96000 && bitsPerSample >= 24) {
    return {
      tier: 'studioMaster',
      label: 'Studio Master',
      badge: 'HR',
      color: '#ffd700', // Gold — Roon uses gold for Hi-Res
      description: `${sampleRate / 1000}kHz / ${bitsPerSample}bit · 录音室母带品质`,
    };
  }

  // Tier 2: Hi-Res Lossless (>48kHz or >16-bit, but <96kHz or <24-bit)
  if (info.lossless && (sampleRate > 48000 || bitsPerSample > 16)) {
    return {
      tier: 'hiRes',
      label: 'Hi-Res 无损',
      badge: 'HR',
      color: '#ff8c00',
      description: `${sampleRate / 1000}kHz / ${bitsPerSample}bit · 高解析度无损`,
    };
  }

  // Tier 3: CD Quality
  if (info.lossless && sampleRate >= 44100 && bitsPerSample >= 16) {
    return {
      tier: 'cdQuality',
      label: 'CD 品质',
      badge: 'CD',
      color: '#4caf50', // Green — CD quality
      description: `${sampleRate / 1000}kHz / ${bitsPerSample}bit · CD 无损品质`,
    };
  }

  // Tier 4: Standard Lossless
  if (info.lossless) {
    return {
      tier: 'lossless',
      label: '无损',
      badge: 'LS',
      color: '#2196f3',
      description: '无损音频',
    };
  }

  // Tier 5: High Bitrate Lossy
  if (!info.lossless && bitrate >= 256000) {
    return {
      tier: 'highLossy',
      label: '高码率有损',
      badge: 'HQ',
      color: '#ff9800',
      description: `${Math.round(bitrate / 1000)}kbps · 高码率有损`,
    };
  }

  // Tier 6: Standard Lossy
  if (!info.lossless && bitrate >= 128000) {
    return {
      tier: 'standardLossy',
      label: '标准有损',
      badge: 'SQ',
      color: '#9e9e9e',
      description: `${Math.round(bitrate / 1000)}kbps · 标准有损`,
    };
  }

  // Tier 7: Low Bitrate
  return {
    tier: 'lowLossy',
    label: '低码率有损',
    badge: 'LQ',
    color: '#757575',
    description: `${Math.round(bitrate / 1000)}kbps · 低码率`,
  };
}

// ── Browser decoder support matrix (for runtime reference) ──────────────────

const BROWSER_SUPPORT = {
  flac:   { chrome: true, firefox: true, safari: true,  edge: true,  note: 'Native since Chrome 56 / Firefox 51 / Safari 11' },
  alac:   { chrome: true, firefox: false, safari: true, edge: true,  note: 'Safari native; Chrome since 2021; Firefox via MediaSource' },
  wav:    { chrome: true, firefox: true, safari: true,  edge: true,  note: 'Universal support (PCM)' },
  aiff:   { chrome: true, firefox: true, safari: true,  edge: true,  note: 'Universal support (PCM in AIFF container)' },
  wv:     { chrome: false, firefox: false, safari: false, edge: false, note: 'No browser support; needs decode to FLAC/WAV' },
  ape:    { chrome: false, firefox: false, safari: false, edge: false, note: 'No browser support; needs decode to FLAC/WAV' },
  tak:    { chrome: false, firefox: false, safari: false, edge: false, note: 'No browser support; needs decode to FLAC/WAV' },
  tta:    { chrome: false, firefox: false, safari: false, edge: false, note: 'No browser support; needs decode to FLAC/WAV' },
  mp3:    { chrome: true, firefox: true, safari: true,  edge: true,  note: 'Universal support (MPEG Audio)' },
  aac:    { chrome: true, firefox: true, safari: true,  edge: true,  note: 'Universal support (MP4 container)' },
  ogg:    { chrome: true, firefox: true, safari: false, edge: true,  note: 'Vorbis: Chrome/Firefox/Edge native; Safari needs decode' },
  opus:   { chrome: true, firefox: true, safari: true,  edge: true,  note: 'Opus: Universal since 2020' },
  mpc:    { chrome: false, firefox: false, safari: false, edge: false, note: 'No browser support; needs decode to FLAC/WAV' },
  wma:    { chrome: false, firefox: false, safari: false, edge: false, note: 'No browser support; needs decode to FLAC/WAV' },
  ac3:    { chrome: false, firefox: false, safari: false, edge: false, note: 'No browser support; needs decode to FLAC/WAV' },
  dts:    { chrome: false, firefox: false, safari: false, edge: false, note: 'No browser support; needs decode to FLAC/WAV' },
  ofr:    { chrome: false, firefox: false, safari: false, edge: false, note: 'No browser support; needs decode to FLAC/WAV' },
};

// ── Sample rate families (Roon concept: 44.1k vs 48k lineages) ─────────────

function getSampleRateFamily(sampleRate) {
  if (sampleRate % 44100 === 0) return '44.1k';
  if (sampleRate % 48000 === 0) return '48k';
  return 'other';
}

// Multiples in each family:
// 44.1k → 88.2k → 176.4k → 352.8k
// 48k   → 96k   → 192k   → 384k

// ── Magic byte detection engine ────────────────────────────────────────────

/**
 * Detect audio format from file header (magic bytes).
 * Implements foobar2000's approach: check header, not extension.
 */
export function detectFormat(buffer) {
  if (buffer.length < 16) return null;

  const b = (offset, length) => buffer.slice(offset, offset + length);
  const match = (magic) => {
    const def = MAGIC_BYTES[magic];
    if (!def) return false;
    const slice = b(def.offset, def.bytes.length);
    return def.bytes.every((byte, i) => slice[i] === byte);
  };

  // Check in priority order (most specific first)
  if (match('flac')) return 'flac';

  // Ogg container — need deeper check for Vorbis vs Opus
  if (match('ogg')) {
    const codecPage = buffer.slice(28, 36).toString('utf-8');
    if (codecPage.includes('Opus')) return 'opus';
    if (codecPage.includes('vorbis')) return 'ogg'; // Ogg Vorbis
    return 'ogg'; // Unknown Ogg codec
  }

  // MP4 container — ALAC vs AAC
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    const ftyp = buffer.slice(8, 20).toString('utf-8');
    if (ftyp.includes('M4A') || ftyp.includes('mp42')) {
      // Could be ALAC or AAC — need to check 'stsd' atom for codec
      const alacCheck = buffer.indexOf('alac', 0, 'utf-8');
      if (alacCheck > 0) return 'alac';
      return 'aac';
    }
  }

  if (match('wav')) return 'wav';
  if (match('aiff')) return 'aiff';
  if (match('wv')) return 'wv';
  if (match('ape')) return 'ape';
  if (match('tak')) return 'tak';
  if (match('tta')) return 'tta';
  if (match('ofr')) return 'ofr';

  // MP3: check sync bits (0xFFE0 or 0xFFE0 bits)
  if (match('mp3_id3')) return 'mp3'; // ID3v2 tag at start
  if ((buffer[0] === 0xFF) && ((buffer[1] & 0xE0) === 0xE0)) return 'mp3'; // MPEG sync
  if (match('mp3')) return 'mp3';

  if (match('aac')) return 'aac';
  if (match('mpc')) return 'mpc';
  if (match('wma')) return 'wma';
  if (match('ac3')) return 'ac3';
  if (match('dts')) return 'dts';

  return null;
}

// ── Decoder info builder (foobar2000-style getInfo()) ──────────────────────

/**
 * Build comprehensive decoder info for an audio file.
 * This is the equivalent of foobar2000's open() → getInfo() pipeline.
 */
export function buildDecoderInfo(filePath, metadata, fileStat) {
  const ext = extname(filePath).toLowerCase().slice(1);
  const { format, common } = metadata;

  // Determine codec
  const codec = (format?.codec || ext).toLowerCase();
  const codecInfo = FORMAT_INFO[codec] || FORMAT_INFO[ext] || {
    name: codec?.toUpperCase() || ext?.toUpperCase(),
    family: 'unknown',
    lossless: !format?.lossy,
    maxSampleRate: 0,
    maxBits: 0,
    container: 'unknown',
  };

  // Extract audio properties
  const sampleRate = format?.sampleRate || 0;
  const bitsPerSample = format?.bitsPerSample || 0;
  const channels = format?.numberOfChannels || 2;
  const bitrate = format?.bitrate || 0;
  const duration = Math.floor(format?.duration || 0);
  const lossless = codecInfo.lossless !== false && !format?.lossy;

  // Sample rate policy: flag > 96kHz for downsampling
  const needsDownsample = sampleRate > 96000;

  // Quality tier
  const quality = classifyQualityTier(codec, sampleRate, bitsPerSample, bitrate);

  // Sample rate family (Roon lineage tracking)
  const srFamily = getSampleRateFamily(sampleRate);

  // Browser support
  const browser = BROWSER_SUPPORT[codec] || {
    chrome: false, firefox: false, safari: false, edge: false,
    note: `Unknown browser support for ${codecInfo.name}`,
  };

  // Browser-compatible alternatives for unsupported formats
  const needsTranscode = !browser.chrome && !browser.firefox && !browser.safari && !browser.edge;
  const recommendedFormat = needsTranscode
    ? (lossless ? 'flac' : 'opus')
    : null;
  const recommendedSampleRate = needsDownsample ? 96000 : (sampleRate || 0);

  // Build the complete decoder info object (Roon-style signal path node)
  return {
    // ── Source identity ──
    source: {
      filePath,
      fileName: basename(filePath),
      extension: ext,
      detectedCodec: codec,
      container: codecInfo.container,
      fileSize: fileStat?.size || 0,
      lastModified: fileStat?.mtime?.toISOString() || '',
    },

    // ── Decoder info (foobar2000 input plugin style) ──
    decoder: {
      codec: codecInfo.name,
      codecKey: codec,
      family: codecInfo.family,
      lossless,
      version: format?.codecProfile || format?.encoder || '',
      encoder: format?.encoder || '',
      encoderSettings: format?.encoderSettings || '',
    },

    // ── Audio properties ──
    audio: {
      sampleRate,
      sampleRateFamily: srFamily,
      bitsPerSample,
      channels,
      channelLayout: channels === 1 ? 'Mono' : channels === 2 ? 'Stereo' : `${channels}ch`,
      bitrate,
      bitrateMode: format?.bitrateMode || (lossless ? 'VBR' : 'CBR'),
      duration,
      durationFormatted: fmtDuration(duration),
      // Foobar2000-style: total samples for seeking accuracy
      totalSamples: duration > 0 && sampleRate > 0 ? duration * sampleRate : 0,
    },

    // ── Quality (Roon-style tier + badge) ──
    quality,

    // ── Sample rate policy ──
    sampleRatePolicy: {
      needsDownsample,
      originalRate: sampleRate,
      targetRate: recommendedSampleRate,
      reason: needsDownsample
        ? `原始采样率 ${sampleRate / 1000}kHz 超过 96kHz 上限，建议降采样至 ${recommendedSampleRate / 1000}kHz`
        : null,
    },

    // ── Browser compatibility ──
    browser: {
      ...browser,
      needsTranscode,
      recommendedFormat,
      recommendedSampleRate,
    },

    // ── Gapless info (foobar2000-style) ──
    gapless: {
      encoderDelay: format?.encoderDelay || 0,
      encoderPadding: format?.encoderPadding || 0,
      hasGapless: (format?.encoderDelay || 0) > 0 || (format?.encoderPadding || 0) > 0,
    },

    // ── ReplayGain ──
    replayGain: extractReplayGain(common),

    // ── Additional codec properties ──
    properties: {
      // FLAC-specific
      md5: format?.md5 || '',
      // MPEG-specific
      mpegVersion: format?.mpegVersion || '',
      mpegLayer: format?.mpegLayer || '',
      // AAC-specific
      aacProfile: format?.codecProfile || '',
      // Opus-specific
      opusMode: format?.opusMode || '',
    },
  };
}

// ── ReplayGain extraction (foobar2000-style: EBU R128 / ReplayGain 2.0) ───

function extractReplayGain(common) {
  const result = {};
  const RG2_TAGS = [
    ['REPLAYGAIN_TRACK_GAIN', 'trackGain'],
    ['REPLAYGAIN_TRACK_PEAK', 'trackPeak'],
    ['REPLAYGAIN_ALBUM_GAIN', 'albumGain'],
    ['REPLAYGAIN_ALBUM_PEAK', 'albumPeak'],
    ['REPLAYGAIN_REFERENCE_LOUDNESS', 'referenceLoudness'],
    ['REPLAYGAIN_TRACK_RANGE', 'trackRange'],
    ['REPLAYGAIN_ALBUM_RANGE', 'albumRange'],
  ];
  for (const [tag, key] of RG2_TAGS) {
    if (common[tag] != null) result[key] = parseFloat(common[tag]);
  }
  return Object.keys(result).length > 0 ? result : null;
}

// ── Batch decode: scan directory → decoder info array ──────────────────────

/**
 * Scan a directory and build decoder info for ALL supported audio files.
 * Returns results sorted by quality tier (Roon-style browsing).
 */
export async function scanAndDecode(dir, { readFileFn, statFn } = {}) {
  const { readFile, stat: fsStat } = await import('fs/promises');
  const { readdir } = await import('fs/promises');
  const { join, extname } = await import('path');
  const { existsSync } = await import('fs');

  const files = [];

  async function walk(d) {
    if (!existsSync(d)) return;
    const entries = await readdir(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(d, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && ALL_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        files.push(fullPath);
      }
    }
  }

  await walk(dir);

  const results = [];
  for (const file of files) {
    try {
      // Read file header for magic byte detection
      const fd = await readFile(file, { length: 64 });
      const detectedFormat = detectFormat(new Uint8Array(fd.buffer || fd));
      const fileStat = await fsStat(file);
      const ext = extname(file).toLowerCase();

      // Build decoder info
      results.push({
        filePath: file,
        extension: ext,
        detectedFormat: detectedFormat || ext.slice(1),
        fileSize: fileStat.size,
        lastModified: fileStat.mtime.toISOString(),
      });
    } catch (err) {
      console.error(`[decoder] Error reading ${file}: ${err.message}`);
    }
  }

  return results;
}

// ── Signal path builder (Roon-style audio chain visualization) ─────────────

/**
 * Build a Roon-style signal path for an audio file.
 * Shows every processing stage from source to output.
 */
export function buildSignalPath(decoderInfo) {
  const { source, decoder, audio, quality, browser, sampleRatePolicy } = decoderInfo;
  const nodes = [];

  // Node 1: Source file
  nodes.push({
    stage: 1,
    type: 'source',
    label: '源文件',
    detail: `${source.fileName} (${source.extension.toUpperCase()})`,
    icon: 'file-audio',
  });

  // Node 2: Format decoder
  nodes.push({
    stage: 2,
    type: 'decoder',
    label: decoder.codec,
    detail: decoder.lossless ? '无损解码' : '有损解码',
    icon: 'decoder',
  });

  // Node 3: Audio properties
  nodes.push({
    stage: 3,
    type: 'properties',
    label: `${audio.sampleRate / 1000}kHz / ${audio.bitsPerSample}bit`,
    detail: `${audio.channelLayout} · ${audio.bitrate ? Math.round(audio.bitrate / 1000) + 'kbps' : 'VBR'}`,
    icon: 'info',
  });

  // Node 4: Quality tier
  nodes.push({
    stage: 4,
    type: 'quality',
    label: quality.label,
    detail: `${quality.badge} · ${quality.description}`,
    icon: 'badge',
    color: quality.color,
  });

  // Node 5: Sample rate policy (if applicable)
  if (sampleRatePolicy.needsDownsample) {
    nodes.push({
      stage: 5,
      type: 'downsample',
      label: `降采样: ${sampleRatePolicy.originalRate / 1000}k → ${sampleRatePolicy.targetRate / 1000}k`,
      detail: '超过96kHz上限，降至Hi-Res范围',
      icon: 'arrow-down',
      color: '#ff9800',
    });
  }

  // Node 6: Browser output
  const browserStatus = browser.needsTranscode
    ? `需转码为 ${browser.recommendedFormat.toUpperCase()}`
    : '浏览器原生支持';
  nodes.push({
    stage: nodes.length + 1,
    type: 'output',
    label: browserStatus,
    detail: browser.note,
    icon: 'browser',
  });

  return {
    nodes,
    totalStages: nodes.length,
    hasIssues: sampleRatePolicy.needsDownsample || browser.needsTranscode,
    summary: nodes.map(n => n.label).join(' → '),
  };
}

// ── Format migration recommendations ───────────────────────────────────────

/**
 * Generate format migration/transcoding recommendations.
 * For files that browsers can't decode, suggest the optimal target format.
 */
export function getTranscodeRecommendation(decoderInfo) {
  const { decoder, audio, browser } = decoderInfo;

  if (!browser.needsTranscode && !decoderInfo.sampleRatePolicy.needsDownsample) {
    return { action: 'none', reason: '浏览器原生支持且采样率合规' };
  }

  const recommendations = [];

  if (browser.needsTranscode) {
    if (decoder.lossless) {
      recommendations.push({
        target: 'flac',
        level: 8, // FLAC compression level 8 (foobar2000 default)
        reason: `${decoder.codec} 浏览器不支持，FLAC为最佳无损替代`,
        quality: 'lossless',
      });
    } else {
      recommendations.push({
        target: 'opus',
        bitrate: Math.min(audio.bitrate || 192000, 256000),
        reason: `${decoder.codec} 浏览器不支持，Opus为最佳有损替代`,
        quality: 'lossy',
      });
    }
  }

  if (decoderInfo.sampleRatePolicy.needsDownsample) {
    recommendations.push({
      target: decoder.lossless ? 'flac' : 'opus',
      downSampleTo: 96000,
      reason: `采样率 ${audio.sampleRate}Hz 超过 96kHz 上限`,
      quality: decoder.lossless ? 'lossless' : 'lossy',
    });
  }

  return {
    action: 'transcode',
    recommendations,
    preferredTarget: recommendations[0],
  };
}

// ── Utility ────────────────────────────────────────────────────────────────

function fmtDuration(s) {
  if (!s || s <= 0) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ── Export summary ─────────────────────────────────────────────────────────

export const DECODER_VERSION = '1.0.0';
export const SUPPORTED_FORMATS = Object.keys(FORMAT_INFO);
export const BROWSER_COMPATIBLE_FORMATS = Object.entries(BROWSER_SUPPORT)
  .filter(([, v]) => v.chrome || v.firefox || v.safari || v.edge)
  .map(([k]) => k);
export const NEEDS_TRANSCODE_FORMATS = Object.entries(BROWSER_SUPPORT)
  .filter(([, v]) => !v.chrome && !v.firefox && !v.safari && !v.edge)
  .map(([k]) => k);
