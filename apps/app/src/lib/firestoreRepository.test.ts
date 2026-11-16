const mockGetDocs = jest.fn();
const mockGetDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockOnSnapshot = jest.fn();
const mockOrderBy = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchDelete = jest.fn();
const mockBatchCommit = jest.fn();

jest.mock('@/lib/firebase', () => ({ getFirebase: () => ({ db: {} }) }));
jest.mock('firebase/firestore', () => ({
  collection: (parent: { path?: string }, ...path: string[]) => ({
    path: [parent.path, ...path].filter(Boolean).join('/'),
  }),
  doc: (parent: { path?: string }, ...path: string[]) => {
    const full = [parent.path, ...path].filter(Boolean).join('/');
    return { path: full, id: full.split('/').pop() };
  },
  query: (source: { path: string }, ...constraints: unknown[]) => ({ ...source, constraints }),
  documentId: () => '__name__',
  where: (...args: unknown[]) => ({ where: args }),
  orderBy: (...args: unknown[]) => {
    mockOrderBy(...args);
    return { orderBy: args };
  },
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  writeBatch: () => ({
    set: mockBatchSet,
    update: mockBatchUpdate,
    delete: mockBatchDelete,
    commit: mockBatchCommit,
  }),
}));

import type { DayMeta, DayRevision, LibraryItem } from '@memory-journal/core';

import { FirestoreRepository } from './firestoreRepository';

const db = {} as never;

const meta: DayMeta = {
  date: '2026-11-14',
  latestRevision: 2,
  wordCount: 5,
  updatedAt: 20,
  firstWrittenAt: 10,
};

const revision = (n: number): DayRevision => ({
  n,
  createdAt: n,
  closedAt: null,
  kind: n === 1 ? 'first' : 'later',
  freeNotes: '',
  blocks: [{ hour: 9, minute: null, text: 'text' }],
  mentions: [],
  wordCount: 1,
  addedWordCount: 1,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSetDoc.mockResolvedValue(undefined);
  mockUpdateDoc.mockResolvedValue(undefined);
  mockDeleteDoc.mockResolvedValue(undefined);
  mockBatchCommit.mockResolvedValue(undefined);
  mockOnSnapshot.mockReturnValue(jest.fn());
});

describe('FirestoreRepository reads', () => {
  it('lists days and drops documents with the wrong shape', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'a', data: () => meta },
        { id: 'b', data: () => ({ date: 5 }) },
      ],
    });
    const repo = new FirestoreRepository('u1', db);

    expect(await repo.listDays()).toEqual([meta]);
    expect(mockGetDocs.mock.calls[0]?.[0]).toMatchObject({ path: 'users/u1/days' });
  });

  it('lists only the days inside a range by their document ids', async () => {
    mockGetDocs.mockResolvedValue({ docs: [{ id: 'a', data: () => meta }] });
    const repo = new FirestoreRepository('u1', db);

    expect(await repo.listDays({ first: '2026-11-01', last: '2026-11-30' })).toEqual([meta]);
    expect(mockGetDocs.mock.calls[0]?.[0]).toMatchObject({
      path: 'users/u1/days',
      constraints: [
        { where: ['__name__', '>=', '2026-11-01'] },
        { where: ['__name__', '<=', '2026-11-30'] },
      ],
    });
  });

  it('lists revisions ordered by their number field', async () => {
    mockGetDocs.mockResolvedValue({ docs: [{ id: '2', data: () => revision(2) }] });
    const repo = new FirestoreRepository('u1', db);

    expect(await repo.listRevisions('2026-11-14')).toEqual([revision(2)]);
    expect(mockGetDocs.mock.calls[0]?.[0]).toMatchObject({
      path: 'users/u1/days/2026-11-14/revisions',
    });
    expect(mockOrderBy).toHaveBeenCalledWith('n');
  });

  it('reads tags and categories with the document id as their id', async () => {
    const repo = new FirestoreRepository('u1', db);
    mockGetDocs.mockResolvedValueOnce({
      docs: [{ id: 'people', data: () => ({ name: 'People', isDefault: true, order: 0 }) }],
    });
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 't1',
          data: () => ({
            name: 'Sam',
            categoryId: 'people',
            note: null,
            aliases: [],
            createdAt: 1,
          }),
        },
      ],
    });

    expect(await repo.listCategories()).toEqual([
      { id: 'people', name: 'People', isDefault: true, order: 0 },
    ]);
    expect((await repo.listTags())[0]?.id).toBe('t1');
  });

  it('reads settings, stats and tutorial progress from their documents', async () => {
    const repo = new FirestoreRepository('u1', db);
    mockGetDoc.mockResolvedValueOnce({ data: () => undefined });
    expect(await repo.getSettings()).toBeNull();

    mockGetDoc.mockResolvedValueOnce({
      data: () => ({ settings: { reminderEnabled: false, theme: 'light' } }),
    });
    expect(await repo.getSettings()).toEqual({ reminderEnabled: false, theme: 'light' });

    mockGetDoc.mockResolvedValueOnce({ data: () => ({}) });
    expect(await repo.getStats()).toBeNull();

    mockGetDoc.mockResolvedValueOnce({ data: () => undefined });
    expect(await repo.getTutorialProgress()).toEqual({ completed: [] });
    expect(mockGetDoc.mock.calls[3]?.[0]).toMatchObject({ path: 'users/u1/progress/tutorials' });
  });

  it('has no guest clock guard for a signed-in user', async () => {
    const repo = new FirestoreRepository('u1', db);
    expect(await repo.getLastSeenAt()).toBeNull();
    await expect(repo.putLastSeenAt()).resolves.toBeUndefined();
  });
});

