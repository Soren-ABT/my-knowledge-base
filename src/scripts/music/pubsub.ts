export type Listener<T> = (state: T) => void;
export type UnsubscribeFn = () => void;

export function createPubSub<T>(getSnapshot: () => T) {
  const listeners = new Set<Listener<T>>();

  function subscribe(fn: Listener<T>): UnsubscribeFn {
    listeners.add(fn);
    // Push initial state to new subscriber (cloned to prevent mutation)
    try {
      fn(deepClone(getSnapshot()));
    } catch {
      // ignore listener errors
    }
    return () => {
      listeners.delete(fn);
    };
  }

  function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  function broadcast() {
    const snap = deepClone(getSnapshot());
    listeners.forEach((fn) => {
      try {
        fn(snap);
      } catch {
        // ignore listener errors
      }
    });
  }

  return { subscribe, broadcast, getListenerCount: () => listeners.size };
}
