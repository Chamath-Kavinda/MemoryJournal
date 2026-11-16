import type { KeyValueStorage } from './draftStore';
import {
  FIRST_SAVE_NOTICE,
  FIRST_SAVE_NOTICE_KEY,
  showFirstSaveNoticeOnce,
} from './firstSaveNotice';

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => Promise.resolve(data.get(key) ?? null),
    setItem: (key, value) => {
      data.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      data.delete(key);
      return Promise.resolve();
    },
  };
}

describe('showFirstSaveNoticeOnce', () => {
  it('shows the one-button notice with the guest warning the first time', async () => {
    const storage = memoryStorage();
    const confirm = jest.fn().mockResolvedValue(true);

    await showFirstSaveNoticeOnce(storage, confirm);

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith(FIRST_SAVE_NOTICE);
    expect(FIRST_SAVE_NOTICE.notice).toBe(true);
    expect(FIRST_SAVE_NOTICE.confirmLabel).toBe('Got it');
    expect(FIRST_SAVE_NOTICE.message).toMatch(
      /Stored on this device only\. Sign in to back it up\./,
    );
    expect(FIRST_SAVE_NOTICE.message).toMatch(/removes a guest journal/);
    expect(storage.data.has(FIRST_SAVE_NOTICE_KEY)).toBe(true);
  });

  it('never shows it a second time', async () => {
    const storage = memoryStorage();
    const confirm = jest.fn().mockResolvedValue(true);

    await showFirstSaveNoticeOnce(storage, confirm);
    await showFirstSaveNoticeOnce(storage, confirm);

    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('counts the notice as shown even when it is dismissed without Got it', async () => {
    const storage = memoryStorage();
    const confirm = jest.fn().mockResolvedValue(false);

    await showFirstSaveNoticeOnce(storage, confirm);
    await showFirstSaveNoticeOnce(storage, confirm);

    expect(confirm).toHaveBeenCalledTimes(1);
  });

  it('records the flag before the dialog opens', async () => {
    const storage = memoryStorage();
    let flagWhileOpen: string | undefined;
    const confirm = jest.fn().mockImplementation(() => {
      flagWhileOpen = storage.data.get(FIRST_SAVE_NOTICE_KEY);
      return Promise.resolve(true);
    });

    await showFirstSaveNoticeOnce(storage, confirm);

    expect(flagWhileOpen).toBe('shown');
  });

  it('does not throw or show anything when the storage fails', async () => {
    const storage: KeyValueStorage = {
      getItem: () => Promise.reject(new Error('disk')),
      setItem: () => Promise.reject(new Error('disk')),
      removeItem: () => Promise.resolve(),
    };
    const confirm = jest.fn().mockResolvedValue(true);

    await expect(showFirstSaveNoticeOnce(storage, confirm)).resolves.toBeUndefined();
    expect(confirm).not.toHaveBeenCalled();
  });
});
