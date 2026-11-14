import { dayIdFromUtc, type DayId } from '@memory-journal/core';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { deviceZone } from '@/features/profile/profileService';

const CHECK_EVERY_MS = 60_000;

function currentDayId(): DayId {
  const now = Date.now();
  return dayIdFromUtc(now, deviceZone(now).utcOffsetMinutes);
}

/**
 * Today's local day id. It is re-checked every minute and when the app returns to the
 * foreground, so the ring moves to the new day after midnight without a restart.
 * This is for display only: write access is decided by server time, not this clock.
 */
export function useTodayId(): DayId {
  const [todayId, setTodayId] = useState(currentDayId);

  useEffect(() => {
    const refresh = () => setTodayId(currentDayId());
    const timer = setInterval(refresh, CHECK_EVERY_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  return todayId;
}
