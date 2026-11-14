import { correctedNow, formatCountdown, serverOffsetMs } from './clock';

describe('serverOffsetMs', () => {
  it('is positive when the device clock is behind the server', () => {
    // Request took 200 ms, so the server stamped at device time 10_100.
    expect(serverOffsetMs(70_100, 10_000, 10_200)).toBe(60_000);
  });

  it('is negative when the device clock is ahead', () => {
    expect(serverOffsetMs(10_100, 70_000, 70_200)).toBe(-60_000);
  });

  it('is zero when the clocks agree', () => {
    expect(serverOffsetMs(10_100, 10_000, 10_200)).toBe(0);
  });

  it('rounds to whole milliseconds', () => {
    expect(serverOffsetMs(1_000, 0, 1)).toBe(1_000);
  });
});

describe('correctedNow', () => {
  it('adds the offset to the device time', () => {
    expect(correctedNow(1_000, 60_000)).toBe(61_000);
    expect(correctedNow(61_000, -60_000)).toBe(1_000);
  });
});

describe('formatCountdown', () => {
  it('formats hours, minutes and seconds', () => {
    expect(formatCountdown(3 * 3_600_000 + 12 * 60_000 + 45_000)).toBe('3:12:45');
    expect(formatCountdown(9_000)).toBe('0:00:09');
  });

  it('rounds partial seconds up', () => {
    expect(formatCountdown(1)).toBe('0:00:01');
    expect(formatCountdown(59_001)).toBe('0:01:00');
  });

  it('never goes below zero', () => {
    expect(formatCountdown(0)).toBe('0:00:00');
    expect(formatCountdown(-5_000)).toBe('0:00:00');
  });
});
