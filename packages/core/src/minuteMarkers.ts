import { assertHour, blocksOfHour } from './dayContent';
import { sortBlocks, type DayContent } from './revisions';
import type { DayBlock } from './types';

function assertMinute(minute: number): void {
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new RangeError(`Invalid minute: ${minute}`);
  }
}

function isMarker(block: DayBlock, hour: number, minute: number): boolean {
  return block.hour === hour && block.minute === minute;
}

/** `:25`, the label of a minute marker inside an hourly row. */
export function minuteLabel(minute: number): string {
  assertMinute(minute);
  return `:${String(minute).padStart(2, '0')}`;
}

/** `09:25`, the exact time a minute marker stands for. */
export function timeLabel(hour: number, minute: number): string {
  assertHour(hour);
  return `${String(hour).padStart(2, '0')}${minuteLabel(minute)}`;
}

/**
 * Reads a minute typed by the user: `25`, `5` or `:25`. Returns null when it is not a whole
 * number from 0 to 59.
 */
export function parseMinute(input: string): number | null {
  const digits = input.trim().replace(/^:/, '');
  if (!/^\d{1,2}$/.test(digits)) return null;
  const minute = Number(digits);
  return minute <= 59 ? minute : null;
}

/** The minute markers of an hour, in time order (the whole-hour block is not included). */
export function minuteBlocksOfHour(content: DayContent, hour: number): DayBlock[] {
  return blocksOfHour(content, hour).filter((block) => block.minute !== null);
}

export function hasMinuteMarker(content: DayContent, hour: number, minute: number): boolean {
  assertHour(hour);
  assertMinute(minute);
  return content.blocks.some((block) => isMarker(block, hour, minute));
}

/** The text written under a minute marker, or an empty string if there is no such marker. */
export function getMinuteText(content: DayContent, hour: number, minute: number): string {
  assertHour(hour);
  assertMinute(minute);
  return content.blocks.find((block) => isMarker(block, hour, minute))?.text ?? '';
}

/** Where the cursor was when Add minute was pressed: in the whole-hour text or in a marker. */
export interface MarkerSplit {
  /** The block the cursor is in: its minute, or null for the whole-hour text. */
  minute: number | null;
  /** Character offset of the cursor inside that block's text. */
  cursor: number;
}

/**
 * Inserts a minute marker (section 5.3). With a `split`, the text after the cursor moves into
 * the new marker and the text before it stays; whitespace at the cut is trimmed. Without one the
 * marker starts empty. A marker that already exists is left alone and the same content is
 * returned. The draft keeps an empty marker so it can be typed into; saving drops blocks with
 * no text (see `normalizeContent`).
 */
export function addMinuteMarker(
  content: DayContent,
  hour: number,
  minute: number,
  split?: MarkerSplit,
): DayContent {
  assertHour(hour);
  assertMinute(minute);
  if (hasMinuteMarker(content, hour, minute)) return content;

  let blocks = content.blocks;
  let after = '';

  if (split !== undefined) {
    const target = blocks.find((block) => block.hour === hour && block.minute === split.minute);
    if (target !== undefined) {
      const cursor = Number.isFinite(split.cursor)
        ? Math.min(Math.max(Math.trunc(split.cursor), 0), target.text.length)
        : target.text.length;
      const before = target.text.slice(0, cursor).trimEnd();
      after = target.text.slice(cursor).trimStart();
      blocks = blocks.flatMap((block) => {
        if (block !== target) return [block];
        // An emptied whole-hour block is dropped; an emptied marker stays so it remains visible.
        return before === '' && block.minute === null ? [] : [{ ...block, text: before }];
      });
    }
  }

  return {
    freeNotes: content.freeNotes,
    blocks: sortBlocks([...blocks, { hour, minute, text: after }]),
  };
}

/**
 * Sets the text under a minute marker, creating the marker if needed. Unlike the whole-hour
 * text, an empty string keeps the marker, so a marker the user just added does not vanish.
 */
export function setMinuteText(
  content: DayContent,
  hour: number,
  minute: number,
  text: string,
): DayContent {
  assertHour(hour);
  assertMinute(minute);
  const others = content.blocks.filter((block) => !isMarker(block, hour, minute));
  return { freeNotes: content.freeNotes, blocks: sortBlocks([...others, { hour, minute, text }]) };
}

/**
 * Removes a minute marker without losing what was written under it: its text is appended to
 * the block before it in the same hour (the previous marker, or the whole-hour text).
 */
export function removeMinuteMarker(content: DayContent, hour: number, minute: number): DayContent {
  assertHour(hour);
  assertMinute(minute);
  const marker = content.blocks.find((block) => isMarker(block, hour, minute));
  if (marker === undefined) return content;

  const rest = content.blocks.filter((block) => block !== marker);
  if (marker.text.trim() === '') return { freeNotes: content.freeNotes, blocks: rest };

  const previous = blocksOfHour({ freeNotes: '', blocks: rest }, hour)
    .filter((block) => (block.minute ?? -1) < minute)
    .pop();

  if (previous === undefined) {
    return {
      freeNotes: content.freeNotes,
      blocks: sortBlocks([...rest, { hour, minute: null, text: marker.text }]),
    };
  }
  const joined = previous.text.trim() === '' ? marker.text : `${previous.text}\n${marker.text}`;
  return {
    freeNotes: content.freeNotes,
    blocks: rest.map((block) => (block === previous ? { ...block, text: joined } : block)),
  };
}
