import { buildDspChain } from "./player-dsp";

const baseSong = {
  codecName: "FLAC",
  sampleRate: 96000,
  bitsPerSample: 24,
};

const baseDsp = {
  replayGainMode: "track" as const,
  headroomEnabled: true,
  headroomDB: -3,
  compressorEnabled: true,
  compressorThreshold: -12,
  compressorRatio: 2,
  crossfeedEnabled: true,
  crossfeedStrength: 0.7,
};

describe("buildDspChain", () => {
  it("builds complete signal path", () => {
    const result = buildDspChain(baseSong, baseDsp);
    expect(result.nodes).toEqual([
      "FLAC",
      "96kHz/24bit",
      "RG(Track Gain)",
      "Headroom(-3dB)",
      "Comp(-12dB, 2:1)",
      "Crossfeed(70%)",
      "Output",
    ]);
    expect(result.path).toBe(
      "FLAC → 96kHz/24bit → RG(Track Gain) → Headroom(-3dB) → Comp(-12dB, 2:1) → Crossfeed(70%) → Output",
    );
    expect(result.activeCount).toBe(3);
  });

  it("counts activeDSP modules correctly", () => {
    const allOff = buildDspChain(baseSong, {
      ...baseDsp,
      headroomEnabled: false,
      compressorEnabled: false,
      crossfeedEnabled: false,
    });
    expect(allOff.activeCount).toBe(0);
  });

  it("shows album gain when mode is album", () => {
    const result = buildDspChain(baseSong, { ...baseDsp, replayGainMode: "album" });
    expect(result.nodes[2]).toBe("RG(Album Gain)");
  });

  it("falls back to codec name when codecName is empty", () => {
    const result = buildDspChain({ codec: "mp3" }, baseDsp);
    expect(result.nodes[0]).toBe("MP3");
  });

  it("shows Audio when no codec info", () => {
    const result = buildDspChain({}, baseDsp);
    expect(result.nodes[0]).toBe("Audio");
  });

  it("handles 44.1kHz sample rate display", () => {
    const result = buildDspChain({ sampleRate: 44100, bitsPerSample: 16 }, baseDsp);
    expect(result.nodes[1]).toBe("44.1kHz/16bit");
  });

  it("handles 48kHz sample rate display", () => {
    const result = buildDspChain({ sampleRate: 48000, bitsPerSample: 24 }, baseDsp);
    expect(result.nodes[1]).toBe("48kHz/24bit");
  });
});
