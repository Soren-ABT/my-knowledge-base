export interface RawTrack {
  id?: number;
  title?: string;
  artist?: string;
  artistRaw?: string;
  featuredArtists?: string[];
  album?: string;
  albumArtist?: string;
  cover?: string;
  url?: string;
  duration?: number;
  sampleRate?: number;
  bitsPerSample?: number;
  channels?: number;
  bitrate?: number;
  isHiRes?: boolean;
  codec?: string;
  codecName?: string;
  qualityTier?: string;
  qualityLabel?: string;
  qualityBadge?: string;
  genre?: string;
  year?: number;
  track?: number | null;
  composer?: string;
  tags?: string[];
  lrc?: string;
  replayGain?: { trackGain?: number; albumGain?: number };
}

export function mapTrack(s: RawTrack, i: number) {
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

export function getAssetPath(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("/"))
    return path;
  return "/" + path;
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds || 0));
  return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
}
