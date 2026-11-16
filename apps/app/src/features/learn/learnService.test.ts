import {
  LESSONS,
  LocalRepository,
  type JournalRepository,
  type KeyValueStore,
} from '@memory-journal/core';

import { setLessonDone, subscribeProgress } from './learnService';

const FIRST = LESSONS[0]!.id;
const SECOND = LESSONS[1]!.id;
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

describe('subscribeProgress', () => {
  let repository: JournalRepository;

  beforeEach(() => {
    repository = new LocalRepository(memoryStore());
  });

  it('reports no progress for a guest who has not finished a lesson', async () => {
    const onChange = jest.fn();

    const stop = subscribeProgress(repository, onChange, jest.fn());
    await settle();
    stop();

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('reports finished lessons in teaching order and drops anything unexpected', async () => {
    await repository.putTutorialProgress({
      completed: [SECOND, 'removed-lesson', FIRST, SECOND],
    });
    const onChange = jest.fn();

    const stop = subscribeProgress(repository, onChange, jest.fn());
    await settle();
    stop();

    expect(onChange).toHaveBeenLastCalledWith([FIRST, SECOND]);
  });

  it('reports a change made later', async () => {
    const onChange = jest.fn();
    const stop = subscribeProgress(repository, onChange, jest.fn());
    await settle();

    await setLessonDone(repository, FIRST, true);
    await settle();
    stop();

    expect(onChange).toHaveBeenLastCalledWith([FIRST]);
  });

  it('passes errors on', async () => {
    const failure = new Error('unreadable');
    jest.spyOn(repository, 'getTutorialProgress').mockRejectedValue(failure);
    const onError = jest.fn();

    const stop = subscribeProgress(repository, jest.fn(), onError);
    await settle();
    stop();

    expect(onError).toHaveBeenCalledWith(failure);
  });
});

describe('setLessonDone', () => {
  let repository: JournalRepository;

  beforeEach(() => {
    repository = new LocalRepository(memoryStore());
  });

  it('adds just this lesson when it is marked done', async () => {
    await setLessonDone(repository, SECOND, true);
    await setLessonDone(repository, FIRST, true);

    expect(await repository.getTutorialProgress()).toEqual({ completed: [FIRST, SECOND] });
  });

  it('marking a lesson done twice keeps one copy', async () => {
    await setLessonDone(repository, FIRST, true);
    await setLessonDone(repository, FIRST, true);

    expect(await repository.getTutorialProgress()).toEqual({ completed: [FIRST] });
  });

  it('removes just this lesson when it is marked not done', async () => {
    await repository.putTutorialProgress({ completed: [FIRST, SECOND] });

    await setLessonDone(repository, FIRST, false);

    expect(await repository.getTutorialProgress()).toEqual({ completed: [SECOND] });
  });

  it('writes nothing for a lesson that does not exist', async () => {
    const put = jest.spyOn(repository, 'putTutorialProgress');

    await expect(setLessonDone(repository, 'no-such-lesson', true)).resolves.toBeUndefined();

    expect(put).not.toHaveBeenCalled();
  });

  it('passes a failed write on to the caller', async () => {
    jest.spyOn(repository, 'putTutorialProgress').mockRejectedValue(new Error('full'));

    await expect(setLessonDone(repository, FIRST, true)).rejects.toThrow('full');
  });
});
