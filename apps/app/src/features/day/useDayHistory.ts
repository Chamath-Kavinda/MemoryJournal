import { isValidDayId, type DayId, type JournalRepository } from '@memory-journal/core';
import { useEffect, useState } from 'react';

import { subscribeDayHistory, type DayHistory } from './revisionService';

export interface DayHistoryState {
  /** The saved passes of the day, or null until they are known (or if they cannot be read). */
  history: DayHistory | null;
  /** True when the saved passes could not be read, for example because of a rules error. */
  failed: boolean;
}

/**
 * The saved passes of one day, kept up to date, for a guest or a signed-in user. The repository
 * is null while the app is still working out who is signed in, so nothing is read yet.
 */
export function useDayHistory(repository: JournalRepository | null, dayId: DayId): DayHistoryState {
  const [state, setState] = useState<DayHistoryState>({ history: null, failed: false });

  useEffect(() => {
    setState({ history: null, failed: false });
    if (!repository || !isValidDayId(dayId)) return;
    return subscribeDayHistory(
      repository,
      dayId,
      (history) => setState({ history, failed: false }),
      () => setState({ history: null, failed: true }),
    );
  }, [repository, dayId]);

  return state;
}
