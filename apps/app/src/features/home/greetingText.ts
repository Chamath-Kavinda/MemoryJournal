/** The part of the day a greeting is for, from the hour of the local clock (0 to 23). */
export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

/** Morning 05:00 to 11:59, afternoon 12:00 to 16:59, evening 17:00 to 20:59, night 21:00 to 04:59. */
export function dayPartOfHour(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/** The first word of a display name, or null when there is no usable name. */
export function firstNameOf(displayName: string | null | undefined): string | null {
  const first = displayName?.trim().split(/\s+/)[0];
  return first ? first : null;
}

/**
 * "Good morning, Sam" for someone who is signed in and has a name, and just "Good morning" for a
 * guest or an account without a name.
 */
export function greetingFor(hour: number, displayName?: string | null): string {
  const text = `Good ${dayPartOfHour(hour)}`;
  const name = firstNameOf(displayName);
  return name ? `${text}, ${name}` : text;
}
