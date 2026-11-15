const mockSetDoc = jest.fn();
const mockOnSnapshot = jest.fn();

jest.mock('@/lib/firebase', () => ({ getFirebase: () => ({ db: {} }) }));
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  arrayUnion: (value: string) => ({ op: 'union', value }),
  arrayRemove: (value: string) => ({ op: 'remove', value }),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
}));

import { LESSONS } from '@memory-journal/core';

import { setLessonDone, subscribeProgress } from './learnService';

const FIRST = LESSONS[0]!.id;
const SECOND = LESSONS[1]!.id;

describe('subscribeProgress', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listens to the tutorials progress document of the user', () => {
    const stop = jest.fn();
    mockOnSnapshot.mockReturnValue(stop);

    const result = subscribeProgress('u1', jest.fn(), jest.fn());

    const [ref] = mockOnSnapshot.mock.calls[0] as [{ path: string }];
    expect(ref.path).toBe('users/u1/progress/tutorials');
    expect(result).toBe(stop);
  });

  it('reports no progress while the document does not exist', () => {
    const onChange = jest.fn();
    mockOnSnapshot.mockImplementation((_ref, next: (snapshot: unknown) => void) =>
      next({ data: () => undefined }),
    );

    subscribeProgress('u1', onChange, jest.fn());

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('reports finished lessons in teaching order and drops anything unexpected', () => {
    const onChange = jest.fn();
    mockOnSnapshot.mockImplementation((_ref, next: (snapshot: unknown) => void) =>
      next({ data: () => ({ completed: [SECOND, 'removed-lesson', FIRST, SECOND, 7] }) }),
    );

    subscribeProgress('u1', onChange, jest.fn());

    expect(onChange).toHaveBeenCalledWith([FIRST, SECOND]);
  });

  it('passes errors on', () => {
    const onError = jest.fn();
    const failure = new Error('denied');
    mockOnSnapshot.mockImplementation((_ref, _next: unknown, error: (reason: Error) => void) =>
      error(failure),
    );

    subscribeProgress('u1', jest.fn(), onError);

    expect(onError).toHaveBeenCalledWith(failure);
  });
});

describe('setLessonDone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetDoc.mockResolvedValue(undefined);
  });

  it('adds just this lesson when it is marked done', async () => {
    await setLessonDone('u1', FIRST, true);

    const [ref, data, options] = mockSetDoc.mock.calls[0] as [
      { path: string },
      Record<string, unknown>,
      unknown,
    ];
    expect(ref.path).toBe('users/u1/progress/tutorials');
    expect(data).toEqual({ completed: { op: 'union', value: FIRST } });
    expect(options).toEqual({ merge: true });
  });

  it('removes just this lesson when it is marked not done', async () => {
    await setLessonDone('u1', FIRST, false);

    const [, data] = mockSetDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data).toEqual({ completed: { op: 'remove', value: FIRST } });
  });

  it('writes nothing for a lesson that does not exist', async () => {
    await expect(setLessonDone('u1', 'no-such-lesson', true)).resolves.toBeUndefined();

    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('passes a refused write on to the caller', async () => {
    mockSetDoc.mockRejectedValue(new Error('permission-denied'));

    await expect(setLessonDone('u1', FIRST, true)).rejects.toThrow('permission-denied');
  });
});
