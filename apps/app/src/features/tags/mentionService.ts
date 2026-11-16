import {
  mentionCounts,
  mentionedDays,
  type JournalRepository,
  type MentionedDay,
} from '@memory-journal/core';

import { watchJournal } from '@/lib/watchJournal';

/**
 * Reports how many days and library pages mention each tag, now and whenever the journal
 * changes. It reads only the day and library summaries, which carry the tag ids (D-024), so no
 * revision text is read.
 */
export function subscribeMentionCounts(
  repository: JournalRepository,
  onChange: (counts: Map<string, number>) => void,
  onError: (error: Error) => void,
): () => void {
  return watchJournal(
    repository,
    async () => {
      const [days, items] = await Promise.all([repository.listDays(), repository.listLibrary()]);
      return mentionCounts(days, items);
    },
    onChange,
    onError,
  );
}

/**
 * Reports the days whose latest pass mentions a tag, newest first, now and whenever the
 * journal changes. The day records carry the tag ids (D-024), so only the day summaries are
 * read and no revision text is.
 */
export function subscribeMentionedDays(
  repository: JournalRepository,
  tagId: string,
  onChange: (days: MentionedDay[]) => void,
  onError: (error: Error) => void,
): () => void {
  return watchJournal(
    repository,
    async () => mentionedDays(await repository.listDays(), tagId),
    onChange,
    onError,
  );
}
