import {
  LocalRepository,
  buildRevision,
  emptyContent,
  mentionToken,
  setHourText,
  type DayContent,
  type DayRevision,
  type JournalRepository,
  type KeyValueStore,
} from '@memory-journal/core';

import { closeSitting, saveDayContent, subscribeDayHistory } from './revisionService';

const DAY = '2026-11-13';
const T0 = Date.UTC(2026, 10, 13, 21, 0);
const MINUTE = 60_000;
const text = (value: string): DayContent => setHourText(emptyContent(), 9, value);
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

/** Saves a revision and its day the way the app does, so history has something to read. */
async function seed(repository: JournalRepository, revisions: DayRevision[], updatedAt = T0) {
  const last = revisions[revisions.length - 1]!;
  for (const revision of revisions) await repository.putRevision(DAY, revision);
  await repository.putDay({
    date: DAY,
    latestRevision: last.n,
    wordCount: last.wordCount,
    updatedAt,
    firstWrittenAt: revisions[0]!.createdAt,
  });
}

describe('subscribeDayHistory', () => {
  it('reports the revisions in number order with the last save time', async () => {
    const repository = new LocalRepository(memoryStore());
    await seed(repository, [saved(2, text('Two')), saved(1, text('One'))]);
    const onChange = jest.fn();

    const stop = subscribeDayHistory(repository, DAY, onChange, jest.fn());
    await settle();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({
      revisions: [saved(1, text('One')), saved(2, text('Two'))],
      lastActivityAt: T0,
      hasPendingWrites: false,
    });
    stop();
  });

  it('has no revisions and no last save time for a day that was never written', async () => {
    const repository = new LocalRepository(memoryStore());
    const onChange = jest.fn();

    const stop = subscribeDayHistory(repository, DAY, onChange, jest.fn());
    await settle();

    expect(onChange).toHaveBeenCalledWith({
      revisions: [],
      lastActivityAt: null,
      hasPendingWrites: false,
    });
    stop();
  });

  it('reports again when the journal changes, and stops after unsubscribe', async () => {
    const repository = new LocalRepository(memoryStore());
    const onChange = jest.fn();
    const stop = subscribeDayHistory(repository, DAY, onChange, jest.fn());
    await settle();

    await seed(repository, [saved(1, text('One'))]);
    await settle();
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ revisions: [saved(1, text('One'))] }),
    );

    stop();
    const calls = onChange.mock.calls.length;
    await seed(repository, [saved(1, text('One')), saved(2, text('Two'))]);
    await settle();
    expect(onChange).toHaveBeenCalledTimes(calls);
  });

  it('marks a save that the repository has not confirmed yet', async () => {
    const repository = new LocalRepository(memoryStore());
    jest.spyOn(repository, 'hasPendingWrites').mockReturnValue(true);
    const onChange = jest.fn();

    const stop = subscribeDayHistory(repository, DAY, onChange, jest.fn());
    await settle();

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ hasPendingWrites: true }));
    stop();
  });

  it('passes a failed read on', async () => {
    const repository = new LocalRepository(memoryStore());
    const failure = new Error('permission-denied');
    jest.spyOn(repository, 'listRevisions').mockRejectedValue(failure);
    const onChange = jest.fn();
    const onError = jest.fn();

    const stop = subscribeDayHistory(repository, DAY, onChange, onError);
    await settle();

    expect(onError).toHaveBeenCalledWith(failure);
    expect(onChange).not.toHaveBeenCalled();
    stop();
  });

  it('drops an older read that finishes after a newer one', async () => {
    const repository = new LocalRepository(memoryStore());
    let finishFirst: (revisions: DayRevision[]) => void = () => undefined;
    jest
      .spyOn(repository, 'listRevisions')
      .mockReturnValueOnce(new Promise<DayRevision[]>((resolve) => (finishFirst = resolve)))
      .mockResolvedValueOnce([saved(1, text('Newer'))]);
    const onChange = jest.fn();
    const stop = subscribeDayHistory(repository, DAY, onChange, jest.fn());

    await repository.putDay({
      date: DAY,
      latestRevision: 1,
      wordCount: 1,
      updatedAt: T0,
      firstWrittenAt: T0,
    });
    await settle();
    finishFirst([saved(1, text('Older'))]);
    await settle();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ revisions: [saved(1, text('Newer'))] }),
    );
    stop();
  });
});

