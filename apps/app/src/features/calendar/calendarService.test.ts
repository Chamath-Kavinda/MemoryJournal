const mockOnSnapshot = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('@/lib/firebase', () => ({ getFirebase: () => ({ db: {} }) }));
jest.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  where: (field: string, op: string, value: string) => ({ field, op, value }),
  query: (ref: unknown, ...filters: unknown[]) => ({ ref, filters }),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

import { subscribeWrittenDays } from './calendarService';

const docs = (...rows: unknown[]) => ({ docs: rows.map((row) => ({ data: () => row })) });

describe('subscribeWrittenDays', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSnapshot.mockReturnValue(mockUnsubscribe);
  });

  it('queries only the days of the given month under the user', () => {
    subscribeWrittenDays('u1', { year: 2026, month: 11 }, jest.fn(), jest.fn());

    const [days] = mockOnSnapshot.mock.calls[0] as [
      { ref: { path: string }; filters: { field: string; op: string; value: string }[] },
    ];
    expect(days.ref.path).toBe('users/u1/days');
    expect(days.filters).toEqual([
      { field: 'date', op: '>=', value: '2026-11-01' },
      { field: 'date', op: '<=', value: '2026-11-30' },
    ]);
  });

  it('reports days with words and ignores empty or malformed documents', () => {
    const onChange = jest.fn();
    subscribeWrittenDays('u1', { year: 2026, month: 11 }, onChange, jest.fn());

    const [, handleSnapshot] = mockOnSnapshot.mock.calls[0] as [unknown, (snap: unknown) => void];
    handleSnapshot(
      docs(
        { date: '2026-11-01', wordCount: 80 },
        { date: '2026-11-02', wordCount: 0 },
        { date: '2026-11-03' },
      ),
    );

    expect(onChange).toHaveBeenCalledWith(new Set(['2026-11-01']));
  });

  it('passes errors on and returns the unsubscribe function', () => {
    const onError = jest.fn();
    const unsubscribe = subscribeWrittenDays('u1', { year: 2026, month: 11 }, jest.fn(), onError);

    const [, , handleError] = mockOnSnapshot.mock.calls[0] as [unknown, unknown, typeof onError];
    const failure = new Error('offline');
    handleError(failure);

    expect(onError).toHaveBeenCalledWith(failure);
    expect(unsubscribe).toBe(mockUnsubscribe);
  });
});
