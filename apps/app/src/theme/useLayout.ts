import { useWindowDimensions } from 'react-native';

import { layoutFor, type Layout } from './sizeClass';

/**
 * The size class, content width and column count for the current window. It reads the window
 * size only, so it updates on rotation, split screen, a foldable opening and a resized window.
 */
export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  return layoutFor(width, height);
}
