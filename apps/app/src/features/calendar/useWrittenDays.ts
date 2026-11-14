import type { DayId, MonthRef } from '@memory-journal/core';
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/features/auth/authStore';

import { subscribeWrittenDays } from './calendarService';

export type WrittenDaysStatus = 'loading' | 'ready' | 'error';

const NONE: ReadonlySet<DayId> = new Set();

/** Live set of days with writing for the visible month. */
export function useWrittenDays(month: MonthRef): {
  writtenDays: ReadonlySet<DayId>;
  status: WrittenDaysStatus;
} {
  const uid = useAuthStore((s) => s.user?.uid);
  const { year, month: monthNumber } = month;
  const [state, setState] = useState<{
    writtenDays: ReadonlySet<DayId>;
    status: WrittenDaysStatus;
  }>({ writtenDays: NONE, status: 'loading' });

  useEffect(() => {
    if (!uid) return;
    setState({ writtenDays: NONE, status: 'loading' });
    return subscribeWrittenDays(
      uid,
      { year, month: monthNumber },
      (writtenDays) => setState({ writtenDays, status: 'ready' }),
      () => setState({ writtenDays: NONE, status: 'error' }),
    );
  }, [uid, year, monthNumber]);

  return state;
}
