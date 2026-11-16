import { countAddedWords, countContentWords, contentOf } from './revisions';
import { streakDaysOf } from './insights';
import type { JournalRepository } from './journalRepository';
import { recallScore, type ScoreDay } from './score';
import { computeStreak } from './streak';
import { MAX_ALIASES, nextCategoryOrder, normalizeName } from './tags';
import { UNLOCK_HOUR, compareDayIds, dayIdFromUtc, toLocalParts } from './time';
import type {
  DayId,
  DayMeta,
  DayRevision,
  EpochMs,
  LibraryItem,
  LibraryRevision,
  Tag,
  TagCategory,
} from './types';

/**
 * Merges a guest journal into a signed-in account (build documentation section 15.6). It only
 * reads from the guest repository and only adds to the account: nothing already in the account
 * is overwritten or deleted. Every id it creates is derived from the guest id, so running it a
 * second time on the same data changes nothing.
 */

const TOKEN = /\{\{tag:([A-Za-z0-9_-]+)((?:\|[^{}|\s]*)?)\}\}/g;

/** Prefix of an id that replaces a guest id which the account already uses for something else. */
export const MERGED_ID_PREFIX = 'g-';

/** Rewrites every `{{tag:ID}}` mention in a text to the tag's id in the account. */
export function rewriteMentionIds(text: string, idMap: ReadonlyMap<string, string>): string {
  if (idMap.size === 0) return text;
  return text.replace(TOKEN, (whole, id: string, label: string) => {
    const next = idMap.get(id);
    return next === undefined ? whole : `{{tag:${next}${label}}}`;
  });
}

function rewriteIds(ids: readonly string[], idMap: ReadonlyMap<string, string>): string[] {
  return [...new Set(ids.map((id) => idMap.get(id) ?? id))];
}

export type MergeItemKind = 'day' | 'library' | 'tag' | 'category' | 'progress';

/** One guest entry that was not added, with the reason, so the person can export it. */
export interface MergeProblem {
  kind: MergeItemKind;
  id: string;
  reason: string;
}

export interface MergeCounts {
  categories: number;
  tags: number;
  libraryItems: number;
  days: number;
  revisions: number;
}

export interface MergeResult {
  /** What was newly written to the account in this run. */
  added: MergeCounts;
  /** Entries the account's rules would refuse (future days, today before 21:00). */
  rejected: MergeProblem[];
  /** Entries whose write failed, for example because the network dropped. */
  failed: MergeProblem[];
  /** Guest tag id to account tag id, for every guest tag. */
  tagIds: Record<string, string>;
  /** True only when nothing was rejected or failed, so the guest copy is safe to remove. */
  complete: boolean;
}

export interface MergeOptions {
  now: EpochMs;
  /** The account's UTC offset, which decides what "today" and "21:00" mean for rejection. */
  utcOffsetMinutes: number;
}

/** The counts shown in the confirmation dialog: "12 days, 5 tags and 2 library items". */
export async function countGuestJournal(guest: JournalRepository): Promise<{
  days: number;
  tags: number;
  libraryItems: number;
  isEmpty: boolean;
}> {
  const [days, tags, library] = await Promise.all([
    guest.listDays(),
    guest.listTags(),
    guest.listLibrary(),
  ]);
  return {
    days: days.length,
    tags: tags.length,
    libraryItems: library.length,
    isEmpty: days.length === 0 && tags.length === 0 && library.length === 0,
  };
}

const sameText = (a: string, b: string): boolean => a.toLocaleLowerCase() === b.toLocaleLowerCase();

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'The write failed.';
}

/** Whether the account would accept a day: not in the future, and today only from 21:00. */
export function dayAcceptedByAccount(
  dayId: DayId,
  now: EpochMs,
  utcOffsetMinutes: number,
): string | null {
  const today = dayIdFromUtc(now, utcOffsetMinutes);
  const order = compareDayIds(dayId, today);
  if (order > 0) return 'This day is in the future.';
  if (order === 0 && toLocalParts(now, utcOffsetMinutes).hour < UNLOCK_HOUR) {
    return 'Today unlocks at 9:00 PM in the account.';
  }
  return null;
}

