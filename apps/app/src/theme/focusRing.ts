import { useEffect } from 'react';
import { Platform } from 'react-native';

const STYLE_ID = 'memory-journal-focus-ring';

/**
 * The style rule that outlines whatever has keyboard focus. `:focus-visible` shows the ring for
 * keyboard users only, so a mouse click does not leave one behind. `!important` is needed
 * because the web build removes the outline of text fields with an inline style.
 */
export function focusRingCss(color: string): string {
  return [
    '[tabindex]:focus-visible,',
    'a:focus-visible,',
    'button:focus-visible,',
    'input:focus-visible,',
    'textarea:focus-visible {',
    `  outline: 2px solid ${color} !important;`,
    '  outline-offset: 2px;',
    '}',
  ].join('\n');
}

/** Puts the focus ring on the web build (also inside Electron). Does nothing on phones. */
export function useFocusRing(color: string): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = focusRingCss(color);
    document.head.appendChild(style);
    return () => style.remove();
  }, [color]);
}
