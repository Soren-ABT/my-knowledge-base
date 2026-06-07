/**
 * Advanced Tag Reader — music metadata recognition system
 * Inspired by foobar2000, Roon, and Navidrome tag extraction patterns.
 *
 * Reads audio file metadata and produces enriched, normalized tag objects
 * suitable for music library/index generation in static site builds.
 *
 * Features:
 *   - ID3v1/v2, Vorbis Comments, APE, MP4 tag reading (via music-metadata)
 *   - Genre normalization with canonical category mapping (Roon-inspired)
 *   - Multi-value field parsing (artists, genres, composers)
 *   - ReplayGain extraction (track + album)
 *   - Audio quality tier classification (Hi-Res, CD, lossy)
 *   - Embedded lyrics detection (synced LRC + unsynced)
 *   - BPM and musical key extraction
 *   - Composer/lyricist/arranger role separation
 *   - Language detection from metadata
 *   - Cover art type identification (front/back/booklet/artist)
 *
 * Usage:
 *   import { readTags, scanDirectory } from './scripts/tag-reader.mjs';
 *
 *   // Single file
 *   const tags = await readTags('/path/to/song.flac');
 *
 *   // Batch scan
 *   const results = await scanDirectory('/music/collection/');
 */

import { parseFile } from 'music-metadata';
import { readdir, stat } from 'fs/promises';
import { join, extname, basename } from 'path';
import { createHash } from 'crypto';
import { existsSync } from 'fs';

// ── Constants ──────────────────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS = new Set([
  '.mp3', '.flac', '.m4a', '.ogg', '.wav', '.wma',
  '.aiff', '.aif', '.ape', '.wv', '.opus', '.aac',
  '.dsf', '.dff', '.mpc', '.spx', '.tak', '.tta',
]);

const AUDIO_QUALITY_TIERS = {
  hiResLossless:  { label: 'Hi-Res 无损',   minSampleRate: 96000, minBits: 24 },
  cdLossless:     { label: 'CD 无损',       minSampleRate: 44100, minBits: 16, maxSampleRate: 48000 },
  lossy:          { label: '有损压缩',      minSampleRate: 0,     minBits: 0 },
};

const COVER_TYPE_MAP = {
  'Cover (front)': 'front',
  'Cover (back)': 'back',
  'Booklet': 'booklet',
  'Artist': 'artist',
  'Band': 'artist',
  'Composer': 'artist',
  'Other': 'other',
};

// ── Genre normalization (Roon-inspired canonical genre tree) ───────────────

const GENRE_CANONICAL = {
  // Pop family
  'pop': 'Pop',
  'j-pop': 'J-Pop',
  'k-pop': 'K-Pop',
  'c-pop': 'C-Pop',
  'synthpop': 'Pop',
  'synth-pop': 'Pop',
  'electropop': 'Pop',
  'dance pop': 'Pop',
  'dream pop': 'Pop',
  'art pop': 'Pop',
  'baroque pop': 'Pop',
  'chamber pop': 'Pop',
  'indie pop': 'Indie',
  'city pop': 'J-Pop',

  // Rock family
  'rock': 'Rock',
  'hard rock': 'Rock',
  'classic rock': 'Rock',
  'alternative rock': 'Rock',
  'indie rock': 'Indie',
  'progressive rock': 'Progressive',
  'prog rock': 'Progressive',
  'psychedelic rock': 'Rock',
  'post-rock': 'Post-Rock',
  'punk rock': 'Punk',
  'punk': 'Punk',
  'pop punk': 'Punk',
  'j-rock': 'J-Rock',

  // Metal family
  'metal': 'Metal',
  'heavy metal': 'Metal',
  'death metal': 'Metal',
  'black metal': 'Metal',
  'power metal': 'Metal',
  'progressive metal': 'Progressive',
  'prog metal': 'Progressive',
  'doom metal': 'Metal',
  'thrash metal': 'Metal',
  'speed metal': 'Metal',
  'folk metal': 'Metal',
  'symphonic metal': 'Metal',
  'metalcore': 'Metal',
  'djent': 'Metal',

  // Electronic family
  'electronic': 'Electronic',
  'edm': 'Electronic',
  'house': 'Electronic',
  'techno': 'Electronic',
  'trance': 'Electronic',
  'drum and bass': 'Electronic',
  'dnb': 'Electronic',
  'dubstep': 'Electronic',
  'ambient': 'Ambient',
  'downtempo': 'Electronic',
  'idm': 'Electronic',
  'chiptune': 'Electronic',
  'vaporwave': 'Electronic',
  'synthwave': 'Electronic',

  // Jazz family
  'jazz': 'Jazz',
  'smooth jazz': 'Jazz',
  'cool jazz': 'Jazz',
  'bebop': 'Jazz',
  'fusion': 'Jazz',
  'jazz fusion': 'Jazz',
  'acid jazz': 'Jazz',
  'nu jazz': 'Jazz',
  'swing': 'Jazz',

  // Classical family
  'classical': 'Classical',
  'orchestral': 'Classical',
  'symphony': 'Classical',
  'chamber music': 'Classical',
  'opera': 'Classical',
  'baroque': 'Classical',
  'romantic': 'Classical',
  'contemporary classical': 'Classical',
  'neo-classical': 'Classical',

  // Soundtrack family
  'soundtrack': 'Soundtrack',
  'score': 'Soundtrack',
  'ost': 'Soundtrack',
  'anime': 'Anime',
  'game': 'Game',
  'vgm': 'Game',
  'film score': 'Soundtrack',

  // Hip-Hop / R&B family
  'hip-hop': 'Hip-Hop',
  'hip hop': 'Hip-Hop',
  'rap': 'Hip-Hop',
  'trap': 'Hip-Hop',
  'r&b': 'R&B',
  'rnb': 'R&B',
  'soul': 'R&B',
  'neo soul': 'R&B',
  'funk': 'Funk',

  // Folk / World
  'folk': 'Folk',
  'world': 'World',
  'latin': 'World',
  'reggae': 'World',
  'bossa nova': 'World',
  'celtic': 'Folk',
  'enka': 'Enka',
  'kayokyoku': 'J-Pop',

  // Other
  'experimental': 'Experimental',
  'avant-garde': 'Experimental',
  'noise': 'Experimental',
  'spoken word': 'Spoken',
  'vocaloid': 'Vocaloid',
  'doujin': 'Doujin',
  'touhou': 'Doujin',
};

