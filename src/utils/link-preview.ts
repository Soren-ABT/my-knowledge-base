export function shouldPreview(href: string): boolean {
  if (!href || href.startsWith("http") || href.startsWith("#") || href === "javascript:void(0)")
    return false;
  if (
    href.endsWith(".md") ||
    href.endsWith(".markdown") ||
    href.endsWith(".html") ||
    href.endsWith(".htm")
  )
    return true;
  if (href.indexOf(".") === -1) return true;
  return false;
}

export function resolveUrl(h: string, base?: string): string {
  return new URL(h, base || window.location.href).href;
}
