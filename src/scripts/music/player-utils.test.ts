import { describe, it, expect } from "vitest";
import { mapTrack, getAssetPath, formatTime } from "./player-utils";
import type { RawTrack } from "./player-utils";

describe("mapTrack", () => {
  const empty: RawTrack = {};

  it("maps all fields with defaults", () => {
    const result = mapTrack(empty, 0);
    expect(result.id).toBe(0);
    expect(result.title).toBe("Unknown");
    expect(result.artist).toBe("Unknown");
    expect(result.artistRaw).toBe("");
    expect(result.featuredArtists).toEqual([]);
    expect(result.album).toBe("");
    expect(result.cover).toBe("");
    expect(result.url).toBe("");
    expect(result.duration).toBe(0);
    expect(result.channels).toBe(2);
    expect(result.isHiRes).toBe(false);
    expect(result.replayGain).toBeUndefined();
  });

  it("preserves provided values", () => {
    const track: RawTrack = {
      id: 5,
      title: "My Song",
      artist: "My Artist",
      album: "My Album",
      duration: 240,
      codec: "flac",
      bitrate: 900,
      year: 2024,
      genre: "Rock",
    };
    const result = mapTrack(track, 0);
    expect(result.id).toBe(5);
    expect(result.title).toBe("My Song");
    expect(result.artist).toBe("My Artist");
    expect(result.album).toBe("My Album");
    expect(result.duration).toBe(240);
    expect(result.codec).toBe("flac");
    expect(result.bitrate).toBe(900);
    expect(result.year).toBe(2024);
    expect(result.genre).toBe("Rock");
  });

  it("falls back to index when id is missing", () => {
    expect(mapTrack({}, 3).id).toBe(3);
    expect(mapTrack({}, 0).id).toBe(0);
  });

  it("keeps replayGain undefined when not provided", () => {
    expect(mapTrack({}, 0).replayGain).toBeUndefined();
  });
});

describe("getAssetPath", () => {
  it("returns empty for falsy path", () => {
    expect(getAssetPath("")).toBe("");
  });

  it("returns HTTP URLs unchanged", () => {
    expect(getAssetPath("https://cdn.com/cover.jpg")).toBe("https://cdn.com/cover.jpg");
    expect(getAssetPath("http://example.com/file.mp3")).toBe("http://example.com/file.mp3");
  });

  it("returns absolute paths unchanged", () => {
    expect(getAssetPath("/assets/music/cover/abc.jpg")).toBe("/assets/music/cover/abc.jpg");
  });

  it("prepends / to relative paths", () => {
    expect(getAssetPath("assets/cover.jpg")).toBe("/assets/cover.jpg");
    expect(getAssetPath("music/track.flac")).toBe("/music/track.flac");
  });
});

describe("formatTime", () => {
  it("formats 0 seconds", () => {
    expect(formatTime(0)).toBe("0:00");
  });

  it("formats whole minutes", () => {
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(120)).toBe("2:00");
  });

  it("formats seconds over 60", () => {
    expect(formatTime(125)).toBe("2:05");
    expect(formatTime(3661)).toBe("61:01");
  });

  it("zero-pads seconds under 10", () => {
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(65)).toBe("1:05");
  });

  it("handles negative values", () => {
    expect(formatTime(-10)).toBe("0:00");
  });

  it("floors non-integer input", () => {
    expect(formatTime(65.9)).toBe("1:05");
  });
});
