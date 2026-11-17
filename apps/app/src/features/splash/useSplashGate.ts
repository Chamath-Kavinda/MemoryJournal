import { useEffect, useState } from 'react';

import { SPLASH_FADE_MS, SPLASH_MAX_MS, SPLASH_MIN_MS } from '@/theme/motion';

export type SplashPhase = 'showing' | 'fading' | 'done';

/**
 * Decides how long the brand splash stays (section 15.5). It leaves when the app is `ready` and
 * the splash has been up for at least 500 ms, or after 3 seconds at the latest, whatever is still
 * loading. It then fades for 200 ms and is done. `ready` must depend on local things only (the
 * bundled fonts and the saved settings), never on the network or Firebase.
 * With reduce motion the caller passes the shorter fade; the phase timing here stays the same
 * length because the fade layer finishes earlier on its own.
 */
export function useSplashGate(ready: boolean, fadeMs: number = SPLASH_FADE_MS): SplashPhase {
  const [phase, setPhase] = useState<SplashPhase>('showing');
  const [minElapsed, setMinElapsed] = useState(false);
  const [maxElapsed, setMaxElapsed] = useState(false);

  useEffect(() => {
    const min = setTimeout(() => setMinElapsed(true), SPLASH_MIN_MS);
    const max = setTimeout(() => setMaxElapsed(true), SPLASH_MAX_MS);
    return () => {
      clearTimeout(min);
      clearTimeout(max);
    };
  }, []);

  const mayLeave = (ready && minElapsed) || maxElapsed;

  useEffect(() => {
    if (!mayLeave || phase !== 'showing') return;
    setPhase('fading');
  }, [mayLeave, phase]);

  useEffect(() => {
    if (phase !== 'fading') return undefined;
    const timer = setTimeout(() => setPhase('done'), fadeMs);
    return () => clearTimeout(timer);
  }, [phase, fadeMs]);

  return phase;
}
