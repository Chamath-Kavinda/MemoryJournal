import type { JournalRepository } from '@memory-journal/core';
import { useEffect, useState } from 'react';

import { subscribeMentionCounts } from './mentionService';

const NO_COUNTS: ReadonlyMap<string, number> = new Map();

/**
 * Live count of how many days and library pages mention each tag, for the Tags list. While the
 * counts load, or if they cannot be read, the map is empty and the list simply shows no counts;
 * the tags themselves never wait for this.
 */
export function useMentionCounts(
  repository: JournalRepository | null,
): ReadonlyMap<string, number> {
  const [counts, setCounts] = useState<ReadonlyMap<string, number>>(NO_COUNTS);

  useEffect(() => {
    setCounts(NO_COUNTS);
    if (!repository) return;
    return subscribeMentionCounts(repository, setCounts, () => setCounts(NO_COUNTS));
  }, [repository]);

  return counts;
}
