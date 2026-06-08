/**
 * Music Metadata Scanner
 * Inspired by foobar2000's tag-reading capabilities.
 * Scans audio files, extracts metadata (title, artist, album, year, genre, cover art),
 * and generates a TypeScript playlist config for the site's music player.
 *
 * Usage:
 *   node scripts/scan-music.mjs [source-directory]
 *   node scripts/scan-music.mjs --watch     (continuous monitoring)
 *   Default source: public/assets/music/url/
 */

import { parseFile } from 'music-metadata';
import { readdir, writeFile, mkdir, readFile, copyFile } from 'fs/promises';
import { join, extname, basename, relative, dirname, resolve } from 'path';
import { existsSync, watch } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { detectFormat, buildDecoderInfo } from './audio-decoder.mjs';

const PUBLIC_DIR = 'public';
const MUSIC_URL_DIR = join(PUBLIC_DIR, 'assets', 'music', 'url');
const COVER_DIR = join(PUBLIC_DIR, 'assets', 'music', 'cover');
const OUTPUT_FILE = join('src', 'config', 'musicPlaylist.generated.ts');
const JSON_OUTPUT_FILE = join(PUBLIC_DIR, 'api', 'music-playlist.json');

const SUPPORTED_EXTENSIONS = new Set([
  '.mp3', '.flac', '.m4a', '.ogg', '.wav', '.wma', '.aiff', '.aif',
  '.ape', '.wv', '.opus', '.aac', '.mpc', '.mp4',
  '.alac', '.tak', '.tta', '.ac3', '.dts', '.aifc', '.wave',
]);

const COVER_EXTS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/bmp': '.bmp', 'image/gif': '.gif' };

// External cover filenames to search for (case-insensitive)
const EXTERNAL_COVER_NAMES = [
  'cover', 'folder', 'front', 'album', 'artwork', 'albumart',
  'Cover', 'Folder', 'Front', 'Album', 'Artwork',
];

const EXTERNAL_COVER_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']);

/**
 * Recursively find all audio files in a directory.
 */
async function findAudioFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await findAudioFiles(fullPath, files);
    } else if (entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Generate a stable filename from track metadata or file path hash.
 */
function sanitizeFilename(str) {
  return str
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 120)
    || 'unknown';
}

function hashPath(filePath) {
  return createHash('md5').update(filePath).digest('hex').slice(0, 8);
}

/**
 * Extract embedded cover art from metadata and save to cover directory.
 * Returns the web path (e.g., /assets/music/cover/xxx.jpg) or empty string.
 */
async function extractCover(metadata, filePath) {
  const pictures = metadata.common.picture;
  if (!pictures || pictures.length === 0) return '';

  // Prefer front cover, then any other picture
  const pic = pictures.find(p => p.type === 'Cover (front)') || pictures[0];
  if (!pic || !pic.data) return '';

  const ext = COVER_EXTS[pic.format] || '.jpg';
  const baseName = sanitizeFilename(basename(filePath, extname(filePath)));
  const fileName = `${baseName}_${hashPath(filePath)}${ext}`;
  const outPath = join(COVER_DIR, fileName);

  // Skip if already extracted (same filename)
  if (!existsSync(outPath)) {
    await writeFile(outPath, Buffer.from(pic.data));
  }

  return `/assets/music/cover/${fileName}`;
}

/**
 * Search for external cover art files in the same directory as the audio file.
 * Checks common names: cover.jpg, folder.jpg, front.jpg, etc.
 * Falls back to any image file in the same directory.
 */