export async function mergeGuestJournal(
  guest: JournalRepository,
  account: JournalRepository,
  options: MergeOptions,
): Promise<MergeResult> {
  const { now, utcOffsetMinutes } = options;
  const added: MergeCounts = { categories: 0, tags: 0, libraryItems: 0, days: 0, revisions: 0 };
  const rejected: MergeProblem[] = [];
  const failed: MergeProblem[] = [];

  const guarded = async (kind: MergeItemKind, id: string, work: () => Promise<void>) => {
    try {
      await work();
      return true;
    } catch (error) {
      failed.push({ kind, id, reason: errorText(error) });
      return false;
    }
  };

  const [guestCategories, guestTags, guestLibrary, guestDays] = await Promise.all([
    guest.listCategories(),
    guest.listTags(),
    guest.listLibrary(),
    guest.listDays(),
  ]);
  const [accountCategories, accountTags, accountLibrary] = await Promise.all([
    account.listCategories(),
    account.listTags(),
    account.listLibrary(),
  ]);

  // 1. Tag categories, matched by name.
  const categoryIds = new Map<string, string>();
  const knownCategories: TagCategory[] = [...accountCategories];
  for (const category of guestCategories) {
    const match = knownCategories.find((c) => sameText(c.name, category.name));
    if (match) {
      categoryIds.set(category.id, match.id);
      continue;
    }
    const id = knownCategories.some((c) => c.id === category.id)
      ? `${MERGED_ID_PREFIX}${category.id}`
      : category.id;
    const created: TagCategory = {
      ...category,
      id,
      isDefault: false,
      order: nextCategoryOrder(knownCategories),
    };
    const ok = await guarded('category', category.id, () => account.putCategory(created));
    if (!ok) continue;
    knownCategories.push(created);
    categoryIds.set(category.id, id);
    added.categories += 1;
  }

  // 2. Tags: same name in the same category merges into the account's tag.
  const tagIds = new Map<string, string>();
  const knownTags: Tag[] = [...accountTags];
  for (const tag of guestTags) {
    const categoryId = categoryIds.get(tag.categoryId);
    if (categoryId === undefined) {
      failed.push({ kind: 'tag', id: tag.id, reason: 'Its category could not be added.' });
      continue;
    }
    const match = knownTags.find((t) => t.categoryId === categoryId && sameText(t.name, tag.name));
    if (match) {
      tagIds.set(tag.id, match.id);
      const aliases = [...match.aliases];
      for (const alias of [tag.name, ...tag.aliases]) {
        const clean = normalizeName(alias);
        if (
          clean !== '' &&
          !sameText(clean, match.name) &&
          !aliases.some((a) => sameText(a, clean))
        ) {
          aliases.push(clean);
        }
      }
      const merged: Tag = {
        ...match,
        aliases: aliases.slice(0, Math.max(MAX_ALIASES, match.aliases.length)),
        note: match.note ?? tag.note,
      };
      const changed = merged.aliases.length !== match.aliases.length || merged.note !== match.note;
      if (changed) {
        const ok = await guarded('tag', tag.id, () => account.putTag(merged));
        if (!ok) continue;
        knownTags[knownTags.indexOf(match)] = merged;
      }
      continue;
    }
    const id = knownTags.some((t) => t.id === tag.id) ? `${MERGED_ID_PREFIX}${tag.id}` : tag.id;
    const created: Tag = { ...tag, id, categoryId };
    const ok = await guarded('tag', tag.id, () => account.putTag(created));
    if (!ok) continue;
    knownTags.push(created);
    tagIds.set(tag.id, id);
    added.tags += 1;
  }

  // 3. Library items. An item the account already holds from an earlier run is skipped.
  const takenLibraryIds = new Set(accountLibrary.map((item) => item.id));
  const libraryById = new Map<string, LibraryItem>(accountLibrary.map((item) => [item.id, item]));
  const sameItem = (a: LibraryItem, b: LibraryItem) =>
    a.type === b.type &&
    a.title === b.title &&
    a.date === b.date &&
    a.latestRevision === b.latestRevision &&
    a.updatedAt === b.updatedAt;

  for (const item of guestLibrary) {
    const altId = `${MERGED_ID_PREFIX}${item.id}`;
    const direct = libraryById.get(item.id);
    const alt = libraryById.get(altId);
    if ((direct && sameItem(direct, item)) || (alt && sameItem(alt, item))) continue;

    const id = takenLibraryIds.has(item.id) ? altId : item.id;
    await guarded('library', item.id, async () => {
      const revisions = await guest.listLibraryRevisions(item.id);
      for (const revision of revisions) {
        const copy: LibraryRevision = {
          ...revision,
          text: rewriteMentionIds(revision.text, tagIds),
          mentions: rewriteIds(revision.mentions, tagIds),
          closedAt: revision.closedAt ?? now,
        };
        await account.putLibraryRevision(id, copy);
        added.revisions += 1;
      }
      // The item goes last, so it never shows text that has no revision behind it.
      await account.putLibraryItem({
        ...item,
        id,
        text: rewriteMentionIds(item.text, tagIds),
        mentions: rewriteIds(item.mentions, tagIds),
      });
      takenLibraryIds.add(id);
      added.libraryItems += 1;
    });
  }

  // 4. Days with their revisions.
  for (const day of guestDays) {
    const reason = dayAcceptedByAccount(day.date, now, utcOffsetMinutes);
    if (reason !== null) {
      rejected.push({ kind: 'day', id: day.date, reason });
      continue;
    }
    await guarded('day', day.date, async () => {
      const [guestRevisions, existingMeta, accountRevisions] = await Promise.all([
        guest.listRevisions(day.date),
        account.getDay(day.date),
        account.listRevisions(day.date),
      ]);
      const own = [...accountRevisions].sort((a, b) => a.n - b.n);
      const incoming = [...guestRevisions].sort((a, b) => a.n - b.n);
      // A guest pass that is already in the account (same start time) was merged before.
      const fresh = incoming.filter(
        (revision) => !own.some((existing) => existing.createdAt === revision.createdAt),
      );
      if (fresh.length === 0 && existingMeta !== null) return;

      const appending = own.length > 0;
      let previous: DayRevision | null = own[own.length - 1] ?? null;
      let nextN = (previous?.n ?? 0) + 1;
      const written: DayRevision[] = [];

      for (const revision of fresh) {
        const content = {
          freeNotes: rewriteMentionIds(revision.freeNotes, tagIds),
          blocks: revision.blocks.map((block) => ({
            ...block,
            text: rewriteMentionIds(block.text, tagIds),
          })),
        };
        const copy: DayRevision = appending
          ? {
              ...revision,
              n: nextN,
              kind: 'later',
              ...content,
              mentions: rewriteIds(revision.mentions, tagIds),
              wordCount: countContentWords(content),
              addedWordCount: countAddedWords(previous ? contentOf(previous) : null, content),
              closedAt: revision.closedAt ?? now,
            }
          : {
              ...revision,
              ...content,
              mentions: rewriteIds(revision.mentions, tagIds),
              closedAt: revision.closedAt ?? now,
            };
        await account.putRevision(day.date, copy);
        written.push(copy);
        previous = copy;
        nextN = copy.n + 1;
        added.revisions += 1;
      }

      const latest = previous;
      if (latest === null) return;
      const meta: DayMeta = {
        date: day.date,
        latestRevision: latest.n,
        wordCount: latest.wordCount,
        updatedAt: Math.max(existingMeta?.updatedAt ?? 0, day.updatedAt),
        firstWrittenAt: Math.min(
          existingMeta?.firstWrittenAt ?? day.firstWrittenAt,
          day.firstWrittenAt,
        ),
        mentions: latest.mentions,
      };
      await account.putDay(meta);
      if (existingMeta === null) added.days += 1;
    });
  }

  // 5. Lesson progress is combined.
  await guarded('progress', 'tutorials', async () => {
    const [mine, theirs] = await Promise.all([
      guest.getTutorialProgress(),
      account.getTutorialProgress(),
    ]);
    const completed = [...new Set([...theirs.completed, ...mine.completed])];
    if (completed.length !== theirs.completed.length) {
      await account.putTutorialProgress({ completed });
    }
  });

  // 6. A brand-new account takes the guest settings; an existing account keeps its own.
  await guarded('progress', 'settings', async () => {
    const [accountSettings, guestSettings] = await Promise.all([
      account.getSettings(),
      guest.getSettings(),
    ]);
    if (accountSettings === null && guestSettings !== null) {
      await account.putSettings(guestSettings);
    }
  });

  // 7. Streak, freezes and score are worked out again from every merged day.
  await guarded('progress', 'stats', async () => {
    const today = dayIdFromUtc(now, utcOffsetMinutes);
    const metas = await account.listDays();
    const scoreDays: ScoreDay[] = [];
    for (const meta of metas) {
      scoreDays.push({ dayId: meta.date, revisions: await account.listRevisions(meta.date) });
    }
    const streak = computeStreak(streakDaysOf(scoreDays, utcOffsetMinutes), today);
    await account.putStats({
      ...streak,
      recallScore: recallScore(scoreDays, today) ?? 0,
      scoreUpdatedAt: now,
    });
  });

  return {
    added,
    rejected,
    failed,
    tagIds: Object.fromEntries(tagIds),
    complete: rejected.length === 0 && failed.length === 0,
  };
}
