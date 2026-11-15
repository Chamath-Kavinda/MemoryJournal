import { create } from 'zustand';

interface TagErrorState {
  message: string | null;
  report: (message: string) => void;
  clear: () => void;
}

/**
 * Tag writes are not awaited by the screens: Firestore shows the change at once and
 * confirms it later (or never, while offline). A write the server refuses is reported
 * here and shown as a banner on the Tags screen.
 */
export const useTagErrorStore = create<TagErrorState>((set) => ({
  message: null,
  report: (message) => set({ message }),
  clear: () => set({ message: null }),
}));

/** Starts watching a write without waiting for it. */
export function watchWrite(write: Promise<unknown>, message: string): void {
  write.catch(() => useTagErrorStore.getState().report(message));
}
