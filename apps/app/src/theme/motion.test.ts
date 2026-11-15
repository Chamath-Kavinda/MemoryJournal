import {
  DURATION,
  EASE_IN,
  EASE_OUT,
  MAX_LOOPS,
  POP_SCALE,
  PRESS_SCALE,
  SPRING,
  STAGGER_MAX_ITEMS,
  STAGGER_STEP,
  staggerDelay,
} from './motion';

describe('motion tokens', () => {
  it('uses the durations of section 15.16', () => {
    expect(DURATION).toEqual({ reduced: 100, fast: 150, base: 250, slow: 400, hero: 900 });
  });

  it('keeps everyday transitions between 150 and 250 ms', () => {
    expect(DURATION.fast).toBeGreaterThanOrEqual(150);
    expect(DURATION.base).toBeLessThanOrEqual(250);
  });

  it('uses the shared spring and the press and pop scales', () => {
    expect(SPRING).toEqual({ damping: 15, stiffness: 180 });
    expect(PRESS_SCALE).toBe(0.97);
    expect(POP_SCALE).toBe(1.2);
  });

  it('describes ease-out as decelerating and ease-in as accelerating', () => {
    // Ease-out ends with a flat approach (the last control point has y = 1).
    expect(EASE_OUT[3]).toBe(1);
    // Ease-in starts slowly (the first control point has y = 0).
    expect(EASE_IN[1]).toBe(0);
  });

  it('allows at most two looping animations', () => {
    expect(MAX_LOOPS).toBe(2);
  });
});

describe('staggerDelay', () => {
  it('starts at zero and steps by 50 ms', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(1)).toBe(STAGGER_STEP);
    expect(staggerDelay(3)).toBe(150);
  });

  it('staggers at most 8 items and shows the rest together with the eighth', () => {
    const last = (STAGGER_MAX_ITEMS - 1) * STAGGER_STEP;
    expect(staggerDelay(STAGGER_MAX_ITEMS - 1)).toBe(last);
    expect(staggerDelay(STAGGER_MAX_ITEMS)).toBe(last);
    expect(staggerDelay(500)).toBe(last);
  });

  it('treats a negative, fractional or invalid index safely', () => {
    expect(staggerDelay(-4)).toBe(0);
    expect(staggerDelay(2.9)).toBe(100);
    expect(staggerDelay(Number.NaN)).toBe(0);
  });
});
