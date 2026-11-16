import {
  monthDayRange,
  writtenDayIds,
  type DayId,
  type JournalRepository,
  type MonthRef,
} from '@memory-journal/core';

/**
 * Reports which days of one month have writing, now and again whenever the journal changes.
 * It reads only day metadata; journal text never reaches this screen. A slow read that is
 * overtaken by a newer one is dropped, so the calendar never goes back to older data.
 */
export function subscribeWrittenDays(
  repository: JournalRepository,
  month: MonthRef,
  onChange: (writtenDays: Set<DayId>) => void,
  onError: (error: Error) => void,
): () => void {
  const range = monthDayRange(month);
  let active = true;
  let latest = 0;

  const load = (): void => {
    const read = ++latest;
    repository.listDays(range).then(
      (days) => {
        if (active && read === latest) onChange(writtenDayIds(days));
      },
      (error: unknown) => {
        if (active && read === latest) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      },
    );
  };

  load();
  const stop = repository.subscribe(load);
  return () => {
    active = false;
    stop();
  };
}
