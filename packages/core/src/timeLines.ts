import type { DayBlock } from './types';

/**
 * Time lines of the day page (section 18.3). A time is stored in the text as its own line:
 * `⏱ 21` for an hour only and `⏱ 21:25` for hour and minutes. A line is a time only when the
 * whole line is exactly that, so the symbol inside a sentence stays plain text.
 */
export const TIME_MARK = '\u23F1';

const TIME_LINE = new RegExp(`^${TIME_MARK} ([01]\\d|2[0-3])(?::([0-5]\\d))?[ \\t]*\\r?$`);
const TIME_LINES_GLOBAL = new RegExp(
  `^${TIME_MARK} (?:[01]\\d|2[0-3])(?::[0-5]\\d)?[ \\t]*\\r?$`,
  'gm',
);

export interface TimeOfDay {
  hour: number;
  /** Null for an hour-only line. */
  minute: number | null;
}

const pad = (value: number): string => String(value).padStart(2, '0');

function assertTime(hour: number, minute: number | null): void {
  const hourOk = Number.isInteger(hour) && hour >= 0 && hour <= 23;
  const minuteOk = minute === null || (Number.isInteger(minute) && minute >= 0 && minute <= 59);
  if (!hourOk || !minuteOk) {
    throw new RangeError(`Invalid time: hour=${hour} minute=${String(minute)}`);
  }
}

/** The line for a time: `⏱ 21` or `⏱ 21:25`. */
export function formatTimeLine(hour: number, minute: number | null): string {
  assertTime(hour, minute);
  return minute === null ? `${TIME_MARK} ${pad(hour)}` : `${TIME_MARK} ${pad(hour)}:${pad(minute)}`;
}

/** Reads one line. Returns null unless the whole line is a time line. */
export function parseTimeLine(line: string): TimeOfDay | null {
  const match = TIME_LINE.exec(line);
  if (!match) return null;
  return { hour: Number(match[1]), minute: match[2] === undefined ? null : Number(match[2]) };
}

/** Counts whitespace-separated words, leaving the time lines out. */
export function countPageWords(text: string): number {
  const withoutTimes = text.replace(TIME_LINES_GLOBAL, '');
  return withoutTimes.match(/\S+/g)?.length ?? 0;
}

/**
 * Splits a page at its time lines into blocks, in the order written. The text before the first
 * time line is not a block. A block's text is trimmed and may be empty.
 */
export function timeBlocksOf(text: string): DayBlock[] {
  const blocks: DayBlock[] = [];
  let current: { time: TimeOfDay; lines: string[] } | null = null;
  const flush = (): void => {
    if (current) {
      blocks.push({
        hour: current.time.hour,
        minute: current.time.minute,
        text: current.lines.join('\n').trim(),
      });
    }
  };
  for (const line of text.split('\n')) {
    const time = parseTimeLine(line);
    if (time) {
      flush();
      current = { time, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  flush();
  return blocks;
}

export interface TextEdit {
  text: string;
  /** Where the cursor goes after the edit. */
  cursor: number;
}

function clampCursor(text: string, cursor: number): number {
  return Math.min(
    Math.max(Number.isFinite(cursor) ? Math.trunc(cursor) : text.length, 0),
    text.length,
  );
}

/** Inserts `insert` at the cursor and puts the cursor after it. */
export function insertAtCursor(text: string, cursor: number, insert: string): TextEdit {
  const at = clampCursor(text, cursor);
  return { text: text.slice(0, at) + insert + text.slice(at), cursor: at + insert.length };
}

/**
 * Add time (section 18.3). Puts the time line on its own line at the cursor, with a line break
 * before it when the cursor is in the middle of a line, and the cursor on the next line. If the
 * same time line is already in the page, nothing is added and the cursor moves to the line after it.
 */
export function insertTimeLine(
  text: string,
  cursor: number,
  hour: number,
  minute: number | null,
): TextEdit {
  const line = formatTimeLine(hour, minute);

  let offset = 0;
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const existing = lines[index] ?? '';
    const end = offset + existing.length;
    const time = parseTimeLine(existing);
    if (time && time.hour === hour && time.minute === minute) {
      if (index < lines.length - 1) return { text, cursor: end + 1 };
      return { text: `${text}\n`, cursor: end + 1 };
    }
    offset = end + 1;
  }

  const at = clampCursor(text, cursor);
  const before = text.slice(0, at);
  const after = text.slice(at);
  const lead = before === '' || before.endsWith('\n') ? '' : '\n';
  const inserted = `${lead}${line}\n`;
  return { text: before + inserted + after, cursor: before.length + inserted.length };
}
