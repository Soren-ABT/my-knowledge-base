let _dragCleanup: (() => void) | null = null;

export function setupRiverDrag(): void {
  const viewport = document.getElementById("river-viewport");
  if (!viewport) return;

  let isDragging = false;
  let didDrag = false;
  let startX = 0;
  let scrollStart = 0;
  let velocityX = 0;
  let prevX = 0;
  let timestamp = 0;
  let momentumRAF: number | null = null;
  const FRICTION = 0.92;
  const MIN_VELOCITY = 0.5;
  const DRAG_MULTIPLIER = 1.5;

  function startDrag(clientX: number): void {
    isDragging = true;
    didDrag = false;
    startX = clientX;
    scrollStart = viewport!.scrollLeft;
    velocityX = 0;
    prevX = clientX;
    timestamp = performance.now();
    cancelMomentum();
    viewport!.classList.add("dragging");
  }

  function moveDrag(clientX: number): void {
    if (!isDragging) return;
    const now = performance.now();
    const dt = now - timestamp;
    if (dt > 0) velocityX = (clientX - prevX) / dt;
    prevX = clientX;
    timestamp = now;
    const dx = (startX - clientX) * DRAG_MULTIPLIER;
    viewport!.scrollLeft = scrollStart + dx;
    if (Math.abs(clientX - startX) > 3) didDrag = true;
  }

  function endDrag(): void {
    if (!isDragging) return;
    isDragging = false;
    viewport!.classList.remove("dragging");
    startMomentum();
  }

  function startMomentum(): void {
    cancelMomentum();
    if (Math.abs(velocityX) < MIN_VELOCITY) return;
    let lastTime = performance.now();

    function tick(now: number): void {
      const dt = now - lastTime;
      lastTime = now;
      velocityX *= FRICTION;
      if (Math.abs(velocityX) < MIN_VELOCITY) {
        cancelMomentum();
        return;
      }
      viewport!.scrollLeft += velocityX * dt;
      const maxScroll = viewport!.scrollWidth - viewport!.clientWidth;
      viewport!.scrollLeft = Math.max(0, Math.min(maxScroll, viewport!.scrollLeft));
      if (viewport!.scrollLeft <= 0 || viewport!.scrollLeft >= maxScroll) {
        if (Math.abs(velocityX) < MIN_VELOCITY * 2) {
          cancelMomentum();
          return;
        }
      }
      momentumRAF = requestAnimationFrame(tick);
    }
    momentumRAF = requestAnimationFrame(tick);
  }

  function cancelMomentum(): void {
    if (momentumRAF) {
      cancelAnimationFrame(momentumRAF);
      momentumRAF = null;
    }
    velocityX = 0;
  }

  const handleMouseDown = (e: MouseEvent) => startDrag(e.clientX);
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) moveDrag(e.clientX);
  };
  const handleMouseUp = () => {
    if (isDragging) endDrag();
  };
  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 1) startDrag(e.touches[0].clientX);
  };
  const handleTouchMove = (e: TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      e.preventDefault();
      moveDrag(e.touches[0].clientX);
    }
  };
  const handleTouchEnd = () => {
    endDrag();
  };

  viewport.addEventListener("mousedown", handleMouseDown);
  window.addEventListener("mousemove", handleMouseMove);
  window.addEventListener("mouseup", handleMouseUp);
  viewport.addEventListener("touchstart", handleTouchStart, { passive: true });
  viewport.addEventListener("touchmove", handleTouchMove, { passive: false });
  viewport.addEventListener("touchend", handleTouchEnd);

  document.querySelectorAll<HTMLElement>(".river-card-v2").forEach((card) => {
    card.addEventListener("click", function (e) {
      if (didDrag) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  });

  _dragCleanup = () => {
    cancelMomentum();
    viewport.removeEventListener("mousedown", handleMouseDown);
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", handleMouseUp);
    viewport.removeEventListener("touchstart", handleTouchStart);
    viewport.removeEventListener("touchmove", handleTouchMove);
    viewport.removeEventListener("touchend", handleTouchEnd);
  };
}

export function cleanupRiverDrag(): void {
  if (_dragCleanup) {
    _dragCleanup();
    _dragCleanup = null;
  }
}
