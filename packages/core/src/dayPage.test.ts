import { contentFromPage, isPageContent, pageOf, timeBlocksOfContent } from './dayPage';
import type { DayContent } from './revisions';

const MARK = '\u23F1';

describe('pageOf', () => {
  it('returns a page-shaped pass as it is', () => {
    const content: DayContent = { freeNotes: `x\n${MARK} 21\n  y  `, blocks: [] };
    expect(isPageContent(content)).toBe(true);
    expect(pageOf(content)).toBe(content.freeNotes);
  });

  it('turns a legacy pass into Free Notes, then blocks in time order as time lines', () => {
    const content: DayContent = {
      freeNotes: 'Things I cannot place  ',
      blocks: [
        { hour: 21, minute: 25, text: 'dinner' },
        { hour: 8, minute: null, text: ' breakfast ' },
        { hour: 21, minute: null, text: 'evening' },
        { hour: 12, minute: null, text: '   ' },
      ],
    };
    expect(isPageContent(content)).toBe(false);
    expect(pageOf(content)).toBe(
      [
        'Things I cannot place',
        `${MARK} 08\nbreakfast`,
        `${MARK} 21\nevening`,
        `${MARK} 21:25\ndinner`,
      ].join('\n\n'),
    );
  });

  it('starts with the first block when a legacy pass has no Free Notes', () => {
    const content: DayContent = {
      freeNotes: '  ',
      blocks: [{ hour: 7, minute: 5, text: 'woke up' }],
    };
    expect(pageOf(content)).toBe(`${MARK} 07:05\nwoke up`);
  });

  it('gives an empty page for an empty pass', () => {
    expect(pageOf({ freeNotes: '', blocks: [] })).toBe('');
  });
});

describe('contentFromPage', () => {
  it('normalises line endings and drops spaces and blank lines at the end', () => {
    expect(contentFromPage('one  \r\ntwo\t\r\n\r\n\n  ')).toEqual({
      freeNotes: 'one\ntwo',
      blocks: [],
    });
  });

  it('keeps the order and the blank lines inside the text', () => {
    const text = `late\n\n${MARK} 21\nevening\n\n${MARK} 08\nmorning`;
    expect(contentFromPage(text)).toEqual({ freeNotes: text, blocks: [] });
  });

  it('gives an empty page for blank text', () => {
    expect(contentFromPage(' \n\n ')).toEqual({ freeNotes: '', blocks: [] });
  });

  it('turns a legacy pass into a page that stores the same words', () => {
    const legacy: DayContent = {
      freeNotes: 'free',
      blocks: [{ hour: 9, minute: 30, text: 'meeting' }],
    };
    expect(contentFromPage(pageOf(legacy)).freeNotes).toBe(`free\n\n${MARK} 09:30\nmeeting`);
  });
});

describe('timeBlocksOfContent', () => {
  it('joins legacy blocks and the blocks of the time lines and skips blank ones', () => {
    const content: DayContent = {
      freeNotes: `before\n${MARK} 10\nbrunch\n${MARK} 11\n`,
      blocks: [
        { hour: 7, minute: null, text: 'old' },
        { hour: 8, minute: null, text: '' },
      ],
    };
    expect(timeBlocksOfContent(content)).toEqual([
      { hour: 7, minute: null, text: 'old' },
      { hour: 10, minute: null, text: 'brunch' },
    ]);
  });
});
