import { SPACING } from '@/theme/layout';
import { LANDSCAPE_MAX_HEIGHT, MEDIUM_BREAKPOINT } from '@/theme/sizeClass';

/** The gap kept between a bottom sheet and the top of the window (v0.2.5, section 7.1). */
export const SHEET_TOP_GAP = 24;

/** Widest a centered sheet grows (v0.2.5, section 7.1). */
export const DIALOG_MAX_WIDTH = 480;

/** Share of the window height a centered dialog may use (v0.2.5, section 7.1). */
export const DIALOG_MAX_HEIGHT_SHARE = 0.8;

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type SheetKind = 'sheet' | 'dialog';

export interface SheetLayoutInput {
  width: number;
  height: number;
  /** The safe area of the window the sheet is drawn in. */
  insets: Insets;
  /** Height of the on-screen keyboard, 0 when it is closed. */
  keyboard: number;
  /**
   * `sheet` is a bottom sheet on a phone and a centered dialog from 600 wide or in landscape.
   * `dialog` is always centered, for confirmations.
   */
  kind: SheetKind;
  /** Overrides the widest the centered dialog grows. */
  maxWidth?: number;
}

export interface SheetLayout {
  centered: boolean;
  maxWidth: number | undefined;
  maxHeight: number;
  /** Space around the panel inside the window: the safe area, and the keyboard when it is open. */
  outer: Insets;
  /** Space under the footer buttons. Always clear of the system buttons. */
  footerPaddingBottom: number;
}

/**
 * Where the panel of a sheet or dialog sits and how tall it may grow (v0.2.5, sections 7.1 and
 * 7.3). It looks only at the window, the safe area and the keyboard, so it works the same on
 * every phone, in landscape and on a resized desktop window.
 *
 * The footer sits above the bottom safe area, or above the keyboard when that is open, so a
 * button is never drawn under a system button. The body is what shrinks and scrolls.
 */
export function sheetLayoutFor({
  width,
  height,
  insets,
  keyboard,
  kind,
  maxWidth,
}: SheetLayoutInput): SheetLayout {
  const keyboardOpen = keyboard > 0;
  const centered = kind === 'dialog' || width >= MEDIUM_BREAKPOINT || height < LANDSCAPE_MAX_HEIGHT;

  if (centered) {
    const outer: Insets = {
      top: insets.top + SPACING.lg,
      bottom: (keyboardOpen ? keyboard : insets.bottom) + SPACING.lg,
      left: insets.left + SPACING.lg,
      right: insets.right + SPACING.lg,
    };
    const room = height - outer.top - outer.bottom;
    return {
      centered,
      maxWidth: maxWidth ?? DIALOG_MAX_WIDTH,
      maxHeight: Math.max(0, Math.min(height * DIALOG_MAX_HEIGHT_SHARE, room)),
      outer,
      footerPaddingBottom: SPACING.lg,
    };
  }

  const lift = keyboardOpen ? keyboard : 0;
  return {
    centered,
    maxWidth: undefined,
    maxHeight: Math.max(0, height - insets.top - SHEET_TOP_GAP - lift),
    outer: { top: 0, bottom: lift, left: 0, right: 0 },
    footerPaddingBottom: keyboardOpen ? SPACING.lg : insets.bottom + SPACING.lg,
  };
}
