import {
  LocalRepository,
  buildRevision,
  libraryContent,
  toLibraryRevision,
  type JournalRepository,
  type KeyValueStore,
  type LibraryItem,
  type LibraryRevision,
} from '@memory-journal/core';

import {
  closeLibrarySitting,
  createLibraryItem,
  saveLibraryText,
  subscribeLibrary,
  subscribeLibraryHistory,
  subscribeMentionedLibraryItems,
  updateLibraryItemInfo,
} from './libraryService';

const T0 = Date.UTC(2026, 10, 13, 15, 0);
const MINUTE = 60_000;
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => Promise.resolve(data.get(key) ?? null),
    setItem: (key, value) => {
      data.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      data.delete(key);
      return Promise.resolve();
    },
    getAllKeys: () => Promise.resolve([...data.keys()]),
  };
}

const item = (overrides: Partial<LibraryItem> = {}): LibraryItem => ({
  id: 'i1',
  type: 'movie',
  title: 'Heat',
  date: null,
  text: '',
  latestRevision: 0,
  updatedAt: T0,
  wordCount: 0,
  mentions: [],
  ...overrides,
});

function pass(n: number, text: string, overrides: Partial<LibraryRevision> = {}): LibraryRevision {
  const built = buildRevision({
    plan: { action: 'create', n, kind: n === 1 ? 'first' : 'later' },
    content: libraryContent(text),
    previous: null,
    existing: null,
    now: T0,
  });
  return { ...toLibraryRevision(built), ...overrides };
}

async function seed(repository: JournalRepository, revisions: LibraryRevision[]) {
  const last = revisions[revisions.length - 1]!;
  for (const revision of revisions) await repository.putLibraryRevision('i1', revision);
  await repository.putLibraryItem(
    item({ text: last.text, latestRevision: last.n, wordCount: last.wordCount, updatedAt: T0 }),
  );
}

describe('createLibraryItem', () => {
  it('returns the id at once and stores an empty page', async () => {
    const repository = new LocalRepository(memoryStore());

    const { id, saved } = createLibraryItem(
      repository,
      { type: 'book', title: 'Dune', date: '2026-11-01' },
      T0,
    );
    await saved;

    expect(id).toMatch(/^[A-Za-z0-9]{20}$/);
    expect(await repository.listLibrary()).toEqual([
      {
        id,
        type: 'book',
        title: 'Dune',
        date: '2026-11-01',
        text: '',
        latestRevision: 0,
        updatedAt: T0,
        wordCount: 0,
        mentions: [],
      },
    ]);
  });

  it('gives every item its own id', () => {
    const repository = new LocalRepository(memoryStore());
    const draft = { type: 'movie' as const, title: 'Heat', date: null };

    expect(createLibraryItem(repository, draft, T0).id).not.toBe(
      createLibraryItem(repository, draft, T0).id,
    );
  });
});

describe('updateLibraryItemInfo', () => {
  it('changes only the title and the date', async () => {
    const repository = new LocalRepository(memoryStore());
    await seed(repository, [pass(1, 'A slow, lovely film')]);

    await updateLibraryItemInfo(repository, 'i1', { title: '  Ronin ', date: null });

    const [stored] = await repository.listLibrary();
    expect(stored).toEqual(
      expect.objectContaining({
        title: 'Ronin',
        date: null,
        text: 'A slow, lovely film',
        latestRevision: 1,
      }),
    );
  });

  it('refuses an empty title and writes nothing', async () => {
    const repository = new LocalRepository(memoryStore());
    const put = jest.spyOn(repository, 'putLibraryItem');

    await expect(
      updateLibraryItemInfo(repository, 'i1', { title: '   ', date: null }),
    ).rejects.toThrow(/Invalid library item/);
    expect(put).not.toHaveBeenCalled();
  });

  it('says so when the item is gone', async () => {
    const repository = new LocalRepository(memoryStore());

    await expect(
      updateLibraryItemInfo(repository, 'missing', { title: 'Heat', date: null }),
    ).rejects.toThrow('no longer exists');
  });
});

