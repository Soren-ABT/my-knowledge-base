export interface VolumeSliderConfig {
  sliderEl: HTMLElement;
  fillEl: HTMLElement | null;
  onVolumeChange: (volume: number) => void;
}

export interface VolumeSliderInstance {
  destroy: () => void;
}

export function createVolumeSlider(config: VolumeSliderConfig): VolumeSliderInstance {
  const { sliderEl, fillEl, onVolumeChange } = config;

  function updateFromClientX(clientX: number): void {
    const rect = sliderEl.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    if (fillEl) fillEl.style.width = pct * 100 + "%";
    onVolumeChange(pct);
  }

  // Mouse
  function onMouseDown(e: MouseEvent): void {
    e.preventDefault();
    sliderEl._volDragging = true;
    sliderEl.classList.add("dragging");
    updateFromClientX(e.clientX);
  }

  function onMouseMove(e: MouseEvent): void {
    if (!sliderEl._volDragging) return;
    updateFromClientX(e.clientX);
  }

  function onMouseUp(): void {
    sliderEl._volDragging = false;
    sliderEl.classList.remove("dragging");
  }

  // Touch
  function onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    sliderEl._volDragging = true;
    sliderEl.classList.add("dragging");
    updateFromClientX(e.touches[0].clientX);
  }

  function onTouchMove(e: TouchEvent): void {
    if (!sliderEl._volDragging) return;
    updateFromClientX(e.touches[0].clientX);
  }

  function onTouchEnd(): void {
    sliderEl._volDragging = false;
    sliderEl.classList.remove("dragging");
  }

  sliderEl.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
  sliderEl.addEventListener("touchstart", onTouchStart, { passive: false });
  document.addEventListener("touchmove", onTouchMove);
  document.addEventListener("touchend", onTouchEnd);

  return {
    destroy() {
      sliderEl.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      sliderEl.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    },
  };
}

declare global {
  interface HTMLElement {
    _volDragging?: boolean;
  }
}
