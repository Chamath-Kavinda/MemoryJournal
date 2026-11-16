import {
  correctedNow,
  getDayAccess,
  getGuestDayAccess,
  isValidDayId,
  nextLastSeenAt,
  type DayId,
  type EpochMs,
  type GuestDayAccess,
} from '@memory-journal/core';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '@/features/auth/authStore';
import { deviceZone } from '@/features/profile/profileService';
import { getFirebase } from '@/lib/firebase';
import { useJournalRepository } from '@/lib/journal';

import { latestSeenAt, recordSeen } from './guestClock';
import { measureServerOffset } from './serverClock';

/**
 * The lock state of a day, kept live. Returns null for an invalid day id.
 *
 * Signed in: it uses the UTC offset stored on the profile (the same value the Firestore rules
 * use) and the device clock moved onto server time, so changing the phone clock does not
 * unlock today. The rules remain the real guard; this keeps the screen honest and drives the
 * countdown.
 *
 * Guest: there is no server, so the device clock is used with a backwards-clock guard (section
 * 15.6). The latest time ever seen is remembered, and if the clock is more than five minutes
 * behind it, today stays closed with the `clockWrong` state. A guest never calls Firebase.
 */
export function useDayAccess(dayId: DayId): GuestDayAccess | null {
  const uid = useAuthStore((s) => s.user?.uid);
  const repository = useJournalRepository();
  const [storedOffset, setStoredOffset] = useState<number | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [deviceNow, setDeviceNow] = useState(() => Date.now());
  const [lastSeenAt, setLastSeenAt] = useState<EpochMs | null>(latestSeenAt);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(getFirebase().db, 'users', uid),
      (snapshot) => {
        const value = snapshot.get('utcOffsetMinutes') as unknown;
        if (typeof value === 'number') setStoredOffset(value);
      },
      () => undefined,
    );
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const measure = () => {
      void measureServerOffset(uid).then((offset) => {
        if (offset !== null) setClockOffsetMs(offset);
      });
    };
    measure();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') measure();
    });
    return () => subscription.remove();
  }, [uid]);

  // Guest: bring in the time stored on the device. The app root records it on launch and on
  // resume; this read covers a Day screen that opens before that has finished.
  useEffect(() => {
    if (uid || repository === null) return;
    let cancelled = false;
    void recordSeen(repository, Date.now()).then((seen) => {
      if (!cancelled) setLastSeenAt((previous) => nextLastSeenAt(seen, previous));
    });
    return () => {
      cancelled = true;
    };
  }, [uid, repository]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setDeviceNow(now);
      // While the screen is open the latest time seen keeps moving forward with a sound clock
      // and stays put when the clock jumps back.
      setLastSeenAt((previous) => nextLastSeenAt(now, previous));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isValidDayId(dayId)) return null;
  if (!uid) {
    return getGuestDayAccess(dayId, deviceNow, deviceZone(deviceNow).utcOffsetMinutes, lastSeenAt);
  }
  const nowMs = correctedNow(deviceNow, clockOffsetMs);
  const utcOffsetMinutes = storedOffset ?? deviceZone(nowMs).utcOffsetMinutes;
  return getDayAccess(dayId, nowMs, utcOffsetMinutes);
}
