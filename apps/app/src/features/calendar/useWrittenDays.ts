import type { DayId, MonthRef } from '@memory-journal/core';
import { useEffect, useState } from 'react';

import { useJournalRepository } from '@/lib/journal';

import { subscribeWrittenDays } from './calendarService';

export type WrittenDaysStatus = 'loading' | 'ready' | 'error';

const NONE: ReadonlySet<DayId> = new Set();

/** Live set of days with writing for the visible month, for a guest or a signed-in user. */
export function useWrittenDays(month: MonthRef): {
  writtenDays: ReadonlySet<DayId>;
  status: WrittenDaysStatus;
} {
  const repository = useJournalRepository();
  const { year, month: monthNumber } = month;
  const [state, setState] = useState<{
    writtenDays: ReadonlySet<DayId>;
    status: WrittenDaysStatus;
  }>({ writtenDays: NONE, status: 'loading' });

  useEffect(() => {
    if (!repository) return;
    setState({ writtenDays: NONE, status: 'loading' });
    return subscribeWrittenDays(
      repository,
      { year, month: monthNumber },
      (writtenDays) => setState({ writtenDays, status: 'ready' }),
      () => setState({ writtenDays: NONE, status: 'error' }),
    );
  }, [repository, year, monthNumber]);

  return state;
}
