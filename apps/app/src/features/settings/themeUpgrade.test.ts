import { LocalRepository, type JournalRepository, type KeyValueStore } from '@memory-journal/core';

import { createMemoryStorage } from '@/test-utils/memoryStorage';

import { setTheme } from './settingsService';
import { applyThemeDefaultV2, THEME_DEFAULT_V2_KEY } from './themeUpgrade';

function journalStore(): KeyValueStore {
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

describe('applyThemeDefaultV2', () => {
  let repository: JournalRepository;

  beforeEach(() => {
    repository = new LocalRepository(journalStore());
  });

  it('moves an upgrader from System to Dark once and records the flag', async () => {
    await setTheme(repository, 'system');
    const storage = createMemoryStorage();

    const changed = await applyThemeDefaultV2(storage, repository, {
      reminderEnabled: true,
      theme: 'system',
    });

    expect(changed).toBe(true);
    expect((await repository.getSettings())?.theme).toBe('dark');
    expect(storage.data.get(THEME_DEFAULT_V2_KEY)).toBe('done');
  });

  it('keeps the reminder setting when it resets the theme', async () => {
    await repository.putSettings({ reminderEnabled: false, theme: 'light' });

    await applyThemeDefaultV2(createMemoryStorage(), repository, {
      reminderEnabled: false,
      theme: 'light',
    });

    expect(await repository.getSettings()).toEqual({ reminderEnabled: false, theme: 'dark' });
  });

  it('respects the choice made after the reset', async () => {
    const storage = createMemoryStorage({ [THEME_DEFAULT_V2_KEY]: 'done' });
    await setTheme(repository, 'light');

    const changed = await applyThemeDefaultV2(storage, repository, {
      reminderEnabled: true,
      theme: 'light',
    });

    expect(changed).toBe(false);
    expect((await repository.getSettings())?.theme).toBe('light');
  });

  it('only records the flag on a fresh install that is already Dark', async () => {
    const storage = createMemoryStorage();

    const changed = await applyThemeDefaultV2(storage, repository, {
      reminderEnabled: true,
      theme: 'dark',
    });

    expect(changed).toBe(false);
    expect(await repository.getSettings()).toBeNull();
    expect(storage.data.get(THEME_DEFAULT_V2_KEY)).toBe('done');
  });

  it('does nothing when the flag cannot be read, so a saved choice is not overridden', async () => {
    const storage = createMemoryStorage();
    storage.failNext('getItem');
    await setTheme(repository, 'light');

    const changed = await applyThemeDefaultV2(storage, repository, {
      reminderEnabled: true,
      theme: 'light',
    });

    expect(changed).toBe(false);
    expect((await repository.getSettings())?.theme).toBe('light');
    expect(storage.data.has(THEME_DEFAULT_V2_KEY)).toBe(false);
  });

  it('leaves the flag unset when the theme cannot be saved, so it is retried next launch', async () => {
    const storage = createMemoryStorage();
    jest.spyOn(repository, 'putSettings').mockRejectedValueOnce(new Error('refused'));

    const changed = await applyThemeDefaultV2(storage, repository, {
      reminderEnabled: true,
      theme: 'system',
    });

    expect(changed).toBe(false);
    expect(storage.data.has(THEME_DEFAULT_V2_KEY)).toBe(false);
  });

  it('still reports the reset when only the flag write fails', async () => {
    const storage = createMemoryStorage();
    storage.failNext('setItem');

    const changed = await applyThemeDefaultV2(storage, repository, {
      reminderEnabled: true,
      theme: 'system',
    });

    expect(changed).toBe(true);
    expect((await repository.getSettings())?.theme).toBe('dark');
  });
});
