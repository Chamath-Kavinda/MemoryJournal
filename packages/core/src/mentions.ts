import { mentionToken, type DayContent } from './revisions';
import { filterTags } from './tags';
import type { Tag, TagCategory } from './types';

/**
 * Mentions are stored in text as tokens (`{{tag:ID|Name}}`, see mentionToken) but a text
 * field cannot show a chip inside its text. The editor therefore shows `@Name` and this
 * module converts between the two forms. Everything here is pure, so mobile and desktop
 * behave the same.
 */

const TOKEN = /\{\{tag:([A-Za-z0-9_-]+)(?:\|([^{}|\s]*))?\}\}/g;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/** Shown when a mentioned tag is gone and the token has no stored name. */
export const UNKNOWN_TAG_NAME = 'tag';

/** Longest `@query` that still opens the suggestions. */
export const MAX_MENTION_QUERY = 40;

/** How many tags the `@` suggestion list shows at most. */
export const MAX_SUGGESTIONS = 8;

/** A tag the editor can turn `@Name` into. */
export interface MentionTarget {
  id: string;
  name: string;
  /** The exact token to keep when the text already holds this mention. */
  token?: string;
}

/** One piece of a text, in its editor form and its stored form. */
export interface DisplaySegment {
  display: string;
  stored: string;
  /** The tag id when the piece is a mention, otherwise null. */
  mentionId: string | null;
}

function decodeLabel(label: string | undefined): string | null {
  if (label === undefined || label === '') return null;
  try {
    return decodeURIComponent(label);
  } catch {
    return label;
  }
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Splits stored text into plain pieces and mention tokens, with the `@Name` each shows as. */
export function storedSegments(
  stored: string,
  names: ReadonlyMap<string, string>,
): DisplaySegment[] {
  const segments: DisplaySegment[] = [];
  let last = 0;
  for (const match of stored.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > last) {
      const text = stored.slice(last, start);
      segments.push({ display: text, stored: text, mentionId: null });
    }
    const id = match[1] ?? '';
    const name = names.get(id) ?? decodeLabel(match[2]) ?? UNKNOWN_TAG_NAME;
    segments.push({ display: `@${name}`, stored: match[0], mentionId: id });
    last = start + match[0].length;
  }
  if (last < stored.length) {
    const text = stored.slice(last);
    segments.push({ display: text, stored: text, mentionId: null });
  }
  return segments;
}

/** Stored text as the editor shows it: every mention as `@Name`, using the tag's current name. */
export function toDisplayText(stored: string, names: ReadonlyMap<string, string>): string {
  return storedSegments(stored, names)
    .map((segment) => segment.display)
    .join('');
}

/**
 * The tags the editor may turn `@Name` into for one text: the mentions already in it first
 * (so a name keeps pointing at the same tag), then every live tag.
 */
export function mentionTargets(
  tags: readonly Pick<Tag, 'id' | 'name'>[],
  stored: string,
): MentionTarget[] {
  const names = new Map(tags.map((tag) => [tag.id, tag.name]));
  const targets: MentionTarget[] = [];
  for (const match of stored.matchAll(TOKEN)) {
    const id = match[1] ?? '';
    const name = names.get(id) ?? decodeLabel(match[2]);
    if (name !== null && name !== undefined) targets.push({ id, name, token: match[0] });
  }
  for (const tag of tags) targets.push({ id: tag.id, name: tag.name });
  return targets;
}

/**
 * Splits editor text into plain pieces and `@Name` mentions. A mention is `@` plus exactly a
 * known name (case sensitive), not preceded or followed by a letter or digit, so
 * "@Ravindu" is not the tag "Ravi". When two targets share a name, the first one wins.
 */
