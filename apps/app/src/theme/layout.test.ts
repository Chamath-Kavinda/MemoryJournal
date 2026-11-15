import { BORDER_WIDTH, ICON_SIZE, RADIUS, SPACING, minTargetFor } from './layout';

describe('layout tokens', () => {
  it('keeps spacing on the 4-point grid (4, 8, 12, 16, 24, 32)', () => {
    expect(Object.values(SPACING)).toEqual([4, 8, 12, 16, 24, 32]);
    for (const value of Object.values(SPACING)) expect(value % 4).toBe(0);
  });

  it('uses radius 12 for inputs and chips, 16 for cards and 24 for sheets', () => {
    expect(RADIUS.input).toBe(12);
    expect(RADIUS.chip).toBe(12);
    expect(RADIUS.card).toBe(16);
    expect(RADIUS.sheet).toBe(24);
    expect(RADIUS.pill).toBeGreaterThanOrEqual(100);
  });

  it('draws borders 1 px wide', () => {
    expect(BORDER_WIDTH).toBe(1);
  });

  it('sizes icons 20 inline, 24 in controls and 40 to 56 in empty states', () => {
    expect(ICON_SIZE.inline).toBe(20);
    expect(ICON_SIZE.control).toBe(24);
    expect(ICON_SIZE.empty).toBeGreaterThanOrEqual(40);
    expect(ICON_SIZE.empty).toBeLessThanOrEqual(56);
  });

  it('asks for touch targets of 44, and 48 on Android', () => {
    expect(minTargetFor('ios')).toBe(44);
    expect(minTargetFor('web')).toBe(44);
    expect(minTargetFor('windows')).toBe(44);
    expect(minTargetFor('android')).toBe(48);
  });
});
