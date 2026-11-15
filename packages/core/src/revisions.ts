import type { DayBlock, DayRevision, EpochMs, RevisionKind } from './types';

/** A sitting ends after this much inactivity (section 5.3). */
export const SITTING_TIMEOUT_MS = 30 * 60_000;

/** The writable part of a day: what a revision stores apart from its metadata. */
export interface DayContent {
  freeNotes: string;
  blocks: DayBlock[];
}

export interface TextSegment {
  text: string;
  /** True when the text was not present in the previous pass. */
  added: boolean;
}

// ---------------------------------------------------------------------------
// Words and mentions
// ---------------------------------------------------------------------------

// `{{tag:ID}}` or `{{tag:ID|Name}}`. The name is URL-encoded, so a token never contains spaces
// and always counts as one word.
const MENTION_PATTERN = /\{\{tag:([A-Za-z0-9_-]+)(?:\|[^{}|\s]*)?\}\}/g;
const WORD_EDGE_PATTERN = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

/** Counts whitespace-separated words. A mention token counts as one word. */
export function countWords(text: string): number {
  return text.match(/\S+/g)?.length ?? 0;
}

/**
 * The token stored in text for a tag mention, for example `{{tag:abc123}}`. With a name it is
 * `{{tag:abc123|Ravi}}`: the name keeps the mention readable after the tag is deleted
 * (section 5.4). It is URL-encoded, so the token never holds spaces, braces or `|`.
 */
export function mentionToken(tagId: string, name?: string): string {
  const label = name === undefined || name === '' ? '' : `|${encodeURIComponent(name)}`;
  return `{{tag:${tagId}${label}}}`;
}

/** Tag ids mentioned in the given texts, unique, in order of first appearance. */
export function extractMentionIds(...texts: string[]): string[] {
  const seen = new Set<string>();
  for (const text of texts) {
    for (const match of text.matchAll(MENTION_PATTERN)) {
      const id = match[1];
      if (id !== undefined) seen.add(id);
    }
  }
  return [...seen];
}

/**
 * The comparison key of a word: lower case without surrounding punctuation.
 * Mention tokens keep their exact id (ids are case sensitive) and ignore the stored name,
 * so renaming a tag does not make its old mentions count as additions.
 */
function wordKey(token: string): string {
  const mention = /\{\{tag:([A-Za-z0-9_-]+)(?:\|[^{}|\s]*)?\}\}/.exec(token);
  if (mention) return `{{tag:${mention[1] ?? ''}}}`;
  return token.toLowerCase().replace(WORD_EDGE_PATTERN, '');
}

// ---------------------------------------------------------------------------
// Content helpers
// ---------------------------------------------------------------------------

function assertValidBlock(block: DayBlock): void {
  const hourOk = Number.isInteger(block.hour) && block.hour >= 0 && block.hour <= 23;
  const minuteOk =
    block.minute === null ||
    (Number.isInteger(block.minute) && block.minute >= 0 && block.minute <= 59);
  if (!hourOk || !minuteOk) {
    throw new RangeError(`Invalid block time: hour=${block.hour} minute=${String(block.minute)}`);
  }
}

/** Time order: by hour, with the whole-hour block before its minute markers. */
export function sortBlocks(blocks: readonly DayBlock[]): DayBlock[] {
  return [...blocks].sort((a, b) => a.hour - b.hour || (a.minute ?? -1) - (b.minute ?? -1));
}

/**
 * Canonical form of day content: invalid blocks are rejected, blocks with no
 * text are dropped (empty rows cost nothing) and the rest are in time order.
 */
export function normalizeContent(content: DayContent): DayContent {
  for (const block of content.blocks) assertValidBlock(block);
  return {
    freeNotes: content.freeNotes,
    blocks: sortBlocks(content.blocks.filter((block) => block.text.trim() !== '')),
  };
}

export function contentOf(revision: Pick<DayRevision, 'freeNotes' | 'blocks'>): DayContent {
  return { freeNotes: revision.freeNotes, blocks: revision.blocks };
}

export function isContentEmpty(content: DayContent): boolean {
  const normalized = normalizeContent(content);
  return normalized.freeNotes.trim() === '' && normalized.blocks.length === 0;
}

export function contentEquals(a: DayContent, b: DayContent): boolean {
  return JSON.stringify(normalizeContent(a)) === JSON.stringify(normalizeContent(b));
}

export function countContentWords(content: DayContent): number {
  return content.blocks.reduce(
    (total, block) => total + countWords(block.text),
    countWords(content.freeNotes),
  );
}

// ---------------------------------------------------------------------------
// Additions between passes
// ---------------------------------------------------------------------------

export interface AdditionsResult {
  freeNotes: TextSegment[];
  /** One entry per block, in the same order as `current.blocks`. */
  blocks: TextSegment[][];
  addedWordCount: number;
}

function buildWordPool(content: DayContent): Map<string, number> {
  const pool = new Map<string, number>();
  const texts = [content.freeNotes, ...content.blocks.map((block) => block.text)];
  for (const text of texts) {
    for (const token of text.match(/\S+/g) ?? []) {
      const key = wordKey(token);
      pool.set(key, (pool.get(key) ?? 0) + 1);
    }
  }
  return pool;
}

