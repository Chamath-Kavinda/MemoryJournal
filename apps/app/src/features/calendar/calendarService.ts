import { monthDayRange, writtenDayIds, type DayId, type MonthRef } from '@memory-journal/core';
import { collection, onSnapshot, query, where, type Unsubscribe } from 'firebase/firestore';
import { z } from 'zod';

import { getFirebase } from '@/lib/firebase';

// Only the metadata the calendar needs; journal text never reaches this screen.
const dayMetaSchema = z.object({ date: z.string(), wordCount: z.number() });

/**
 * Listens to the day documents of one month and reports which days have writing.
 * Works offline: Firestore serves the local cache and the callback fires again on sync.
 */
export function subscribeWrittenDays(
  uid: string,
  month: MonthRef,
  onChange: (writtenDays: Set<DayId>) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const { first, last } = monthDayRange(month);
  const days = query(
    collection(getFirebase().db, 'users', uid, 'days'),
    where('date', '>=', first),
    where('date', '<=', last),
  );

  return onSnapshot(
    days,
    (snapshot) => {
      const metas = snapshot.docs.flatMap((document) => {
        const parsed = dayMetaSchema.safeParse(document.data());
        return parsed.success ? [parsed.data] : [];
      });
      onChange(writtenDayIds(metas));
    },
    onError,
  );
}
