import type { Tag, TagCategory } from './types';

/** Fixed ids of the default categories, so every device seeds the same documents. */
export const DEFAULT_CATEGORIES: readonly TagCategory[] = [
  { id: 'people', name: 'People', isDefault: true, order: 0 },
  { id: 'places', name: 'Places', isDefault: true, order: 1 },
  { id: 'numbers', name: 'Numbers', isDefault: true, order: 2 },
];

export const MAX_NAME_LENGTH = 60;
export const MAX_NOTE_LENGTH = 500;
export const MAX_ALIASES = 10;

/** What the tag form collects, before it is checked. */
export interface TagInput {
  name: string;
  categoryId: string;
  note: string;
  /** Aliases typed as one string, separated by commas or new lines. */
  aliasesText: string;
}

/** A checked tag, ready to store (without id and creation date). */
export interface TagDraft {
  name: string;
  categoryId: string;
  note: string | null;
  aliases: string[];
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Trims and collapses inner whitespace, so "  Ravi   Perera " equals "Ravi Perera". */
export function normalizeName(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function sameName(a: string, b: string): boolean {
  return a.toLocaleLowerCase() === b.toLocaleLowerCase();
}

/** Splits typed aliases, drops empty and repeated ones, and drops any that equal the name. */
export function parseAliases(text: string, name: string): string[] {
  const seen: string[] = [name];
  const aliases: string[] = [];
  for (const part of text.split(/[,\n]/)) {
    const alias = normalizeName(part);
    if (alias === '' || seen.some((s) => sameName(s, alias))) continue;
    seen.push(alias);
    aliases.push(alias);
  }
  return aliases;
}

/** Checks a category name. `ignoreId` is the category being renamed. */
export function validateCategoryName(
  rawName: string,
  categories: readonly TagCategory[],
  ignoreId?: string,
): ValidationResult<string> {
  const name = normalizeName(rawName);
  if (name === '') return { ok: false, error: 'Give the category a name.' };
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Keep the name under ${MAX_NAME_LENGTH + 1} characters.` };
  }
  if (categories.some((c) => c.id !== ignoreId && sameName(c.name, name))) {
    return { ok: false, error: 'A category with this name already exists.' };
  }
  return { ok: true, value: name };
}

/**
 * Checks the tag form. A tag name must be unique inside its category, ignoring case.
 * `ignoreId` is the tag being edited.
 */
export function validateTagInput(
  input: TagInput,
  categories: readonly TagCategory[],
  tags: readonly Tag[],
  ignoreId?: string,
): ValidationResult<TagDraft> {
  const name = normalizeName(input.name);
  if (name === '') return { ok: false, error: 'Give the tag a name.' };
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Keep the name under ${MAX_NAME_LENGTH + 1} characters.` };
  }
  if (!categories.some((c) => c.id === input.categoryId)) {
    return { ok: false, error: 'Choose a category.' };
  }
  if (
    tags.some(
      (t) => t.id !== ignoreId && t.categoryId === input.categoryId && sameName(t.name, name),
    )
  ) {
    return { ok: false, error: 'This category already has a tag with this name.' };
  }

  const note = input.note.trim();
  if (note.length > MAX_NOTE_LENGTH) {
    return { ok: false, error: `Keep the note under ${MAX_NOTE_LENGTH + 1} characters.` };
  }

  const aliases = parseAliases(input.aliasesText, name);
  if (aliases.length > MAX_ALIASES) {
    return { ok: false, error: `Use at most ${MAX_ALIASES} aliases.` };
  }
  if (aliases.some((a) => a.length > MAX_NAME_LENGTH)) {
    return { ok: false, error: `Keep each alias under ${MAX_NAME_LENGTH + 1} characters.` };
  }

  return {
    ok: true,
    value: { name, categoryId: input.categoryId, note: note === '' ? null : note, aliases },
  };
}

/** Defaults first in their fixed order, then custom categories by order and name. */
export function sortCategories(categories: readonly TagCategory[]): TagCategory[] {
  return [...categories].sort(
    (a, b) =>
      Number(b.isDefault) - Number(a.isDefault) ||
      a.order - b.order ||
      a.name.localeCompare(b.name),
  );
}

/** The `order` for a category created now: after every existing one. */
export function nextCategoryOrder(categories: readonly TagCategory[]): number {
  return categories.reduce((max, c) => Math.max(max, c.order), -1) + 1;
}

/** The default categories that are not stored yet. */
export function missingDefaultCategories(existing: readonly TagCategory[]): TagCategory[] {
  const ids = new Set(existing.map((c) => c.id));
  return DEFAULT_CATEGORIES.filter((c) => !ids.has(c.id));
}

export type CategoryChange = { ok: true } | { ok: false; error: string };

/** Default categories keep their names. */
export function canRenameCategory(category: TagCategory): CategoryChange {
  return category.isDefault
    ? { ok: false, error: 'People, Places and Numbers cannot be renamed.' }
    : { ok: true };
}

/**
 * Default categories cannot be deleted, and a custom category can only be deleted when
 * no tag uses it, so a tag is never left without a category.
 */
export function canDeleteCategory(category: TagCategory, tags: readonly Tag[]): CategoryChange {
  if (category.isDefault) {
    return { ok: false, error: 'People, Places and Numbers cannot be deleted.' };
  }
  const count = tags.filter((t) => t.categoryId === category.id).length;
  if (count > 0) {
    const noun = count === 1 ? 'tag uses' : 'tags use';
    return { ok: false, error: `${count} ${noun} this category. Move or delete them first.` };
  }
  return { ok: true };
}

export interface TagFilter {
  /** Matches the name or any alias, ignoring case. Empty matches everything. */
  query: string;
  /** Only tags of this category, or null for all. */
  categoryId: string | null;
}

/** Tags that match the filter, sorted by name. */
export function filterTags(tags: readonly Tag[], filter: TagFilter): Tag[] {
  const query = normalizeName(filter.query).toLocaleLowerCase();
  return tags
    .filter((tag) => {
      if (filter.categoryId !== null && tag.categoryId !== filter.categoryId) return false;
      if (query === '') return true;
      return [tag.name, ...tag.aliases].some((text) => text.toLocaleLowerCase().includes(query));
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