async function findExternalCover(filePath) {
  const dir = dirname(filePath);
  const baseName = basename(filePath, extname(filePath));

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    // 1) Exact match: same basename as audio file + image extension
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = extname(entry.name).toLowerCase();
      if (!EXTERNAL_COVER_EXTS.has(ext)) continue;
      const entryBase = basename(entry.name, extname(entry.name));
      if (entryBase === baseName) {
        return { path: join(dir, entry.name), matched: 'exact' };
      }
      // Check without track number prefix (e.g., "01. Song Name" → "Song Name")
      const stripped = baseName.replace(/^\d{1,3}[\.\-\s]+/, '');
      if (stripped && entryBase === stripped) {
        return { path: join(dir, entry.name), matched: 'stripped' };
      }
    }

    // 2) Common cover names
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = extname(entry.name).toLowerCase();
      if (!EXTERNAL_COVER_EXTS.has(ext)) continue;
      const entryBase = basename(entry.name, extname(entry.name));
      for (const coverName of EXTERNAL_COVER_NAMES) {
        if (entryBase === coverName || entryBase.toLowerCase() === coverName.toLowerCase()) {
          return { path: join(dir, entry.name), matched: 'common' };
        }
      }
    }

    // 3) Fallback: any image file in same directory (first found)
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = extname(entry.name).toLowerCase();
      if (EXTERNAL_COVER_EXTS.has(ext)) {
        return { path: join(dir, entry.name), matched: 'fallback' };
      }
    }
  } catch (e) {
    // Directory may not exist or be unreadable
  }

  return null;
}

/**
 * Import an external cover image into the managed cover directory.
 */
async function importExternalCover(extCover, filePath) {
  const ext = extname(extCover.path).toLowerCase();
  const baseName = sanitizeFilename(basename(filePath, extname(filePath)));
  const fileName = `${baseName}_${hashPath(filePath)}_ext${ext}`;
  const outPath = join(COVER_DIR, fileName);

  if (!existsSync(outPath)) {
    await copyFile(extCover.path, outPath);
  }

  return `/assets/music/cover/${fileName}`;
}

/**
 * Search for lyrics files (.lrc or .txt) with matching basename.
 */
async function findLyricsFile(filePath) {
  const dir = dirname(filePath);
  const baseName = basename(filePath, extname(filePath));

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    // Check .lrc files first (preferred)
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = extname(entry.name).toLowerCase();
      if (ext !== '.lrc') continue;
      const entryBase = basename(entry.name, ext);
      if (entryBase === baseName) {
        const content = await readFile(join(dir, entry.name), 'utf-8');
        return content;
      }
    }

    // Check .txt files
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = extname(entry.name).toLowerCase();
      if (ext !== '.txt') continue;
      const entryBase = basename(entry.name, ext);
      if (entryBase === baseName || entryBase === 'lyrics' || entryBase === 'Lyrics') {
        const content = await readFile(join(dir, entry.name), 'utf-8');
        return content;
      }
    }
  } catch (e) {
    // No lyrics found or read error
  }

  return '';
}

/**
 * Parse artist string for featured/co-artists.
 * Handles: feat., ft., feat, Feat., ×, x, /, ;, ,, with, &
 */
function parseFeaturedArtists(artistStr) {
  if (!artistStr) return { main: '', featured: [] };

  // 1) Explicit featuring patterns: "MainArtist feat. Guest"
  const featPatterns = [
    /\s+(?:feat\.|ft\.|feat|Feat\.|Ft\.)\s+/,
    /\s+[×x]\s+/,
    /\s+with\s+/i,
  ];

  let main = artistStr;
  let featured = [];

  for (const pat of featPatterns) {
    const idx = main.search(pat);
    if (idx > 0) {
      const featPart = main.slice(idx).replace(pat, '').trim();
      main = main.slice(0, idx).trim();
      featured = featPart
        .split(/\s*[,;&\/]\s*/)
        .map(s => s.trim())
        .filter(Boolean);
      break;
    }
  }

  if (featured.length > 0) {
    return { main, featured };
  }

  // 2) Multi-artist separator detection: "Artist A, Artist B" or "Artist A / Artist B"
  // Only split if both parts look like valid artist names (not a single name with comma)
  const parts = artistStr.split(/\s*[,;\/]\s*/).map(s => s.trim()).filter(Boolean);

  if (parts.length >= 2) {
    // Heuristic: all parts should look like distinct artist names (no single char, not a title)
    const allLookLikeNames = parts.every(p => p.length >= 2 && !/^[A-Z]{1,3}$/.test(p));
    // Avoid splitting "Lastname, Firstname" patterns (common in some tag formats)
    const hasLastNameComma = parts.length === 2 && parts[0].indexOf(' ') === -1 && parts[1].indexOf(' ') >= 0;
    if (allLookLikeNames && !hasLastNameComma) {
      main = parts[0];
      featured = parts.slice(1);
      return { main, featured };
    }
  }

  return { main: artistStr, featured: [] };
}

/**
 * Format track number from metadata.
 */
