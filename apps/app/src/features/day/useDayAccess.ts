import {
  correctedNow,
  getDayAccess,
  isValidDayId,
  type DayAccess,
  type DayId,
} from '@memory-journal/core';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { useAuthStore } from '@/features/auth/authStore';
import { deviceZone } from '@/features/profile/profileService';
import { getFirebase } from '@/lib/firebase';

import { measureServerOffset } from './serverClock';

/**
 * The lock state of a day, kept live. It uses the UTC offset stored on the profile (the
 * same value the Firestore rules use) and the device clock moved onto server time, so
 * changing the phone clock does not unlock today. Returns null for an invalid day id.
 * The rules remain the real guard; this keeps the screen honest and drives the countdown.
 */
export function useDayAccess(dayId: DayId): DayAccess | null {
  const uid = useAuthStore((s) => s.user?.uid);
  const [storedOffset, setStoredOffset] = useState<number | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [deviceNow, setDeviceNow] = useState(() => Date.now());

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

  useEffect(() => {
    const timer = setInterval(() => setDeviceNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isValidDayId(dayId)) return null;
  const nowMs = correctedNow(deviceNow, clockOffsetMs);
  const utcOffsetMinutes = storedOffset ?? deviceZone(nowMs).utcOffsetMinutes;
  return getDayAccess(dayId, nowMs, utcOffsetMinutes);
}