describe('saveDayContent', () => {
  it('writes nothing when the text did not change', async () => {
    const repository = new LocalRepository(memoryStore());
    const saveDay = jest.spyOn(repository, 'saveDay');

    const outcome = await saveDayContent(
      repository,
      DAY,
      { revisions: [saved(1, text('Same'))], lastActivityAt: T0 },
      text('Same'),
      T0 + MINUTE,
    );

    expect(outcome).toEqual({ saved: false });
    expect(saveDay).not.toHaveBeenCalled();
  });

  it('writes nothing for a day that is still empty', async () => {
    const repository = new LocalRepository(memoryStore());
    const saveDay = jest.spyOn(repository, 'saveDay');

    const outcome = await saveDayContent(
      repository,
      DAY,
      { revisions: [], lastActivityAt: null },
      emptyContent(),
      T0,
    );

    expect(outcome).toEqual({ saved: false });
    expect(saveDay).not.toHaveBeenCalled();
  });

  it('creates revision 1 and the day together on the first save', async () => {
    const repository = new LocalRepository(memoryStore());
    const saveDay = jest.spyOn(repository, 'saveDay');

    const outcome = await saveDayContent(
      repository,
      DAY,
      { revisions: [], lastActivityAt: null },
      text('Breakfast with Amma'),
      T0,
    );

    expect(outcome.saved).toBe(true);
    expect(saveDay).toHaveBeenCalledTimes(1);
    expect(saveDay).toHaveBeenCalledWith({
      dayId: DAY,
      revision: expect.objectContaining({
        n: 1,
        kind: 'first',
        createdAt: T0,
        closedAt: null,
        wordCount: 3,
        addedWordCount: 3,
        blocks: [{ hour: 9, minute: null, text: 'Breakfast with Amma' }],
      }),
      meta: {
        date: DAY,
        latestRevision: 1,
        wordCount: 3,
        updatedAt: T0,
        firstWrittenAt: T0,
        mentions: [],
      },
    });
    expect(await repository.listRevisions(DAY)).toHaveLength(1);
    expect(await repository.getDay(DAY)).toEqual(expect.objectContaining({ latestRevision: 1 }));
  });

  it('stores the tags of the latest pass on the day', async () => {
    const repository = new LocalRepository(memoryStore());
    const withTags = text(
      `Lunch with ${mentionToken('t1', 'Ravi')} at ${mentionToken('t2', 'Galle Fort')}`,
    );

    await saveDayContent(repository, DAY, { revisions: [], lastActivityAt: null }, withTags, T0);

    expect(await repository.getDay(DAY)).toEqual(
      expect.objectContaining({ mentions: ['t1', 't2'] }),
    );
  });

  it('drops a tag from the day once the latest pass no longer mentions it', async () => {
    const repository = new LocalRepository(memoryStore());
    const first = saved(1, text(`Lunch with ${mentionToken('t1', 'Ravi')}`), {
      closedAt: T0 + MINUTE,
    });
    await seed(repository, [first], T0 + MINUTE);

    await saveDayContent(
      repository,
      DAY,
      { revisions: [first], lastActivityAt: T0 + MINUTE },
      text('Lunch with Ravi'),
      T0 + 24 * 60 * MINUTE,
    );

    expect(await repository.getDay(DAY)).toEqual(
      expect.objectContaining({ latestRevision: 2, mentions: [] }),
    );
  });

  it('updates the open revision while the sitting goes on', async () => {
    const repository = new LocalRepository(memoryStore());
    const first = saved(1, text('Breakfast with Amma'));
    await seed(repository, [first]);
    const saveDay = jest.spyOn(repository, 'saveDay');

    const outcome = await saveDayContent(
      repository,
      DAY,
      { revisions: [first], lastActivityAt: T0 },
      text('Breakfast with Amma and Ravi'),
      T0 + 5 * MINUTE,
    );

    expect(outcome.saved).toBe(true);
    const call = saveDay.mock.calls[0]![0];
    expect(call.revision).toEqual(
      expect.objectContaining({ n: 1, createdAt: T0, closedAt: null, wordCount: 5 }),
    );
    expect(call.meta).toEqual(
      expect.objectContaining({
        latestRevision: 1,
        updatedAt: T0 + 5 * MINUTE,
        firstWrittenAt: T0,
      }),
    );
    expect(call.close).toBeUndefined();
    expect(await repository.listRevisions(DAY)).toHaveLength(1);
  });

  it('starts revision 2 once the sitting has run out, and closes the old one where it went quiet', async () => {
    const repository = new LocalRepository(memoryStore());
    const first = saved(1, text('Breakfast with Amma'));
    await seed(repository, [first], T0 + 10 * MINUTE);
    const later = T0 + 41 * MINUTE; // 31 minutes after the last save at T0 + 10 minutes

    const outcome = await saveDayContent(
      repository,
      DAY,
      { revisions: [first], lastActivityAt: T0 + 10 * MINUTE },
      text('Breakfast with Amma and Ravi'),
      later,
    );

    expect(outcome.saved).toBe(true);
    const [one, two] = await repository.listRevisions(DAY);
    expect(one).toEqual(expect.objectContaining({ n: 1, closedAt: T0 + 10 * MINUTE }));
    expect(two).toEqual(
      expect.objectContaining({
        n: 2,
        kind: 'later',
        createdAt: later,
        closedAt: null,
        wordCount: 5,
        addedWordCount: 2,
      }),
    );
    expect(await repository.getDay(DAY)).toEqual(
      expect.objectContaining({ latestRevision: 2, firstWrittenAt: T0 }),
    );
  });

  it('starts the next revision without touching a revision that is already closed', async () => {
    const repository = new LocalRepository(memoryStore());
    const first = saved(1, text('Breakfast'), { closedAt: T0 + MINUTE });
    await seed(repository, [first], T0 + MINUTE);
    const saveDay = jest.spyOn(repository, 'saveDay');

    await saveDayContent(
      repository,
      DAY,
      { revisions: [first], lastActivityAt: T0 + MINUTE },
      text('Breakfast and tea'),
      T0 + 24 * 60 * MINUTE,
    );

    const call = saveDay.mock.calls[0]![0];
    expect(call.close).toBeUndefined();
    expect(call.revision.n).toBe(2);
    expect((await repository.listRevisions(DAY))[0]).toEqual(first);
  });

  it('lets a failed save reach the caller', async () => {
    const repository = new LocalRepository(memoryStore());
    jest.spyOn(repository, 'saveDay').mockRejectedValue(new Error('permission-denied'));

    await expect(
      saveDayContent(
        repository,
        DAY,
        { revisions: [], lastActivityAt: null },
        text('Hello there'),
        T0,
      ),
    ).rejects.toThrow('permission-denied');
  });
});

describe('closeSitting', () => {
  it('sets the end time on the open revision', async () => {
    const repository = new LocalRepository(memoryStore());
    const open = saved(2, text('Hello'));
    await repository.putRevision(DAY, open);

    await closeSitting(repository, DAY, open, T0 + MINUTE);

    expect(await repository.listRevisions(DAY)).toEqual([{ ...open, closedAt: T0 + MINUTE }]);
  });

  it('refuses to close a revision that is already closed', async () => {
    const repository = new LocalRepository(memoryStore());
    const putRevision = jest.spyOn(repository, 'putRevision');

    await expect(
      closeSitting(repository, DAY, saved(2, text('Hello'), { closedAt: T0 }), T0 + MINUTE),
    ).rejects.toThrow('already closed');
    expect(putRevision).not.toHaveBeenCalled();
  });
});
