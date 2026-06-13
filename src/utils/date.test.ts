import { describe, it, expect } from "vitest";
import { formatDate, formatDateFull } from "./date";

describe("formatDate", () => {
  it("formats a date as YYYY-MM-DD", () => {
    const date = new Date(2026, 5, 13); // June 13, 2026
    expect(formatDate(date)).toBe("2026-06-13");
  });

  it("pads single-digit months and days", () => {
    const date = new Date(2026, 0, 5); // Jan 5, 2026
    expect(formatDate(date)).toBe("2026-01-05");
  });
});

describe("formatDateFull", () => {
  it("formats a date as YYYY-MM-DD HH:MM", () => {
    const date = new Date(2026, 5, 13, 14, 30);
    expect(formatDateFull(date)).toBe("2026-06-13 14:30");
  });

  it("pads hours and minutes", () => {
    const date = new Date(2026, 0, 1, 3, 5);
    expect(formatDateFull(date)).toBe("2026-01-01 03:05");
  });
});
