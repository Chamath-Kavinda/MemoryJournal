import {
  SITTING_TIMEOUT_MS,
  buildRevision,
  closeRevision,
  contentEquals,
  contentOf,
  countAddedWords,
  countContentWords,
  countWords,
  extractMentionIds,
  isContentEmpty,
  isSittingOpen,
  markAdditions,
  mentionToken,
  normalizeContent,
  planSave,
  sortBlocks,
} from './revisions';
import type { DayContent } from './revisions';
import type { DayBlock, DayRevision } from './types';

const MINUTE = 60_000;
const NOW = Date.UTC(2026, 10, 14, 16, 0, 0);

const block = (hour: number, minute: number | null, text: string): DayBlock => ({
  hour,
  minute,
  text,
});

const content = (freeNotes: string, ...blocks: DayBlock[]): DayContent => ({ freeNotes, blocks });

function revision(overrides: Partial<DayRevision> = {}): DayRevision {
  return {
    n: 1,
    createdAt: NOW - 5 * MINUTE,
    closedAt: null,
    kind: 'first',
    freeNotes: '',
    blocks: [],
    mentions: [],
    wordCount: 0,
    addedWordCount: 0,
    ...overrides,
  };
}

describe('words and mentions', () => {
  it('counts whitespace-separated words', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   \n ')).toBe(0);
    expect(countWords('a b  c\n d')).toBe(4);
  });

  it('counts a mention token as one word', () => {
    expect(countWords(`met ${mentionToken('abc123')} today`)).toBe(3);
  });

  it('builds mention tokens', () => {
    expect(mentionToken('abc123')).toBe('{{tag:abc123}}');
  });

  it('extracts unique mention ids in order of first appearance', () => {
    const one = `saw ${mentionToken('b')} and ${mentionToken('a')}`;
    const two = `${mentionToken('b')} again, then ${mentionToken('c-1_x')}`;
    expect(extractMentionIds(one, two)).toEqual(['b', 'a', 'c-1_x']);
  });

  it('returns no ids when there are no mentions', () => {
    expect(extractMentionIds('plain text', '')).toEqual([]);
    expect(extractMentionIds()).toEqual([]);
  });
});

describe('content helpers', () => {
  it('sorts blocks by hour with the whole-hour block before its minute markers', () => {
    const input = [block(9, 30, 'c'), block(10, null, 'd'), block(9, null, 'a'), block(9, 5, 'b')];
    const sorted = sortBlocks(input);
    expect(sorted.map((b) => b.text)).toEqual(['a', 'b', 'c', 'd']);
    expect(input[0]?.text).toBe('c'); // input is not mutated
  });

  it('normalizes by dropping empty blocks and sorting', () => {
    const result = normalizeContent(
      content('notes', block(11, null, '  '), block(8, 5, 'x'), block(7, null, 'y')),
    );
    expect(result).toEqual(content('notes', block(7, null, 'y'), block(8, 5, 'x')));
  });

  it.each([
    ['hour 24', block(24, null, 'x')],
    ['hour -1', block(-1, null, 'x')],
    ['fractional hour', block(1.5, null, 'x')],
    ['minute 60', block(1, 60, 'x')],
    ['minute -1', block(1, -1, 'x')],
    ['fractional minute', block(1, 0.5, 'x')],
  ])('rejects %s', (_name, bad) => {
    expect(() => normalizeContent(content('', bad))).toThrow(RangeError);
  });

  it('accepts the boundary values', () => {
    expect(() => normalizeContent(content('', block(0, 0, 'a'), block(23, 59, 'b')))).not.toThrow();
  });

  it('detects empty content', () => {
    expect(isContentEmpty(content(''))).toBe(true);
    expect(isContentEmpty(content('  ', block(3, null, ' ')))).toBe(true);
    expect(isContentEmpty(content('notes'))).toBe(false);
    expect(isContentEmpty(content('', block(3, null, 'x')))).toBe(false);
  });

  it('compares content ignoring block order and empty blocks', () => {
    const a = content('n', block(9, null, 'x'), block(8, null, 'y'));
    const b = content('n', block(8, null, 'y'), block(9, null, 'x'), block(12, null, ''));
    expect(contentEquals(a, b)).toBe(true);
    expect(contentEquals(a, content('n', block(8, null, 'y'), block(9, null, 'z')))).toBe(false);
    expect(contentEquals(a, content('other', ...a.blocks))).toBe(false);
  });

  it('extracts content from a revision', () => {
    const rev = revision({ freeNotes: 'f', blocks: [block(1, null, 'x')] });
    expect(contentOf(rev)).toEqual({ freeNotes: 'f', blocks: [block(1, null, 'x')] });
  });

  it('counts the words of a whole day', () => {
    expect(
      countContentWords(content('one two', block(1, null, 'three'), block(2, 5, 'four five'))),
    ).toBe(5);
  });
});

