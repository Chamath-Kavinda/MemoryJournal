import type { Edge } from 'react-native-safe-area-context';

import { useLayout } from '@/theme/useLayout';

const WITH_BOTTOM_BAR: readonly Edge[] = ['top', 'left', 'right'];
const WITHOUT_BOTTOM_BAR: readonly Edge[] = ['top', 'right', 'bottom', 'left'];

/**
 * The safe-area edges a tab screen pads itself with. The bottom bar already adds the bottom
 * inset, so on windows that show it the screen must not add it again: that was the empty strip
 * above the bar. On wide windows the side navigation is used instead and the screen keeps the
 * bottom inset itself.
 */
export function useTabScreenEdges(): readonly Edge[] {
  const { sizeClass } = useLayout();
  return sizeClass === 'expanded' ? WITHOUT_BOTTOM_BAR : WITH_BOTTOM_BAR;
}
