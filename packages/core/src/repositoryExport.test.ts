import { EXPORT_FORMAT } from './accountData';
import { LocalRepository, type KeyValueStore } from './localRepository';
import { exportFromRepository } from './repositoryExport';
import type { DayMeta, DayRevision, LibraryItem, LibraryRevision, Tag, TagCategory } from './types';

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

const NOW = Date.UTC(2026, 10, 16, 12, 0, 0);

const meta = (date: string): DayMeta => ({
  date,
  latestRevision: 2,
  wordCount: 5,
  updatedAt: 10,
  firstWrittenAt: 5,
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

const category: TagCategory = { id: 'c1', name: 'People', isDefault: true, order: 0 };
const tag: Tag = {
  id: 't1',
  name: 'Maya',
  categoryId: 'c1',
  note: null,
  aliases: [],
  createdAt: 1,
};
const item: LibraryItem = {
  id: 'l1',
  type: 'book',
  title: 'Dune',
  date: null,
  text: 'sand',
  latestRevision: 1,
  updatedAt: 1,
  wordCount: 1,
  mentions: [],
};
const itemRevision: LibraryRevision = {
  n: 1,
  createdAt: 1,
  closedAt: 1,
  kind: 'first',
  text: 'sand',
  mentions: [],
  wordCount: 1,
  addedWordCount: 1,
};

describe('exportFromRepository', () => {
  it('exports an empty journal with no profile and no lessons', async () => {
    const bundle = await exportFromRepository(new LocalRepository(memoryStore()), NOW);

    expect(bundle.format).toBe(EXPORT_FORMAT);
    expect(bundle.exportedAt).toBe('2026-11-16T12:00:00.000Z');
    expect(bundle.profile).toBeNull();
    expect(bundle.days).toEqual([]);
    expect(bundle.library).toEqual([]);
    expect(bundle.tags).toEqual([]);
    expect(bundle.tagCategories).toEqual([]);
    expect(bundle.tutorials).toEqual({ completed: [] });
  });

  it('includes every day with its revisions in number order, plus library, tags and progress', async () => {
    const repo = new LocalRepository(memoryStore());
    await repo.putDay(meta('2026-11-15'));
    await repo.putDay(meta('2026-11-14'));
    await repo.putRevision('2026-11-14', revision(10));
    await repo.putRevision('2026-11-14', revision(2));
    await repo.putRevision('2026-11-15', revision(1));
    await repo.putCategory(category);
    await repo.putTag(tag);
    await repo.putLibraryItem(item);
    await repo.putLibraryRevision('l1', itemRevision);
    await repo.putTutorialProgress({ completed: ['memory-palace'] });
    await repo.putSettings({ reminderEnabled: false, theme: 'light' });

    const bundle = await exportFromRepository(repo, NOW);

    expect(bundle.days.map((d) => d.id)).toEqual(['2026-11-14', '2026-11-15']);
    expect(bundle.days[0]?.revisions.map((r) => r.id)).toEqual(['2', '10']);
    expect(bundle.days[0]?.data).toMatchObject({ date: '2026-11-14', wordCount: 5 });
    expect(bundle.library[0]?.revisions.map((r) => r.id)).toEqual(['1']);
    expect(bundle.tags[0]?.data).toMatchObject({ name: 'Maya' });
    expect(bundle.tagCategories[0]?.id).toBe('c1');
    expect(bundle.tutorials).toEqual({ completed: ['memory-palace'] });
    expect(bundle.profile).toEqual({
      settings: { reminderEnabled: false, theme: 'light' },
      stats: null,
    });
  });

  it('rejects when a read fails, so a partial file is never produced', async () => {
    const repo = new LocalRepository(memoryStore());
    jest.spyOn(repo, 'listTags').mockRejectedValue(new Error('read failed'));

    await expect(exportFromRepository(repo, NOW)).rejects.toThrow('read failed');
  });
});
