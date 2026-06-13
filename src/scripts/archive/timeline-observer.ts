let _ringObserver: IntersectionObserver | null = null;

export function setupRingObserver(): void {
  _ringObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        (entry.target as HTMLElement).classList.toggle("in-view", entry.isIntersecting);
      });
    },
    { rootMargin: "-80px 0px" },
  );

  document
    .querySelectorAll<HTMLElement>(".archive-year-section")
    .forEach((s) => _ringObserver!.observe(s));
}

export function cleanupRingObserver(): void {
  if (_ringObserver) {
    _ringObserver.disconnect();
    _ringObserver = null;
  }
}
