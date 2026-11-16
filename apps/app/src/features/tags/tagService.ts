import {
  missingDefaultCategories,
  newId,
  type EpochMs,
  type JournalRepository,
  type Tag,
  type TagCategory,
  type TagDraft,
} from '@memory-journal/core';

import { watchJournal } from '@/lib/watchJournal';

/** Every category and tag of the journal in use. */
export interface TagData {
  categories: TagCategory[];
  tags: Tag[];
}

/**
 * Reports the categories and tags now and whenever the journal changes, for a guest or a
 * signed-in user. Both are read together, so a screen never shows a tag whose category is
 * not known yet.
 */
export function subscribeTagData(
  repository: JournalRepository,
  onChange: (data: TagData) => void,
  onError: (error: Error) => void,
): () => void {
  return watchJournal(
    repository,
    async () => {
      const [categories, tags] = await Promise.all([
        repository.listCategories(),
        repository.listTags(),
      ]);
      return { categories, tags };
    },
    onChange,
    onError,
  );
}

/**
 * Stores People, Places and Numbers when they are missing. The ids are fixed, so seeding
 * twice, or on two devices at once, writes the same records and is harmless.
 */
export async function seedDefaultCategories(
  repository: JournalRepository,
  existing: readonly TagCategory[],
): Promise<void> {
  await Promise.all(
    missingDefaultCategories(existing).map((category) => repository.putCategory(category)),
  );
}

/** Adds a custom category. The name and order are checked by the caller. */
export async function createCategory(
  repository: JournalRepository,
  name: string,
  order: number,
): Promise<void> {
  await repository.putCategory({ id: newId(), name, isDefault: false, order });
}

export async function renameCategory(
  repository: JournalRepository,
  categoryId: string,
  name: string,
): Promise<void> {
  // Read the category again, so only the name changes.
  const current = (await repository.listCategories()).find((c) => c.id === categoryId);
  if (current === undefined) throw new Error('This category no longer exists.');
  await repository.putCategory({ ...current, name });
}

export function deleteCategory(repository: JournalRepository, categoryId: string): Promise<void> {
  return repository.deleteCategory(categoryId);
}

/** Adds a tag and returns its new id at once, before the write has been confirmed. */
export function createTag(
  repository: JournalRepository,
  draft: TagDraft,
  nowMs: EpochMs = Date.now(),
): { id: string; saved: Promise<void> } {
  const id = newId();
  return { id, saved: repository.putTag({ id, ...draft, createdAt: nowMs }) };
}

/** Changes a tag. `createdAt` is never touched. */
export async function updateTag(
  repository: JournalRepository,
  tagId: string,
  draft: TagDraft,
): Promise<void> {
  const current = (await repository.listTags()).find((t) => t.id === tagId);
  if (current === undefined) throw new Error('This tag no longer exists.');
  await repository.putTag({ ...current, ...draft });
}

/**
 * Deletes the tag. Entries that mention it are not changed (revisions are immutable), they
 * just stop resolving to a tag.
 */
export function deleteTag(repository: JournalRepository, tagId: string): Promise<void> {
  return repository.deleteTag(tagId);
}
