import type { Tag, TagCategory, TagDraft } from '@memory-journal/core';

/** What the writer needs to offer tags while typing. */
export interface Tagging {
  /** The user's tags. Mentions show a tag's current name. */
  tags: readonly Tag[];
  categories: readonly TagCategory[];
  /**
   * Stores a new tag and returns its id at once, before the server has confirmed it, so the
   * mention can be inserted right away. Leave out to hide tag creation.
   */
  createTag?: (draft: TagDraft) => string;
}
