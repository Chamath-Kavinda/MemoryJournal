import type { EpochMs, UserProfile } from './types';

export interface ZoneInfo {
  timeZone: string;
  utcOffsetMinutes: number;
}

export interface NewProfileInput extends ZoneInfo {
  displayName: string | null;
  email: string | null;
  nowMs: EpochMs;
}

/** The `users/{uid}` document written on first sign-in (documentation section 5.1). */
export function createInitialProfile(input: NewProfileInput): UserProfile {
  return {
    displayName: input.displayName ?? '',
    email: input.email ?? '',
    timeZone: input.timeZone,
    utcOffsetMinutes: input.utcOffsetMinutes,
    createdAt: input.nowMs,
    stats: {
      currentStreak: 0,
      longestStreak: 0,
      lastStreakDay: null,
      freezeCount: 0,
      recallScore: 0,
      scoreUpdatedAt: null,
    },
    settings: {
      reminderEnabled: true,
      theme: 'system',
    },
  };
}

/**
 * The fields to update when the device time zone or offset no longer matches the
 * stored profile (travel, daylight saving). Returns null when nothing changed.
 * The offset matters because the Firestore rules use it to decide when today unlocks.
 */
export function zoneUpdate(stored: ZoneInfo, current: ZoneInfo): Partial<ZoneInfo> | null {
  const patch: Partial<ZoneInfo> = {};
  if (stored.timeZone !== current.timeZone) patch.timeZone = current.timeZone;
  if (stored.utcOffsetMinutes !== current.utcOffsetMinutes) {
    patch.utcOffsetMinutes = current.utcOffsetMinutes;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}
