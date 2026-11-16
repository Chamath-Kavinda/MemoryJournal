import type { JournalRepository } from '@memory-journal/core';

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Runs `read` now and again whenever the journal changes. A slow read that is overtaken by a
 * newer one is dropped, so a screen never goes back to older data. Returns a function that stops
 * listening; a read still in flight is ignored after that.
 */
export function watchJournal<T>(
  repository: Pick<JournalRepository, 'subscribe'>,
  read: () => Promise<T>,
  onChange: (value: T) => void,
  onError: (error: Error) => void,
): () => void {
  let active = true;
  let latest = 0;

  const load = (): void => {
    const current = ++latest;
    read().then(
      (value) => {
        if (active && current === latest) onChange(value);
      },
      (error: unknown) => {
        if (active && current === latest) onError(asError(error));
      },
    );
  };

  load();
  const stop = repository.subscribe(load);
  return () => {
    active = false;
    stop();
  };
}
