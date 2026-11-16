import { LinearTransition } from 'react-native-reanimated';

import { DURATION } from '@/theme/motion';

import { easeOut } from './easing';

/**
 * How a row moves and grows when something above it or inside it changes size, for example an
 * hourly row opening. It runs on the UI thread and is left out when reduce motion is on.
 */
export const ROW_LAYOUT = LinearTransition.duration(DURATION.base).easing(easeOut);
