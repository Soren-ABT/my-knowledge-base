class TypewriterEffect {
  private el: HTMLElement;
  private texts: string[];
  private speed: number;
  private deleteSpeed: number;
  private pauseTime: number;
  private currentIndex = 0;
  private charIndex = 0;
  private isDeleting = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  constructor(el: HTMLElement) {
    this.el = el;
    this.texts = JSON.parse(el.dataset.text || "[]");
    this.speed = parseInt(el.dataset.speed || "80");
    this.deleteSpeed = parseInt(el.dataset.deleteSpeed || "40");
    this.pauseTime = parseInt(el.dataset.pauseTime || "2000");
    this.start();
  }

  private type(): void {
    if (this.destroyed) return;
    const current = this.texts[this.currentIndex];
    if (this.isDeleting) {
      this.charIndex--;
      this.el.textContent = current.substring(0, this.charIndex);
      if (this.charIndex <= 0) {
        this.isDeleting = false;
        this.currentIndex = (this.currentIndex + 1) % this.texts.length;
        this.timer = setTimeout(() => this.type(), this.speed * 2);
        return;
      }
      this.timer = setTimeout(() => this.type(), this.deleteSpeed);
      return;
    }

    this.charIndex++;
    this.el.textContent = current.substring(0, this.charIndex);
    if (this.charIndex >= current.length) {
      if (this.texts.length > 1) {
        this.timer = setTimeout(() => {
          this.isDeleting = true;
          this.type();
        }, this.pauseTime);
      }
      return;
    }
    this.timer = setTimeout(() => this.type(), this.speed);
  }

  start(): void {
    if (!this.texts.length) return;
    this.currentIndex = 0;
    this.charIndex = 0;
    this.isDeleting = false;
    this.type();
  }

  destroy(): void {
    this.destroyed = true;
    if (this.timer) clearTimeout(this.timer);
  }
}

declare global {
  interface HTMLElement {
    _typewriter?: TypewriterEffect;
  }
}

export function initTypewriters(): void {
  document.querySelectorAll<HTMLElement>(".typewriter-text").forEach((el) => {
    if (!el._typewriter) {
      el._typewriter = new TypewriterEffect(el);
    }
  });
}

document.addEventListener("astro:page-load", initTypewriters);
initTypewriters();
