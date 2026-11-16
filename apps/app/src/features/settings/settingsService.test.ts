import { LocalRepository, type JournalRepository, type KeyValueStore } from '@memory-journal/core';

import { setReminderEnabled, setTheme, subscribeSettings } from './settingsService';

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

describe('subscribeSettings', () => {
  let repository: JournalRepository;

  beforeEach(() => {
    repository = new LocalRepository(memoryStore());
  });

  it('reads the defaults while nothing is stored yet', async () => {
    const onChange = jest.fn();

    const stop = subscribeSettings(repository, onChange, jest.fn());
    await settle();
    stop();

    expect(onChange).toHaveBeenCalledWith({ reminderEnabled: true, theme: 'dark' });
  });

  it('reads the stored settings', async () => {
    await repository.putSettings({ reminderEnabled: false, theme: 'light' });
    const onChange = jest.fn();

    const stop = subscribeSettings(repository, onChange, jest.fn());
    await settle();
    stop();

    expect(onChange).toHaveBeenLastCalledWith({ reminderEnabled: false, theme: 'light' });
  });

  it('reports a change made later', async () => {
    const onChange = jest.fn();
    const stop = subscribeSettings(repository, onChange, jest.fn());
    await settle();

    await setTheme(repository, 'system');
    await settle();
    stop();

    expect(onChange).toHaveBeenLastCalledWith({ reminderEnabled: true, theme: 'system' });
  });

  it('passes errors on', async () => {
    const failure = new Error('unreadable');
    jest.spyOn(repository, 'getSettings').mockRejectedValue(failure);
    const onError = jest.fn();

    const stop = subscribeSettings(repository, jest.fn(), onError);
    await settle();
    stop();

    expect(onError).toHaveBeenCalledWith(failure);
  });
});

describe('setters', () => {
  let repository: JournalRepository;

  beforeEach(() => {
    repository = new LocalRepository(memoryStore());
  });

  it('changes only the reminder setting', async () => {
    await repository.putSettings({ reminderEnabled: true, theme: 'light' });

    await setReminderEnabled(repository, false);

    expect(await repository.getSettings()).toEqual({ reminderEnabled: false, theme: 'light' });
  });

  it('changes only the theme', async () => {
    await repository.putSettings({ reminderEnabled: false, theme: 'dark' });

    await setTheme(repository, 'light');

    expect(await repository.getSettings()).toEqual({ reminderEnabled: false, theme: 'light' });
  });

  it('starts from the defaults when nothing is stored yet', async () => {
    await setReminderEnabled(repository, false);

    expect(await repository.getSettings()).toEqual({ reminderEnabled: false, theme: 'dark' });
  });

  it('passes a refused write on to the caller', async () => {
    jest.spyOn(repository, 'putSettings').mockRejectedValue(new Error('permission-denied'));

    await expect(setReminderEnabled(repository, true)).rejects.toThrow('permission-denied');
  });
});
