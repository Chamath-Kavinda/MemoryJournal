import {
  countPageWords,
  formatTimeLine,
  insertAtCursor,
  insertTimeLine,
  parseTimeLine,
  timeBlocksOf,
} from './timeLines';

const MARK = '\u23F1';

describe('formatTimeLine and parseTimeLine', () => {
  it('writes an hour-only line and an hour-and-minutes line with two digits', () => {
    expect(formatTimeLine(9, null)).toBe(`${MARK} 09`);
    expect(formatTimeLine(21, 5)).toBe(`${MARK} 21:05`);
    expect(formatTimeLine(0, 0)).toBe(`${MARK} 00:00`);
  });

  it('rejects an impossible time', () => {
    expect(() => formatTimeLine(24, null)).toThrow(RangeError);
    expect(() => formatTimeLine(8, 60)).toThrow(RangeError);
    expect(() => formatTimeLine(1.5, null)).toThrow(RangeError);
  });

  it('reads what it writes', () => {
    expect(parseTimeLine(formatTimeLine(23, 59))).toEqual({ hour: 23, minute: 59 });
    expect(parseTimeLine(formatTimeLine(7, null))).toEqual({ hour: 7, minute: null });
  });

  it('accepts spaces and a carriage return at the end of the line', () => {
    expect(parseTimeLine(`${MARK} 21:25  `)).toEqual({ hour: 21, minute: 25 });
    expect(parseTimeLine(`${MARK} 21\r`)).toEqual({ hour: 21, minute: null });
  });

  it('is a time only when the whole line is exactly a time', () => {
    expect(parseTimeLine(`at ${MARK} 21:25`)).toBeNull();
    expect(parseTimeLine(`${MARK} 21:25 dinner`)).toBeNull();
    expect(parseTimeLine(`${MARK} 24`)).toBeNull();
    expect(parseTimeLine(`${MARK} 21:75`)).toBeNull();
    expect(parseTimeLine(`${MARK} 9`)).toBeNull();
    expect(parseTimeLine('21:25')).toBeNull();
  });
});

describe('countPageWords', () => {
  it('leaves time lines out and counts a mention as one word', () => {
    const text = `Woke up early\n${MARK} 07:30\nCoffee with {{tag:abc|Ravi}}\n${MARK} 21`;
    expect(countPageWords(text)).toBe(6);
  });

  it('counts the symbol inside a sentence as a word', () => {
    expect(countPageWords(`I saw ${MARK} 21:25 on the clock`)).toBe(7);
  });
});

describe('timeBlocksOf', () => {
  it('splits at time lines in the order written and ignores text before the first one', () => {
    const text = `Morning thoughts\n${MARK} 21:25\ndinner\nwith friends\n\n${MARK} 08\nbreakfast`;
    expect(timeBlocksOf(text)).toEqual([
      { hour: 21, minute: 25, text: 'dinner\nwith friends' },
      { hour: 8, minute: null, text: 'breakfast' },
    ]);
  });

  it('keeps an empty block and a page with no time lines gives none', () => {
    expect(timeBlocksOf(`${MARK} 10\n${MARK} 11\nlunch`)).toEqual([
      { hour: 10, minute: null, text: '' },
      { hour: 11, minute: null, text: 'lunch' },
    ]);
    expect(timeBlocksOf('just text')).toEqual([]);
    expect(timeBlocksOf('')).toEqual([]);
  });
});

describe('insertAtCursor', () => {
  it('inserts at the cursor and moves the cursor after the insert', () => {
    expect(insertAtCursor('abcd', 2, 'XY')).toEqual({ text: 'abXYcd', cursor: 4 });
  });

  it('clamps a cursor that is out of range', () => {
    expect(insertAtCursor('abc', 99, '!')).toEqual({ text: 'abc!', cursor: 4 });
    expect(insertAtCursor('abc', -5, '!')).toEqual({ text: '!abc', cursor: 1 });
    expect(insertAtCursor('abc', Number.NaN, '!')).toEqual({ text: 'abc!', cursor: 4 });
  });
});

describe('insertTimeLine', () => {
  it('adds the line to an empty page and puts the cursor on the next line', () => {
    const line = `${MARK} 21:25\n`;
    expect(insertTimeLine('', 0, 21, 25)).toEqual({ text: line, cursor: line.length });
  });

  it('breaks the line when the cursor is in the middle of it', () => {
    const result = insertTimeLine('helloworld', 5, 9, null);
    expect(result.text).toBe(`hello\n${MARK} 09\nworld`);
    expect(result.cursor).toBe(`hello\n${MARK} 09\n`.length);
  });

  it('adds no extra break at the start of a line', () => {
    const result = insertTimeLine('one\ntwo', 4, 10, 30);
    expect(result.text).toBe(`one\n${MARK} 10:30\ntwo`);
    expect(result.cursor).toBe(`one\n${MARK} 10:30\n`.length);
  });

  it('adds a break after text at the end of the page', () => {
    const result = insertTimeLine('hello', 5, 6, 0);
    expect(result.text).toBe(`hello\n${MARK} 06:00\n`);
    expect(result.cursor).toBe(result.text.length);
  });

  it('moves the cursor to a time that is already there instead of adding a second line', () => {
    const text = `a\n${MARK} 21:25\nb\n${MARK} 08\nc`;
    const result = insertTimeLine(text, 0, 21, 25);
    expect(result.text).toBe(text);
    expect(result.cursor).toBe(`a\n${MARK} 21:25\n`.length);
  });

  it('adds a line break when the existing time is the last line', () => {
    const text = `a\n${MARK} 21`;
    const result = insertTimeLine(text, 0, 21, null);
    expect(result.text).toBe(`${text}\n`);
    expect(result.cursor).toBe(result.text.length);
  });

  it('treats an hour-only time and the same hour with minutes as different times', () => {
    const text = `${MARK} 21:25\nx`;
    const result = insertTimeLine(text, text.length, 21, null);
    expect(result.text).toContain(`${MARK} 21\n`);
    expect(result.text.split('\n').filter((line) => line.startsWith(MARK))).toHaveLength(2);
  });
});
