import { emptyContent, getHourText, setHourText } from './dayContent';
import {
  addMinuteMarker,
  getMinuteText,
  hasMinuteMarker,
  minuteBlocksOfHour,
  minuteLabel,
  parseMinute,
  removeMinuteMarker,
  setMinuteText,
  timeLabel,
} from './minuteMarkers';
import { normalizeContent, type DayContent } from './revisions';

describe('minuteLabel and timeLabel', () => {
  it('formats a minute marker and an exact time', () => {
    expect(minuteLabel(5)).toBe(':05');
    expect(minuteLabel(25)).toBe(':25');
    expect(timeLabel(9, 25)).toBe('09:25');
    expect(timeLabel(21, 0)).toBe('21:00');
  });

  it('rejects an invalid minute or hour', () => {
    expect(() => minuteLabel(60)).toThrow(RangeError);
    expect(() => minuteLabel(-1)).toThrow(RangeError);
    expect(() => minuteLabel(2.5)).toThrow(RangeError);
    expect(() => timeLabel(24, 0)).toThrow(RangeError);
  });
});

describe('parseMinute', () => {
  it('reads whole minutes from 0 to 59, with or without a colon', () => {
    expect(parseMinute('25')).toBe(25);
    expect(parseMinute(' 5 ')).toBe(5);
    expect(parseMinute('05')).toBe(5);
    expect(parseMinute(':25')).toBe(25);
    expect(parseMinute('0')).toBe(0);
    expect(parseMinute('59')).toBe(59);
  });

  it('rejects anything else', () => {
    expect(parseMinute('')).toBeNull();
    expect(parseMinute('60')).toBeNull();
    expect(parseMinute('75')).toBeNull();
    expect(parseMinute('-1')).toBeNull();
    expect(parseMinute('2.5')).toBeNull();
    expect(parseMinute('abc')).toBeNull();
    expect(parseMinute('123')).toBeNull();
  });
});

describe('addMinuteMarker', () => {
  const base = setHourText(emptyContent(), 9, 'Breakfast then a phone call');

  it('adds an empty marker when there is no split', () => {
    const content = addMinuteMarker(base, 9, 25);
    expect(content.blocks).toEqual([
      { hour: 9, minute: null, text: 'Breakfast then a phone call' },
      { hour: 9, minute: 25, text: '' },
    ]);
  });

  it('moves the text after the cursor into the new marker', () => {
    const content = addMinuteMarker(base, 9, 25, { minute: null, cursor: 14 });
    expect(content.blocks).toEqual([
      { hour: 9, minute: null, text: 'Breakfast then' },
      { hour: 9, minute: 25, text: 'a phone call' },
    ]);
  });

  it('drops the whole-hour block when the cursor is at the very start', () => {
    const content = addMinuteMarker(base, 9, 25, { minute: null, cursor: 0 });
    expect(content.blocks).toEqual([{ hour: 9, minute: 25, text: 'Breakfast then a phone call' }]);
  });

  it('keeps everything before a cursor at the very end', () => {
    const content = addMinuteMarker(base, 9, 25, { minute: null, cursor: 999 });
    expect(content.blocks).toEqual([
      { hour: 9, minute: null, text: 'Breakfast then a phone call' },
      { hour: 9, minute: 25, text: '' },
    ]);
  });

  it('treats a negative, fractional or missing cursor sensibly', () => {
    expect(addMinuteMarker(base, 9, 25, { minute: null, cursor: -5 }).blocks).toEqual([
      { hour: 9, minute: 25, text: 'Breakfast then a phone call' },
    ]);
    expect(addMinuteMarker(base, 9, 25, { minute: null, cursor: 9.9 }).blocks).toEqual([
      { hour: 9, minute: null, text: 'Breakfast' },
      { hour: 9, minute: 25, text: 'then a phone call' },
    ]);
    expect(addMinuteMarker(base, 9, 25, { minute: null, cursor: Number.NaN }).blocks).toEqual([
      { hour: 9, minute: null, text: 'Breakfast then a phone call' },
      { hour: 9, minute: 25, text: '' },
    ]);
  });

  it('splits the text of another minute marker and keeps the emptied marker', () => {
    const start = setMinuteText(base, 9, 10, 'Left the house');
    const content = addMinuteMarker(start, 9, 40, { minute: 10, cursor: 0 });
    expect(content.blocks).toEqual([
      { hour: 9, minute: null, text: 'Breakfast then a phone call' },
      { hour: 9, minute: 10, text: '' },
      { hour: 9, minute: 40, text: 'Left the house' },
    ]);
  });

  it('ignores a split that points at a block that does not exist', () => {
    const content = addMinuteMarker(base, 9, 25, { minute: 50, cursor: 3 });
    expect(content.blocks).toEqual([
      { hour: 9, minute: null, text: 'Breakfast then a phone call' },
      { hour: 9, minute: 25, text: '' },
    ]);
  });

  it('keeps markers in time order and leaves free notes and other hours alone', () => {
    let content: DayContent = { freeNotes: 'Notes', blocks: [] };
    content = setHourText(content, 8, 'Bus');
    content = addMinuteMarker(content, 9, 40);
    content = addMinuteMarker(content, 9, 5);
    expect(content.freeNotes).toBe('Notes');
    expect(content.blocks.map((block) => [block.hour, block.minute])).toEqual([
      [8, null],
      [9, 5],
      [9, 40],
    ]);
  });

  it('returns the same content when the marker already exists', () => {
    const once = addMinuteMarker(base, 9, 25);
    expect(addMinuteMarker(once, 9, 25, { minute: null, cursor: 3 })).toBe(once);
  });

  it('rejects an invalid hour or minute', () => {
    expect(() => addMinuteMarker(base, 24, 5)).toThrow(RangeError);
    expect(() => addMinuteMarker(base, 9, 60)).toThrow(RangeError);
  });

  it('does not survive saving until something is written under it', () => {
    const content = addMinuteMarker(base, 9, 25);
    expect(normalizeContent(content).blocks).toEqual([
      { hour: 9, minute: null, text: 'Breakfast then a phone call' },
    ]);
  });
});

