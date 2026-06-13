import { describe, it, expect, vi } from "vitest";
import { createPubSub } from "./pubsub";

describe("createPubSub", () => {
  it("calls subscriber with initial state", () => {
    const { subscribe } = createPubSub(() => ({ count: 42 }));
    const fn = vi.fn();
    subscribe(fn);
    expect(fn).toHaveBeenCalledWith({ count: 42 });
  });

  it("returns unsubscribe function", () => {
    const state = { count: 0 };
    const { subscribe, broadcast } = createPubSub(() => state);
    const fn = vi.fn();
    const unsub = subscribe(fn);
    fn.mockClear(); // clear initial state push
    unsub();
    state.count = 1;
    broadcast();
    expect(fn).not.toHaveBeenCalled();
  });

  it("broadcasts to all subscribers", () => {
    const state = { count: 0 };
    const { subscribe, broadcast } = createPubSub(() => state);
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    fn1.mockClear();
    fn2.mockClear();
    subscribe(fn1);
    subscribe(fn2);
    state.count = 5;
    broadcast();
    expect(fn1).toHaveBeenCalledWith({ count: 5 });
    expect(fn2).toHaveBeenCalledWith({ count: 5 });
  });

  it("returns correct listener count", () => {
    const { subscribe, getListenerCount } = createPubSub(() => ({}));
    expect(getListenerCount()).toBe(0);
    const unsub = subscribe(vi.fn());
    expect(getListenerCount()).toBe(1);
    unsub();
    expect(getListenerCount()).toBe(0);
  });

  it("broadcast clones state (listener cannot mutate original)", () => {
    const state = { count: 0 };
    const { subscribe, broadcast } = createPubSub(() => state);
    const fn = vi.fn((s: { count: number }) => {
      s.count = 999;
    });
    subscribe(fn);
    expect(state.count).toBe(0); // original unchanged by subscribe
    broadcast();
    expect(state.count).toBe(0); // original unchanged by broadcast
  });

  it("handles listener errors gracefully", () => {
    const { subscribe, broadcast } = createPubSub(() => ({ x: 1 }));
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    subscribe(bad);
    subscribe(good);
    expect(() => broadcast()).not.toThrow();
    expect(good).toHaveBeenCalled();
  });
});