describe('FirestoreRepository writes', () => {
  it('saves a day as one batch and closes the earlier sitting in it', async () => {
    const repo = new FirestoreRepository('u1', db);

    await repo.saveDay({
      dayId: '2026-11-14',
      revision: revision(2),
      meta,
      close: { n: 1, closedAt: 15 },
    });

    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/u1/days/2026-11-14/revisions/1' }),
      { closedAt: 15 },
    );
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/u1/days/2026-11-14/revisions/2' }),
      revision(2),
    );
    // No `mentions` key at all when the day has none, because Firestore refuses undefined.
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/u1/days/2026-11-14' }),
      meta,
    );
    expect(Object.keys(mockBatchSet.mock.calls[1]?.[1] as object)).not.toContain('mentions');
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('saves a library page as one batch and closes the earlier sitting in it', async () => {
    const repo = new FirestoreRepository('u1', db);
    const libraryRevision = {
      n: 2,
      createdAt: 20,
      closedAt: null,
      kind: 'later' as const,
      text: 'more words',
      mentions: [],
      wordCount: 2,
      addedWordCount: 1,
    };
    const item: LibraryItem = {
      id: 'i1',
      type: 'book',
      title: 'Dune',
      date: null,
      text: 'more words',
      latestRevision: 2,
      updatedAt: 20,
      wordCount: 2,
      mentions: [],
    };

    await repo.saveLibraryPage({
      itemId: 'i1',
      revision: libraryRevision,
      item,
      close: { n: 1, closedAt: 15 },
    });

    expect(mockBatchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/u1/library/i1/revisions/1' }),
      { closedAt: 15 },
    );
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/u1/library/i1/revisions/2' }),
      libraryRevision,
    );
    // The id lives in the document path, not inside the stored fields.
    const { id: _id, ...stored } = item;
    expect(mockBatchSet).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/u1/library/i1' }),
      stored,
    );
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('stores tags and categories without the id inside the document', async () => {
    const repo = new FirestoreRepository('u1', db);
    await repo.putTag({
      id: 't1',
      name: 'Sam',
      categoryId: 'people',
      note: null,
      aliases: [],
      createdAt: 1,
    });

    expect(mockSetDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/u1/tags/t1' }), {
      name: 'Sam',
      categoryId: 'people',
      note: null,
      aliases: [],
      createdAt: 1,
    });
  });

  it('changes the two settings as separate fields', async () => {
    const repo = new FirestoreRepository('u1', db);
    await repo.putSettings({ reminderEnabled: true, theme: 'dark' });

    expect(mockUpdateDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/u1' }), {
      'settings.reminderEnabled': true,
      'settings.theme': 'dark',
    });
  });

  it('removes a library item together with its revisions', async () => {
    const revisionRef = { path: 'users/u1/library/a/revisions/1' };
    mockGetDocs.mockResolvedValue({ docs: [{ ref: revisionRef }] });
    const repo = new FirestoreRepository('u1', db);

    await repo.deleteLibraryItem('a');

    expect(mockBatchDelete).toHaveBeenCalledWith(revisionRef);
    expect(mockBatchDelete).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/u1/library/a' }),
    );
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('stores a library item without its id inside the document', async () => {
    const item: LibraryItem = {
      id: 'a',
      type: 'book',
      title: 'Dune',
      date: null,
      text: '',
      latestRevision: 0,
      updatedAt: 1,
      wordCount: 0,
      mentions: [],
    };
    await new FirestoreRepository('u1', db).putLibraryItem(item);

    const stored = mockSetDoc.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(stored).not.toHaveProperty('id');
    expect(stored.title).toBe('Dune');
  });

  it('refuses to clear an account', async () => {
    await expect(new FirestoreRepository('u1', db).clearAll()).rejects.toThrow(/delete service/);
    expect(mockDeleteDoc).not.toHaveBeenCalled();
  });

  it('tells listeners when a write is queued and again when it settles', async () => {
    const repo = new FirestoreRepository('u1', db);
    const listener = jest.fn();
    repo.subscribe(listener);
    listener.mockClear();

    await repo.deleteTag('t1');

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('reports pending writes until the server confirms them, even when a write fails', async () => {
    let confirm: () => void = () => undefined;
    mockDeleteDoc.mockReturnValueOnce(new Promise<void>((resolve) => (confirm = resolve)));
    const repo = new FirestoreRepository('u1', db);
    expect(repo.hasPendingWrites()).toBe(false);

    const saving = repo.deleteTag('t1');
    expect(repo.hasPendingWrites()).toBe(true);
    confirm();
    await saving;
    expect(repo.hasPendingWrites()).toBe(false);

    mockDeleteDoc.mockRejectedValueOnce(new Error('offline'));
    await expect(repo.deleteTag('t2')).rejects.toThrow('offline');
    expect(repo.hasPendingWrites()).toBe(false);
  });
});

describe('FirestoreRepository subscribe', () => {
  it('listens to the journal collections and ignores each first snapshot', () => {
    const repo = new FirestoreRepository('u1', db);
    const listener = jest.fn();
    repo.subscribe(listener);

    const paths = mockOnSnapshot.mock.calls.map((call) => (call[0] as { path: string }).path);
    expect(paths).toEqual([
      'users/u1/days',
      'users/u1/tagCategories',
      'users/u1/tags',
      'users/u1/library',
      'users/u1',
      'users/u1/progress/tutorials',
    ]);

    const next = mockOnSnapshot.mock.calls[0]?.[1] as () => void;
    next();
    expect(listener).not.toHaveBeenCalled();
    next();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('listens once for any number of listeners and stops after the last one leaves', () => {
    const stops = [jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn()];
    stops.forEach((stop) => mockOnSnapshot.mockReturnValueOnce(stop));
    const repo = new FirestoreRepository('u1', db);

    const stopA = repo.subscribe(jest.fn());
    const stopB = repo.subscribe(jest.fn());
    expect(mockOnSnapshot).toHaveBeenCalledTimes(6);

    stopA();
    stops.forEach((stop) => expect(stop).not.toHaveBeenCalled());
    stopB();
    stops.forEach((stop) => expect(stop).toHaveBeenCalledTimes(1));
  });

  it('passes listener errors to the error callback', () => {
    const onError = jest.fn();
    new FirestoreRepository('u1', db, onError).subscribe(jest.fn());

    const fail = mockOnSnapshot.mock.calls[0]?.[2] as (e: Error) => void;
    const error = new Error('denied');
    fail(error);
    expect(onError).toHaveBeenCalledWith(error);
  });
});
