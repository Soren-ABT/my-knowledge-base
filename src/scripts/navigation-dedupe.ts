/**
 * Client-side navigation deduplication (CiaLli pattern).
 * Prevents ClientRouter from triggering redundant navigations to the same URL.
 */
export function shouldIgnoreSamePageNavigation(
  to: string,
  currentPath: string,
): boolean {
  try {
    const target = new URL(to, location.origin);
    const current = new URL(currentPath, location.origin);

    return (
      target.pathname === current.pathname &&
      target.search === current.search &&
      target.hash === current.hash &&
      target.origin === location.origin
    );
  } catch {
    return false;
  }
}

export function initNavigationDedupe(): void {
  document.addEventListener('click', (e) => {
    const link = (e.target as Element).closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Skip: hash-only links (native scroll), download links, external links
    if (href.startsWith('#')) return;
    if (link.hasAttribute('download')) return;
    if (link.target === '_blank') return;
    if (link.getAttribute('rel')?.includes('external')) return;

    if (shouldIgnoreSamePageNavigation(href, location.pathname + location.search + location.hash)) {
      e.preventDefault();
      e.stopPropagation();
    }
  });
}
