import type { KeyValueStorage } from '@/features/day/draftStore';

/** An in-memory stand-in for AsyncStorage. `failNext` makes the next call reject, once. */
export function createMemoryStorage(initial: Record<string, string> = {}): KeyValueStorage & {
  data: Map<string, string>;
  failNext: (operation: 'getItem' | 'setItem' | 'removeItem') => void;
} {
  const data = new Map(Object.entries(initial));
  const failures = new Set<string>();

  function check(operation: string): void {
    if (failures.delete(operation)) throw new Error(`${operation} failed`);
  }

  return {
    data,
    failNext: (operation) => failures.add(operation),
    getItem: async (key) => {
      check('getItem');
      return data.get(key) ?? null;
    },
    setItem: async (key, value) => {
      check('setItem');
      data.set(key, value);
    },
    removeItem: async (key) => {
      check('removeItem');
      data.delete(key);
    },
  };
}
