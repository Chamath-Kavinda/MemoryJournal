import { createInitialProfile, zoneUpdate } from './profile';

describe('createInitialProfile', () => {
  const base = {
    displayName: 'Chama',
    email: 'chama@example.com',
    timeZone: 'Asia/Colombo',
    utcOffsetMinutes: 330,
    nowMs: 1_700_000_000_000,
  };

  it('stores identity, zone and creation time', () => {
    const profile = createInitialProfile(base);
    expect(profile).toMatchObject({
      displayName: 'Chama',
      email: 'chama@example.com',
      timeZone: 'Asia/Colombo',
      utcOffsetMinutes: 330,
      createdAt: 1_700_000_000_000,
    });
  });

  it('starts with empty stats and the reminder on', () => {
    const profile = createInitialProfile(base);
    expect(profile.stats).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastStreakDay: null,
      freezeCount: 0,
      recallScore: 0,
      scoreUpdatedAt: null,
    });
    expect(profile.settings).toEqual({ reminderEnabled: true, theme: 'dark' });
  });

  it('falls back to empty strings when Google gives no name or email', () => {
    const profile = createInitialProfile({ ...base, displayName: null, email: null });
    expect(profile.displayName).toBe('');
    expect(profile.email).toBe('');
  });
});

describe('zoneUpdate', () => {
  const stored = { timeZone: 'America/New_York', utcOffsetMinutes: -300 };

  it('returns null when nothing changed', () => {
    expect(zoneUpdate(stored, { ...stored })).toBeNull();
  });

  it('returns only the offset after a daylight saving change', () => {
    expect(zoneUpdate(stored, { timeZone: 'America/New_York', utcOffsetMinutes: -240 })).toEqual({
      utcOffsetMinutes: -240,
    });
  });

  it('returns both fields after moving to another zone', () => {
    expect(zoneUpdate(stored, { timeZone: 'Asia/Colombo', utcOffsetMinutes: 330 })).toEqual({
      timeZone: 'Asia/Colombo',
      utcOffsetMinutes: 330,
    });
  });

  it('returns only the name when two zones share an offset', () => {
    expect(zoneUpdate(stored, { timeZone: 'America/Toronto', utcOffsetMinutes: -300 })).toEqual({
      timeZone: 'America/Toronto',
    });
  });
});