describe('saveLibraryText', () => {
  it('creates revision 1 and the item summary together, with no 9 PM lock', async () => {
    const repository = new LocalRepository(memoryStore());
    await repository.putLibraryItem(item());
    const saveLibraryPage = jest.spyOn(repository, 'saveLibraryPage');

    const outcome = await saveLibraryText(
      repository,
      { item: item(), revisions: [], lastActivityAt: null },
      'A slow, lovely film',
      T0,
    );

    expect(outcome.saved).toBe(true);
    expect(saveLibraryPage).toHaveBeenCalledTimes(1);
    expect(saveLibraryPage.mock.calls[0]![0].close).toBeUndefined();
    expect(await repository.listLibraryRevisions('i1')).toEqual([
      expect.objectContaining({ n: 1, kind: 'first', text: 'A slow, lovely film' }),
    ]);
    expect((await repository.listLibrary())[0]).toEqual(
      expect.objectContaining({
        title: 'Heat',
        text: 'A slow, lovely film',
        latestRevision: 1,
        wordCount: 4,
        updatedAt: T0,
        mentions: [],
      }),
    );
  });

  it('writes nothing when the text did not change', async () => {
    const repository = new LocalRepository(memoryStore());
    const saveLibraryPage = jest.spyOn(repository, 'saveLibraryPage');

    const outcome = await saveLibraryText(
      repository,
      { item: item(), revisions: [pass(1, 'Same words')], lastActivityAt: T0 },
      'Same words',
      T0 + MINUTE,
    );

    expect(outcome).toEqual({ saved: false });
    expect(saveLibraryPage).not.toHaveBeenCalled();
  });

  it('updates the open revision while the sitting goes on', async () => {
    const repository = new LocalRepository(memoryStore());
    await seed(repository, [pass(1, 'Same words')]);

    const outcome = await saveLibraryText(
      repository,
      { item: item(), revisions: [pass(1, 'Same words')], lastActivityAt: T0 },
      'Same words and more',
      T0 + 5 * MINUTE,
    );

    expect(outcome.saved).toBe(true);
    const revisions = await repository.listLibraryRevisions('i1');
    expect(revisions).toHaveLength(1);
    expect(revisions[0]).toEqual(expect.objectContaining({ n: 1, text: 'Same words and more' }));
  });

  it('starts revision 2 after a quiet hour and closes the forgotten sitting at its last save', async () => {
    const repository = new LocalRepository(memoryStore());
    await seed(repository, [pass(1, 'Same words')]);

    const outcome = await saveLibraryText(
      repository,
      { item: item(), revisions: [pass(1, 'Same words')], lastActivityAt: T0 },
      'Same words and a new thought',
      T0 + 60 * MINUTE,
    );

    expect(outcome.saved).toBe(true);
    const [one, two] = await repository.listLibraryRevisions('i1');
    expect(one).toEqual(expect.objectContaining({ n: 1, closedAt: T0 }));
    expect(two).toEqual(expect.objectContaining({ n: 2, kind: 'later', closedAt: null }));
    expect((await repository.listLibrary())[0]).toEqual(
      expect.objectContaining({ latestRevision: 2 }),
    );
  });

  it('lets a failed save reach the caller', async () => {
    const repository = new LocalRepository(memoryStore());
    jest.spyOn(repository, 'saveLibraryPage').mockRejectedValue(new Error('permission-denied'));

    await expect(
      saveLibraryText(
        repository,
        { item: item(), revisions: [], lastActivityAt: null },
        'Hello there',
        T0,
      ),
    ).rejects.toThrow('permission-denied');
  });
});

