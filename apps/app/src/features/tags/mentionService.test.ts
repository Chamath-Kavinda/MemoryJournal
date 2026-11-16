import {
  LocalRepository,
  type DayMeta,
  type JournalRepository,
  type KeyValueStore,
} from '@memory-journal/core';

import { subscribeMentionedDays } from './mentionService';

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

const day = (date: string, wordCount: number, mentions: string[]): DayMeta =>
  ({ date, wordCount, mentions, latestRevision: 1 }) as unknown as DayMeta;

async function seeded(...metas: DayMeta[]): Promise<JournalRepository> {
  const repository = new LocalRepository(memoryStore());
  for (const meta of metas) await repository.putDay(meta);
  return repository;
}

describe('subscribeMentionedDays', () => {
  it('reports the days that mention the tag, newest first', async () => {
    const repository = await seeded(
      day('2026-11-03', 20, ['t1']),
      day('2026-11-13', 55, ['t1', 't2']),
      day('2026-11-08', 9, ['t2']),
    );
    const onChange = jest.fn();

    const stop = subscribeMentionedDays(repository, 't1', onChange, jest.fn());
    await settle();

    expect(onChange).toHaveBeenCalledWith([
      { dayId: '2026-11-13', wordCount: 55 },
      { dayId: '2026-11-03', wordCount: 20 },
    ]);
    stop();
  });

  it('reports an empty list when no day mentions the tag', async () => {
    const repository = await seeded(day('2026-11-03', 20, ['t2']));
    const onChange = jest.fn();

    subscribeMentionedDays(repository, 't1', onChange, jest.fn());
    await settle();

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('updates when a day is saved later', async () => {
    const repository = await seeded();
    const onChange = jest.fn();
    subscribeMentionedDays(repository, 't1', onChange, jest.fn());
    await settle();

    await repository.putDay(day('2026-11-10', 8, ['t1']));
    await settle();

    expect(onChange).toHaveBeenLastCalledWith([{ dayId: '2026-11-10', wordCount: 8 }]);
  });

  it('passes errors on and stops listening', async () => {
    const repository = await seeded();
    const failure = new Error('denied');
    repository.listDays = () => Promise.reject(failure);
    const onError = jest.fn();

    const stop = subscribeMentionedDays(repository, 't1', jest.fn(), onError);
    await settle();
    stop();

    expect(onError).toHaveBeenCalledWith(failure);
  });
});
