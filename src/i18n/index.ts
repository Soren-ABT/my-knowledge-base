import type { UIStrings } from "./types";

export type { UIStrings } from "./types";

/** Replace {key} placeholders with values from params. */
export function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`));
}

/** Get strings for a locale. Use with top-level await in Astro frontmatter. */
export async function getStrings(lang: string): Promise<UIStrings> {
  switch (lang) {
    case "en":
      return (await import("./en")).default;
    case "zh-CN":
    default:
      return (await import("./zh-CN")).default;
  }
}

/** Static import for when you know the locale at build time. */
export { default as zhCN } from "./zh-CN";
export { default as en } from "./en";
