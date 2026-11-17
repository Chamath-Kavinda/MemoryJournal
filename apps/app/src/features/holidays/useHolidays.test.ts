jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));
jest.mock('./holidayService', () => ({ holidayLoader: { load: jest.fn() } }));

import type { Holiday } from '@memory-journal/core';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { holidayLoader } from './holidayService';
import { useHolidays } from './useHolidays';

const load = holidayLoader.load as jest.Mock;

const LABOUR_DAY: Holiday = { dayId: '2026-05-01', name: 'Labour Day' };

/** A promise the test settles by hand, so "not loaded yet" can be observed. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('useHolidays', () => {
  beforeEach(() => load.mockReset());

  it('is empty until the holidays are loaded, then holds them', async () => {
    const pending = deferred<Holiday[]>();
    load.mockReturnValue(pending.promise);

    const { result } = await renderHook(() => useHolidays(2026));
    expect(result.current).toEqual([]);

    await act(async () => {
      pending.resolve([LABOUR_DAY]);
      await pending.promise;
    });

    await waitFor(() => expect(result.current).toEqual([LABOUR_DAY]));
    expect(load).toHaveBeenCalledWith(2026);
  });

  it('shows nothing of the old year while a new year loads', async () => {
    load.mockImplementation((year: number) =>
      year === 2026 ? Promise.resolve([LABOUR_DAY]) : new Promise(() => undefined),
    );

    const { result, rerender } = await renderHook<readonly Holiday[], { year: number }>(
      ({ year }) => useHolidays(year),
      { initialProps: { year: 2026 } },
    );
    await waitFor(() => expect(result.current).toHaveLength(1));

    await rerender({ year: 2025 });

    expect(result.current).toEqual([]);
  });
});
