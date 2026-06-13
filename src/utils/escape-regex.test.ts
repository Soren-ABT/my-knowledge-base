import { describe, it, expect } from "vitest";
import { escapeRegex } from "./escape-regex";

describe("escapeRegex", () => {
  it("escapes regex special characters", () => {
    expect(escapeRegex(".*+?^${}()|[]\\")).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
  });

  it("returns empty string for empty input", () => {
    expect(escapeRegex("")).toBe("");
  });

  it("does not modify plain text", () => {
    expect(escapeRegex("hello world")).toBe("hello world");
  });

  it("escapes Chinese text with special chars", () => {
    expect(escapeRegex("你好 (世界) [测试]")).toBe("你好 \\(世界\\) \\[测试\\]");
  });

  it("escapes each special character individually", () => {
    expect(escapeRegex("[abc]")).toBe("\\[abc\\]");
    expect(escapeRegex("a+b")).toBe("a\\+b");
    expect(escapeRegex("a|b")).toBe("a\\|b");
  });
});
