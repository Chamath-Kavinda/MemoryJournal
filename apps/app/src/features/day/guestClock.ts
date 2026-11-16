import { nextLastSeenAt, type EpochMs, type JournalRepository } from '@memory-journal/core';

/**
 * The latest time seen in this run of the app. The app root fills it at launch, so a Day screen
 * has it before its own read of the stored time finishes and never shows today as writable
 * for a moment on a wrong clock.
 */
let latestSeen: EpochMs | null = null;

/** The latest time seen in this run of the app, or null before anything was recorded. */
export function latestSeenAt(): EpochMs | null {
  return latestSeen;
}

/** Forgets the in-memory time, for tests. */
export function resetSeenCache(): void {
  latestSeen = null;
}

/**
 * Remembers the latest time the app has seen, for the guest backwards-clock guard (section
 * 15.6). It is called on launch, on resume and after every save. The stored time only ever
 * moves forward, so setting the device clock back never lowers it. Returns the latest time
 * known. If the stored time cannot be read or written, the in-memory time is still kept and
 * the guard simply has less to go on; it never blocks the app.
 */
export async function recordSeen(repository: JournalRepository, nowMs: EpochMs): Promise<EpochMs> {
  try {
    const stored = await repository.getLastSeenAt();
    const next = nextLastSeenAt(nowMs, stored);
    if (next !== stored) await repository.putLastSeenAt(next);
    latestSeen = nextLastSeenAt(next, latestSeen);
  } catch {
    latestSeen = nextLastSeenAt(nowMs, latestSeen);
  }
  return latestSeen;
}
