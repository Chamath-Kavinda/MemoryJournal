import { isValidDayId, type DayId } from '@memory-journal/core';
import { useEffect, useState } from 'react';

import { subscribeDayHistory, type DayHistory } from './revisionService';

export interface DayHistoryState {
  /** The saved passes of the day, or null until they are known (or if they cannot be read). */
  history: DayHistory | null;
  /** True when the saved passes could not be read, for example because of a rules error. */
  failed: boolean;
}

/** The saved passes of one day, kept up to date. Works offline from Firestore's cache. */
export function useDayHistory(uid: string | undefined, dayId: DayId): DayHistoryState {
  const [state, setState] = useState<DayHistoryState>({ history: null, failed: false });

  useEffect(() => {
    setState({ history: null, failed: false });
    if (!uid || !isValidDayId(dayId)) return;
    return subscribeDayHistory(
      uid,
      dayId,
      (history) => setState({ history, failed: false }),
      () => setState({ history: null, failed: true }),
    );
  }, [uid, dayId]);

  return state;
}
