import { mentionedDays, type JournalRepository, type MentionedDay } from '@memory-journal/core';

import { watchJournal } from '@/lib/watchJournal';

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