function markText(
  pool: Map<string, number> | null,
  text: string,
): { segments: TextSegment[]; added: number } {
  const pieces = text.split(/(\s+)/).filter((piece) => piece !== '');
  const isSpace = pieces.map((piece) => /^\s/.test(piece));
  let added = 0;

  const flags = pieces.map((piece, index) => {
    if (isSpace[index]) return false;
    if (pool) {
      const left = pool.get(wordKey(piece)) ?? 0;
      if (left > 0) {
        pool.set(wordKey(piece), left - 1);
        return false;
      }
    }
    added += 1;
    return true;
  });

  // Whitespace is highlighted only when it sits between two added words.
  const segments: TextSegment[] = [];
  pieces.forEach((piece, index) => {
    const flag = isSpace[index]
      ? (flags[index - 1] ?? false) && (flags[index + 1] ?? false)
      : flags[index] === true;
    const last = segments[segments.length - 1];
    if (last && last.added === flag) last.text += piece;
    else segments.push({ text: piece, added: flag });
  });
  return { segments, added };
}

/**
 * Marks the words of `current` that were not present in `previous`
 * (case and surrounding punctuation are ignored). Words are matched as a
 * multiset, so a word repeated more often than before counts as added.
 * With no previous pass, every word is added.
 */
export function markAdditions(previous: DayContent | null, current: DayContent): AdditionsResult {
  const pool = previous ? buildWordPool(previous) : null;
  const freeNotes = markText(pool, current.freeNotes);
  const blocks = current.blocks.map((block) => markText(pool, block.text));
  return {
    freeNotes: freeNotes.segments,
    blocks: blocks.map((block) => block.segments),
    addedWordCount: blocks.reduce((total, block) => total + block.added, freeNotes.added),
  };
}

export function countAddedWords(previous: DayContent | null, current: DayContent): number {
  return markAdditions(previous, current).addedWordCount;
}

// ---------------------------------------------------------------------------
// Sittings and saving
// ---------------------------------------------------------------------------

/**
 * A sitting is open while its revision has not been closed and the last
 * activity was less than 30 minutes ago.
 */
export function isSittingOpen(
  revision: Pick<DayRevision, 'closedAt'>,
  lastActivityAt: EpochMs,
  now: EpochMs,
): boolean {
  return revision.closedAt === null && now - lastActivityAt < SITTING_TIMEOUT_MS;
}

export type SavePlan =
  | { action: 'none' }
  | { action: 'create'; n: number; kind: RevisionKind }
  | { action: 'update'; n: number };

export interface PlanSaveInput {
  /** The newest revision of the day, or null if the day has none. */
  latest: DayRevision | null;
  /** When the day was last saved; falls back to the revision's creation time. */
  lastActivityAt: EpochMs | null;
  content: DayContent;
  now: EpochMs;
}

/**
 * Decides what pressing Save (or closing the day) does:
 * - nothing, if the content did not change (or an empty day stays empty),
 * - update the open revision, if the sitting is still open,
 * - otherwise create the next revision. Revision 1 is `first`, all later ones
 *   are `later`, because a closed revision is immutable.
 */
export function planSave({ latest, lastActivityAt, content, now }: PlanSaveInput): SavePlan {
  if (latest === null) {
    return isContentEmpty(content) ? { action: 'none' } : { action: 'create', n: 1, kind: 'first' };
  }
  if (contentEquals(contentOf(latest), content)) return { action: 'none' };

  const activity = lastActivityAt ?? latest.createdAt;
  if (isSittingOpen(latest, activity, now)) return { action: 'update', n: latest.n };
  return { action: 'create', n: latest.n + 1, kind: 'later' };
}

export interface BuildRevisionInput {
  plan: Exclude<SavePlan, { action: 'none' }>;
  content: DayContent;
  /** The revision before the one being written; the pass to compare against. */
  previous: DayRevision | null;
  /** The open revision being updated. Required when the plan is `update`. */
  existing: DayRevision | null;
  now: EpochMs;
}

/** Builds the revision document for a save plan, with counts and mentions filled in. */
export function buildRevision({
  plan,
  content,
  previous,
  existing,
  now,
}: BuildRevisionInput): DayRevision {
  const normalized = normalizeContent(content);
  const base = {
    freeNotes: normalized.freeNotes,
    blocks: normalized.blocks,
    mentions: extractMentionIds(normalized.freeNotes, ...normalized.blocks.map((b) => b.text)),
    wordCount: countContentWords(normalized),
    addedWordCount: countAddedWords(previous ? contentOf(previous) : null, normalized),
  };

  if (plan.action === 'create') {
    return { n: plan.n, createdAt: now, closedAt: null, kind: plan.kind, ...base };
  }
  if (existing === null || existing.n !== plan.n) {
    throw new Error(`Cannot update revision ${plan.n} without the matching open revision`);
  }
  return {
    n: existing.n,
    createdAt: existing.createdAt,
    closedAt: null,
    kind: existing.kind,
    ...base,
  };
}

/** Ends a sitting. A closed revision is immutable. */
export function closeRevision(revision: DayRevision, now: EpochMs): DayRevision {
  if (revision.closedAt !== null) {
    throw new Error(`Revision ${revision.n} is already closed`);
  }
  return { ...revision, closedAt: now };
}
