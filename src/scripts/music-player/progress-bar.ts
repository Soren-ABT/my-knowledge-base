export interface ProgressBarConfig {
  barEl: HTMLElement;
  fillEl: HTMLElement | null;
  thumbEl: HTMLElement | null;
  tooltipEl: HTMLElement | null;
  getDuration: () => number;
  onSeek: (time: number) => void;
  formatTime: (seconds: number) => string;
}

export interface ProgressBarInstance {
  destroy: () => void;
}

export function createProgressBar(config: ProgressBarConfig): ProgressBarInstance {
  const { barEl, fillEl, thumbEl, tooltipEl, getDuration, onSeek, formatTime } = config;
  let dragging = false;

  function seekFromEvent(e: MouseEvent | Touch) {
    const rect = barEl.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (thumbEl) thumbEl.style.left = pct * 100 + "%";
    if (fillEl) fillEl.style.width = pct * 100 + "%";
    if (tooltipEl) {
      tooltipEl.textContent = formatTime(pct * getDuration());
      tooltipEl.style.left = pct * 100 + "%";
    }
    onSeek(pct * getDuration());
  }

  function showTooltip(e: MouseEvent) {
    if (!tooltipEl) return;
    const rect = barEl.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    tooltipEl.textContent = formatTime(pct * getDuration());
    tooltipEl.style.left = pct * 100 + "%";
    tooltipEl.hidden = false;
  }

  function hideTooltip() {
    if (!dragging && tooltipEl) tooltipEl.hidden = true;
  }

  function onMouseDown(e: MouseEvent) {
    e.preventDefault();
    dragging = true;
    barEl.classList.add("dragging");
    if (tooltipEl) tooltipEl.hidden = false;
    seekFromEvent(e);
  }

  function onMouseMove(e: MouseEvent) {
    if (dragging) seekFromEvent(e);
    else if (barEl.matches(":hover")) showTooltip(e);
  }

  function onMouseUp() {
    if (dragging) {
      dragging = false;
      barEl.classList.remove("dragging");
      hideTooltip();
    }
  }

  function onTouchStart(e: TouchEvent) {
    e.preventDefault();
    dragging = true;
    barEl.classList.add("dragging");
    if (tooltipEl) tooltipEl.hidden = false;
    seekFromEvent(e.touches[0]);
  }

  function onTouchMove(e: TouchEvent) {
    if (dragging) seekFromEvent(e.touches[0]);
  }

  function onTouchEnd() {
    if (dragging) {
      dragging = false;
      barEl.classList.remove("dragging");
      hideTooltip();
    }
  }

  function onMouseEnter(e: MouseEvent) {
    showTooltip(e);
  }

  function onMouseLeave() {
    hideTooltip();
  }

  barEl.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  barEl.addEventListener("touchstart", onTouchStart, { passive: false });
  document.addEventListener("touchmove", onTouchMove);
  document.addEventListener("touchend", onTouchEnd);
  barEl.addEventListener("mouseenter", onMouseEnter);
  barEl.addEventListener("mouseleave", onMouseLeave);

  return {
    destroy() {
      barEl.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      barEl.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      barEl.removeEventListener("mouseenter", onMouseEnter);
      barEl.removeEventListener("mouseleave", onMouseLeave);
    },
  };
}
