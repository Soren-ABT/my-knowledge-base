// Wave animation for theme transitions — extracted from WelcomeLayout.astro is:inline

const WAVE_DURATION = 1000;
const WAVE_FREQ = 2.2;
const WAVE_MAX_AMP = 65;
const WAVE_HARMONICS = [
  { mult: 1.0, amp: 1.0 },
  { mult: 2.3, amp: 0.25 },
  { mult: 4.7, amp: 0.1 },
];

let waveCanvas: HTMLCanvasElement | null = null;
let waveCtx: CanvasRenderingContext2D | null = null;
let waveAnimId: number | null = null;

function ensureWaveCtx(): CanvasRenderingContext2D | null {
  if (!waveCanvas)
    waveCanvas = document.getElementById("theme-wave-canvas") as HTMLCanvasElement | null;
  if (!waveCtx && waveCanvas) waveCtx = waveCanvas.getContext("2d");
  return waveCtx;
}

export function animateWave(fillColor: string, onComplete?: () => void): void {
  const canvas =
    waveCanvas || (document.getElementById("theme-wave-canvas") as HTMLCanvasElement | null);
  if (!canvas) {
    waveCanvas = null;
    return;
  }
  waveCanvas = canvas;

  const ctx = ensureWaveCtx();
  if (!ctx) return;

  if (waveAnimId) {
    cancelAnimationFrame(waveAnimId);
    waveAnimId = null;
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = "block";
  const w = canvas.width;
  const h = canvas.height;
  const freq = WAVE_FREQ;
  const maxAmp = WAVE_MAX_AMP;
  const harmonics = WAVE_HARMONICS;
  const dur = WAVE_DURATION;
  const st = performance.now();

  function frame(now: number): void {
    const raw = Math.min((now - st) / dur, 1);
    const eased = 1 - Math.pow(1 - raw, 4);
    const waveY = -maxAmp + eased * (h + maxAmp * 2);
    const ampEnvelope = Math.sin(eased * Math.PI);
    const amp = maxAmp * ampEnvelope;
    const steps = Math.max(2, Math.floor(w / 1.5));
    const ps = eased * Math.PI * 1.8;

    ctx!.clearRect(0, 0, w, h);
    ctx!.beginPath();
    ctx!.moveTo(0, 0);
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      const phase = (i / steps) * Math.PI * 2 * freq + ps;
      let yOff = 0;
      for (let j = 0; j < harmonics.length; j++) {
        yOff += Math.sin(phase * harmonics[j].mult) * amp * harmonics[j].amp;
      }
      ctx!.lineTo(x, waveY + yOff);
    }
    ctx!.lineTo(w, h);
    ctx!.lineTo(0, h);
    ctx!.closePath();
    ctx!.fillStyle = fillColor;
    ctx!.fill();

    // Gradient shadow overlay
    ctx!.save();
    ctx!.clip();
    const gT = waveY - amp - 10;
    const gB = waveY + amp + 80;
    const grd = ctx!.createLinearGradient(0, gT, 0, gB);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(0.3, "rgba(0,0,0,0)");
    grd.addColorStop(0.6, "rgba(0,0,0,0.10)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    ctx!.fillStyle = grd;
    ctx!.fillRect(0, gT, w, gB - gT);
    ctx!.restore();

    // Highlight stroke
    ctx!.beginPath();
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      const phase = (i / steps) * Math.PI * 2 * freq + ps;
      let yOff = 0;
      for (let j = 0; j < harmonics.length; j++) {
        yOff += Math.sin(phase * harmonics[j].mult) * amp * harmonics[j].amp;
      }
      if (i === 0) ctx!.moveTo(x, waveY + yOff);
      else ctx!.lineTo(x, waveY + yOff);
    }
    ctx!.strokeStyle = "rgba(255,255,255,0.20)";
    ctx!.lineWidth = 1.4;
    ctx!.stroke();

    ctx!.beginPath();
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      const phase = (i / steps) * Math.PI * 2 * freq + ps;
      let yOff = 0;
      for (let j = 0; j < harmonics.length; j++) {
        yOff += Math.sin(phase * harmonics[j].mult) * amp * harmonics[j].amp;
      }
      if (i === 0) ctx!.moveTo(x, waveY + yOff - 1.0);
      else ctx!.lineTo(x, waveY + yOff - 1.0);
    }
    ctx!.strokeStyle = "rgba(255,255,255,0.38)";
    ctx!.lineWidth = 0.5;
    ctx!.stroke();

    if (raw < 1) {
      waveAnimId = requestAnimationFrame(frame);
    } else {
      ctx!.clearRect(0, 0, w, h);
      canvas!.style.display = "none";
      waveAnimId = null;
      if (onComplete) onComplete();
    }
  }

  waveAnimId = requestAnimationFrame(frame);
}

export function freezeTransitions(el: HTMLElement): void {
  el.classList.add("no-transition");
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      el.classList.remove("no-transition");
    });
  });
}

// Expose on window for legacy callers (ThemeScript via is:inline)
window.__animateWave = animateWave;
window.__freezeTransitions = freezeTransitions;

declare global {
  interface Window {
    __animateWave?: typeof animateWave;
    __freezeTransitions?: typeof freezeTransitions;
    __hideLoader?: () => void;
    __waveAnimId?: number | null;
  }
}
