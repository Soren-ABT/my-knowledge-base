import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomId } from "./random-id";

describe("randomId", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a string of 8 characters", () => {
    expect(randomId()).toHaveLength(8);
  });

  it("contains only alphanumeric characters", () => {
    for (let i = 0; i < 20; i++) {
      expect(randomId()).toMatch(/^[a-z0-9]{8}$/);
    }
  });

  it("produces different values on subsequent calls", () => {
    const ids = new Set(Array.from({ length: 100 }, () => randomId()));
    expect(ids.size).toBe(100);
  });

  it("returns different values with deterministically mocked Math.random", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.0)
      .mockReturnValueOnce(0.5)
      .mockReturnValueOnce(1.0);
    // 0 -> "0" -> id starts with "0"
    expect(typeof randomId()).toBe("string");
    expect(randomId()).not.toBe(randomId());
  });
});
