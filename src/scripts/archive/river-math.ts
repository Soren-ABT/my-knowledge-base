export interface RiverConfig {
  cardW: number;
  cardH: number;
  cardGap: number;
  riverY: number;
  amplitude: number;
  wavelength: number;
  padding: number;
  stepSize: number;
}

export interface CardPos {
  x: number;
  y: number;
  cx: number;
  waveY: number;
  isAbove: boolean;
}

export interface RiverData {
  tw: number;
  svgH: number;
  mainP: string;
  botP: string;
  cards: CardPos[];
}

/**
 * Build SVG path "d" string for the wavy river.
 */
export function buildRiverPath(totalWidth: number, cfg: RiverConfig, offsetY = 0): string {
  const { riverY, amplitude, wavelength, stepSize } = cfg;
  const parts: string[] = [];
  const steps = Math.max(1, Math.ceil(totalWidth / stepSize));
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * totalWidth;
    const y =
      riverY +
      amplitude * 0.5 * Math.sin((x / wavelength) * Math.PI * 2) +
      amplitude * 0.3 * Math.sin((x / (wavelength * 0.6)) * Math.PI * 2 + 1) +
      amplitude * 0.2 * Math.sin((x / (wavelength * 1.5)) * Math.PI * 2 + 2.5);
    parts.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${(y + offsetY).toFixed(1)}`);
  }
  return parts.join(" ");
}

/** Total SVG width needed for the given number of posts. */
export function totalWidth(postCount: number, cfg: RiverConfig): number {
  return cfg.padding * 2 + postCount * (cfg.cardW + cfg.cardGap) - cfg.cardGap;
}

/** Compute card positions placed along the river (alternating above/below). */
export function cardPositions(postCount: number, cfg: RiverConfig): CardPos[] {
  const offset = 50;
  return Array.from({ length: postCount }, (_, i) => {
    const x = cfg.padding + i * (cfg.cardW + cfg.cardGap);
    const cx = x + cfg.cardW / 2;
    const { riverY, amplitude, wavelength } = cfg;
    const waveY =
      riverY +
      amplitude * 0.5 * Math.sin((cx / wavelength) * Math.PI * 2) +
      amplitude * 0.3 * Math.sin((cx / (wavelength * 0.6)) * Math.PI * 2 + 1) +
      amplitude * 0.2 * Math.sin((cx / (wavelength * 1.5)) * Math.PI * 2 + 2.5);
    const isAbove = i % 2 === 0;
    const y = isAbove ? waveY - offset - cfg.cardH : waveY + offset;
    return { x, y, cx, waveY, isAbove };
  });
}

/** Estimate total length of an SVG path from its "d" attribute. */
export function estimatePathLength(d: string): number {
  const pts = d
    .replace(/^M\s*/, "")
    .split(/ L\s*/)
    .map((p) => p.split(" ").map(Number));
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.sqrt((pts[i][0] - pts[i - 1][0]) ** 2 + (pts[i][1] - pts[i - 1][1]) ** 2);
  }
  return Math.round(len);
}

/** Generate sparkle positions along the river path. */
export function sparklePositions(mainP: string, count: number): { x: number; y: number }[] {
  const pts = mainP
    .replace(/^M\s*/, "")
    .split(/ L\s*/)
    .map((p) => p.split(" ").map(Number));
  const result: { x: number; y: number }[] = [];
  const step = Math.max(1, Math.floor(pts.length / count));
  for (let i = 0; i < count; i++) {
    const idx = Math.min(i * step, pts.length - 1);
    result.push({ x: pts[idx][0], y: pts[idx][1] + (Math.random() - 0.5) * 16 });
  }
  return result;
}

/** Generate floating particle positions along the river path. */
export function floatingParticles(
  mainP: string,
  count: number,
): { x: number; y: number; delay: number; dur: number }[] {
  const pts = mainP
    .replace(/^M\s*/, "")
    .split(/ L\s*/)
    .map((p) => p.split(" ").map(Number));
  const result: { x: number; y: number; delay: number; dur: number }[] = [];
  const step = Math.max(1, Math.floor(pts.length / count));
  for (let i = 0; i < count; i++) {
    const idx = Math.min(i * step + (i % 3) * 7, pts.length - 1);
    result.push({
      x: pts[idx][0] + (Math.random() - 0.5) * 30,
      y: pts[idx][1] + (Math.random() - 0.5) * 20,
      delay: Math.random() * 4,
      dur: 3 + Math.random() * 4,
    });
  }
  return result;
}

export function makeRiverData(
  cfg: RiverConfig,
  tw: number,
  mainP: string,
  botP: string,
  cards: CardPos[],
): RiverData {
  return { tw, svgH: cfg.riverY + cfg.amplitude + cfg.cardH + 220, mainP, botP, cards };
}

const CAT_COLOR_MAP: Record<string, string> = {
  技术: "#22d3ee",
  生活: "#a78bfa",
  学术: "#fbbf24",
  随笔: "#f472b6",
  项目: "#34d399",
  教程: "#60a5fa",
};

export function getCatColor(cat: string): string {
  if (CAT_COLOR_MAP[cat]) return CAT_COLOR_MAP[cat];
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h << 5) - h + cat.charCodeAt(i);
  return `oklch(0.65 0.16 ${Math.abs(h % 360)})`;
}

export function getCatBg(cat: string): string {
  const c = getCatColor(cat);
  return c.replace("0.65", "0.5").replace("0.16", "0.10");
}