describe('closeLibrarySitting', () => {
  it('sets closedAt on the revision', async () => {
    const repository = new LocalRepository(memoryStore());
    await repository.putLibraryRevision('i1', pass(1, 'Words'));

    await closeLibrarySitting(repository, 'i1', pass(1, 'Words'), T0 + MINUTE);

    expect(await repository.listLibraryRevisions('i1')).toEqual([
      expect.objectContaining({ n: 1, closedAt: T0 + MINUTE }),
    ]);
  });

  it('refuses to close a revision that is already closed', async () => {
    const repository = new LocalRepository(memoryStore());
    const put = jest.spyOn(repository, 'putLibraryRevision');

    await expect(
      closeLibrarySitting(repository, 'i1', pass(1, 'Words', { closedAt: T0 }), T0 + MINUTE),
    ).rejects.toThrow('already closed');
    expect(put).not.toHaveBeenCalled();
  });
});

describe('subscribeLibrary', () => {
  it('lists the items now, again after a change, and stops after unsubscribe', async () => {
    const repository = new LocalRepository(memoryStore());
    await repository.putLibraryItem(item());
    const onChange = jest.fn();

    const stop = subscribeLibrary(repository, onChange, jest.fn());
    await settle();
    expect(onChange).toHaveBeenLastCalledWith([item()]);

    await repository.putLibraryItem(item({ id: 'i2', title: 'Ronin' }));
    await settle();
    expect(onChange).toHaveBeenLastCalledWith([item(), item({ id: 'i2', title: 'Ronin' })]);

    stop();
    const calls = onChange.mock.calls.length;
    await repository.putLibraryItem(item({ id: 'i3' }));
    await settle();
    expect(onChange).toHaveBeenCalledTimes(calls);
  });

  it('passes a failed read on', async () => {
    const repository = new LocalRepository(memoryStore());
    const failure = new Error('permission-denied');
    jest.spyOn(repository, 'listLibrary').mockRejectedValue(failure);
    const onError = jest.fn();

    const stop = subscribeLibrary(repository, jest.fn(), onError);
    await settle();

    expect(onError).toHaveBeenCalledWith(failure);
    stop();
  });
});

describe('subscribeLibraryHistory', () => {
  it('reports the item and its passes in number order', async () => {
    const repository = new LocalRepository(memoryStore());
    await seed(repository, [pass(2, 'Two'), pass(1, 'One')]);
    const onChange = jest.fn();

    const stop = subscribeLibraryHistory(repository, 'i1', onChange, jest.fn());
    await settle();

    expect(onChange).toHaveBeenCalledWith({
      item: expect.objectContaining({ id: 'i1' }),
      revisions: [pass(1, 'One'), pass(2, 'Two')],
      hasPendingWrites: false,
    });
    stop();
  });

  it('reports a missing item as null', async () => {
    const repository = new LocalRepository(memoryStore());
    const onChange = jest.fn();

    const stop = subscribeLibraryHistory(repository, 'missing', onChange, jest.fn());
    await settle();

    expect(onChange).toHaveBeenCalledWith({ item: null, revisions: [], hasPendingWrites: false });
    stop();
  });

  it('marks a save the repository has not confirmed yet', async () => {
    const repository = new LocalRepository(memoryStore());
    jest.spyOn(repository, 'hasPendingWrites').mockReturnValue(true);
    const onChange = jest.fn();

    const stop = subscribeLibraryHistory(repository, 'i1', onChange, jest.fn());
    await settle();

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hasPendingWrites: true }));
    stop();
  });
});

describe('subscribeMentionedLibraryItems', () => {
  it('lists only the items whose latest pass mentions the tag', async () => {
    const repository = new LocalRepository(memoryStore());
    await repository.putLibraryItem(
      item({ id: 'a', type: 'book', title: 'Dune', wordCount: 10, mentions: ['tag-1'] }),
    );
    await repository.putLibraryItem(item({ id: 'b', title: 'Heat', mentions: ['tag-2'] }));
    const onChange = jest.fn();

    const stop = subscribeMentionedLibraryItems(repository, 'tag-1', onChange, jest.fn());
    await settle();

    expect(onChange).toHaveBeenCalledTimes(1);
    const items = onChange.mock.calls[0]?.[0] as { itemId: string }[];
    expect(items.map((found) => found.itemId)).toEqual(['a']);
    stop();
  });
});
