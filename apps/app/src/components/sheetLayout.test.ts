import { sheetLayoutFor, type SheetLayoutInput } from './sheetLayout';

const PHONE: SheetLayoutInput = {
  width: 360,
  height: 640,
  insets: { top: 24, bottom: 48, left: 0, right: 0 },
  keyboard: 0,
  kind: 'sheet',
};

describe('sheetLayoutFor', () => {
  it('is a bottom sheet on a phone, with the footer above the system buttons', () => {
    const layout = sheetLayoutFor(PHONE);

    expect(layout.centered).toBe(false);
    // The footer padding is the bottom inset plus 16.
    expect(layout.footerPaddingBottom).toBe(48 + 16);
    // The window height minus the top inset minus 24.
    expect(layout.maxHeight).toBe(640 - 24 - 24);
    expect(layout.outer).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });

  it('adds only 16 when there is no bottom inset', () => {
    const layout = sheetLayoutFor({ ...PHONE, insets: { top: 0, bottom: 0, left: 0, right: 0 } });

    expect(layout.footerPaddingBottom).toBe(16);
  });

  it('lifts the sheet above the keyboard and shrinks the body, keeping the footer in view', () => {
    const layout = sheetLayoutFor({ ...PHONE, keyboard: 300 });

    expect(layout.outer.bottom).toBe(300);
    expect(layout.maxHeight).toBe(640 - 24 - 24 - 300);
    // The keyboard covers the system buttons, so the footer needs only its own padding.
    expect(layout.footerPaddingBottom).toBe(16);
  });

  it('is a centered dialog from 600 wide, at most 480 wide and 80 percent tall', () => {
    const layout = sheetLayoutFor({ ...PHONE, width: 800, height: 1000 });

    expect(layout.centered).toBe(true);
    expect(layout.maxWidth).toBe(480);
    expect(layout.maxHeight).toBe(800);
  });

  it('is a centered dialog on a phone held sideways', () => {
    const layout = sheetLayoutFor({
      ...PHONE,
      width: 560,
      height: 360,
      insets: { top: 0, bottom: 0, left: 48, right: 0 },
    });

    expect(layout.centered).toBe(true);
    expect(layout.maxHeight).toBeLessThanOrEqual(360 * 0.8);
    // The side inset (a camera cut-out or a navigation bar) is kept clear.
    expect(layout.outer.left).toBe(48 + 16);
  });

  it('keeps a confirmation dialog centered on a phone, and lets it set its own width', () => {
    const layout = sheetLayoutFor({ ...PHONE, kind: 'dialog', maxWidth: 420 });

    expect(layout.centered).toBe(true);
    expect(layout.maxWidth).toBe(420);
    // Kept clear of the system buttons by the space around the dialog.
    expect(layout.outer.bottom).toBe(48 + 16);
  });

  it('never gives a negative height', () => {
    const layout = sheetLayoutFor({ ...PHONE, height: 100, keyboard: 400 });

    expect(layout.maxHeight).toBe(0);
  });
});
