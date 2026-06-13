import { describe, it, expect } from "vitest";
import { getReadingStats } from "./reading-time";

describe("getReadingStats", () => {
  it("counts CJK characters correctly", () => {
    const stats = getReadingStats("你好世界");
    expect(stats.cjkChars).toBe(4);
    expect(stats.words).toBe(0);
  });

  it("counts English words correctly", () => {
    const stats = getReadingStats("hello world from vitest");
    expect(stats.words).toBe(4);
    expect(stats.cjkChars).toBe(0);
  });

  it("counts mixed CJK and English", () => {
    const stats = getReadingStats("你好 world 测试 test");
    expect(stats.cjkChars).toBe(4);
    expect(stats.words).toBe(2);
    expect(stats.chars).toBe(6);
  });

  it("returns at least 1 minute", () => {
    const stats = getReadingStats("hi");
    expect(stats.minutes).toBeGreaterThanOrEqual(1);
  });

  it("calculates reading time for long CJK text", () => {
    // 800 CJK chars at ~400 chars/min => ~2 min
    const text = "文".repeat(800);
    const stats = getReadingStats(text);
    expect(stats.minutes).toBe(2);
  });
});
