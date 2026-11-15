import { libraryContent, toLibraryRevision, buildRevision } from '@memory-journal/core';
import type { LibraryRevision } from '@memory-journal/core';

const mockOnSnapshot = jest.fn();
const mockUpdateDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockBatch = { set: jest.fn(), update: jest.fn(), commit: jest.fn() };

jest.mock('@/lib/firebase', () => ({ getFirebase: () => ({ db: {} }) }));
jest.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  doc: (ref: unknown, ...path: string[]) => {
    const base = (ref as { path?: string }).path;
    // doc(collectionRef) makes a new id, doc(collectionRef, id) and doc(db, ...path) address one.
    if (path.length === 0) return { id: 'new-id', path: `${base}/new-id` };
    return { id: path[path.length - 1], path: base ? `${base}/${path.join('/')}` : path.join('/') };
  },
  orderBy: (field: string) => ({ orderBy: field }),
  where: (field: string, op: string, value: unknown) => ({ where: [field, op, value] }),
  query: (ref: unknown, ...filters: unknown[]) => ({ ref, filters }),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  writeBatch: () => mockBatch,
}));

import {
  closeLibrarySitting,
  createLibraryItem,
  saveLibraryText,
  subscribeLibrary,
  subscribeMentionedLibraryItems,
  updateLibraryItemInfo,
} from './libraryService';

const T0 = Date.UTC(2026, 10, 13, 15, 0);
const MINUTE = 60_000;
const itemPath = 'users/u1/library/i1';

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

beforeEach(() => {
  jest.clearAllMocks();
  mockBatch.commit.mockResolvedValue(undefined);
  mockUpdateDoc.mockResolvedValue(undefined);
  mockSetDoc.mockResolvedValue(undefined);
});

describe('createLibraryItem', () => {
  it('returns the id at once and stores an empty page', async () => {
    const { id, saved } = createLibraryItem(
      'u1',
      { type: 'book', title: 'Dune', date: '2026-11-01' },
      T0,
    );
    await saved;

    expect(id).toBe('new-id');
    expect(mockSetDoc).toHaveBeenCalledWith(
      { id: 'new-id', path: 'users/u1/library/new-id' },
      {
        type: 'book',
        title: 'Dune',
        date: '2026-11-01',
        text: '',
        latestRevision: 0,
        updatedAt: T0,
        wordCount: 0,
        mentions: [],
      },
    );
  });
});

