import type { JournalRepository, MentionedDay } from '@memory-journal/core';
import { useEffect, useState } from 'react';

import { subscribeMentionedDays } from './mentionService';

export type MentionedDaysStatus = 'loading' | 'ready' | 'error';

/**
 * Live list of the days that mention a tag, newest first. The repository is null while the app
 * is still working out who is using it, so nothing is read yet.
 */
export function useMentionedDays(
  repository: JournalRepository | null,
  tagId: string,
): { days: MentionedDay[]; status: MentionedDaysStatus } {
  const [days, setDays] = useState<MentionedDay[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setDays(null);
    setFailed(false);
    if (!repository || tagId === '') return;
    return subscribeMentionedDays(repository, tagId, setDays, () => setFailed(true));
  }, [repository, tagId]);

  let status: MentionedDaysStatus = 'ready';
  if (failed) status = 'error';
  else if (days === null) status = 'loading';

  return { days: days ?? [], status };
}
