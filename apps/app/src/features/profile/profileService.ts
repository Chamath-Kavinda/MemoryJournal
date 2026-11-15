import { createInitialProfile, utcOffsetMinutesForZone, zoneUpdate } from '@memory-journal/core';
import type { User } from 'firebase/auth';
import { Timestamp, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

import { isDeletionInProgress } from '@/features/settings/deletionState';
import { getFirebase } from '@/lib/firebase';

export type ProfileSyncResult = 'created' | 'updated' | 'unchanged' | 'unavailable';

export function deviceZone(nowMs: number): { timeZone: string; utcOffsetMinutes: number } {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return { timeZone, utcOffsetMinutes: utcOffsetMinutesForZone(timeZone, nowMs) };
}

/**
 * Makes sure `users/{uid}` exists and that its stored time zone and UTC offset match
 * this device. The offset is what the Firestore rules use for the 21:00 unlock, so it
 * is refreshed on every start and when the app returns to the foreground.
 * Returns 'unavailable' when Firestore cannot be reached; the next call retries. It also
 * returns 'unavailable', and writes nothing, while the account is being deleted (D-034).
 */
export async function syncUserProfile(
  user: Pick<User, 'uid' | 'displayName' | 'email'>,
  nowMs: number = Date.now(),
): Promise<ProfileSyncResult> {
  if (isDeletionInProgress()) return 'unavailable';
  const zone = deviceZone(nowMs);
  const ref = doc(getFirebase().db, 'users', user.uid);

  try {
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      const profile = createInitialProfile({
        displayName: user.displayName,
        email: user.email,
        nowMs,
        ...zone,
      });
      await setDoc(ref, { ...profile, createdAt: Timestamp.fromMillis(profile.createdAt) });
      return 'created';
    }

    const stored = snapshot.data() as { timeZone?: string; utcOffsetMinutes?: number };
    const patch = zoneUpdate(
      { timeZone: stored.timeZone ?? '', utcOffsetMinutes: stored.utcOffsetMinutes ?? Number.NaN },
      zone,
    );
    if (!patch) return 'unchanged';
    await updateDoc(ref, patch);
    return 'updated';
  } catch {
    return 'unavailable';
  }
}