describe('updateLibraryItemInfo', () => {
  it('changes only the title and the date', async () => {
    await updateLibraryItemInfo('u1', 'i1', { title: '  Heat ', date: null });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { id: 'i1', path: itemPath },
      { title: 'Heat', date: null },
    );
  });

  it('refuses an empty title and writes nothing', async () => {
    await expect(updateLibraryItemInfo('u1', 'i1', { title: '   ', date: null })).rejects.toThrow(
      /Invalid library item/,
    );
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('saveLibraryText', () => {
  it('creates revision 1 and the summary fields in one batch, with no 9 PM lock', async () => {
    const outcome = await saveLibraryText(
      'u1',
      'i1',
      { revisions: [], lastActivityAt: null },
      'A slow, lovely film',
      T0,
    );

    expect(outcome.saved).toBe(true);
    expect(mockBatch.set).toHaveBeenCalledTimes(1);
    expect(mockBatch.set.mock.calls[0]?.[0]).toEqual({
      id: '1',
      path: `${itemPath}/revisions/1`,
    });
    expect(mockBatch.update).toHaveBeenCalledWith(
      { id: 'i1', path: itemPath },
      expect.objectContaining({ latestRevision: 1, wordCount: 4, updatedAt: T0, mentions: [] }),
    );
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });

  it('writes nothing when the text did not change', async () => {
    const first = pass(1, 'Same words');

    const outcome = await saveLibraryText(
      'u1',
      'i1',
      { revisions: [first], lastActivityAt: T0 },
      'Same words',
      T0 + MINUTE,
    );

    expect(outcome).toEqual({ saved: false });
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it('updates the open revision while the sitting goes on', async () => {
    const first = pass(1, 'Same words');

    const outcome = await saveLibraryText(
      'u1',
      'i1',
      { revisions: [first], lastActivityAt: T0 },
      'Same words and more',
      T0 + 5 * MINUTE,
    );

    expect(outcome.saved).toBe(true);
    expect(mockBatch.set.mock.calls[0]?.[0]).toEqual({
      id: '1',
      path: `${itemPath}/revisions/1`,
    });
    expect(mockBatch.update).toHaveBeenCalledTimes(1);
  });

  it('starts revision 2 after a quiet hour and closes the forgotten sitting at its last save', async () => {
    const first = pass(1, 'Same words');

    const outcome = await saveLibraryText(
      'u1',
      'i1',
      { revisions: [first], lastActivityAt: T0 },
      'Same words and a new thought',
      T0 + 60 * MINUTE,
    );

    expect(outcome.saved).toBe(true);
    expect(mockBatch.update).toHaveBeenCalledWith(
      { id: '1', path: `${itemPath}/revisions/1` },
      { closedAt: T0 },
    );
    expect(mockBatch.set.mock.calls[0]?.[0]).toEqual({
      id: '2',
      path: `${itemPath}/revisions/2`,
    });
    expect(mockBatch.update).toHaveBeenCalledWith(
      { id: 'i1', path: itemPath },
      expect.objectContaining({ latestRevision: 2 }),
    );
  });
});

describe('closeLibrarySitting', () => {
  it('sets closedAt on the revision', async () => {
    await closeLibrarySitting('u1', 'i1', pass(1, 'Words'), T0 + MINUTE);

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { id: '1', path: `${itemPath}/revisions/1` },
      { closedAt: T0 + MINUTE },
    );
  });
});

describe('subscribeLibrary', () => {
  const row = {
    type: 'movie',
    title: 'Heat',
    date: null,
    text: '',
    latestRevision: 0,
    updatedAt: T0,
    wordCount: 0,
    mentions: [],
  };

  it('lists items and leaves out documents with an unexpected shape', () => {
    mockOnSnapshot.mockReturnValueOnce(jest.fn());
    const onChange = jest.fn();
    subscribeLibrary('u1', onChange, jest.fn());
    const [ref, onSnap] = mockOnSnapshot.mock.calls[0] as [
      { path: string },
      (snapshot: unknown) => void,
    ];

    onSnap({
      docs: [
        { id: 'a', data: () => row },
        { id: 'bad', data: () => ({ title: 5 }) },
      ],
    });

    expect(ref.path).toBe('users/u1/library');
    expect(onChange).toHaveBeenCalledWith([{ id: 'a', ...row }]);
  });
});

describe('subscribeMentionedLibraryItems', () => {
  it('queries the item documents by tag id, without reading page text', () => {
    mockOnSnapshot.mockReturnValueOnce(jest.fn());
    const onChange = jest.fn();
    subscribeMentionedLibraryItems('u1', 'tag-1', onChange, jest.fn());
    const [q, onSnap] = mockOnSnapshot.mock.calls[0] as [
      { ref: { path: string }; filters: unknown[] },
      (snapshot: unknown) => void,
    ];

    expect(q.ref.path).toBe('users/u1/library');
    expect(q.filters).toEqual([{ where: ['mentions', 'array-contains', 'tag-1'] }]);

    onSnap({
      docs: [
        {
          id: 'a',
          data: () => ({
            type: 'book',
            title: 'Dune',
            date: null,
            wordCount: 10,
            updatedAt: T0,
            mentions: ['tag-1'],
          }),
        },
        { id: 'bad', data: () => ({ title: 5 }) },
      ],
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const items = onChange.mock.calls[0]?.[0] as { itemId: string }[];
    expect(items.map((item) => item.itemId)).toEqual(['a']);
  });
});
