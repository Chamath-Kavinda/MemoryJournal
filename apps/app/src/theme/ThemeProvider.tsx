import type { ThemePreference } from '@memory-journal/core';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { DEFAULT_THEME, paletteFor, resolveScheme, type Palette, type Scheme } from './palette';

interface ThemeValue {
  preference: ThemePreference;
  scheme: Scheme;
  palette: Palette;
}

const ThemeContext = createContext<ThemePreference | null>(null);

interface ProviderProps {
  preference: ThemePreference;
  children: ReactNode;
}

/** Makes the saved theme choice available to every screen below it. */
export function ThemeProvider({ preference, children }: ProviderProps) {
  return <ThemeContext.Provider value={preference}>{children}</ThemeContext.Provider>;
}

/**
 * The colours to draw with. Without a provider (as in most tests) the default theme is used,
 * which is also what a person who never opened Settings gets.
 */
export function useTheme(): ThemeValue {
  const preference = useContext(ThemeContext) ?? DEFAULT_THEME;
  const system = useColorScheme();
  return useMemo(() => {
    const scheme = resolveScheme(preference, system);
    return { preference, scheme, palette: paletteFor(scheme) };
  }, [preference, system]);
}
