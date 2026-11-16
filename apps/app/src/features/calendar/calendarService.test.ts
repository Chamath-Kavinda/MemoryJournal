import { LocalRepository, type DayMeta, type KeyValueStore } from '@memory-journal/core';

import { subscribeWrittenDays } from './calendarService';

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

const day = (date: string, wordCount: number): DayMeta => ({
  date,
  latestRevision: 1,
  wordCount,
  updatedAt: 1,
  firstWrittenAt: 1,
});

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
const november = { year: 2026, month: 11 };

describe('subscribeWrittenDays', () => {
  it('reports the days of the month that have words and ignores empty ones', async () => {
    const repository = new LocalRepository(memoryStore());
    await repository.putDay(day('2026-10-31', 40));
    await repository.putDay(day('2026-11-01', 80));
    await repository.putDay(day('2026-11-02', 0));
    await repository.putDay(day('2026-12-01', 20));
    const onChange = jest.fn();

    const stop = subscribeWrittenDays(repository, november, onChange, jest.fn());
    await settle();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(new Set(['2026-11-01']));
    stop();
  });

  it('reports again when the journal changes, and stops after unsubscribe', async () => {
    const repository = new LocalRepository(memoryStore());
    const onChange = jest.fn();
    const stop = subscribeWrittenDays(repository, november, onChange, jest.fn());
    await settle();

    await repository.putDay(day('2026-11-05', 12));
    await settle();
    expect(onChange).toHaveBeenLastCalledWith(new Set(['2026-11-05']));

    stop();
    await repository.putDay(day('2026-11-06', 12));
    await settle();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('drops an older read that finishes after a newer one', async () => {
    let finishFirst: (days: DayMeta[]) => void = () => undefined;
    const listDays = jest
      .fn()
      .mockReturnValueOnce(new Promise<DayMeta[]>((resolve) => (finishFirst = resolve)))
      .mockResolvedValueOnce([day('2026-11-02', 5)]);
    let notify: () => void = () => undefined;
    const repository = {
      listDays,
      subscribe: (listener: () => void) => {
        notify = listener;
        return () => undefined;
      },
    };
    const onChange = jest.fn();

    subscribeWrittenDays(repository as never, november, onChange, jest.fn());
    notify();
    await settle();
    finishFirst([day('2026-11-01', 5)]);
    await settle();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(new Set(['2026-11-02']));
  });

  it('passes read errors on, wrapping anything that is not an Error', async () => {
    const onError = jest.fn();
    const failure = new Error('offline');
    const listDays = jest.fn().mockRejectedValueOnce(failure).mockRejectedValueOnce('denied');
    let notify: () => void = () => undefined;
    const repository = {
      listDays,
      subscribe: (listener: () => void) => {
        notify = listener;
        return () => undefined;
      },
    };

    subscribeWrittenDays(repository as never, november, jest.fn(), onError);
    await settle();
    expect(onError).toHaveBeenLastCalledWith(failure);

    notify();
    await settle();
    expect(onError).toHaveBeenLastCalledWith(new Error('denied'));
  });

  it('ignores a read that finishes after unsubscribe', async () => {
    let finish: (days: DayMeta[]) => void = () => undefined;
    const repository = {
      listDays: () => new Promise<DayMeta[]>((resolve) => (finish = resolve)),
      subscribe: () => () => undefined,
    };
    const onChange = jest.fn();

    const stop = subscribeWrittenDays(repository as never, november, onChange, jest.fn());
    stop();
    finish([day('2026-11-01', 5)]);
    await settle();

    expect(onChange).not.toHaveBeenCalled();
  });
});
