import type { DayRevision } from './types';

/** Which pass of a day is on screen: the newest one, or a numbered one. */
export type RevisionSelection = 'latest' | number;

export interface RevisionOption {
  key: RevisionSelection;
  label: string;
}

/** 1 becomes "1st", 2 "2nd", 3 "3rd", 11 "11th", 21 "21st". */
export function ordinal(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * The choices of the revision toggle: Latest, then 1st, 2nd, 3rd and so on (section 5.3).
 * A day with fewer than two passes has nothing to compare, so it gets no choices.
 */
export function revisionOptions(revisionCount: number): RevisionOption[] {
  if (!Number.isInteger(revisionCount) || revisionCount < 2) return [];
  const passes = Array.from({ length: revisionCount }, (_, index) => ({
    key: index + 1,
    label: ordinal(index + 1),
  }));
  return [{ key: 'latest', label: 'Latest' }, ...passes];
}

/**
 * The revision a selection points at, or null if it does not exist. "Latest" is the
 * revision with the highest number, whatever order the list is in.
 */
export function pickRevision(
  revisions: readonly DayRevision[],
  selection: RevisionSelection,
): DayRevision | null {
  if (selection === 'latest') {
    return revisions.reduce<DayRevision | null>(
      (best, revision) => (best === null || revision.n > best.n ? revision : best),
      null,
    );
  }
  return revisions.find((revision) => revision.n === selection) ?? null;
}

/** The pass just before `n`, which the Highlight additions switch compares against. */
export function previousRevision(revisions: readonly DayRevision[], n: number): DayRevision | null {
  return revisions.reduce<DayRevision | null>(
    (best, revision) =>
      revision.n < n && (best === null || revision.n > best.n) ? revision : best,
    null,
  );
}
