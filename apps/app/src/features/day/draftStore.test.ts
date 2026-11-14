import { emptyContent, setHourText, setMinuteText } from '@memory-journal/core';

import { createMemoryStorage } from '@/test-utils/memoryStorage';

import { clearDraft, draftKey, loadDraft, saveDraft } from './draftStore';

const DAY = '2026-11-13';

describe('draftKey', () => {
  it('is separate for each user and each day', () => {
    expect(draftKey('u1', DAY)).toBe('draft:v1:u1:2026-11-13');
    expect(draftKey('u1', DAY)).not.toBe(draftKey('u2', DAY));
    expect(draftKey('u1', DAY)).not.toBe(draftKey('u1', '2026-11-12'));
  });
});

describe('saveDraft and loadDraft', () => {
  it('stores a draft and reads it back with its save time', async () => {
    const storage = createMemoryStorage();
    const content = setMinuteText(setHourText(emptyContent(), 9, 'Breakfast'), 9, 25, 'Call Amma');

    await saveDraft(storage, 'u1', DAY, { ...content, freeNotes: 'Somewhere' }, 1234);

    expect(await loadDraft(storage, 'u1', DAY)).toEqual({
      savedAt: 1234,
      content: {
        freeNotes: 'Somewhere',
        blocks: [
          { hour: 9, minute: null, text: 'Breakfast' },
          { hour: 9, minute: 25, text: 'Call Amma' },
        ],
      },
    });
  });

  it('returns null when there is no draft', async () => {
    expect(await loadDraft(createMemoryStorage(), 'u1', DAY)).toBeNull();
  });

  it('keeps drafts of other users and days apart', async () => {
    const storage = createMemoryStorage();
    await saveDraft(storage, 'u1', DAY, setHourText(emptyContent(), 9, 'Mine'), 1);

    expect(await loadDraft(storage, 'u2', DAY)).toBeNull();
    expect(await loadDraft(storage, 'u1', '2026-11-12')).toBeNull();
  });

  it('removes the stored draft when the day has no text', async () => {
    const storage = createMemoryStorage();
    await saveDraft(storage, 'u1', DAY, setHourText(emptyContent(), 9, 'Hello'), 1);
    expect(storage.data.size).toBe(1);

    await saveDraft(storage, 'u1', DAY, emptyContent(), 2);
    expect(storage.data.size).toBe(0);
  });

  it('treats a marker with no text as an empty day', async () => {
    const storage = createMemoryStorage();
    await saveDraft(storage, 'u1', DAY, setMinuteText(emptyContent(), 9, 25, ''), 1);
    expect(storage.data.size).toBe(0);
  });

  it('ignores stored data that is not valid JSON', async () => {
    const storage = createMemoryStorage({ [draftKey('u1', DAY)]: '{not json' });
    expect(await loadDraft(storage, 'u1', DAY)).toBeNull();
  });

  it('ignores stored data of the wrong shape or version', async () => {
    const key = draftKey('u1', DAY);
    const good = { version: 1, savedAt: 1, content: { freeNotes: '', blocks: [] } };
    const cases = [
      { ...good, version: 2 },
      { ...good, content: { freeNotes: 5, blocks: [] } },
      { ...good, content: { freeNotes: '', blocks: [{ hour: 30, minute: null, text: 'x' }] } },
      { ...good, content: { freeNotes: '', blocks: [{ hour: 9, minute: 60, text: 'x' }] } },
      { ...good, content: { freeNotes: '', blocks: [{ hour: 9, minute: 1.5, text: 'x' }] } },
      { ...good, savedAt: 'yesterday' },
      'a string',
      null,
    ];
    for (const stored of cases) {
      const storage = createMemoryStorage({ [key]: JSON.stringify(stored) });
      expect(await loadDraft(storage, 'u1', DAY)).toBeNull();
    }
  });

  it('lets a storage failure through instead of hiding it', async () => {
    const storage = createMemoryStorage();
    storage.failNext('getItem');
    await expect(loadDraft(storage, 'u1', DAY)).rejects.toThrow('getItem failed');

    storage.failNext('setItem');
    await expect(
      saveDraft(storage, 'u1', DAY, setHourText(emptyContent(), 9, 'x'), 1),
    ).rejects.toThrow('setItem failed');
  });
});

describe('clearDraft', () => {
  it('removes the draft of one day only', async () => {
    const storage = createMemoryStorage();
    await saveDraft(storage, 'u1', DAY, setHourText(emptyContent(), 9, 'A'), 1);
    await saveDraft(storage, 'u1', '2026-11-12', setHourText(emptyContent(), 9, 'B'), 1);

    await clearDraft(storage, 'u1', DAY);

    expect(await loadDraft(storage, 'u1', DAY)).toBeNull();
    expect(await loadDraft(storage, 'u1', '2026-11-12')).not.toBeNull();
  });
});
