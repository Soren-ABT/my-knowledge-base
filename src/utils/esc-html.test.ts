import { describe, it, expect } from "vitest";
import { escHTML } from "./esc-html";

describe("escHTML", () => {
  it("escapes < and > characters", () => {
    expect(escHTML("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert('xss')&lt;/script&gt;",
    );
  });

  it("escapes ampersand", () => {
    expect(escHTML("a & b")).toBe("a &amp; b");
  });

  it("preserves double quotes (textContent does not escape them)", () => {
    expect(escHTML('say "hello"')).toBe('say "hello"');
  });

  it("does not modify plain text", () => {
    expect(escHTML("hello world")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(escHTML("")).toBe("");
  });

  it("handles Chinese text", () => {
    expect(escHTML("你好世界")).toBe("你好世界");
  });

  it("escapes mixed content with <, >, and &", () => {
    expect(escHTML("<a href='x' & y>")).toBe("&lt;a href='x' &amp; y&gt;");
  });
});
