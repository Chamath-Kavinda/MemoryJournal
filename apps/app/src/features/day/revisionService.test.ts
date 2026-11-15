import {
  buildRevision,
  emptyContent,
  mentionToken,
  setHourText,
  type DayContent,
  type DayRevision,
} from '@memory-journal/core';

const mockOnSnapshot = jest.fn();
const mockUpdateDoc = jest.fn();
const mockBatch = { set: jest.fn(), update: jest.fn(), commit: jest.fn() };

jest.mock('@/lib/firebase', () => ({ getFirebase: () => ({ db: {} }) }));
jest.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  orderBy: (field: string) => ({ orderBy: field }),
  query: (ref: unknown, ...filters: unknown[]) => ({ ref, filters }),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  writeBatch: () => mockBatch,
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
}));

import { closeSitting, saveDayContent, subscribeDayHistory } from './revisionService';

const DAY = '2026-11-13';
const T0 = Date.UTC(2026, 10, 13, 21, 0);
const MINUTE = 60_000;
const path = (n: number) => `users/u1/days/${DAY}/revisions/${n}`;
const text = (value: string): DayContent => setHourText(emptyContent(), 9, value);

function saved(n: number, content: DayContent, overrides: Partial<DayRevision> = {}): DayRevision {
  const revision = buildRevision({
    plan: { action: 'create', n, kind: n === 1 ? 'first' : 'later' },
    content,
    previous: null,
    existing: null,
    now: T0,
  });
  return { ...revision, ...overrides };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBatch.commit.mockResolvedValue(undefined);
  mockUpdateDoc.mockResolvedValue(undefined);
});

describe('subscribeDayHistory', () => {
  const stopRevisions = jest.fn();
  const stopMeta = jest.fn();

  function start() {
    mockOnSnapshot.mockReturnValueOnce(stopRevisions).mockReturnValueOnce(stopMeta);
    const onChange = jest.fn();
    const onError = jest.fn();
    const unsubscribe = subscribeDayHistory('u1', DAY, onChange, onError);
    const [revisionsQuery, onRevisions, onRevisionsError] = mockOnSnapshot.mock.calls[0] as [
      { ref: { path: string }; filters: unknown[] },
      (snapshot: unknown) => void,
      (error: Error) => void,
    ];
    const [metaRef, onMeta] = mockOnSnapshot.mock.calls[1] as [
      { path: string },
      (snapshot: unknown) => void,
    ];
    return {
      onChange,
      onError,
      unsubscribe,
      revisionsQuery,
      onRevisions,
      onRevisionsError,
      metaRef,
      onMeta,
    };
  }

  const revisionSnapshot = (rows: unknown[], pending = false) => ({
    docs: rows.map((row) => ({ data: () => row })),
    metadata: { hasPendingWrites: pending },
  });

  it('listens to the revisions in number order and to the day document', () => {
    const { revisionsQuery, metaRef } = start();

    expect(revisionsQuery.ref.path).toBe(`users/u1/days/${DAY}/revisions`);
    expect(revisionsQuery.filters).toEqual([{ orderBy: 'n' }]);
    expect(metaRef.path).toBe(`users/u1/days/${DAY}`);
  });

  it('reports only once both the revisions and the day document are known', () => {
    const { onChange, onRevisions, onMeta } = start();

    onRevisions(revisionSnapshot([saved(1, text('Breakfast'))]));
    expect(onChange).not.toHaveBeenCalled();

    onMeta({ data: () => ({ updatedAt: T0 }) });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      revisions: [saved(1, text('Breakfast'))],
      lastActivityAt: T0,
      hasPendingWrites: false,
    });
  });

  it('has no last save time for a day that has no document yet', () => {
    const { onChange, onRevisions, onMeta } = start();

    onRevisions(revisionSnapshot([]));
    onMeta({ data: () => undefined });

    expect(onChange).toHaveBeenCalledWith({
      revisions: [],
      lastActivityAt: null,
      hasPendingWrites: false,
    });
  });

  it('marks a save that has not reached the server yet', () => {
    const { onChange, onRevisions, onMeta } = start();
    onMeta({ data: () => ({ updatedAt: T0 }) });

    onRevisions(revisionSnapshot([saved(1, text('Written offline'))], true));

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ hasPendingWrites: true }));
  });

  it('reports again when something changes', () => {
    const { onChange, onRevisions, onMeta } = start();
    onMeta({ data: () => ({ updatedAt: T0 }) });
    onRevisions(revisionSnapshot([saved(1, text('One'))]));

    onRevisions(revisionSnapshot([saved(1, text('One')), saved(2, text('One two'))]));

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ revisions: [saved(1, text('One')), saved(2, text('One two'))] }),
    );
  });

  it('leaves out revisions that do not match the expected shape', () => {
    const { onChange, onRevisions, onMeta } = start();
    onMeta({ data: () => ({ updatedAt: T0 }) });

    onRevisions(
      revisionSnapshot([saved(1, text('Good')), { n: 2 }, { ...saved(3, text('Bad')), kind: 'x' }]),
    );

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ revisions: [saved(1, text('Good'))] }),
    );
  });

  it('passes errors on and stops both listeners', () => {
    const { onError, onRevisionsError, unsubscribe } = start();
    const failure = new Error('permission-denied');

    onRevisionsError(failure);
    unsubscribe();

    expect(onError).toHaveBeenCalledWith(failure);
    expect(stopRevisions).toHaveBeenCalledTimes(1);
    expect(stopMeta).toHaveBeenCalledTimes(1);
  });
});

