import { useReducedMotion } from 'react-native-reanimated';

/**
 * True when the system setting asks for reduced motion. Every animated component reads it here, so
 * the whole app follows one switch and tests can replace it in one place.
 */
export function useReduceMotion(): boolean {
  return useReducedMotion();
}
