import type { EpochMs } from './types';

const pad2 = (value: number): string => String(value).padStart(2, '0');

/**
 * How far the device clock is from server time, in milliseconds (positive when the
 * device is behind). The server stamped its time somewhere between the moment the
 * request was sent and the moment the answer arrived, so the midpoint is used.
 */
export function serverOffsetMs(serverMs: EpochMs, sentMs: EpochMs, receivedMs: EpochMs): number {
  return Math.round(serverMs - (sentMs + receivedMs) / 2);
}

/** The device time moved onto the server's clock. */
export function correctedNow(deviceNowMs: EpochMs, offsetMs: number): EpochMs {
  return deviceNowMs + offsetMs;
}

/** `H:MM:SS`, rounded up to the next whole second so it never shows 0:00:00 early. */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}:${pad2(minutes)}:${pad2(totalSeconds % 60)}`;
}
