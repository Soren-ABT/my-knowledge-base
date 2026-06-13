interface SongInfo {
  codecName?: string;
  codec?: string;
  sampleRate?: number;
  bitsPerSample?: number;
}

interface DSPState {
  replayGainMode: "track" | "album";
  headroomEnabled: boolean;
  headroomDB: number;
  compressorEnabled: boolean;
  compressorThreshold: number;
  compressorRatio: number;
  crossfeedEnabled: boolean;
  crossfeedStrength: number;
}

export interface DspChainResult {
  nodes: string[];
  path: string;
  activeCount: number;
}

export function buildDspChain(song: SongInfo, dsp: DSPState): DspChainResult {
  const nodes: string[] = [];

  // Source format
  if (song.codecName) nodes.push(song.codecName);
  else if (song.codec) nodes.push(song.codec.toUpperCase());
  else nodes.push("Audio");

  if (song.sampleRate) {
    const khz = song.sampleRate / 1000;
    const decimals = song.sampleRate % 1000 === 0 ? 0 : 1;
    nodes.push(khz.toFixed(decimals) + "kHz/" + (song.bitsPerSample || 16) + "bit");
  }

  // ReplayGain
  nodes.push("RG(" + (dsp.replayGainMode === "album" ? "Album Gain" : "Track Gain") + ")");

  // Headroom
  if (dsp.headroomEnabled) {
    nodes.push("Headroom(" + dsp.headroomDB + "dB)");
  }

  // Compressor
  if (dsp.compressorEnabled) {
    nodes.push("Comp(" + dsp.compressorThreshold + "dB, " + dsp.compressorRatio + ":1)");
  }

  // Crossfeed
  if (dsp.crossfeedEnabled) {
    nodes.push("Crossfeed(" + Math.round(dsp.crossfeedStrength * 100) + "%)");
  }

  nodes.push("Output");

  return {
    nodes,
    path: nodes.join(" → "),
    activeCount:
      (dsp.headroomEnabled ? 1 : 0) +
      (dsp.compressorEnabled ? 1 : 0) +
      (dsp.crossfeedEnabled ? 1 : 0),
  };
}
