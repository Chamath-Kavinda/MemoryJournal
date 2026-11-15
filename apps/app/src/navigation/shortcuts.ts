import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/** The parts of a keyboard event the shortcuts look at, so they can be tested without a browser. */
export interface KeyLike {
  code: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

/**
 * Alt+1 to Alt+9 pick the first nine navigation items. Returns the item's index, or null for
 * any other key, any extra modifier, or a number beyond the items. The physical key (`code`)
 * is used so the shortcut works on every keyboard layout, and the numpad is left alone because
 * Alt plus numpad digits types characters on Windows.
 */
export function shortcutIndex(event: KeyLike, itemCount: number): number | null {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null;
  const match = /^Digit([1-9])$/.exec(event.code);
  if (!match) return null;
  const index = Number(match[1]) - 1;
  return index < itemCount ? index : null;
}

/** The text shown next to an item, or an empty string for an item without a shortcut. */
export function shortcutLabel(index: number): string {
  return index >= 0 && index < 9 ? `Alt+${index + 1}` : '';
}

/** True where a keyboard is the normal way to move around (the web build, so also Electron). */
export const HAS_KEYBOARD_SHORTCUTS = Platform.OS === 'web';

/**
 * Listens for the navigation shortcuts on the web build and calls `onSelect` with the item
 * index. Does nothing on phones, or while `enabled` is false (for example when signed out).
 */
export function useNavShortcuts(
  itemCount: number,
  onSelect: (index: number) => void,
  enabled: boolean,
): void {
  const latest = useRef(onSelect);
  latest.current = onSelect;

  useEffect(() => {
    if (!enabled || Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const index = shortcutIndex(event, itemCount);
      if (index === null) return;
      event.preventDefault();
      latest.current(index);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled, itemCount]);
}
