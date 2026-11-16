import {
  sortCategories,
  type JournalRepository,
  type Tag,
  type TagCategory,
} from '@memory-journal/core';
import { useEffect, useMemo, useRef, useState } from 'react';

import { seedDefaultCategories, subscribeTagData, type TagData } from './tagService';

export type TagDataStatus = 'loading' | 'ready' | 'error';

/**
 * Live categories (defaults first) and tags of whoever is using the app: the guest journal on
 * the device or the signed-in account. The repository is null while the app is still working
 * out who that is, so nothing is read yet. The first time the categories load, People, Places
 * and Numbers are stored if they are missing.
 */
export function useTagData(repository: JournalRepository | null): {
  categories: TagCategory[];
  tags: Tag[];
  status: TagDataStatus;
} {
  const [data, setData] = useState<TagData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setData(null);
    setFailed(false);
    if (!repository) return;
    return subscribeTagData(repository, setData, () => setFailed(true));
  }, [repository]);

  // Seeding is safe to repeat (fixed ids), so a first read from an empty cache is fine.
  const seededFor = useRef<JournalRepository | null>(null);
  useEffect(() => {
    if (!repository || data === null || seededFor.current === repository) return;
    seededFor.current = repository;
    seedDefaultCategories(repository, data.categories).catch(() => {
      seededFor.current = null;
    });
  }, [repository, data]);

  const categories = data?.categories;
  const sorted = useMemo(() => sortCategories(categories ?? []), [categories]);
  let status: TagDataStatus = 'ready';
  if (failed) status = 'error';
  else if (data === null) status = 'loading';

  return { categories: sorted, tags: data?.tags ?? [], status };
}
