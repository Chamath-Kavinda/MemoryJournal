import type { MentionedDay } from '@memory-journal/core';
import { useEffect, useState } from 'react';

import { subscribeMentionedDays } from './mentionService';

export type MentionedDaysStatus = 'loading' | 'ready' | 'error';

/** Live list of the days that mention a tag, newest first. */
export function useMentionedDays(
  uid: string | undefined,
  tagId: string,
): { days: MentionedDay[]; status: MentionedDaysStatus } {
  const [days, setDays] = useState<MentionedDay[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!uid || tagId === '') return;
    setDays(null);
    setFailed(false);
    return subscribeMentionedDays(uid, tagId, setDays, () => setFailed(true));
  }, [uid, tagId]);

  let status: MentionedDaysStatus = 'ready';
  if (failed) status = 'error';
  else if (days === null) status = 'loading';

  return { days: days ?? [], status };
}
