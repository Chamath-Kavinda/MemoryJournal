import { LocalRepository, type KeyValueStore } from './localRepository';
import type { DayMeta, DayRevision, LibraryItem, LibraryRevision, Tag } from './types';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
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

const meta = (date: string): DayMeta => ({
  date,
  latestRevision: 1,
  wordCount: 3,
  updatedAt: 1,
  firstWrittenAt: 1,
});

const revision = (n: number): DayRevision => ({
  n,
  createdAt: n,
  closedAt: n,
  kind: n === 1 ? 'first' : 'later',
  freeNotes: '',
  blocks: [{ hour: 9, minute: null, text: `pass ${n}` }],
  mentions: [],
  wordCount: 2,
  addedWordCount: 2,
});

const libraryItem = (id: string): LibraryItem => ({
  id,
  type: 'book',
  title: 'Dune',
  date: null,
  text: 'text',
  latestRevision: 1,
  updatedAt: 1,
  wordCount: 1,
  mentions: [],
});

const libraryRevision = (n: number): LibraryRevision => ({
  n,
  createdAt: n,
  closedAt: n,
  kind: 'first',
  text: 'text',
  mentions: [],
  wordCount: 1,
  addedWordCount: 1,
});

describe('LocalRepository', () => {
  it('stores and reads days and their revisions in order', async () => {
    const repo = new LocalRepository(memoryStore());
    await repo.putDay(meta('2026-11-14'));
    await repo.putDay(meta('2026-11-13'));
    await repo.putRevision('2026-11-14', revision(10));
    await repo.putRevision('2026-11-14', revision(2));
    await repo.putRevision('2026-11-13', revision(1));

    expect((await repo.listDays()).map((d) => d.date)).toEqual(['2026-11-13', '2026-11-14']);
    expect(await repo.getDay('2026-11-14')).toEqual(meta('2026-11-14'));
    expect(await repo.getDay('2026-01-01')).toBeNull();
    expect((await repo.listRevisions('2026-11-14')).map((r) => r.n)).toEqual([2, 10]);
  });

  it('stores tags and categories and deletes them', async () => {
    const repo = new LocalRepository(memoryStore());
    const tag: Tag = {
      id: 't1',
      name: 'Sam',
      categoryId: 'c1',
      note: null,
      aliases: [],
      createdAt: 1,
    };
    await repo.putCategory({ id: 'c1', name: 'People', isDefault: true, order: 0 });
    await repo.putTag(tag);
    expect(await repo.listTags()).toEqual([tag]);
    expect(await repo.listCategories()).toHaveLength(1);

    await repo.deleteTag('t1');
    await repo.deleteCategory('c1');
    expect(await repo.listTags()).toEqual([]);
    expect(await repo.listCategories()).toEqual([]);
  });

  it('stores library items and removes their revisions with them', async () => {
    const repo = new LocalRepository(memoryStore());
    await repo.putLibraryItem(libraryItem('a'));
    await repo.putLibraryItem(libraryItem('b'));
    await repo.putLibraryRevision('a', libraryRevision(1));
    await repo.putLibraryRevision('b', libraryRevision(1));

    await repo.deleteLibraryItem('a');

    expect((await repo.listLibrary()).map((i) => i.id)).toEqual(['b']);
    expect(await repo.listLibraryRevisions('a')).toEqual([]);
    expect(await repo.listLibraryRevisions('b')).toHaveLength(1);
  });

  it('defaults tutorial progress, settings, stats and the last seen time', async () => {
    const repo = new LocalRepository(memoryStore());
    expect(await repo.getTutorialProgress()).toEqual({ completed: [] });
    expect(await repo.getSettings()).toBeNull();
    expect(await repo.getStats()).toBeNull();
    expect(await repo.getLastSeenAt()).toBeNull();

    await repo.putTutorialProgress({ completed: ['a'] });
    await repo.putSettings({ reminderEnabled: true, theme: 'dark' });
    await repo.putLastSeenAt(99);
    expect(await repo.getTutorialProgress()).toEqual({ completed: ['a'] });
    expect(await repo.getSettings()).toEqual({ reminderEnabled: true, theme: 'dark' });
    expect(await repo.getLastSeenAt()).toBe(99);
  });

  it('clears only guest keys', async () => {
    const store = memoryStore();
    await store.setItem('other:key', 'keep');
    const repo = new LocalRepository(store);
    await repo.putDay(meta('2026-11-14'));
    await repo.putLastSeenAt(1);

    await repo.clearAll();

    expect(await repo.listDays()).toEqual([]);
    expect(await repo.getLastSeenAt()).toBeNull();
    expect(store.data.get('other:key')).toBe('keep');
  });

  it('saves a revision with its day, and closes the earlier sitting in the same save', async () => {
    const repo = new LocalRepository(memoryStore());
    await repo.saveDay({
      dayId: '2026-11-14',
      revision: { ...revision(1), closedAt: null },
      meta: meta('2026-11-14'),
    });
    await repo.saveDay({
      dayId: '2026-11-14',
      revision: revision(2),
      meta: { ...meta('2026-11-14'), latestRevision: 2 },
      close: { n: 1, closedAt: 50 },
    });

    const revisions = await repo.listRevisions('2026-11-14');
    expect(revisions.map((r) => [r.n, r.closedAt])).toEqual([
      [1, 50],
      [2, 2],
    ]);
    expect((await repo.getDay('2026-11-14'))?.latestRevision).toBe(2);
  });

  it('tells listeners once per change and stops after unsubscribe', async () => {
    const repo = new LocalRepository(memoryStore());
    const listener = jest.fn();
    const stop = repo.subscribe(listener);

    await repo.putTag({
      id: 't1',
      name: 'Sam',
      categoryId: 'c1',
      note: null,
      aliases: [],
      createdAt: 1,
    });
    expect(listener).toHaveBeenCalledTimes(1);

    await repo.saveDay({ dayId: '2026-11-14', revision: revision(1), meta: meta('2026-11-14') });
    expect(listener).toHaveBeenCalledTimes(2);

    await repo.putLastSeenAt(5);
    expect(listener).toHaveBeenCalledTimes(2);

    await repo.clearAll();
    expect(listener).toHaveBeenCalledTimes(3);

    stop();
    await repo.putSettings({ reminderEnabled: false, theme: 'dark' });
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