function normalizeGenre(raw) {
  if (!raw) return '';
  const lower = raw.trim().toLowerCase();
  if (GENRE_CANONICAL[lower]) return GENRE_CANONICAL[lower];
  // Partial match
  for (const [key, canonical] of Object.entries(GENRE_CANONICAL)) {
    if (lower.includes(key)) return canonical;
  }
  return raw.trim();
}

function normalizeGenres(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return [...new Set(raw.map(normalizeGenre).filter(Boolean))];
  // Split on common separators
  const parts = raw.split(/[,;/|]|\s*\/\/\s*/);
  return [...new Set(parts.map(normalizeGenre).filter(Boolean))];
}

// ── Multi-value field parsing (foobar2000-style) ───────────────────────────

const ARTIST_SEPARATORS = /[,;]|\/| feat\.? | ft\.? | with | & | and | x /i;

function splitArtists(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(s => s.trim()).filter(Boolean);
  return raw.split(ARTIST_SEPARATORS).map(s => s.trim()).filter(Boolean);
}

// ── Audio quality classification ───────────────────────────────────────────

function classifyQuality(format) {
  const sr = format.sampleRate || 0;
  const bits = format.bitsPerSample || 0;
  const lossless = !format.lossy && format.codec !== 'MP3' && format.codec !== 'AAC';

  if (lossless && sr >= 96000) return { tier: 'hiResLossless', label: 'Hi-Res 无损' };
  if (lossless && sr >= 44100 && bits >= 16) return { tier: 'cdLossless', label: 'CD 无损' };
  if (lossless) return { tier: 'lossless', label: '无损' };
  if (sr >= 44100 && bits >= 16) return { tier: 'highQualityLossy', label: '高品有损' };
  return { tier: 'lossy', label: '有损' };
}

// ── Language detection from title/artist ────────────────────────────────────

