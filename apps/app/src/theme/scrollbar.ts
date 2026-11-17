import { useEffect } from 'react';
import { Platform } from 'react-native';

const STYLE_ID = 'memory-journal-scrollbar';

/** The colours of the scrollbar, all taken from the active palette (section 17.4). */
export interface ScrollbarColors {
  /** Track and corner: the page background. */
  track: string;
  /** Top (or left) end of the thumb gradient: `neonViolet`. */
  from: string;
  /** Bottom (or right) end of the thumb gradient: `neonBlue`. */
  to: string;
  /** The brighter end the thumb moves to while hovered: `neonCyan`. */
  hover: string;
}

/**
 * The style rules that colour every scrollbar to match the theme. The thumb is a rounded pill:
 * a gradient with a border in the track colour, so a 3 px inset shows around it. Browsers that
 * cannot style `::-webkit-scrollbar` get a thin scrollbar in the same colours instead. That
 * fallback sits behind `@supports not selector(...)` because browsers that know the standard
 * `scrollbar-color` ignore `::-webkit-scrollbar` altogether, which would lose the gradient.
 */
export function scrollbarCss({ track, from, to, hover }: ScrollbarColors): string {
  const thumb = (end: string, angle: number) =>
    [
      `  background: linear-gradient(${angle}deg, ${from}, ${end});`,
      `  border: 3px solid ${track};`,
      '  border-radius: 999px;',
      '  background-clip: padding-box;',
    ].join('\n');

  return [
    '*::-webkit-scrollbar {',
    '  width: 12px;',
    '  height: 12px;',
    `  background: ${track};`,
    '}',
    '*::-webkit-scrollbar-track {',
    `  background: ${track};`,
    '}',
    '*::-webkit-scrollbar-corner {',
    `  background: ${track};`,
    '}',
    '*::-webkit-scrollbar-thumb:vertical {',
    thumb(to, 180),
    '}',
    '*::-webkit-scrollbar-thumb:horizontal {',
    thumb(to, 90),
    '}',
    '*::-webkit-scrollbar-thumb:vertical:hover {',
    thumb(hover, 180),
    '}',
    '*::-webkit-scrollbar-thumb:horizontal:hover {',
    thumb(hover, 90),
    '}',
    '@supports not selector(::-webkit-scrollbar) {',
    '  * {',
    '    scrollbar-width: thin;',
    `    scrollbar-color: ${to} ${track};`,
    '  }',
    '}',
  ].join('\n');
}

/**
 * Themes the scrollbars of the web build, also inside Electron, and puts the rules in again
 * whenever the colours change (a new theme). Does nothing on phones, where the system scrollbar
 * is already a thin overlay.
 */
export function useScrollbarTheme(colors: ScrollbarColors): void {
  const { track, from, to, hover } = colors;
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return undefined;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = scrollbarCss({ track, from, to, hover });
    document.head.appendChild(style);
    return () => style.remove();
  }, [track, from, to, hover]);
}
