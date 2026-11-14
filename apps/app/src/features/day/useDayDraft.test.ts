import { emptyContent, setHourText, type DayContent } from '@memory-journal/core';
import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { createMemoryStorage } from '@/test-utils/memoryStorage';

import { draftKey, loadDraft, saveDraft } from './draftStore';
import { DRAFT_SAVE_DELAY_MS, useDayDraft } from './useDayDraft';

const DAY = '2026-11-13';
const OTHER_DAY = '2026-11-12';

const text = (value: string): DayContent => setHourText(emptyContent(), 9, value);

let appStateListener: ((state: AppStateStatus) => void) | undefined;
let removeListener: jest.Mock;

beforeEach(() => {
  jest.useFakeTimers();
  appStateListener = undefined;
  removeListener = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    appStateListener = listener as unknown as (state: AppStateStatus) => void;
    return { remove: removeListener };
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Lets the promises of the storage fake settle inside act, so state updates are applied. */
const flush = () => act(async () => {});

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

async function renderDraft(
  storage: ReturnType<typeof createMemoryStorage>,
  initial: { uid: string | undefined; dayId: string } = { uid: 'u1', dayId: DAY },
) {
  const hook = await renderHook(
    (props: { uid: string | undefined; dayId: string }) =>
      useDayDraft({ uid: props.uid, dayId: props.dayId, storage }),
    { initialProps: initial },
  );
  await flush();
  return hook;
}

async function type(
  hook: Awaited<ReturnType<typeof renderDraft>>,
  content: DayContent,
): Promise<void> {
  await act(async () => {
    hook.result.current.setContent(content);
  });
}

describe('useDayDraft', () => {
  it('is ready and empty when nothing is stored', async () => {
    const { result } = await renderDraft(createMemoryStorage());

    expect(result.current.ready).toBe(true);
    expect(result.current.content).toEqual(emptyContent());
    expect(result.current.saveState).toBe('idle');
  });

  it('is not ready, and saves nothing, until the stored draft has been read', async () => {
    const storage = createMemoryStorage();
    await saveDraft(storage, 'u1', DAY, text('Stored'), 1);

    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const readStored = storage.getItem;
    jest.spyOn(storage, 'getItem').mockImplementation(async (key) => {
      await gate;
      return readStored(key);
    });
    const setItem = jest.spyOn(storage, 'setItem');

    const hook = await renderHook(() => useDayDraft({ uid: 'u1', dayId: DAY, storage }));
    expect(hook.result.current.ready).toBe(false);

    await type(hook, text('typed too early'));
    await advance(DRAFT_SAVE_DELAY_MS);
    expect(setItem).not.toHaveBeenCalled();

    await act(async () => {
      release();
    });

    expect(hook.result.current.ready).toBe(true);
    // The stored draft wins; it was never overwritten by the early typing.
    expect(hook.result.current.content).toEqual(text('Stored'));
    expect((await loadDraft(storage, 'u1', DAY))?.content).toEqual(text('Stored'));
  });

  it('loads the draft stored for this user and day', async () => {
    const storage = createMemoryStorage();
    await saveDraft(storage, 'u1', DAY, text('Breakfast'), 1);

    const { result } = await renderDraft(storage);

    expect(result.current.content).toEqual(text('Breakfast'));
  });

  it('does not load the draft of another day or another user', async () => {
    const storage = createMemoryStorage();
    await saveDraft(storage, 'u1', OTHER_DAY, text('Yesterday'), 1);
    await saveDraft(storage, 'u2', DAY, text('Someone else'), 1);

    const { result } = await renderDraft(storage);

    expect(result.current.content).toEqual(emptyContent());
  });

  it('saves the newest text once the delay has passed, not before', async () => {
    const storage = createMemoryStorage();
    const setItem = jest.spyOn(storage, 'setItem');
    const hook = await renderDraft(storage);

    await type(hook, text('a'));
    await advance(1000);
    await type(hook, text('ab'));
    await advance(DRAFT_SAVE_DELAY_MS - 1000 - 1);

    expect(setItem).not.toHaveBeenCalled();
    expect(hook.result.current.saveState).toBe('idle');

    await advance(1);
    await flush();

    expect(setItem).toHaveBeenCalledTimes(1);
    expect((await loadDraft(storage, 'u1', DAY))?.content).toEqual(text('ab'));
    expect(hook.result.current.saveState).toBe('saved');
  });

  it('keeps saving while typing goes on', async () => {
    const storage = createMemoryStorage();
    const setItem = jest.spyOn(storage, 'setItem');
    const hook = await renderDraft(storage);

    await type(hook, text('one'));
    await advance(DRAFT_SAVE_DELAY_MS);
    await flush();
    await type(hook, text('one two'));
    await advance(DRAFT_SAVE_DELAY_MS);
    await flush();

    expect(setItem).toHaveBeenCalledTimes(2);
    expect((await loadDraft(storage, 'u1', DAY))?.content).toEqual(text('one two'));
  });

  it('saves a pending edit at once when the screen closes', async () => {
    const storage = createMemoryStorage();
    const hook = await renderDraft(storage);

    await type(hook, text('Written just before leaving'));
    await act(async () => {
      hook.unmount();
    });
    await flush();

    expect((await loadDraft(storage, 'u1', DAY))?.content).toEqual(
      text('Written just before leaving'),
    );
    expect(removeListener).toHaveBeenCalled();
  });

  it('saves a pending edit at once when the app goes to the background', async () => {
    const storage = createMemoryStorage();
    const hook = await renderDraft(storage);

    await type(hook, text('Typed, then switched app'));
    await act(async () => {
      appStateListener?.('background');
    });
    await flush();

    expect((await loadDraft(storage, 'u1', DAY))?.content).toEqual(
      text('Typed, then switched app'),
    );
    expect(hook.result.current.saveState).toBe('saved');
  });

  it('writes nothing when there is no unsaved text', async () => {
    const storage = createMemoryStorage();
    const setItem = jest.spyOn(storage, 'setItem');
    const hook = await renderDraft(storage);

    await act(async () => {
      appStateListener?.('background');
    });
    await act(async () => {
      hook.unmount();
    });
    await flush();

    expect(setItem).not.toHaveBeenCalled();
  });

  it('removes the stored draft when all the text is deleted', async () => {
    const storage = createMemoryStorage();
    await saveDraft(storage, 'u1', DAY, text('Something'), 1);
    const hook = await renderDraft(storage);

    await type(hook, emptyContent());
    await advance(DRAFT_SAVE_DELAY_MS);
    await flush();

    expect(storage.data.has(draftKey('u1', DAY))).toBe(false);
  });

  it('reports a failed save and tries again on the next edit', async () => {
    const storage = createMemoryStorage();
    const hook = await renderDraft(storage);

    storage.failNext('setItem');
    await type(hook, text('first'));
    await advance(DRAFT_SAVE_DELAY_MS);
    await flush();

    expect(hook.result.current.saveState).toBe('error');
    expect(await loadDraft(storage, 'u1', DAY)).toBeNull();
    // The text stays on screen: a failed save never loses what was typed.
    expect(hook.result.current.content).toEqual(text('first'));

    await type(hook, text('first and more'));
    await advance(DRAFT_SAVE_DELAY_MS);
    await flush();

    expect(hook.result.current.saveState).toBe('saved');
    expect((await loadDraft(storage, 'u1', DAY))?.content).toEqual(text('first and more'));
  });

  it('retries a failed save when the app goes to the background', async () => {
    const storage = createMemoryStorage();
    const hook = await renderDraft(storage);

    storage.failNext('setItem');
    await type(hook, text('keep me'));
    await advance(DRAFT_SAVE_DELAY_MS);
    await flush();
    expect(hook.result.current.saveState).toBe('error');

    await act(async () => {
      appStateListener?.('background');
    });
    await flush();

    expect(hook.result.current.saveState).toBe('saved');
    expect((await loadDraft(storage, 'u1', DAY))?.content).toEqual(text('keep me'));
  });

  it('still lets the user write when the stored draft cannot be read', async () => {
    const storage = createMemoryStorage();
    storage.failNext('getItem');
    const hook = await renderDraft(storage);

    expect(hook.result.current.ready).toBe(true);
    expect(hook.result.current.saveState).toBe('error');

    await type(hook, text('Still works'));
    await advance(DRAFT_SAVE_DELAY_MS);
    await flush();

    expect(hook.result.current.saveState).toBe('saved');
    expect((await loadDraft(storage, 'u1', DAY))?.content).toEqual(text('Still works'));
  });

  it('keeps the old day text on the old day when another day is opened', async () => {
    const storage = createMemoryStorage();
    await saveDraft(storage, 'u1', OTHER_DAY, text('From the other day'), 1);
    const hook = await renderDraft(storage);

    await type(hook, text('Unsaved text of today'));
    await hook.rerender({ uid: 'u1', dayId: OTHER_DAY });
    await flush();

    expect((await loadDraft(storage, 'u1', DAY))?.content).toEqual(text('Unsaved text of today'));
    expect(hook.result.current.content).toEqual(text('From the other day'));
    expect(hook.result.current.ready).toBe(true);
  });

  it('does nothing without a signed-in user', async () => {
    const storage = createMemoryStorage();
    const setItem = jest.spyOn(storage, 'setItem');
    const getItem = jest.spyOn(storage, 'getItem');
    const hook = await renderDraft(storage, { uid: undefined, dayId: DAY });

    await type(hook, text('nobody'));
    await advance(DRAFT_SAVE_DELAY_MS);
    await flush();

    expect(hook.result.current.ready).toBe(false);
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });

  it('does nothing for a day id that is not a real date', async () => {
    const storage = createMemoryStorage();
    const getItem = jest.spyOn(storage, 'getItem');
    const hook = await renderDraft(storage, { uid: 'u1', dayId: 'not-a-day' });

    expect(hook.result.current.ready).toBe(false);
    expect(getItem).not.toHaveBeenCalled();
  });
});
