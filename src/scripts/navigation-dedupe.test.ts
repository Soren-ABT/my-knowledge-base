import { describe, it, expect } from "vitest";
import { shouldIgnoreSamePageNavigation } from "../scripts/navigation-dedupe";

describe("shouldIgnoreSamePageNavigation", () => {
  it("returns true for identical URLs", () => {
    expect(shouldIgnoreSamePageNavigation("/posts/hello", "/posts/hello")).toBe(true);
  });

  it("returns true for same pathname and search", () => {
    expect(shouldIgnoreSamePageNavigation("/posts?page=2", "/posts?page=2")).toBe(true);
  });

  it("returns true for same pathname and hash", () => {
    expect(shouldIgnoreSamePageNavigation("/about#team", "/about#team")).toBe(true);
  });

  it("returns false for different pathnames", () => {
    expect(shouldIgnoreSamePageNavigation("/posts/hello", "/posts/world")).toBe(false);
  });

  it("returns false when search params differ", () => {
    expect(shouldIgnoreSamePageNavigation("/posts?page=1", "/posts?page=2")).toBe(false);
  });

  it("returns false when hash differs", () => {
    expect(shouldIgnoreSamePageNavigation("/about#team", "/about#contact")).toBe(false);
  });

  it("returns false when current path has search but target does not", () => {
    expect(shouldIgnoreSamePageNavigation("/posts", "/posts?page=2")).toBe(false);
  });

  it("returns false for external URLs (different origin)", () => {
    expect(shouldIgnoreSamePageNavigation("https://other.com/page", "/page")).toBe(false);
  });

  it("returns false for invalid/malformed URLs", () => {
    expect(shouldIgnoreSamePageNavigation("", "/page")).toBe(false);
  });
});