describe('markAdditions', () => {
  const joined = (segments: { text: string }[]): string => segments.map((s) => s.text).join('');

  it('marks everything as added when there is no previous pass', () => {
    const result = markAdditions(null, content('free notes', block(9, null, 'at nine')));
    expect(result.freeNotes).toEqual([{ text: 'free notes', added: true }]);
    expect(result.blocks).toEqual([[{ text: 'at nine', added: true }]]);
    expect(result.addedWordCount).toBe(4);
  });

  it('marks nothing when the content is unchanged', () => {
    const same = content('a b', block(9, null, 'c d'));
    const result = markAdditions(same, same);
    expect(result.addedWordCount).toBe(0);
    expect(result.freeNotes).toEqual([{ text: 'a b', added: false }]);
  });

  it('marks only the new words', () => {
    const result = markAdditions(content('I met Sam'), content('I met Sam at the park'));
    expect(result.freeNotes).toEqual([
      { text: 'I met Sam ', added: false },
      { text: 'at the park', added: true },
    ]);
    expect(result.addedWordCount).toBe(3);
  });

  it('ignores case and surrounding punctuation', () => {
    expect(countAddedWords(content('Hello, world'), content('hello world!'))).toBe(0);
  });

  it('treats repeated words as a multiset', () => {
    const result = markAdditions(content('a b'), content('a a b'));
    expect(result.freeNotes).toEqual([
      { text: 'a ', added: false },
      { text: 'a', added: true },
      { text: ' b', added: false },
    ]);
    expect(result.addedWordCount).toBe(1);
  });

  it('highlights whitespace only between two added words', () => {
    const result = markAdditions(content('x'), content('x new words'));
    expect(result.freeNotes).toEqual([
      { text: 'x ', added: false },
      { text: 'new words', added: true },
    ]);
  });

  it('keeps leading and trailing whitespace unhighlighted', () => {
    const result = markAdditions(null, content('  hi  '));
    expect(result.freeNotes).toEqual([
      { text: '  ', added: false },
      { text: 'hi', added: true },
      { text: '  ', added: false },
    ]);
  });

  it('never loses text: segments always rebuild the original', () => {
    const text = '  Went  to the\n market,\tbought   milk ';
    const result = markAdditions(content('market milk'), content(text));
    expect(joined(result.freeNotes)).toBe(text);
  });

  it('returns no segments for empty text', () => {
    expect(markAdditions(null, content('')).freeNotes).toEqual([]);
  });

  it('shares the previous words across free notes and blocks', () => {
    const previous = content('sam', block(9, null, 'went home'));
    const current = content('', block(8, null, 'sam'), block(9, null, 'went home late'));
    const result = markAdditions(previous, current);
    expect(result.blocks[0]).toEqual([{ text: 'sam', added: false }]);
    expect(result.blocks[1]).toEqual([
      { text: 'went home ', added: false },
      { text: 'late', added: true },
    ]);
    expect(result.addedWordCount).toBe(1);
  });

  it('matches mention tokens exactly, ignoring punctuation but not case', () => {
    const previous = content(`${mentionToken('abc')},`);
    expect(countAddedWords(previous, content(mentionToken('abc')))).toBe(0);
    expect(countAddedWords(previous, content(mentionToken('ABC')))).toBe(1);
  });

  it('handles punctuation-only words', () => {
    expect(countAddedWords(content('-'), content('-'))).toBe(0);
  });
});

describe('isSittingOpen', () => {
  it('is open within 30 minutes of the last activity', () => {
    expect(isSittingOpen({ closedAt: null }, NOW - SITTING_TIMEOUT_MS + 1, NOW)).toBe(true);
  });

  it('ends at exactly 30 minutes of inactivity', () => {
    expect(isSittingOpen({ closedAt: null }, NOW - SITTING_TIMEOUT_MS, NOW)).toBe(false);
  });

  it('is never open once the revision is closed', () => {
    expect(isSittingOpen({ closedAt: NOW - 1 }, NOW, NOW)).toBe(false);
  });
});

