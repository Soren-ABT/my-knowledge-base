import { describe, it, expect } from "vitest";
import {
  clampVolume,
  setVolume,
  toggleMute,
  toggleShuffle,
  toggleRepeat,
  dBtoLinear,
  crossfeedStrengthMapping,
} from "./player-state";
import type { PlayerState } from "./player-state";

const base: PlayerState = {
  volume: 0.5,
  isMuted: false,
  isShuffled: false,
  isRepeating: 0,
};

describe("clampVolume", () => {
  it("returns value within range", () => {
    expect(clampVolume(0.5)).toBe(0.5);
  });

  it("clamps to 0", () => {
    expect(clampVolume(-0.1)).toBe(0);
    expect(clampVolume(-10)).toBe(0);
  });

  it("clamps to 1", () => {
    expect(clampVolume(1.1)).toBe(1);
    expect(clampVolume(100)).toBe(1);
  });

  it("returns boundary values unchanged", () => {
    expect(clampVolume(0)).toBe(0);
    expect(clampVolume(1)).toBe(1);
  });
});

describe("setVolume", () => {
  it("sets volume and marks muted at 0", () => {
    const result = setVolume(base, 0);
    expect(result.volume).toBe(0);
    expect(result.isMuted).toBe(true);
  });

  it("sets volume and unmutes at non-zero", () => {
    const result = setVolume(base, 0.8);
    expect(result.volume).toBe(0.8);
    expect(result.isMuted).toBe(false);
  });

  it("clamps out-of-range values", () => {
    expect(setVolume(base, 2).volume).toBe(1);
    expect(setVolume(base, -1).volume).toBe(0);
  });

  it("does not mutate original state", () => {
    const original = { ...base };
    setVolume(base, 0.3);
    expect(base).toEqual(original);
  });
});

describe("toggleMute", () => {
  it("toggles muted state", () => {
    expect(toggleMute(base).isMuted).toBe(true);
    expect(toggleMute({ ...base, isMuted: true }).isMuted).toBe(false);
  });

  it("restores volume to 0.5 when unmuting from zero", () => {
    const result = toggleMute({ ...base, volume: 0, isMuted: true });
    expect(result.volume).toBe(0.5);
    expect(result.isMuted).toBe(false);
  });

  it("preserves volume when unmuting from non-zero", () => {
    const result = toggleMute({ ...base, volume: 0.7, isMuted: true });
    expect(result.volume).toBe(0.7);
    expect(result.isMuted).toBe(false);
  });
});

describe("toggleShuffle", () => {
  it("toggles shuffle", () => {
    expect(toggleShuffle(base).isShuffled).toBe(true);
    expect(toggleShuffle({ ...base, isShuffled: true }).isShuffled).toBe(false);
  });

  it("disables repeat when shuffle is enabled", () => {
    const withRepeat = { ...base, isShuffled: false, isRepeating: 2 };
    const result = toggleShuffle(withRepeat);
    expect(result.isShuffled).toBe(true);
    expect(result.isRepeating).toBe(0);
  });

  it("preserves repeat when shuffle is disabled", () => {
    const withRepeat = { ...base, isShuffled: true, isRepeating: 0 };
    const result = toggleShuffle(withRepeat);
    expect(result.isShuffled).toBe(false);
    expect(result.isRepeating).toBe(0);
  });
});

describe("toggleRepeat", () => {
  it("cycles 0→1→2→0", () => {
    expect(toggleRepeat({ ...base, isRepeating: 0 }).isRepeating).toBe(1);
    expect(toggleRepeat({ ...base, isRepeating: 1 }).isRepeating).toBe(2);
    expect(toggleRepeat({ ...base, isRepeating: 2 }).isRepeating).toBe(0);
  });

  it("disables shuffle when repeat is non-zero", () => {
    const withShuffle = { ...base, isShuffled: true, isRepeating: 0 };
    const result = toggleRepeat(withShuffle);
    expect(result.isRepeating).toBe(1);
    expect(result.isShuffled).toBe(false);
  });

  it("re-enables shuffle when repeat cycles back to 0", () => {
    const withBoth = { ...base, isShuffled: false, isRepeating: 2 };
    const result = toggleRepeat(withBoth);
    expect(result.isRepeating).toBe(0);
    expect(result.isShuffled).toBe(false); // was already false
  });
});

describe("dBtoLinear", () => {
  it("returns 1 for 0 dB", () => {
    expect(dBtoLinear(0)).toBeCloseTo(1, 5);
  });

  it("returns >1 for positive dB", () => {
    expect(dBtoLinear(6)).toBeCloseTo(2, 1);
  });

  it("returns <1 for negative dB", () => {
    expect(dBtoLinear(-6)).toBeCloseTo(0.5, 1);
  });
});

describe("crossfeedStrengthMapping", () => {
  it("returns baseline values at strength 0", () => {
    const result = crossfeedStrengthMapping(0);
    expect(result.freq).toBe(650);
    expect(result.gainDB).toBe(-12);
    expect(result.dryGain).toBe(1);
  });

  it("returns max values at strength 1", () => {
    const result = crossfeedStrengthMapping(1);
    expect(result.freq).toBe(900);
    expect(result.gainDB).toBe(-6);
    expect(result.dryGain).toBe(0.85);
  });

  it("interpolates at strength 0.5", () => {
    const result = crossfeedStrengthMapping(0.5);
    expect(result.freq).toBe(775);
    expect(result.gainDB).toBe(-9);
    expect(result.dryGain).toBe(0.925);
  });
});
