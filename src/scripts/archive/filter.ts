export function applyArchiveFilter(): void {
  const params = new URLSearchParams(window.location.search);
  const filterTags = params.getAll("tag");
  const filterCategory = params.get("category");
  if (filterTags.length === 0 && !filterCategory) return;

  document.querySelectorAll<HTMLElement>(".archive-post-item, .river-card-v2").forEach((el) => {
    const elTags = (el.dataset.tags || "").split(",").filter(Boolean);
    const elCat = el.dataset.category || "";
    const tagOk = filterTags.length === 0 || filterTags.some((t) => elTags.includes(t));
    const catOk = !filterCategory || elCat === filterCategory;
    el.style.display = tagOk && catOk ? "" : "none";
  });

  document
    .querySelectorAll<HTMLElement>(".archive-year-section, .river-year-block")
    .forEach((section) => {
      const hasVisible = section.querySelector<HTMLElement>(
        '.archive-post-item:not([style*="display: none"]), .river-card-v2:not([style*="display: none"])',
      );
      if (!hasVisible) section.style.display = "none";
    });
}
