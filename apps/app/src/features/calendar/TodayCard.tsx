import type { DayId } from '@memory-journal/core';

import { useDayAccess } from '@/features/day/useDayAccess';

import { TodayCardView } from './TodayCardView';

interface Props {
  todayId: DayId;
  onWrite: () => void;
}

/**
 * The Today card of Home, kept live. It uses the same lock state as the Day screen, so the card
 * and the writer always agree: server time for a signed-in user, the guarded device clock for a
 * guest.
 */
export function TodayCard({ todayId, onWrite }: Props) {
  const access = useDayAccess(todayId);
  return <TodayCardView access={access} onWrite={onWrite} />;
}
