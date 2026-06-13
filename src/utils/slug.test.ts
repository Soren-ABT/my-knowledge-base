import { describe, it, expect } from "vitest";
import { normalizeSlug } from "./slug";

describe("normalizeSlug", () => {
  it("removes .md extension", () => {
    expect(normalizeSlug("posts/hello-world.md")).toBe("posts/hello-world");
  });

  it("removes .mdx extension", () => {
    expect(normalizeSlug("posts/hello-world.mdx")).toBe("posts/hello-world");
  });

  it("removes /index suffix", () => {
    expect(normalizeSlug("posts/hello-world/index")).toBe("posts/hello-world");
  });

  it("handles pure slug with no extension or index", () => {
    expect(normalizeSlug("posts/hello-world")).toBe("posts/hello-world");
  });

  it("handles .md with /index", () => {
    expect(normalizeSlug("posts/hello-world/index.md")).toBe("posts/hello-world");
  });
});
