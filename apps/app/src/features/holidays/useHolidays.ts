import type { Holiday } from '@memory-journal/core';
import { useEffect, useState } from 'react';

import { holidayLoader } from './holidayService';

const NONE: readonly Holiday[] = [];

/**
 * The public holidays of a year, empty until they are loaded and whenever they cannot be. The
 * calendar never waits for them and never shows an error for them (section 17.2).
 */
export function useHolidays(year: number): readonly Holiday[] {
  const [loaded, setLoaded] = useState<{ year: number; holidays: readonly Holiday[] }>({
    year,
    holidays: NONE,
  });

  useEffect(() => {
    let active = true;
    void holidayLoader.load(year).then((holidays) => {
      if (active) setLoaded({ year, holidays });
    });
    return () => {
      active = false;
    };
  }, [year]);

  // Holidays of another year, left over while the new year loads, are not shown.
  return loaded.year === year ? loaded.holidays : NONE;
}
