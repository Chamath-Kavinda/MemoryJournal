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

describe('guest, account A, new account B and account A again', () => {
  it('each shows only its own data, and the device keeps nothing between sign-ins', async () => {
    const device = new LocalRepository(memoryStore());
    const accountA = new LocalRepository(memoryStore());
    const accountB = new LocalRepository(memoryStore());
    const dayCount = async (repo: LocalRepository) => (await repo.listDays()).length;

    // A guest writes on the device, then signs in as A and the journal is merged.
    await device.putCategory(category('people', 'People'));
    await device.putTag(tag('g1', 'Ana', 'people'));
    await saveDay(device, meta('2026-11-10', 1, 100), [revision(1, 'guest day', 100)]);
    const merged = await mergeGuestJournal(device, accountA, options);
    expect(merged.complete).toBe(true);

    // Only after a complete merge is the guest copy removed from the device.
    await device.clearAll();
    expect(await countGuestJournal(device)).toMatchObject({ days: 0, tags: 0, isEmpty: true });
    expect(await dayCount(accountA)).toBe(1);

    // A also writes a second day in the cloud; sign out wipes the device again.
    await saveDay(accountA, meta('2026-11-11', 1, 200), [revision(1, 'account day', 200)]);

    // A new account B starts empty and never receives anything of A.
    expect(await dayCount(accountB)).toBe(0);
    expect(await accountB.listTags()).toEqual([]);
    expect((await countGuestJournal(device)).isEmpty).toBe(true);

    // B writes its own day. A is unchanged.
    await saveDay(accountB, meta('2026-11-12', 1, 300), [revision(1, 'b day', 300)]);
    expect((await accountA.listDays()).map((d) => d.date).sort()).toEqual([
      '2026-11-10',
      '2026-11-11',
    ]);
    expect((await accountB.listDays()).map((d) => d.date)).toEqual(['2026-11-12']);

    // Signing back in as A brings A's data and tags back, and nothing of B.
    expect((await accountA.listTags()).map((t) => t.name)).toEqual(['Ana']);
    expect(await accountA.getDay('2026-11-12')).toBeNull();
    expect((await accountA.listRevisions('2026-11-10'))[0]?.blocks[0]?.text).toBe('guest day');
  });

  it('keeps the guest data on the device when the merge is incomplete', async () => {
    const device = new LocalRepository(memoryStore());
    const account = new LocalRepository(memoryStore());
    await saveDay(device, meta('2026-11-10', 1, 100), [revision(1, 'guest day', 100)]);
    const failing = Object.create(account) as LocalRepository;
    failing.putRevision = async () => {
      throw new Error('offline');
    };

    const result = await mergeGuestJournal(device, failing, options);

    expect(result.complete).toBe(false);
    // The caller deletes the guest copy only when `complete` is true, so it is still there.
    expect(await countGuestJournal(device)).toMatchObject({ days: 1, isEmpty: false });
  });
});
