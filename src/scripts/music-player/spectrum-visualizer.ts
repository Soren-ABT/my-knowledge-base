export interface SpectrumConfig {
  canvas: HTMLCanvasElement;
  barCount: number;
  getColor: (value: number, index: number) => string;
  getAnalyser: () => AnalyserNode | null;
  isActive?: () => boolean; // additional condition beyond isPlaying (e.g., immOpen)
}

export interface SpectrumInstance {
  destroy: () => void;
}

type UnsubscribeFn = () => void;

export function createSpectrumVisualizer(
  config: SpectrumConfig,
  subscribe: (fn: (state: { isPlaying: boolean }) => void) => UnsubscribeFn,
): SpectrumInstance {
  const { canvas, barCount, getColor, getAnalyser, isActive } = config;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { destroy() {} };

  let animId: number | null = null;
  let freqData: Uint8Array | null = null;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
  }

  function draw() {
    animId = requestAnimationFrame(draw);
    const a = getAnalyser();
    if (!a) return;
    if (!freqData) freqData = new Uint8Array(a.frequencyBinCount);
    resize();
    a.getByteFrequencyData(freqData as unknown as Uint8Array<ArrayBuffer>);

    const w = canvas.width;
    const h = canvas.height;
    ctx!.clearRect(0, 0, w, h);
    const barW = (w / barCount) * 0.65;
    const gap = (w / barCount) * 0.35;
    const step = Math.floor(freqData.length / barCount);

    for (let i = 0; i < barCount; i++) {
      let max = 0;
      for (let j = 0; j < step; j++) max = Math.max(max, freqData[i * step + j]);
      const bh = (max / 255) * h * 0.85;
      const x = i * (barW + gap);
      ctx!.fillStyle = getColor(max, i);
      if ((ctx as any).roundRect) {
        ctx!.beginPath();
        (ctx as any).roundRect(x, h - bh, barW, bh, [barW / 2, barW / 2, 0, 0]);
        ctx!.fill();
      } else {
        ctx!.fillRect(x, h - bh, barW, bh);
      }
    }
  }

  function start() {
    if (!animId) draw();
  }

  function stop() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
  }

  const unsub = subscribe(function (s) {
    const active = isActive ? isActive() : true;
    if (s.isPlaying && active) start();
    else stop();
  });

  return {
    destroy() {
      unsub();
      stop();
    },
  };
}