const CJK_RE = /[぀-ゟ゠-ヿ一-鿿가-힯]/;
const LATIN_RE = /^[A-Za-z0-9\s.,!?'"()\-&]+$/;

function detectLanguage(title, artist) {
  const text = (title || '') + (artist || '');
  if (CJK_RE.test(text)) {
    // Check Korean vs Japanese vs Chinese
    if (/[가-힯]/.test(text)) return 'ko';
    if (/[぀-ゟ]/.test(text)) return 'ja';
    if (/[一-鿿]/.test(text)) return 'ja'; // Default CJK to Japanese for our use case
  }
  if (LATIN_RE.test(text)) return 'en';
  return 'unknown';
}

// ── ReplayGain extraction ──────────────────────────────────────────────────

function extractReplayGain(common) {
  const rg = {};
  // Standard ReplayGain 2.0 tags
  if (common['REPLAYGAIN_TRACK_GAIN'] != null) {
    rg.trackGain = parseFloat(common['REPLAYGAIN_TRACK_GAIN']);
  }
  if (common['REPLAYGAIN_TRACK_PEAK'] != null) {
    rg.trackPeak = parseFloat(common['REPLAYGAIN_TRACK_PEAK']);
  }
  if (common['REPLAYGAIN_ALBUM_GAIN'] != null) {
    rg.albumGain = parseFloat(common['REPLAYGAIN_ALBUM_GAIN']);
  }
  if (common['REPLAYGAIN_ALBUM_PEAK'] != null) {
    rg.albumPeak = parseFloat(common['REPLAYGAIN_ALBUM_PEAK']);
  }
  return Object.keys(rg).length > 0 ? rg : null;
}

// ── Embedded lyrics extraction ─────────────────────────────────────────────

function extractLyrics(common) {
  const result = {};
  // Unsynchronized lyrics
  if (common.lyrics && common.lyrics.length > 0) {
    result.unsynced = common.lyrics.join('\n');
  }
  // Various LRC tag names used by different software
  const lrcSources = [
    common['LYRICS'],
    common['UNSYNCEDLYRICS'],
    common['UNSYNCED LYRICS'],
    common['LYRICS_LRC'],
    common['SYNCRONIZED_LYRICS'],
  ];
  for (const src of lrcSources) {
    if (src && src.length > 0) {
      result.synced = Array.isArray(src) ? src[0] : src;
      break;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

// ── Cover art classification ───────────────────────────────────────────────

function classifyCovers(pictures) {
  if (!pictures || pictures.length === 0) return [];
  return pictures.map(pic => ({
    type: COVER_TYPE_MAP[pic.type] || 'other',
    description: pic.description || '',
    format: pic.format || 'image/jpeg',
    width: pic.width || 0,
    height: pic.height || 0,
    data: pic.data,
  }));
}

// ── Primary API: read metadata from a single file ──────────────────────────

/**
 * Read and enrich all metadata from an audio file.
 * @param {string} filePath - Absolute path to audio file
 * @returns {Promise<Object|null>} Enriched tag object or null on failure
 */
export async function readTags(filePath) {
  try {
    const meta = await parseFile(filePath, {
      skipCovers: false,
      skipPostHeaders: true,
      duration: true,
    });
    const { common, format } = meta;

    // ── Basic identity ──
    const title = common.title || basename(filePath, extname(filePath));
    const artist = common.artist || '未知艺术家';
    const albumArtist = common.albumartist || artist;
    const album = common.album || '';

    // ── Multi-value artists ──
    const artists = splitArtists(common.artist);
    const albumArtists = splitArtists(common.albumartist);

    // ── Composer roles ──
    const composer = common.composer
      ? (Array.isArray(common.composer) ? common.composer.join(', ') : common.composer)
      : '';
    const lyricist = common.lyricist
      ? (Array.isArray(common.lyricist) ? common.lyricist.join(', ') : common.lyricist)
      : '';

    // ── Genre normalization ──
    const rawGenres = common.genre || [];
    const genres = normalizeGenres(Array.isArray(rawGenres) ? rawGenres.join(', ') : rawGenres);
    const primaryGenre = genres[0] || '';

    // ── Track numbering ──
    const trackNo = common.track?.no ?? 0;
    const trackOf = common.track?.of ?? 0;
    const discNo = common.disk?.no ?? 1;
    const discOf = common.disk?.of ?? 1;

    // ── Duration ──
    const duration = Math.floor(
      format.duration ||
      (format.numberOfSamples && format.sampleRate
        ? format.numberOfSamples / format.sampleRate
        : 0)
    );

    // ── Audio quality ──
    const quality = classifyQuality(format);
    const sampleRate = format.sampleRate || 0;
    const bitsPerSample = format.bitsPerSample || 0;
    const channels = format.numberOfChannels || 2;
    const bitrate = format.bitrate || 0;
    const codec = format.codec || extname(filePath).slice(1).toUpperCase();

    // ── ReplayGain ──
    const replayGain = extractReplayGain(common);

    // ── BPM & Key ──
    const bpm = common.bpm || 0;
    const key = common.key || '';

    // ── Lyrics ──
    const lyrics = extractLyrics(common);

    // ── Cover art ──
    const covers = classifyCovers(common.picture);

    // ── Language ──
    const language = detectLanguage(title, artist);

    // ── Tags / Keywords ──
    const tags = [...genres];
    if (primaryGenre && !tags.includes(primaryGenre)) tags.unshift(primaryGenre);

    return {
      // Identity
      title,
      artist,
      albumArtist,
      album,
      year: common.year || 0,
      date: common.date || '',

      // Artists (multi-value)
      artists,
      albumArtists,

      // Composition
      composer,
      lyricist,
      arranger: common.arranger || '',

      // Genre
      genre: primaryGenre,
      genres,
      tags,

      // Track info
      track: trackNo ? { no: trackNo, of: trackOf } : undefined,
      disc: discOf > 1 ? { no: discNo, of: discOf } : undefined,

      // Audio
      duration,
      sampleRate,
      bitsPerSample,
      channels,
      bitrate,
      codec,
      quality,

      // Extended
      replayGain,
      bpm,
      key,
      language,
      lyrics,

      // Cover art
      covers,

      // Raw (for debugging/advanced use)
      _raw: {
        format: {
          codec: format.codec,
          sampleRate: format.sampleRate,
          bitsPerSample: format.bitsPerSample,
          numberOfChannels: format.numberOfChannels,
          bitrate: format.bitrate,
          duration: format.duration,
          lossy: format.lossy,
        },
        common: {
          title: common.title,
          artist: common.artist,
          album: common.album,
          albumartist: common.albumartist,
          year: common.year,
          genre: common.genre,
          track: common.track,
          disk: common.disk,
          composer: common.composer,
          lyricist: common.lyricist,
        },
      },
    };
  } catch (err) {
    console.error(`[tag-reader] Failed to parse: ${filePath}`);
    console.error(`  ${err.message}`);
    return null;
  }
}

// ── Batch scan: directory → tag list ───────────────────────────────────────

/**
 * Recursively scan a directory for audio files and read all tags.
 * Returns results sorted by album then track number (Roon-like ordering).
 *
 * @param {string} dir - Root directory to scan
 * @param {Object} [opts]
 * @param {function} [opts.filter] - Optional filter function (filePath) => boolean
 * @param {function} [opts.onProgress] - Progress callback (current, total)
 * @returns {Promise<Object[]>} Array of enriched tag objects
 */
export async function scanDirectory(dir, opts = {}) {
  const files = [];

  async function walk(d) {
    if (!existsSync(d)) return;
    const entries = await readdir(d, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(d, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
        if (!opts.filter || opts.filter(fullPath)) {
          files.push(fullPath);
        }
      }
    }
  }

  await walk(dir);

  const results = [];
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    if (opts.onProgress) opts.onProgress(i + 1, total);
    const tags = await readTags(files[i]);
    if (tags) results.push(tags);
  }

  // Sort: album artist → album → disc → track
  results.sort((a, b) => {
    const aa = (a.albumArtist || a.artist).toLowerCase();
    const ba = (b.albumArtist || b.artist).toLowerCase();
    if (aa !== ba) return aa.localeCompare(ba);
    const al = (a.album || '').toLowerCase();
    const bl = (b.album || '').toLowerCase();
    if (al !== bl) return al.localeCompare(bl);
    const da = a.disc?.no || 1;
    const db = b.disc?.no || 1;
    if (da !== db) return da - db;
    return (a.track?.no || 0) - (b.track?.no || 0);
  });

  return results;
}

// ── File hash for deduplication ────────────────────────────────────────────

export function hashPath(filePath) {
  return createHash('md5').update(filePath).digest('hex').slice(0, 8);
}

// ── Statistics summary (Navidrome-style scan report) ───────────────────────

export function summarizeScan(results) {
  const summary = {
    totalTracks: results.length,
    totalDuration: 0,
    totalSize: 0,
    genres: {},
    artists: {},
    albums: {},
    qualities: {},
    years: { min: Infinity, max: 0 },
    languages: {},
  };

  for (const t of results) {
    summary.totalDuration += t.duration || 0;
    for (const g of t.genres) {
      summary.genres[g] = (summary.genres[g] || 0) + 1;
    }
    summary.artists[t.artist] = (summary.artists[t.artist] || 0) + 1;
    const albumKey = `${t.albumArtist || t.artist} - ${t.album}`;
    if (!summary.albums[albumKey]) {
      summary.albums[albumKey] = { tracks: 0, duration: 0, year: t.year };
    }
    summary.albums[albumKey].tracks++;
    summary.albums[albumKey].duration += t.duration || 0;
    summary.qualities[t.quality?.tier || 'unknown'] =
      (summary.qualities[t.quality?.tier || 'unknown'] || 0) + 1;
    if (t.year && t.year > 0) {
      summary.years.min = Math.min(summary.years.min, t.year);
      summary.years.max = Math.max(summary.years.max, t.year);
    }
    summary.languages[t.language] = (summary.languages[t.language] || 0) + 1;
  }

  if (summary.years.min === Infinity) summary.years.min = 0;

  return {
    ...summary,
    totalDurationFormatted: fmtDuration(summary.totalDuration),
    genreList: Object.entries(summary.genres).sort((a, b) => b[1] - a[1]),
    topArtists: Object.entries(summary.artists)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20),
  };
}

function fmtDuration(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}
