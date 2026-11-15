import { CHECK_INTERVAL_MS, createReminderScheduler } from './reminderScheduler';

/** A UTC instant for a local wall-clock time on the given November 2026 day at the given offset. */
const local = (day: number, hour: number, minute: number, offsetMinutes: number, second = 0) =>
  Date.UTC(2026, 10, day, hour, minute, second) - offsetMinutes * 60_000;

describe('reminder scheduler', () => {
  let nowMs: number;
  let offset: number;
  let notify: jest.Mock;

  const create = () =>
    createReminderScheduler({ now: () => nowMs, utcOffsetMinutes: () => offset, notify });

  /** Moves the clock forward the way real time does, one check interval at a time. */
  const advance = (ms: number) => {
    for (let moved = 0; moved < ms; moved += CHECK_INTERVAL_MS) {
      nowMs += CHECK_INTERVAL_MS;
      jest.advanceTimersByTime(CHECK_INTERVAL_MS);
    }
  };
  const minutes = (n: number) => n * 60_000;
  const hours = (n: number) => n * 3_600_000;

  beforeEach(() => {
    jest.useFakeTimers();
    offset = 330;
    nowMs = local(15, 20, 0, offset);
    notify = jest.fn();
  });

  afterEach(() => jest.useRealTimers());

  it('stays quiet until a reminder is wanted', () => {
    const scheduler = create();
    scheduler.start();

    advance(hours(3));

    expect(notify).not.toHaveBeenCalled();
  });

  it('reminds once at 21:00 and not again the same evening', () => {
    const scheduler = create();
    scheduler.setEnabled(true);
    scheduler.start();

    advance(minutes(59));
    expect(notify).not.toHaveBeenCalled();

    advance(minutes(2));
    expect(notify).toHaveBeenCalledTimes(1);

    advance(hours(2));
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('reminds again the next evening', () => {
    const scheduler = create();
    scheduler.setEnabled(true);
    scheduler.start();

    // 20:00 the next day: the first evening has been reminded, the second has not come yet.
    advance(hours(24));
    expect(notify).toHaveBeenCalledTimes(1);

    advance(hours(2));
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('does not remind at once when switched on after 21:00', () => {
    nowMs = local(15, 21, 30, offset);
    const scheduler = create();
    scheduler.setEnabled(true);
    scheduler.start();

    advance(minutes(10));

    expect(notify).not.toHaveBeenCalled();
  });

  it('still reminds the next evening after being switched on late', () => {
    nowMs = local(15, 21, 30, offset);
    const scheduler = create();
    scheduler.setEnabled(true);
    scheduler.start();

    advance(hours(24));

    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('does not remind while switched off', () => {
    const scheduler = create();
    scheduler.setEnabled(true);
    scheduler.start();
    advance(minutes(30));

    scheduler.setEnabled(false);
    advance(hours(2));

    expect(notify).not.toHaveBeenCalled();
  });

  it('reminds when switched off and on again before 21:00', () => {
    const scheduler = create();
    scheduler.setEnabled(true);
    scheduler.start();
    scheduler.setEnabled(false);
    advance(minutes(10));
    scheduler.setEnabled(true);

    advance(minutes(55));

    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('does not remind again when switched off and on after 21:00', () => {
    const scheduler = create();
    scheduler.setEnabled(true);
    scheduler.start();
    advance(minutes(65));
    expect(notify).toHaveBeenCalledTimes(1);

    scheduler.setEnabled(false);
    scheduler.setEnabled(true);
    advance(minutes(10));

    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('reminds on waking from sleep shortly after 21:00, but only once', () => {
    const scheduler = create();
    scheduler.setEnabled(true);
    scheduler.start();

    nowMs = local(15, 21, 20, offset);
    scheduler.check();
    scheduler.check();

    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('does not remind on waking from sleep long after 21:00', () => {
    const scheduler = create();
    scheduler.setEnabled(true);
    scheduler.start();

    nowMs = local(16, 0, 30, offset);
    scheduler.check();

    expect(notify).not.toHaveBeenCalled();
  });

  it('stops looking at the clock after stop', () => {
    const scheduler = create();
    scheduler.setEnabled(true);
    scheduler.start();
    scheduler.stop();

    advance(hours(3));

    expect(notify).not.toHaveBeenCalled();
  });

  it('does not check twice as often when started twice', () => {
    const scheduler = create();
    scheduler.setEnabled(true);
    scheduler.start();
    scheduler.start();

    advance(hours(2));

    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('follows the device into a new time zone', () => {
    const scheduler = create();
    scheduler.setEnabled(true);
    scheduler.start();
    advance(minutes(30));

    // The device moves to UTC. It is now 14:30 there, so 21:00 is hours away.
    offset = 0;
    advance(minutes(30));
    expect(notify).not.toHaveBeenCalled();

    nowMs = Date.UTC(2026, 10, 15, 20, 59);
    advance(minutes(2));
    expect(notify).toHaveBeenCalledTimes(1);
  });
});
