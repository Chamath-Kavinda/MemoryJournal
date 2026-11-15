import { sortCategories, type Tag, type TagCategory } from '@memory-journal/core';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAuthStore } from '@/features/auth/authStore';

import { seedDefaultCategories, subscribeCategories, subscribeTags } from './tagService';

export type TagDataStatus = 'loading' | 'ready' | 'error';

/**
 * Live categories (defaults first) and tags of the signed-in user. The first time the
 * categories load, People, Places and Numbers are stored if they are missing.
 */
export function useTagData(): {
  uid: string | undefined;
  categories: TagCategory[];
  tags: Tag[];
  status: TagDataStatus;
} {
  const uid = useAuthStore((s) => s.user?.uid);
  const [categories, setCategories] = useState<TagCategory[] | null>(null);
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!uid) return;
    setCategories(null);
    setTags(null);
    setFailed(false);
    const onError = () => setFailed(true);
    const stopCategories = subscribeCategories(uid, setCategories, onError);
    const stopTags = subscribeTags(uid, setTags, onError);
    return () => {
      stopCategories();
      stopTags();
    };
  }, [uid]);

  // Seeding is safe to repeat (fixed ids), so a first snapshot from an empty cache is fine.
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!uid || categories === null || seededFor.current === uid) return;
    seededFor.current = uid;
    seedDefaultCategories(uid, categories).catch(() => {
      seededFor.current = null;
    });
  }, [uid, categories]);

  const sorted = useMemo(() => sortCategories(categories ?? []), [categories]);
  let status: TagDataStatus = 'ready';
  if (failed) status = 'error';
  else if (categories === null || tags === null) status = 'loading';

  return { uid, categories: sorted, tags: tags ?? [], status };
}
