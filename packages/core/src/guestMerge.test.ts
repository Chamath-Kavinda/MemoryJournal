import { mergeGuestJournal, rewriteMentionIds, countGuestJournal } from './guestMerge';
import { LocalRepository, type KeyValueStore } from './localRepository';
import type { DayMeta, DayRevision, Tag, TagCategory } from './types';

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
    getAllKeys: async () => [...data.keys()],
  };
}

// 2026-11-16 22:00 in UTC+05:30 is 16:30 UTC.
const NOW = Date.UTC(2026, 10, 16, 16, 30);
const OFFSET = 330;
const options = { now: NOW, utcOffsetMinutes: OFFSET };

const category = (id: string, name: string, order = 0): TagCategory => ({
  id,
  name,
  isDefault: false,
  order,
});

const tag = (id: string, name: string, categoryId: string, extra: Partial<Tag> = {}): Tag => ({
  id,
  name,
  categoryId,
  note: null,
  aliases: [],
  createdAt: 1,
  ...extra,
});

const revision = (n: number, text: string, createdAt: number, extra = {}): DayRevision => ({
  n,
  createdAt,
  closedAt: createdAt + 1,
  kind: n === 1 ? 'first' : 'later',
  freeNotes: '',
  blocks: [{ hour: 9, minute: null, text }],
  mentions: [],
  wordCount: text.split(/\s+/).length,
  addedWordCount: text.split(/\s+/).length,
  ...extra,
});

const meta = (date: string, latest: number, first: number, updated = first): DayMeta => ({
  date,
  latestRevision: latest,
  wordCount: 3,
  updatedAt: updated,
  firstWrittenAt: first,
});

async function saveDay(repo: LocalRepository, day: DayMeta, revisions: DayRevision[]) {
  await repo.putDay(day);
  for (const r of revisions) await repo.putRevision(day.date, r);
}

describe('rewriteMentionIds', () => {
  it('rewrites ids and keeps stored names', () => {
    const map = new Map([['a', 'z']]);
    expect(rewriteMentionIds('hi {{tag:a|Ana}} and {{tag:b}}', map)).toBe(
      'hi {{tag:z|Ana}} and {{tag:b}}',
    );
  });
});