function formatTrack(common) {
  const no = common.track?.no;
  const of = common.track?.of;
  if (no != null) {
    return { no, of: of ?? 0 };
  }
  return undefined;
}

/**
 * Parse a single audio file and return song metadata.
 */
async function parseAudioFile(filePath) {
  try {
    const meta = await parseFile(filePath, { skipCovers: false, skipPostHeaders: true });
    const { common, format } = meta;

    // ── Decoder intelligence (foobar2000-style) ──
    // Magic byte format verification
    let detectedCodec = '';
    try {
      const header = await readFile(filePath, { length: 64 });
      detectedCodec = detectFormat(new Uint8Array(header.buffer || header)) || '';
    } catch (e) {
      detectedCodec = format?.codec || '';
    }

    // Build decoder info (Roon-style signal path)
    const decoderInfo = buildDecoderInfo(filePath, meta, null);
    const quality = decoderInfo?.quality || {};
    const browser = decoderInfo?.browser || {};

    // Duration: prefer metadata, fall back to format estimation
    const duration = Math.floor(
      format.duration ||
      (format.numberOfSamples && format.sampleRate
        ? format.numberOfSamples / format.sampleRate
        : 0)
    );

    // Extract cover art: embedded first, then external fallback
    let cover = await extractCover(meta, filePath);
    if (!cover) {
      const extCover = await findExternalCover(filePath);
      if (extCover) {
        cover = await importExternalCover(extCover, filePath);
        if (extCover.matched) {
          console.log(`    → External cover: ${extCover.matched} (${basename(extCover.path)})`);
        }
      }
    }

    // Extract lyrics from .lrc/.txt files
    const lrc = await findLyricsFile(filePath);
    if (lrc) {
      console.log(`    → Lyrics found (${lrc.length} chars)`);
    }

    // URL path (relative to public/) — encode spaces and Unicode for browser compatibility
    const urlPath = '/' + relative(PUBLIC_DIR, filePath)
      .replace(/\\/g, '/')
      .split('/')
      .map(encodeURIComponent)
      .join('/');

    // Sample rate & Hi-Res detection (industry standard: >= 96kHz)
    const sampleRate = format.sampleRate || 0;
    const bitsPerSample = format.bitsPerSample || 0;
    const isHiRes = sampleRate >= 96000;
    const channels = format.numberOfChannels || 2;
    const bitrate = format.bitrate || 0;

    // Artist with featured parsing
    const rawArtist = common.artist || '未知艺术家';
    const { main: parsedArtist, featured: featuredArtists } = parseFeaturedArtists(rawArtist);

    // Genre + tags
    const genreStr = Array.isArray(common.genre) ? common.genre.join(', ') : (common.genre || '');
    const tags = genreStr ? genreStr.split(',').map(s => s.trim()).filter(Boolean) : [];

    // Composer handling
    const composer = Array.isArray(common.composer)
      ? common.composer.join(', ')
      : (common.composer || '');

    // ReplayGain (foobar2000-style)
    const replayGain = {
      trackGain: common['REPLAYGAIN_TRACK_GAIN'] != null ? parseFloat(common['REPLAYGAIN_TRACK_GAIN']) : undefined,
      trackPeak: common['REPLAYGAIN_TRACK_PEAK'] != null ? parseFloat(common['REPLAYGAIN_TRACK_PEAK']) : undefined,
      albumGain: common['REPLAYGAIN_ALBUM_GAIN'] != null ? parseFloat(common['REPLAYGAIN_ALBUM_GAIN']) : undefined,
      albumPeak: common['REPLAYGAIN_ALBUM_PEAK'] != null ? parseFloat(common['REPLAYGAIN_ALBUM_PEAK']) : undefined,
    };
    const hasReplayGain = Object.values(replayGain).some(v => v !== undefined);

    return {
      title: common.title || basename(filePath, extname(filePath)),
      artist: parsedArtist,
      artistRaw: rawArtist,
      featuredArtists: featuredArtists.length > 0 ? featuredArtists : undefined,
      albumArtist: common.albumartist || '',
      album: common.album || '',
      year: common.year || 0,
      genre: genreStr,
      tags,
      track: formatTrack(common),
      composer,
      cover,
      url: urlPath,
      duration,
      sampleRate,
      bitsPerSample,
      channels,
      bitrate,
      isHiRes,
      lrc: lrc || undefined,
      replayGain: hasReplayGain ? replayGain : undefined,
      // Decoder info
      codec: detectedCodec || format?.codec || '',
      codecName: decoderInfo?.decoder?.codec || '',
      qualityTier: quality.tier || '',
      qualityLabel: quality.label || '',
      qualityBadge: quality.badge || '',
      browserSupported: browser.chrome || browser.firefox || browser.safari || browser.edge || false,
      needsTranscode: browser.needsTranscode || false,
      recommendedFormat: browser.recommendedFormat || '',
    };
  } catch (err) {
    console.error(`  [ERROR] Failed to parse: ${filePath}`);
    console.error(`          ${err.message}`);
    return null;
  }
}

