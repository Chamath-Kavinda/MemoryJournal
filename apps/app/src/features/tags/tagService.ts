import {
  missingDefaultCategories,
  type EpochMs,
  type Tag,
  type TagCategory,
  type TagDraft,
} from '@memory-journal/core';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { z } from 'zod';

import { getFirebase } from '@/lib/firebase';

const categorySchema = z.object({
  name: z.string(),
  isDefault: z.boolean(),
  order: z.number(),
});

const tagSchema = z.object({
  name: z.string(),
  categoryId: z.string(),
  note: z.string().nullable(),
  aliases: z.array(z.string()),
  createdAt: z.number(),
});

function categoriesPath(uid: string) {
  return collection(getFirebase().db, 'users', uid, 'tagCategories');
}

function tagsPath(uid: string) {
  return collection(getFirebase().db, 'users', uid, 'tags');
}

/**
 * Listens to the user's categories. Works offline: Firestore serves the local cache and
 * calls back again on sync. Documents with an unexpected shape are left out.
 */
export function subscribeCategories(
  uid: string,
  onChange: (categories: TagCategory[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    categoriesPath(uid),
    (snapshot) => {
      onChange(
        snapshot.docs.flatMap((document) => {
          const parsed = categorySchema.safeParse(document.data());
          return parsed.success ? [{ id: document.id, ...parsed.data }] : [];
        }),
      );
    },
    onError,
  );
}

/** Listens to the user's tags, in the same way as {@link subscribeCategories}. */
export function subscribeTags(
  uid: string,
  onChange: (tags: Tag[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    tagsPath(uid),
    (snapshot) => {
      onChange(
        snapshot.docs.flatMap((document) => {
          const parsed = tagSchema.safeParse(document.data());
          return parsed.success ? [{ id: document.id, ...parsed.data }] : [];
        }),
      );
    },
    onError,
  );
}

/**
 * Stores People, Places and Numbers when they are missing. The ids are fixed, so seeding
 * on two devices at once writes the same documents and is harmless.
 */
export async function seedDefaultCategories(
  uid: string,
  existing: readonly TagCategory[],
): Promise<void> {
  const missing = missingDefaultCategories(existing);
  if (missing.length === 0) return;
  const batch = writeBatch(getFirebase().db);
  for (const { id, ...data } of missing) {
    batch.set(doc(categoriesPath(uid), id), data);
  }
  await batch.commit();
}

/** Adds a custom category. The name and order are checked by the caller. */
export async function createCategory(uid: string, name: string, order: number): Promise<void> {
  await setDoc(doc(categoriesPath(uid)), { name, isDefault: false, order });
}

export async function renameCategory(uid: string, categoryId: string, name: string): Promise<void> {
  await updateDoc(doc(categoriesPath(uid), categoryId), { name });
}

export async function deleteCategory(uid: string, categoryId: string): Promise<void> {
  await deleteDoc(doc(categoriesPath(uid), categoryId));
}

/** Adds a tag and returns its new id at once, before the server has confirmed the write. */
export function createTag(
  uid: string,
  draft: TagDraft,
  nowMs: EpochMs = Date.now(),
): { id: string; saved: Promise<void> } {
  const ref = doc(tagsPath(uid));
  return { id: ref.id, saved: setDoc(ref, { ...draft, createdAt: nowMs }) };
}

/** Changes a tag. `createdAt` is never touched. */
export async function updateTag(uid: string, tagId: string, draft: TagDraft): Promise<void> {
  await updateDoc(doc(tagsPath(uid), tagId), { ...draft });
}

/**
 * Deletes the tag document. Entries that mention it are not changed (revisions are
 * immutable), they just stop resolving to a tag.
 */
export async function deleteTag(uid: string, tagId: string): Promise<void> {
  await deleteDoc(doc(tagsPath(uid), tagId));
}
