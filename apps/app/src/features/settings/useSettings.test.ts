jest.mock('@/lib/firebase', () => ({ getFirebase: () => ({ db: {} }) }));
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  onSnapshot: jest.fn(),
  updateDoc: jest.fn(),
}));

import { DEFAULT_SETTINGS } from '@memory-journal/core';

import { reminderWanted } from './useSettings';

describe('reminderWanted', () => {
  it('is off until the stored setting has been read', () => {
    expect(reminderWanted({ status: 'loading', settings: DEFAULT_SETTINGS })).toBe(false);
  });

  it('follows the stored setting once it is read', () => {
    expect(
      reminderWanted({ status: 'ready', settings: { ...DEFAULT_SETTINGS, reminderEnabled: true } }),
    ).toBe(true);
    expect(
      reminderWanted({
        status: 'ready',
        settings: { ...DEFAULT_SETTINGS, reminderEnabled: false },
      }),
    ).toBe(false);
  });

  it('falls back to the default (on) when the setting cannot be read', () => {
    expect(reminderWanted({ status: 'error', settings: DEFAULT_SETTINGS })).toBe(true);
  });
});
