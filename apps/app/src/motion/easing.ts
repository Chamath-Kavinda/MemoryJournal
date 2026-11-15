import { Easing } from 'react-native-reanimated';

import { EASE_IN, EASE_OUT } from '@/theme/motion';

/** Reanimated easing functions built from the motion tokens. */
export const easeOut = Easing.bezier(...EASE_OUT);
export const easeIn = Easing.bezier(...EASE_IN);
/** For loops that go up and down, which neither enter nor leave. */
export const easeInOut = Easing.inOut(Easing.ease);