/**
 * Convert track info to TypeScript source string.
 */
function toTypeScript(playlist) {
  const lines = [];
  lines.push('// Auto-generated by scripts/scan-music.mjs');
  lines.push('// DO NOT EDIT MANUALLY');
  lines.push(`// Generated at: ${new Date().toISOString()}`);
  lines.push(`// Total tracks: ${playlist.length}`);
  lines.push('');
  lines.push('import type { MusicTrack } from "../types/config";');
  lines.push('');
  lines.push("export const generatedPlaylist: MusicTrack[] = [");

  for (const song of playlist) {
    const props = [];
    props.push(`    title: ${JSON.stringify(song.title)}`);
    props.push(`    artist: ${JSON.stringify(song.artist)}`);
    if (song.artistRaw && song.artistRaw !== song.artist) props.push(`    artistRaw: ${JSON.stringify(song.artistRaw)}`);
    if (song.featuredArtists && song.featuredArtists.length) props.push(`    featuredArtists: ${JSON.stringify(song.featuredArtists)}`);
    if (song.albumArtist) props.push(`    albumArtist: ${JSON.stringify(song.albumArtist)}`);
    if (song.album) props.push(`    album: ${JSON.stringify(song.album)}`);
    if (song.year) props.push(`    year: ${song.year}`);
    if (song.genre) props.push(`    genre: ${JSON.stringify(song.genre)}`);
    if (song.tags && song.tags.length) props.push(`    tags: ${JSON.stringify(song.tags)}`);
    if (song.track) props.push(`    track: { no: ${song.track.no}, of: ${song.track.of} }`);
    if (song.composer) props.push(`    composer: ${JSON.stringify(song.composer)}`);
    props.push(`    cover: ${JSON.stringify(song.cover)}`);
    props.push(`    url: ${JSON.stringify(song.url)}`);
    props.push(`    duration: ${song.duration}`);
    if (song.sampleRate) props.push(`    sampleRate: ${song.sampleRate}`);
    if (song.bitsPerSample) props.push(`    bitsPerSample: ${song.bitsPerSample}`);
    if (song.channels) props.push(`    channels: ${song.channels}`);
    if (song.bitrate) props.push(`    bitrate: ${song.bitrate}`);
    if (song.isHiRes) props.push(`    isHiRes: true`);
    if (song.lrc) props.push(`    lrc: ${JSON.stringify(song.lrc)}`);
    if (song.replayGain) props.push(`    replayGain: ${JSON.stringify(song.replayGain)}`);
    if (song.codec) props.push(`    codec: ${JSON.stringify(song.codec)}`);
    if (song.codecName) props.push(`    codecName: ${JSON.stringify(song.codecName)}`);
    if (song.qualityTier) props.push(`    qualityTier: ${JSON.stringify(song.qualityTier)}`);
    if (song.qualityLabel) props.push(`    qualityLabel: ${JSON.stringify(song.qualityLabel)}`);
    if (song.qualityBadge) props.push(`    qualityBadge: ${JSON.stringify(song.qualityBadge)}`);

    lines.push('  {');
    lines.push(props.join(',\n'));
    lines.push('  },');
  }

  lines.push('];');
  lines.push('');
  return lines.join('\n');
}

/**
 * Core scan: find and parse all audio files, then write output.
 * Uses concurrency-limited parallel scanning for performance.
 */
