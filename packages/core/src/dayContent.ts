import { sortBlocks, type DayContent } from './revisions';
import type { DayBlock } from './types';

/** The 24 hourly rows of a day, 0 to 23. */
export const HOURS: readonly number[] = Array.from({ length: 24 }, (_, hour) => hour);

/** How long a collapsed row's preview may be before it is cut with an ellipsis. */
export const PREVIEW_MAX_LENGTH = 60;

export function assertHour(hour: number): void {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError(`Invalid hour: ${hour}`);
  }
}

export function emptyContent(): DayContent {
  return { freeNotes: '', blocks: [] };
}

/** `09:00`, the label of an hourly row. */
export function hourLabel(hour: number): string {
  assertHour(hour);
  return `${String(hour).padStart(2, '0')}:00`;
}

/** The blocks that belong to an hour, in time order (the whole-hour block first). */
export function blocksOfHour(content: DayContent, hour: number): DayBlock[] {
  assertHour(hour);
  return sortBlocks(content.blocks.filter((block) => block.hour === hour));
}

/** The text written for the hour as a whole, without minute markers. */
export function getHourText(content: DayContent, hour: number): string {
  return blocksOfHour(content, hour).find((block) => block.minute === null)?.text ?? '';
}

/**
 * Sets the whole-hour text. An empty string removes the block, so empty rows stay out of
 * the content and cost nothing (section 5.3). Minute markers of the hour are untouched.
 */
export function setHourText(content: DayContent, hour: number, text: string): DayContent {
  assertHour(hour);
  const others = content.blocks.filter((block) => !(block.hour === hour && block.minute === null));
  const blocks = text === '' ? others : [...others, { hour, minute: null, text }];
  return { freeNotes: content.freeNotes, blocks: sortBlocks(blocks) };
}

export function setFreeNotes(content: DayContent, freeNotes: string): DayContent {
  return { freeNotes, blocks: content.blocks };
}

/** True when anything is written in the hour, including under a minute marker. */
export function hourHasText(content: DayContent, hour: number): boolean {
  return blocksOfHour(content, hour).some((block) => block.text.trim() !== '');
}

/** A one-line preview of an hour: its first text on a single line, cut with an ellipsis. */
export function hourPreview(
  content: DayContent,
  hour: number,
  maxLength: number = PREVIEW_MAX_LENGTH,
): string {
  const first = blocksOfHour(content, hour).find((block) => block.text.trim() !== '');
  if (!first) return '';
  const line = first.text.replace(/\s+/g, ' ').trim();
  return line.length > maxLength ? `${line.slice(0, maxLength - 1).trimEnd()}…` : line;
}
