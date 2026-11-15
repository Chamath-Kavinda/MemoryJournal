import { isBackShortcut, shortcutIndex, shortcutLabel, type KeyLike } from './shortcuts';

function key(code: string, modifiers: Partial<KeyLike> = {}): KeyLike {
  return { code, altKey: true, ctrlKey: false, metaKey: false, shiftKey: false, ...modifiers };
}

describe('shortcutIndex', () => {
  it('maps Alt+1 to the first item and Alt+6 to the sixth', () => {
    expect(shortcutIndex(key('Digit1'), 6)).toBe(0);
    expect(shortcutIndex(key('Digit6'), 6)).toBe(5);
  });

  it('ignores numbers beyond the items', () => {
    expect(shortcutIndex(key('Digit7'), 6)).toBeNull();
  });

  it('needs Alt and nothing else', () => {
    expect(shortcutIndex(key('Digit1', { altKey: false }), 6)).toBeNull();
    expect(shortcutIndex(key('Digit1', { ctrlKey: true }), 6)).toBeNull();
    expect(shortcutIndex(key('Digit1', { metaKey: true }), 6)).toBeNull();
    expect(shortcutIndex(key('Digit1', { shiftKey: true }), 6)).toBeNull();
  });

  it('ignores zero, letters and the numpad', () => {
    expect(shortcutIndex(key('Digit0'), 6)).toBeNull();
    expect(shortcutIndex(key('KeyA'), 6)).toBeNull();
    expect(shortcutIndex(key('Numpad1'), 6)).toBeNull();
  });
});

describe('shortcutLabel', () => {
  it('names the shortcut of an item', () => {
    expect(shortcutLabel(0)).toBe('Alt+1');
    expect(shortcutLabel(5)).toBe('Alt+6');
  });

  it('has no label beyond the ninth item', () => {
    expect(shortcutLabel(9)).toBe('');
  });
});

describe('isBackShortcut', () => {
  const idle = { typing: false, dialogOpen: false };

  it('treats Alt+Left as Back', () => {
    expect(isBackShortcut(key('ArrowLeft'), idle)).toBe(true);
  });

  it('treats Esc as Back when nothing else is using it', () => {
    expect(isBackShortcut(key('Escape', { altKey: false }), idle)).toBe(true);
  });

  it('leaves Esc to a text field while the person is typing', () => {
    expect(isBackShortcut(key('Escape', { altKey: false }), { ...idle, typing: true })).toBe(false);
  });

  it('leaves Esc to an open dialog, where it means Cancel', () => {
    expect(isBackShortcut(key('Escape', { altKey: false }), { ...idle, dialogOpen: true })).toBe(
      false,
    );
  });

  it('ignores Left without Alt, and Alt+Left with another modifier', () => {
    expect(isBackShortcut(key('ArrowLeft', { altKey: false }), idle)).toBe(false);
    expect(isBackShortcut(key('ArrowLeft', { ctrlKey: true }), idle)).toBe(false);
    expect(isBackShortcut(key('ArrowLeft', { shiftKey: true }), idle)).toBe(false);
  });

  it('ignores other keys', () => {
    expect(isBackShortcut(key('KeyA'), idle)).toBe(false);
    expect(isBackShortcut(key('Enter', { altKey: false }), idle)).toBe(false);
  });
});
