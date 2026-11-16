import { newId } from './ids';

describe('newId', () => {
  it('makes 20 letters and digits', () => {
    expect(newId()).toMatch(/^[A-Za-z0-9]{20}$/);
  });

  it('does not repeat in practice', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => newId()));
    expect(ids.size).toBe(1000);
  });

  it('stays inside the alphabet at both ends of the random range', () => {
    expect(newId(() => 0)).toBe('A'.repeat(20));
    expect(newId(() => 0.9999999)).toBe('9'.repeat(20));
  });
});