describe('mergeGuestJournal', () => {
  it('counts the guest journal', async () => {
    const guest = new LocalRepository(memoryStore());
    expect((await countGuestJournal(guest)).isEmpty).toBe(true);
    await guest.putTag(tag('t1', 'Ana', 'people'));
    expect(await countGuestJournal(guest)).toMatchObject({ tags: 1, isEmpty: false });
  });

  it('copies new days, tags and library items and rewrites mentions', async () => {
    const guest = new LocalRepository(memoryStore());
    const account = new LocalRepository(memoryStore());
    await account.putCategory(category('people', 'People'));
    await account.putTag(tag('acc1', 'Ana', 'people', { note: 'from work' }));
    await guest.putCategory(category('gp', 'people'));
    await guest.putTag(tag('g1', 'ana', 'gp', { note: 'ignored', aliases: ['Annie'] }));
    await guest.putTag(tag('g2', 'Kandy', 'gp'));
    await saveDay(guest, meta('2026-11-10', 1, 100), [
      revision(1, 'met {{tag:g1|Ana}} today', 100, { mentions: ['g1'] }),
    ]);

    const result = await mergeGuestJournal(guest, account, options);

    expect(result.complete).toBe(true);
    expect(result.tagIds).toEqual({ g1: 'acc1', g2: 'g2' });
    const tags = await account.listTags();
    const ana = tags.find((t) => t.id === 'acc1');
    expect(ana?.note).toBe('from work');
    expect(ana?.aliases).toContain('Annie');
    const [rev] = await account.listRevisions('2026-11-10');
    expect(rev?.blocks[0]?.text).toBe('met {{tag:acc1|Ana}} today');
    expect(rev?.mentions).toEqual(['acc1']);
    expect(rev?.closedAt).not.toBeNull();
  });

  it('appends guest passes after the account passes without touching them', async () => {
    const guest = new LocalRepository(memoryStore());
    const account = new LocalRepository(memoryStore());
    const own = revision(1, 'account text here', 500);
    await saveDay(account, meta('2026-11-10', 1, 500), [own]);
    await saveDay(guest, meta('2026-11-10', 1, 100), [revision(1, 'guest text here too', 100)]);

    await mergeGuestJournal(guest, account, options);

    const revisions = await account.listRevisions('2026-11-10');
    expect(revisions.map((r) => [r.n, r.kind])).toEqual([
      [1, 'first'],
      [2, 'later'],
    ]);
    expect(revisions[0]).toEqual(own);
    expect(revisions[1]?.createdAt).toBe(100);
    const day = await account.getDay('2026-11-10');
    expect(day?.latestRevision).toBe(2);
    expect(day?.firstWrittenAt).toBe(100);
  });

  it('can be run twice with the same result', async () => {
    const guest = new LocalRepository(memoryStore());
    const account = new LocalRepository(memoryStore());
    await account.putCategory(category('people', 'People'));
    await saveDay(account, meta('2026-11-10', 1, 500), [revision(1, 'account text', 500)]);
    await saveDay(guest, meta('2026-11-10', 1, 100), [revision(1, 'guest text', 100)]);
    await saveDay(guest, meta('2026-11-11', 1, 200), [revision(1, 'another day', 200)]);
    await guest.putCategory(category('c1', 'Songs'));
    await guest.putTag(tag('s1', 'Waltz', 'c1'));

    await mergeGuestJournal(guest, account, options);
    const snapshot = JSON.stringify([
      await account.listDays(),
      await account.listRevisions('2026-11-10'),
      await account.listRevisions('2026-11-11'),
      await account.listTags(),
      await account.listCategories(),
    ]);
    await mergeGuestJournal(guest, account, options);
    expect(
      JSON.stringify([
        await account.listDays(),
        await account.listRevisions('2026-11-10'),
        await account.listRevisions('2026-11-11'),
        await account.listTags(),
        await account.listCategories(),
      ]),
    ).toBe(snapshot);
  });

  it('rejects future days and today before 21:00 and keeps them in the guest journal', async () => {
    const guest = new LocalRepository(memoryStore());
    const account = new LocalRepository(memoryStore());
    await saveDay(guest, meta('2026-11-20', 1, 1), [revision(1, 'future', 1)]);
    const early = { now: Date.UTC(2026, 10, 16, 10, 0), utcOffsetMinutes: OFFSET };
    await saveDay(guest, meta('2026-11-16', 1, 1), [revision(1, 'today', 1)]);

    const result = await mergeGuestJournal(guest, account, early);

    expect(result.complete).toBe(false);
    expect(result.rejected.map((p) => p.id).sort()).toEqual(['2026-11-16', '2026-11-20']);
    expect(await account.listDays()).toEqual([]);
    expect((await guest.listDays()).length).toBe(2);
  });

  it('reports failed writes and keeps going', async () => {
    const guest = new LocalRepository(memoryStore());
    const account = new LocalRepository(memoryStore());
    await saveDay(guest, meta('2026-11-10', 1, 1), [revision(1, 'one', 1)]);
    await saveDay(guest, meta('2026-11-11', 1, 2), [revision(1, 'two', 2)]);
    const real = account.putRevision.bind(account);
    account.putRevision = async (dayId, r) => {
      if (dayId === '2026-11-10') throw new Error('offline');
      return real(dayId, r);
    };

    const result = await mergeGuestJournal(guest, account, options);

    expect(result.complete).toBe(false);
    expect(result.failed).toEqual([{ kind: 'day', id: '2026-11-10', reason: 'offline' }]);
    expect((await account.listDays()).map((d) => d.date)).toEqual(['2026-11-11']);
  });

  it('combines lesson progress and gives a new account the guest settings', async () => {
    const guest = new LocalRepository(memoryStore());
    const account = new LocalRepository(memoryStore());
    await guest.putTutorialProgress({ completed: ['a', 'b'] });
    await account.putTutorialProgress({ completed: ['b', 'c'] });
    await guest.putSettings({ reminderEnabled: false, theme: 'light' });

    await mergeGuestJournal(guest, account, options);

    expect((await account.getTutorialProgress()).completed.sort()).toEqual(['a', 'b', 'c']);
    expect(await account.getSettings()).toEqual({ reminderEnabled: false, theme: 'light' });

    await account.putSettings({ reminderEnabled: true, theme: 'dark' });
    await mergeGuestJournal(guest, account, options);
    expect(await account.getSettings()).toEqual({ reminderEnabled: true, theme: 'dark' });
  });
});