describe('saveDayContent', () => {
  it('writes nothing when the text did not change', async () => {
    const outcome = await saveDayContent(
      'u1',
      DAY,
      { revisions: [saved(1, text('Same'))], lastActivityAt: T0 },
      text('Same'),
      T0 + MINUTE,
    );

    expect(outcome).toEqual({ saved: false });
    expect(mockBatch.set).not.toHaveBeenCalled();
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it('writes nothing for a day that is still empty', async () => {
    const outcome = await saveDayContent(
      'u1',
      DAY,
      { revisions: [], lastActivityAt: null },
      emptyContent(),
      T0,
    );
    expect(outcome).toEqual({ saved: false });
    expect(mockBatch.commit).not.toHaveBeenCalled();
  });

  it('creates revision 1 and the day document together on the first save', async () => {
    const outcome = await saveDayContent(
      'u1',
      DAY,
      { revisions: [], lastActivityAt: null },
      text('Breakfast with Amma'),
      T0,
    );

    expect(outcome.saved).toBe(true);
    expect(mockBatch.set).toHaveBeenCalledTimes(2);
    expect(mockBatch.set).toHaveBeenCalledWith(
      { path: path(1) },
      expect.objectContaining({
        n: 1,
        kind: 'first',
        createdAt: T0,
        closedAt: null,
        wordCount: 3,
        addedWordCount: 3,
        blocks: [{ hour: 9, minute: null, text: 'Breakfast with Amma' }],
      }),
    );
    expect(mockBatch.set).toHaveBeenCalledWith(
      { path: `users/u1/days/${DAY}` },
      {
        date: DAY,
        latestRevision: 1,
        wordCount: 3,
        updatedAt: T0,
        firstWrittenAt: T0,
        mentions: [],
      },
    );
    expect(mockBatch.update).not.toHaveBeenCalled();
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });

  it('stores the tags of the latest pass on the day document', async () => {
    const withTags = text(
      `Lunch with ${mentionToken('t1', 'Ravi')} at ${mentionToken('t2', 'Galle Fort')}`,
    );

    await saveDayContent('u1', DAY, { revisions: [], lastActivityAt: null }, withTags, T0);

    expect(mockBatch.set).toHaveBeenCalledWith(
      { path: `users/u1/days/${DAY}` },
      expect.objectContaining({ mentions: ['t1', 't2'] }),
    );
  });

  it('drops a tag from the day document once the latest pass no longer mentions it', async () => {
    const first = saved(1, text(`Lunch with ${mentionToken('t1', 'Ravi')}`), {
      closedAt: T0 + MINUTE,
    });

    await saveDayContent(
      'u1',
      DAY,
      { revisions: [first], lastActivityAt: T0 + MINUTE },
      text('Lunch with Ravi'),
      T0 + 24 * 60 * MINUTE,
    );

    expect(mockBatch.set).toHaveBeenCalledWith(
      { path: `users/u1/days/${DAY}` },
      expect.objectContaining({ latestRevision: 2, mentions: [] }),
    );
  });

  it('updates the open revision while the sitting goes on', async () => {
    const first = saved(1, text('Breakfast with Amma'));

    const outcome = await saveDayContent(
      'u1',
      DAY,
      { revisions: [first], lastActivityAt: T0 },
      text('Breakfast with Amma and Ravi'),
      T0 + 5 * MINUTE,
    );

    expect(outcome.saved).toBe(true);
    expect(mockBatch.set).toHaveBeenCalledWith(
      { path: path(1) },
      expect.objectContaining({ n: 1, createdAt: T0, closedAt: null, wordCount: 5 }),
    );
    expect(mockBatch.set).toHaveBeenCalledWith(
      { path: `users/u1/days/${DAY}` },
      expect.objectContaining({
        latestRevision: 1,
        updatedAt: T0 + 5 * MINUTE,
        firstWrittenAt: T0,
      }),
    );
    expect(mockBatch.update).not.toHaveBeenCalled();
  });

  it('starts revision 2 once the sitting has run out, and closes the old one where it went quiet', async () => {
    const first = saved(1, text('Breakfast with Amma'));
    const later = T0 + 41 * MINUTE; // 31 minutes after the last save at T0 + 10 minutes

    const outcome = await saveDayContent(
      'u1',
      DAY,
      { revisions: [first], lastActivityAt: T0 + 10 * MINUTE },
      text('Breakfast with Amma and Ravi'),
      later,
    );

    expect(outcome.saved).toBe(true);
    expect(mockBatch.update).toHaveBeenCalledWith(
      { path: path(1) },
      { closedAt: T0 + 10 * MINUTE },
    );
    expect(mockBatch.set).toHaveBeenCalledWith(
      { path: path(2) },
      expect.objectContaining({
        n: 2,
        kind: 'later',
        createdAt: later,
        closedAt: null,
        wordCount: 5,
        addedWordCount: 2,
      }),
    );
    expect(mockBatch.set).toHaveBeenCalledWith(
      { path: `users/u1/days/${DAY}` },
      expect.objectContaining({ latestRevision: 2, firstWrittenAt: T0 }),
    );
  });

  it('starts the next revision without touching a revision that is already closed', async () => {
    const first = saved(1, text('Breakfast'), { closedAt: T0 + MINUTE });
    const nextDay = T0 + 24 * 60 * MINUTE;

    await saveDayContent(
      'u1',
      DAY,
      { revisions: [first], lastActivityAt: T0 + MINUTE },
      text('Breakfast and tea'),
      nextDay,
    );

    expect(mockBatch.update).not.toHaveBeenCalled();
    expect(mockBatch.set).toHaveBeenCalledWith(
      { path: path(2) },
      expect.objectContaining({ n: 2 }),
    );
  });

  it('lets a failed commit reach the caller', async () => {
    mockBatch.commit.mockRejectedValueOnce(new Error('permission-denied'));

    await expect(
      saveDayContent('u1', DAY, { revisions: [], lastActivityAt: null }, text('Hello there'), T0),
    ).rejects.toThrow('permission-denied');
  });
});

describe('closeSitting', () => {
  it('sets the end time on the open revision', async () => {
    await closeSitting('u1', DAY, saved(2, text('Hello')), T0 + MINUTE);

    expect(mockUpdateDoc).toHaveBeenCalledWith({ path: path(2) }, { closedAt: T0 + MINUTE });
  });

  it('refuses to close a revision that is already closed', async () => {
    await expect(
      closeSitting('u1', DAY, saved(2, text('Hello'), { closedAt: T0 }), T0 + MINUTE),
    ).rejects.toThrow('already closed');
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});