async function doScan(sourceDir) {
  const files = await findAudioFiles(sourceDir);
  console.log(`Found ${files.length} audio file(s)`);

  if (files.length === 0) {
    const emptyTs = `// Auto-generated by scripts/scan-music.mjs — no audio files found\n` +
      `import type { MusicTrack } from "../types/config";\n\n` +
      `export const generatedPlaylist: MusicTrack[] = [];\n`;
    await writeFile(OUTPUT_FILE, emptyTs);
    const jsonDir = dirname(JSON_OUTPUT_FILE);
    if (!existsSync(jsonDir)) {
      await mkdir(jsonDir, { recursive: true });
    }
    await writeFile(JSON_OUTPUT_FILE, '[]');
    console.log('No audio files found. Empty playlist generated.');
    return 0;
  }

  // Parallel scanning with concurrency limit (avoid overwhelming the system)
  const CONCURRENCY = 4;
  const playlist = [];
  let completed = 0;

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (file) => {
        const ext = extname(file).toLowerCase();
        const relPath = relative(sourceDir, file);
        console.log(`  ${relPath} [${ext.slice(1).toUpperCase()}]`);
        const result = await parseAudioFile(file);
        if (result) {
          const trackStr = result.track ? ` | Track ${result.track.no}` : '';
          const yearStr = result.year ? ` | ${result.year}` : '';
          const featStr = result.featuredArtists ? ` [feat. ${result.featuredArtists.join(', ')}]` : '';
          console.log(`    → "${result.title}" — ${result.artist}${featStr}${yearStr}${trackStr}`);
          if (result.cover) {
            console.log(`    → Cover: ${result.cover}`);
          }
          if (result.lrc) {
            console.log(`    → Lyrics: ${Math.round(result.lrc.length / 100) * 100}+ chars`);
          }
          if (result.replayGain) {
            console.log(`    → ReplayGain: track ${result.replayGain.trackGain || '--'} dB`);
          }
        }
        return result;
      })
    );

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        playlist.push(r.value);
      }
      completed++;
    }
  }

  const ts = toTypeScript(playlist);
  await writeFile(OUTPUT_FILE, ts);
  console.log(`Generated: ${OUTPUT_FILE}`);

  // Also write JSON for runtime client-side fetching (auto-import / refresh)
  const jsonDir = dirname(JSON_OUTPUT_FILE);
  if (!existsSync(jsonDir)) {
    await mkdir(jsonDir, { recursive: true });
  }
  await writeFile(JSON_OUTPUT_FILE, JSON.stringify(playlist, null, 2));
  console.log(`Generated: ${JSON_OUTPUT_FILE}`);
  console.log(`Total tracks in playlist: ${playlist.length}`);
  return playlist.length;
}

/**
 * Watch mode: monitor source directory and re-scan on changes.
 */
function startWatch(sourceDir) {
  let watchTimeout = null;
  let scanning = false;

  const watcher = watch(sourceDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    const ext = extname(filename).toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) return;

    // Debounce: accumulate changes over 2s before re-scanning
    clearTimeout(watchTimeout);
    console.log(`  [watch] ${eventType}: ${filename}`);
    watchTimeout = setTimeout(async () => {
      if (scanning) return;
      scanning = true;
      console.log('\n[watch] Change detected — re-scanning...\n');
      try {
        await doScan(sourceDir);
      } catch (err) {
        console.error('[watch] Scan error:', err.message);
      }
      scanning = false;
      console.log('[watch] Done. Watching for changes...\n');
    }, 2000);
  });

  console.log('Watching for music file changes... (Ctrl+C to stop)\n');

  // Keep event loop alive
  process.stdin.resume();

  const cleanup = () => { watcher.close(); process.exit(0); };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

/**
 * Main entry.
 */
async function main() {
  console.log('Music Scanner — reading audio metadata');
  console.log('='.repeat(50));

  // Ensure output directories exist
  await mkdir(MUSIC_URL_DIR, { recursive: true });
  await mkdir(COVER_DIR, { recursive: true });

  // Source directory from CLI arg or default
  const args = process.argv.slice(2).filter(a => a !== '--watch');
  const sourceDir = args[0] || MUSIC_URL_DIR;
  console.log(`Scanning: ${sourceDir}`);

  await doScan(sourceDir);

  if (process.argv.includes('--watch')) {
    console.log('');
    startWatch(sourceDir);
  }
}

// Only run main() when executed directly (not imported)
const isDirect = process.argv[1] && (
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
);

if (isDirect) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { doScan, MUSIC_URL_DIR };