describe('setMinuteText, getMinuteText and hasMinuteMarker', () => {
  it('creates a marker and reads it back', () => {
    const content = setMinuteText(emptyContent(), 9, 25, 'Call Amma');
    expect(hasMinuteMarker(content, 9, 25)).toBe(true);
    expect(hasMinuteMarker(content, 9, 26)).toBe(false);
    expect(hasMinuteMarker(content, 10, 25)).toBe(false);
    expect(getMinuteText(content, 9, 25)).toBe('Call Amma');
    expect(getMinuteText(content, 9, 26)).toBe('');
  });

  it('replaces the text and keeps the marker when it is emptied', () => {
    let content = setMinuteText(emptyContent(), 9, 25, 'Call Amma');
    content = setMinuteText(content, 9, 25, 'Call Amma back');
    expect(content.blocks).toEqual([{ hour: 9, minute: 25, text: 'Call Amma back' }]);
    content = setMinuteText(content, 9, 25, '');
    expect(hasMinuteMarker(content, 9, 25)).toBe(true);
  });

  it('does not touch the whole-hour text or the free notes', () => {
    const base: DayContent = {
      freeNotes: 'Notes',
      blocks: [{ hour: 9, minute: null, text: 'Morning' }],
    };
    const content = setMinuteText(base, 9, 25, 'Call');
    expect(content.freeNotes).toBe('Notes');
    expect(getHourText(content, 9)).toBe('Morning');
  });

  it('rejects an invalid hour or minute', () => {
    expect(() => setMinuteText(emptyContent(), 24, 5, 'x')).toThrow(RangeError);
    expect(() => setMinuteText(emptyContent(), 9, 60, 'x')).toThrow(RangeError);
    expect(() => hasMinuteMarker(emptyContent(), 24, 5)).toThrow(RangeError);
    expect(() => hasMinuteMarker(emptyContent(), 9, 60)).toThrow(RangeError);
    expect(() => getMinuteText(emptyContent(), 24, 5)).toThrow(RangeError);
    expect(() => getMinuteText(emptyContent(), 9, 60)).toThrow(RangeError);
  });
});

describe('minuteBlocksOfHour', () => {
  it('lists only the markers of the hour, in time order', () => {
    let content = setHourText(emptyContent(), 9, 'Morning');
    content = setMinuteText(content, 9, 40, 'B');
    content = setMinuteText(content, 9, 5, 'A');
    content = setMinuteText(content, 10, 15, 'Other hour');
    expect(minuteBlocksOfHour(content, 9).map((block) => block.minute)).toEqual([5, 40]);
    expect(minuteBlocksOfHour(content, 11)).toEqual([]);
  });
});

describe('removeMinuteMarker', () => {
  it('removes an empty marker', () => {
    const content = addMinuteMarker(setHourText(emptyContent(), 9, 'Morning'), 9, 25);
    expect(removeMinuteMarker(content, 9, 25).blocks).toEqual([
      { hour: 9, minute: null, text: 'Morning' },
    ]);
  });

  it('moves the text of a marker back into the whole-hour text', () => {
    let content = setHourText(emptyContent(), 9, 'Morning');
    content = setMinuteText(content, 9, 25, 'Call Amma');
    expect(removeMinuteMarker(content, 9, 25).blocks).toEqual([
      { hour: 9, minute: null, text: 'Morning\nCall Amma' },
    ]);
  });

  it('creates the whole-hour text when it did not exist', () => {
    const content = setMinuteText(emptyContent(), 9, 25, 'Call Amma');
    expect(removeMinuteMarker(content, 9, 25).blocks).toEqual([
      { hour: 9, minute: null, text: 'Call Amma' },
    ]);
  });

  it('uses the previous marker when there is one', () => {
    let content = setHourText(emptyContent(), 9, 'Morning');
    content = setMinuteText(content, 9, 10, 'First');
    content = setMinuteText(content, 9, 25, 'Second');
    expect(removeMinuteMarker(content, 9, 25).blocks).toEqual([
      { hour: 9, minute: null, text: 'Morning' },
      { hour: 9, minute: 10, text: 'First\nSecond' },
    ]);
  });

  it('does not add a blank line when the block before it is empty', () => {
    let content = setMinuteText(emptyContent(), 9, 10, '');
    content = setMinuteText(content, 9, 25, 'Second');
    expect(removeMinuteMarker(content, 9, 25).blocks).toEqual([
      { hour: 9, minute: 10, text: 'Second' },
    ]);
  });

  it('returns the same content when there is no such marker', () => {
    const content = setHourText(emptyContent(), 9, 'Morning');
    expect(removeMinuteMarker(content, 9, 25)).toBe(content);
  });

  it('rejects an invalid hour or minute', () => {
    expect(() => removeMinuteMarker(emptyContent(), 24, 5)).toThrow(RangeError);
    expect(() => removeMinuteMarker(emptyContent(), 9, 60)).toThrow(RangeError);
  });
});