export function displaySegments(
  display: string,
  targets: readonly MentionTarget[],
): DisplaySegment[] {
  const byName = new Map<string, MentionTarget>();
  for (const target of targets) {
    if (target.name !== '' && !byName.has(target.name)) byName.set(target.name, target);
  }
  if (display === '') return [];
  if (byName.size === 0) return [{ display, stored: display, mentionId: null }];

  const longestFirst = [...byName.keys()].sort((a, b) => b.length - a.length || (a < b ? -1 : 1));
  const pattern = new RegExp(`@(${longestFirst.map(escapeRegExp).join('|')})`, 'gu');

  const segments: DisplaySegment[] = [];
  let last = 0;
  for (const match of display.matchAll(pattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const before = start > 0 ? display.charAt(start - 1) : '';
    const after = end < display.length ? display.charAt(end) : '';
    if (LETTER_OR_DIGIT.test(before) || LETTER_OR_DIGIT.test(after)) continue;
    const target = byName.get(match[1] ?? '');
    if (!target) continue;

    if (start > last) {
      const text = display.slice(last, start);
      segments.push({ display: text, stored: text, mentionId: null });
    }
    segments.push({
      display: match[0],
      stored: target.token ?? mentionToken(target.id, target.name),
      mentionId: target.id,
    });
    last = end;
  }
  if (last < display.length) {
    const text = display.slice(last);
    segments.push({ display: text, stored: text, mentionId: null });
  }
  return segments;
}

/** Editor text back to stored text, turning `@Name` into mention tokens. */
export function fromDisplayText(display: string, targets: readonly MentionTarget[]): string {
  return displaySegments(display, targets)
    .map((segment) => segment.stored)
    .join('');
}

/**
 * Converts a cursor position in editor text to the matching position in stored text.
 * A cursor inside a mention moves to the nearer edge of the token.
 */
export function displayToStoredOffset(segments: readonly DisplaySegment[], offset: number): number {
  let displayPos = 0;
  let storedPos = 0;
  for (const segment of segments) {
    const length = segment.display.length;
    if (offset <= displayPos + length) {
      if (segment.mentionId === null) return storedPos + (offset - displayPos);
      const nearStart = offset - displayPos <= length / 2;
      return nearStart ? storedPos : storedPos + segment.stored.length;
    }
    displayPos += length;
    storedPos += segment.stored.length;
  }
  return storedPos;
}

/**
 * Replaces a range of editor text with stored text (for example a mention token) and returns
 * the new stored text. Works on the stored form directly, so a tag that was only just created
 * and is not in `targets` yet still ends up in the text.
 */
export function replaceDisplayRange(
  display: string,
  targets: readonly MentionTarget[],
  range: { start: number; end: number },
  storedReplacement: string,
): string {
  const segments = displaySegments(display, targets);
  const stored = segments.map((segment) => segment.stored).join('');
  const start = displayToStoredOffset(segments, Math.max(0, Math.min(range.start, range.end)));
  const end = displayToStoredOffset(segments, Math.max(range.start, range.end));
  return stored.slice(0, start) + storedReplacement + stored.slice(end);
}

export interface ActiveMention {
  /** Offset of the `@` in the editor text. */
  start: number;
  /** What was typed after the `@`. */
  query: string;
}

/**
 * The `@query` the cursor is at the end of, or null. It opens the suggestions only when the
 * `@` starts a word, the query has no whitespace, and it is not already a finished mention.
 */
export function activeMention(
  display: string,
  cursor: number,
  targets: readonly MentionTarget[],
): ActiveMention | null {
  let index = Math.min(cursor, display.length);
  while (index > 0 && display.charAt(index - 1) !== '@') {
    if (/\s/.test(display.charAt(index - 1))) return null;
    index -= 1;
  }
  if (index === 0) return null;

  const start = index - 1;
  if (start > 0 && LETTER_OR_DIGIT.test(display.charAt(start - 1))) return null;
  const query = display.slice(index, Math.min(cursor, display.length));
  if (query.length > MAX_MENTION_QUERY) return null;
  if (query !== '' && targets.some((target) => target.name === query)) return null;
  return { start, query };
}

export interface TagGroup {
  category: TagCategory;
  tags: Tag[];
}

/**
 * Tags matching the query (name or alias), at most `limit`, grouped by category in category
 * order. Groups with no match are left out.
 */
export function suggestTags(
  tags: readonly Tag[],
  categories: readonly TagCategory[],
  query: string,
  limit: number = MAX_SUGGESTIONS,
): TagGroup[] {
  const matches = filterTags(tags, { query, categoryId: null }).slice(0, limit);
  const groups: TagGroup[] = [];
  for (const category of categories) {
    const inCategory = matches.filter((tag) => tag.categoryId === category.id);
    if (inCategory.length > 0) groups.push({ category, tags: inCategory });
  }
  return groups;
}

/** Applies a text conversion to the free notes and every block of a day. */
export function mapContentText(content: DayContent, convert: (text: string) => string): DayContent {
  return {
    freeNotes: convert(content.freeNotes),
    blocks: content.blocks.map((block) => ({ ...block, text: convert(block.text) })),
  };
}
