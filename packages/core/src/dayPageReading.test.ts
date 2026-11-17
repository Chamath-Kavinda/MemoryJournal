import { countAddedWords, countContentWords, markAdditions } from './revisions';
import type { DayContent } from './revisions';
import { recallScore, scoreDay, type ScoreDay } from './score';
import type { DayBlock, DayRevision } from './types';

const TIME = '⏱';

const block = (hour: number, minute: number | null, text: string): DayBlock => ({
  hour,
  minute,
  text,
});
const page = (freeNotes: string): DayContent => ({ freeNotes, blocks: [] });

describe('words and additions read a pass through the day page', () => {
  it('does not count time lines as words', () => {
    expect(countContentWords(page(`${TIME} 21\nwent for a walk\n${TIME} 21:25\nhome`))).toBe(5);
  });

  it('counts a legacy pass and the same text in the page shape the same', () => {
    const legacy: DayContent = {
      freeNotes: 'morning notes',
      blocks: [block(21, 25, 'went home'), block(9, null, 'coffee')],
    };
    const asPage = page(`morning notes\n\n${TIME} 09\ncoffee\n\n${TIME} 21:25\nwent home`);
    expect(countContentWords(legacy)).toBe(countContentWords(asPage));
    expect(countContentWords(legacy)).toBe(5);
  });

  it('never marks a time line as an addition', () => {
    const previous = page(`${TIME} 21\nwalk`);
    const current = page(`${TIME} 21\nwalk\n${TIME} 22:10\nread a book`);
    const result = markAdditions(previous, current);
    expect(result.addedWordCount).toBe(3);
    const marked = result.freeNotes
      .filter((segment) => segment.added)
      .map((segment) => segment.text)
      .join('');
    expect(marked).not.toContain(TIME);
  });

  it('compares an old pass with a new pass fairly', () => {
    const previous: DayContent = { freeNotes: '', blocks: [block(21, null, 'went for a walk')] };
    const current = page(`${TIME} 21\nwent for a walk\nthen tea`);
    expect(countAddedWords(previous, current)).toBe(2);
  });
});

function pass(content: DayContent, mentions: string[] = []): DayRevision {
  return {
    n: 1,
    createdAt: Date.UTC(2026, 10, 14, 17, 0, 0),
    closedAt: null,
    kind: 'first',
    freeNotes: content.freeNotes,
    blocks: content.blocks,
    mentions,
    wordCount: countContentWords(content),
    addedWordCount: 0,
  };
}

const dayOf = (content: DayContent, mentions: string[] = []): ScoreDay => ({
  dayId: '2026-11-14',
  revisions: [pass(content, mentions)],
});

const TODAY = '2026-11-14';

describe('score reads time lines', () => {
  it('gives the same Coverage and Precision to legacy blocks and to time lines', () => {
    const legacy = dayOf({
      freeNotes: '',
      blocks: [block(8, null, 'coffee'), block(9, 30, 'train'), block(12, null, 'lunch')],
    });
    const lines = dayOf(page(`${TIME} 08\ncoffee\n${TIME} 09:30\ntrain\n${TIME} 12\nlunch`));
    const a = scoreDay([legacy], legacy.dayId, TODAY);
    const b = scoreDay([lines], lines.dayId, TODAY);
    expect(b?.coverage).toBeCloseTo(a?.coverage ?? -1);
    expect(b?.precision).toBeCloseTo(a?.precision ?? -1);
    expect(b?.coverage).toBeGreaterThan(0);
    expect(b?.precision).toBeGreaterThan(0);
  });

  it('gives a page with no time lines no Coverage and no minute Precision', () => {
    const plain = dayOf(page('a long day with no times marked at all'));
    const result = scoreDay([plain], plain.dayId, TODAY);
    expect(result?.coverage).toBe(0);
    expect(result?.precision).toBe(0);
    expect(result?.detail).toBeGreaterThan(0);
  });

  it('ignores a time line with no text after it', () => {
    const empty = dayOf(page(`${TIME} 08\n${TIME} 09:15\n`));
    const result = scoreDay([empty], empty.dayId, TODAY);
    expect(result?.coverage).toBe(0);
    expect(result?.precision).toBe(0);
  });

  it('still produces a recall score for a page-shaped day', () => {
    const lines = dayOf(page(`${TIME} 20\nwalked the dog`));
    expect(recallScore([lines], TODAY)).not.toBeNull();
  });
});
