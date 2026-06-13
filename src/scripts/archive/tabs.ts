export function switchArchiveView(viewName: string): void {
  document.querySelectorAll<HTMLElement>(".archive-tab").forEach((btn) => {
    const isActive = btn.dataset.view === viewName;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });
  document.querySelectorAll<HTMLElement>(".archive-view").forEach((view) => {
    view.classList.toggle("active", view.id === `archive-view-${viewName}`);
  });
  try {
    localStorage.setItem("archive-view", viewName);
  } catch {
    /* noop */
  }
}

export function bindTabHandlers(): void {
  document.querySelectorAll<HTMLElement>(".archive-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchArchiveView(btn.dataset.view!));
  });
}

export function restoreSavedView(): void {
  let savedView: string | null = null;
  try {
    savedView = localStorage.getItem("archive-view");
  } catch {
    /* noop */
  }
  if (savedView === "river") switchArchiveView("river");
}
