export function normalizeSlug(id: string): string {
  return id.replace(/\.(md|mdx)$/, "").replace(/\/index$/, "");
}