describe('planSave', () => {
  const written = content('went to the market', block(9, null, 'breakfast'));

  it('does nothing for an empty day with no revisions', () => {
    expect(
      planSave({ latest: null, lastActivityAt: null, content: content(''), now: NOW }),
    ).toEqual({
      action: 'none',
    });
  });

  it('creates revision 1 (first) for the first save of a day', () => {
    expect(planSave({ latest: null, lastActivityAt: null, content: written, now: NOW })).toEqual({
      action: 'create',
      n: 1,
      kind: 'first',
    });
  });

  it('does nothing when the content did not change', () => {
    const latest = revision({ ...written });
    expect(planSave({ latest, lastActivityAt: NOW - MINUTE, content: written, now: NOW })).toEqual({
      action: 'none',
    });
  });

  it('ignores a newly added empty block', () => {
    const latest = revision({ ...written });
    const withEmpty = content(written.freeNotes, ...written.blocks, block(15, null, ''));
    expect(
      planSave({ latest, lastActivityAt: NOW - MINUTE, content: withEmpty, now: NOW }).action,
    ).toBe('none');
  });

  it('updates the open revision within the same sitting', () => {
    const latest = revision({ n: 2, kind: 'later', ...written });
    const edited = content('went to the market and the bank', ...written.blocks);
    expect(
      planSave({ latest, lastActivityAt: NOW - 10 * MINUTE, content: edited, now: NOW }),
    ).toEqual({
      action: 'update',
      n: 2,
    });
  });

  it('creates the next revision after 30 minutes of inactivity', () => {
    const latest = revision({ ...written });
    const edited = content('went to the market and the bank', ...written.blocks);
    expect(
      planSave({ latest, lastActivityAt: NOW - 31 * MINUTE, content: edited, now: NOW }),
    ).toEqual({
      action: 'create',
      n: 2,
      kind: 'later',
    });
  });

  it('never edits a closed revision, even with recent activity', () => {
    const latest = revision({ n: 3, kind: 'later', closedAt: NOW - MINUTE, ...written });
    const edited = content('different', ...written.blocks);
    expect(planSave({ latest, lastActivityAt: NOW - MINUTE, content: edited, now: NOW })).toEqual({
      action: 'create',
      n: 4,
      kind: 'later',
    });
  });

  it('falls back to the revision creation time when the last activity is unknown', () => {
    const edited = content('changed', ...written.blocks);
    const recent = revision({ createdAt: NOW - 10 * MINUTE, ...written });
    const stale = revision({ createdAt: NOW - 40 * MINUTE, ...written });
    expect(
      planSave({ latest: recent, lastActivityAt: null, content: edited, now: NOW }).action,
    ).toBe('update');
    expect(
      planSave({ latest: stale, lastActivityAt: null, content: edited, now: NOW }).action,
    ).toBe('create');
  });
});

describe('buildRevision', () => {
  it('builds revision 1 with counts, mentions and canonical blocks', () => {
    const rev = buildRevision({
      plan: { action: 'create', n: 1, kind: 'first' },
      content: content(
        `lunch with ${mentionToken('sam')}`,
        block(13, null, 'ate rice'),
        block(8, 15, `bus ${mentionToken('route5')}`),
        block(20, null, '   '),
      ),
      previous: null,
      existing: null,
      now: NOW,
    });

    expect(rev).toEqual({
      n: 1,
      createdAt: NOW,
      closedAt: null,
      kind: 'first',
      freeNotes: `lunch with ${mentionToken('sam')}`,
      blocks: [block(8, 15, `bus ${mentionToken('route5')}`), block(13, null, 'ate rice')],
      mentions: ['sam', 'route5'],
      wordCount: 7,
      addedWordCount: 7,
    });
  });

  it('counts additions against the previous pass for a later revision', () => {
    const previous = revision({ freeNotes: 'went to the market', wordCount: 4, addedWordCount: 4 });
    const rev = buildRevision({
      plan: { action: 'create', n: 2, kind: 'later' },
      content: content('went to the market and met Anna'),
      previous,
      existing: null,
      now: NOW,
    });
    expect(rev.kind).toBe('later');
    expect(rev.wordCount).toBe(7);
    expect(rev.addedWordCount).toBe(3);
  });

  it('updates an open revision, keeping its creation time and comparing with the pass before it', () => {
    const previous = revision({ n: 1, freeNotes: 'one two' });
    const existing = revision({
      n: 2,
      kind: 'later',
      createdAt: NOW - 20 * MINUTE,
      freeNotes: 'one two three',
    });
    const rev = buildRevision({
      plan: { action: 'update', n: 2 },
      content: content('one two three four'),
      previous,
      existing,
      now: NOW,
    });
    expect(rev.createdAt).toBe(NOW - 20 * MINUTE);
    expect(rev.kind).toBe('later');
    expect(rev.closedAt).toBeNull();
    expect(rev.addedWordCount).toBe(2); // "three" and "four" against revision 1
  });

  it('refuses to update without the matching open revision', () => {
    const base = {
      plan: { action: 'update', n: 2 } as const,
      content: content('x'),
      previous: null,
      now: NOW,
    };
    expect(() => buildRevision({ ...base, existing: null })).toThrow();
    expect(() => buildRevision({ ...base, existing: revision({ n: 3 }) })).toThrow();
  });

  it('rejects invalid blocks', () => {
    expect(() =>
      buildRevision({
        plan: { action: 'create', n: 1, kind: 'first' },
        content: content('', block(25, null, 'x')),
        previous: null,
        existing: null,
        now: NOW,
      }),
    ).toThrow(RangeError);
  });
});

describe('closeRevision', () => {
  it('sets closedAt without mutating the original', () => {
    const open = revision();
    const closed = closeRevision(open, NOW);
    expect(closed.closedAt).toBe(NOW);
    expect(open.closedAt).toBeNull();
  });

  it('throws if the revision is already closed', () => {
    expect(() => closeRevision(revision({ closedAt: NOW - 1 }), NOW)).toThrow();
  });
});
