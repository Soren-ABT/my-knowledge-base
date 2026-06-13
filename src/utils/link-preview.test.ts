import { describe, it, expect, beforeEach } from "vitest";
import { shouldPreview, resolveUrl } from "./link-preview";

describe("shouldPreview", () => {
  it("returns false for empty href", () => {
    expect(shouldPreview("")).toBe(false);
  });

  it("returns false for external HTTP URLs", () => {
    expect(shouldPreview("https://example.com/page")).toBe(false);
    expect(shouldPreview("http://example.com")).toBe(false);
  });

  it("returns false for hash-only links", () => {
    expect(shouldPreview("#section")).toBe(false);
  });

  it("returns false for javascript: links", () => {
    expect(shouldPreview("javascript:void(0)")).toBe(false);
  });

  it("returns true for .md files", () => {
    expect(shouldPreview("post.md")).toBe(true);
    expect(shouldPreview("/docs/guide.markdown")).toBe(true);
  });

  it("returns true for .html files", () => {
    expect(shouldPreview("page.html")).toBe(true);
    expect(shouldPreview("/page.htm")).toBe(true);
  });

  it("returns true for extensionless paths", () => {
    expect(shouldPreview("/posts/hello-world")).toBe(true);
    expect(shouldPreview("about")).toBe(true);
  });

  it("returns false for paths with unrecognized extensions", () => {
    expect(shouldPreview("file.pdf")).toBe(false);
    expect(shouldPreview("image.png")).toBe(false);
  });
});

describe("resolveUrl", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: {
        href: "https://example.com/blog/",
        origin: "https://example.com",
        pathname: "/blog/",
      },
      writable: true,
      configurable: true,
    });
  });

  it("resolves relative paths", () => {
    expect(resolveUrl("post/hello")).toBe("https://example.com/blog/post/hello");
  });

  it("resolves absolute paths", () => {
    expect(resolveUrl("/docs/guide")).toBe("https://example.com/docs/guide");
  });

  it("preserves fully qualified URLs", () => {
    expect(resolveUrl("https://other.com/page")).toBe("https://other.com/page");
  });

  it("resolves with search params", () => {
    expect(resolveUrl("/search?q=test")).toBe("https://example.com/search?q=test");
  });

  it("resolves with hash", () => {
    expect(resolveUrl("/about#team")).toBe("https://example.com/about#team");
  });

  it("uses explicit base when provided", () => {
    expect(resolveUrl("page", "https://custom.com/")).toBe("https://custom.com/page");
  });
});
