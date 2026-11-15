import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  cancelAnimation,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { MAX_LOOPS } from '@/theme/motion';

import { easeInOut } from './easing';
import { useReduceMotion } from './useReduceMotion';

let usedLoops = 0;

/** Takes one of the looping animation slots. Returns false when all of them are in use. */
export function claimLoop(): boolean {
  if (usedLoops >= MAX_LOOPS) return false;
  usedLoops += 1;
  return true;
}

export function releaseLoop(): void {
  usedLoops = Math.max(0, usedLoops - 1);
}

/** For tests only: forget every claimed slot. */
export function resetLoops(): void {
  usedLoops = 0;
}

/** True while the app is in the foreground; loops stop in the background. */
export function useAppActive(): boolean {
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);
  return active;
}

/**
 * Asks for one looping animation slot. It is granted only when `wanted` is true, reduce motion is
 * off, the app is in the foreground, and fewer than two other loops are running. Pass
 * `wanted = false` for a screen that is not focused so its loops stop.
 */
export function useLoopSlot(wanted: boolean): boolean {
  const reduce = useReduceMotion();
  const appActive = useAppActive();
  const should = wanted && !reduce && appActive;
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (!should) {
      setGranted(false);
      return undefined;
    }
    if (!claimLoop()) {
      setGranted(false);
      return undefined;
    }
    setGranted(true);
    return () => {
      releaseLoop();
    };
  }, [should]);

  return granted;
}

/**
 * A value that goes 0 to 1 and back to 0 forever while the loop slot is granted, and rests at 0
 * otherwise. Runs on the UI thread, so nothing re-renders while it loops.
 */
export function useLoopProgress(wanted: boolean, halfCycleMs: number): SharedValue<number> {
  const granted = useLoopSlot(wanted);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (granted) {
      progress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: halfCycleMs, easing: easeInOut }),
          withTiming(0, { duration: halfCycleMs, easing: easeInOut }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(progress);
      progress.value = 0;
    }
    return () => {
      cancelAnimation(progress);
    };
  }, [granted, halfCycleMs, progress]);

  return progress;
}
