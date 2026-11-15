const mockOnSnapshot = jest.fn();

jest.mock('@/lib/firebase', () => ({ getFirebase: () => ({ db: {} }) }));
jest.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  where: (field: string, op: string, value: unknown) => ({ where: [field, op, value] }),
  query: (ref: unknown, ...filters: unknown[]) => ({ ref, filters }),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

import { subscribeMentionedDays } from './mentionService';

const stop = jest.fn();

function start(tagId = 't1') {
  mockOnSnapshot.mockReturnValueOnce(stop);
  const onChange = jest.fn();
  const onError = jest.fn();
  const unsubscribe = subscribeMentionedDays('u1', tagId, onChange, onError);
  const [daysQuery, onSnap, onSnapError] = mockOnSnapshot.mock.calls[0] as [
    { ref: { path: string }; filters: unknown[] },
    (snapshot: unknown) => void,
    (error: Error) => void,
  ];
  return { onChange, onError, unsubscribe, daysQuery, onSnap, onSnapError };
}

const snapshot = (rows: unknown[]) => ({ docs: rows.map((row) => ({ data: () => row })) });

beforeEach(() => jest.clearAllMocks());

describe('subscribeMentionedDays', () => {
  it('asks for the days of the user that mention the tag', () => {
    const { daysQuery } = start('t9');

    expect(daysQuery.ref.path).toBe('users/u1/days');
    expect(daysQuery.filters).toEqual([{ where: ['mentions', 'array-contains', 't9'] }]);
  });

  it('reports the days newest first', () => {
    const { onChange, onSnap } = start();

    onSnap(
      snapshot([
        { date: '2026-11-03', wordCount: 20, mentions: ['t1'] },
        { date: '2026-11-13', wordCount: 55, mentions: ['t1', 't2'] },
      ]),
    );

    expect(onChange).toHaveBeenCalledWith([
      { dayId: '2026-11-13', wordCount: 55 },
      { dayId: '2026-11-03', wordCount: 20 },
    ]);
  });

  it('reports an empty list when no day mentions the tag', () => {
    const { onChange, onSnap } = start();

    onSnap(snapshot([]));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('leaves out documents that do not match the expected shape', () => {
    const { onChange, onSnap } = start();

    onSnap(
      snapshot([
        { date: '2026-11-10', wordCount: 8, mentions: ['t1'] },
        { date: '2026-11-11', mentions: ['t1'] },
        { date: '2026-11-12', wordCount: 'many', mentions: ['t1'] },
      ]),
    );

    expect(onChange).toHaveBeenCalledWith([{ dayId: '2026-11-10', wordCount: 8 }]);
  });

  it('passes errors on and stops listening', () => {
    const { onError, onSnapError, unsubscribe } = start();
    const failure = new Error('permission-denied');

    onSnapError(failure);
    unsubscribe();

    expect(onError).toHaveBeenCalledWith(failure);
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
