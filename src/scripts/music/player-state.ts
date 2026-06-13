export interface PlayerState {
  volume: number;
  isMuted: boolean;
  isShuffled: boolean;
  isRepeating: number; // 0=off, 1=one, 2=all
}

export function clampVolume(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function setVolume(state: PlayerState, v: number): PlayerState {
  const volume = clampVolume(v);
  return { ...state, volume, isMuted: volume === 0 };
}

export function toggleMute(state: PlayerState): PlayerState {
  const isMuted = !state.isMuted;
  // Restore minimum audible volume when unmuting from zero-volume state
  let volume = state.volume;
  if (!isMuted && volume === 0) {
    volume = 0.5;
  }
  return { ...state, isMuted, volume };
}

export function toggleShuffle(state: PlayerState): PlayerState {
  const isShuffled = !state.isShuffled;
  // Mutual exclusion: shuffle disables repeat
  const isRepeating = isShuffled ? 0 : state.isRepeating;
  return { ...state, isShuffled, isRepeating };
}

export function toggleRepeat(state: PlayerState): PlayerState {
  // 3-state cycling: off(0) -> one(1) -> all(2) -> off(0)
  const isRepeating = (state.isRepeating + 1) % 3;
  // Mutual exclusion: repeat (non-zero) disables shuffle
  const isShuffled = isRepeating !== 0 ? false : state.isShuffled;
  return { ...state, isRepeating, isShuffled };
}

export function dBtoLinear(dB: number): number {
  return Math.pow(10, dB / 20);
}

export function crossfeedStrengthMapping(strength: number) {
  // s in [0, 1]
  const freq = 650 + strength * 250; // 650–900 Hz
  const gainDB = -(12 - strength * 6); // -12 to -6 dB
  const dryGain = 1 - strength * 0.15; // 1.0 to 0.85
  return { freq, gainDB, dryGain, gainLinear: dBtoLinear(gainDB) };
}
