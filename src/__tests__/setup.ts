/// <reference types="vitest/globals" />
import { vi } from "vitest";

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
(globalThis as any).IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: "",
  thresholds: [],
  takeRecords: vi.fn(),
}));

// Mock requestAnimationFrame
let rafId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();
(globalThis as any).requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
  const id = ++rafId;
  rafCallbacks.set(id, cb);
  return id;
});
(globalThis as any).cancelAnimationFrame = vi.fn((id: number) => {
  rafCallbacks.delete(id);
});

// Mock localStorage
const store = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    store.delete(key);
  }),
  clear: vi.fn(() => {
    store.clear();
  }),
  get length() {
    return store.size;
  },
  key: vi.fn((index: number) => [...store.keys()][index] ?? null),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock getComputedStyle
const computedStyleStore = new Map<Element, CSSStyleDeclaration>();
(globalThis as any).getComputedStyle = vi.fn((el: Element) => {
  return computedStyleStore.get(el) || {};
});

// Clear all mocks before each test
beforeEach(() => {
  store.clear();
  rafId = 0;
  rafCallbacks.clear();
  computedStyleStore.clear();
});
