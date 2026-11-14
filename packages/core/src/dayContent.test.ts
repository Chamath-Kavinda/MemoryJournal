import {
  HOURS,
  blocksOfHour,
  emptyContent,
  getHourText,
  hourHasText,
  hourLabel,
  hourPreview,
  setFreeNotes,
  setHourText,
} from './dayContent';
import type { DayContent } from './revisions';

describe('HOURS and hourLabel', () => {
  it('has 24 hours labelled 00:00 to 23:00', () => {
    expect(HOURS).toHaveLength(24);
    expect(hourLabel(0)).toBe('00:00');
    expect(hourLabel(9)).toBe('09:00');
    expect(hourLabel(23)).toBe('23:00');
  });

  it('rejects an invalid hour', () => {
    expect(() => hourLabel(24)).toThrow(RangeError);
    expect(() => hourLabel(-1)).toThrow(RangeError);
    expect(() => hourLabel(1.5)).toThrow(RangeError);
  });
});

describe('emptyContent', () => {
  it('has no notes and no blocks', () => {
    expect(emptyContent()).toEqual({ freeNotes: '', blocks: [] });
  });
});

describe('getHourText and setHourText', () => {
  it('returns an empty string for an empty hour', () => {
    expect(getHourText(emptyContent(), 9)).toBe('');
  });

  it('writes the whole-hour text and reads it back', () => {
    const content = setHourText(emptyContent(), 9, 'Breakfast with Amma');
    expect(content.blocks).toEqual([{ hour: 9, minute: null, text: 'Breakfast with Amma' }]);
    expect(getHourText(content, 9)).toBe('Breakfast with Amma');
  });

  it('replaces existing text and keeps hours in time order', () => {
    let content = setHourText(emptyContent(), 14, 'Lunch');
    content = setHourText(content, 8, 'Bus');
    content = setHourText(content, 14, 'Late lunch');
    expect(content.blocks.map((block) => [block.hour, block.text])).toEqual([
      [8, 'Bus'],
      [14, 'Late lunch'],
    ]);
  });

  it('removes the block when the text becomes empty', () => {
    const written = setHourText(emptyContent(), 9, 'Hello');
    expect(setHourText(written, 9, '').blocks).toEqual([]);
  });

  it('leaves minute markers and free notes alone', () => {
    const base: DayContent = {
      freeNotes: 'Somewhere that day',
      blocks: [{ hour: 9, minute: 25, text: 'Phone call' }],
    };
    const content = setHourText(base, 9, 'Morning');
    expect(content.freeNotes).toBe('Somewhere that day');
    expect(content.blocks).toEqual([
      { hour: 9, minute: null, text: 'Morning' },
      { hour: 9, minute: 25, text: 'Phone call' },
    ]);
    expect(getHourText(content, 9)).toBe('Morning');
    expect(setHourText(content, 9, '').blocks).toEqual([
      { hour: 9, minute: 25, text: 'Phone call' },
    ]);
  });

  it('rejects an invalid hour', () => {
    expect(() => setHourText(emptyContent(), 24, 'x')).toThrow(RangeError);
  });
});

describe('setFreeNotes', () => {
  it('sets the free notes and keeps the blocks', () => {
    const base = setHourText(emptyContent(), 9, 'Hello');
    const content = setFreeNotes(base, 'Met someone, cannot place when');
    expect(content.freeNotes).toBe('Met someone, cannot place when');
    expect(content.blocks).toEqual(base.blocks);
  });
});

describe('blocksOfHour and hourHasText', () => {
  const content: DayContent = {
    freeNotes: '',
    blocks: [
      { hour: 9, minute: 25, text: 'Phone call' },
      { hour: 9, minute: null, text: 'Morning' },
      { hour: 10, minute: null, text: '   ' },
    ],
  };

  it('lists the blocks of one hour in time order', () => {
    expect(blocksOfHour(content, 9).map((block) => block.minute)).toEqual([null, 25]);
    expect(blocksOfHour(content, 11)).toEqual([]);
  });

  it('knows whether an hour has text', () => {
    expect(hourHasText(content, 9)).toBe(true);
    expect(hourHasText(content, 10)).toBe(false);
    expect(hourHasText(content, 11)).toBe(false);
  });

  it('rejects an invalid hour', () => {
    expect(() => blocksOfHour(content, 99)).toThrow(RangeError);
  });
});

describe('hourPreview', () => {
  it('is empty when the hour has no text', () => {
    expect(hourPreview(emptyContent(), 9)).toBe('');
  });

  it('puts the text on one line', () => {
    const content = setHourText(emptyContent(), 9, '  First line\n\nsecond   line ');
    expect(hourPreview(content, 9)).toBe('First line second line');
  });

  it('cuts long text with an ellipsis', () => {
    const content = setHourText(emptyContent(), 9, 'a'.repeat(100));
    const preview = hourPreview(content, 9);
    expect(preview).toBe(`${'a'.repeat(59)}…`);
    expect(hourPreview(content, 9, 10)).toBe(`${'a'.repeat(9)}…`);
  });

  it('keeps text that fits exactly', () => {
    const content = setHourText(emptyContent(), 9, 'a'.repeat(60));
    expect(hourPreview(content, 9)).toBe('a'.repeat(60));
  });

  it('falls back to the first minute marker when the whole hour is empty', () => {
    const content: DayContent = {
      freeNotes: '',
      blocks: [{ hour: 9, minute: 25, text: 'Phone call' }],
    };
    expect(hourPreview(content, 9)).toBe('Phone call');
  });
});
