import {
  MAX_MENTION_QUERY,
  activeMention,
  displaySegments,
  displayToStoredOffset,
  fromDisplayText,
  mapContentText,
  mentionTargets,
  replaceDisplayRange,
  storedSegments,
  suggestTags,
  toDisplayText,
  type MentionTarget,
} from './mentions';
import { countWords, extractMentionIds, markAdditions, mentionToken } from './revisions';
import { DEFAULT_CATEGORIES } from './tags';
import type { Tag, TagCategory } from './types';

function tag(id: string, name: string, categoryId = 'people', aliases: string[] = []): Tag {
  return { id, name, categoryId, note: null, aliases, createdAt: 0 };
}

const ravi = tag('t1', 'Ravi');
const fort = tag('t2', 'Galle Fort', 'places', ['the fort']);
const tags = [ravi, fort];
const names = new Map(tags.map((t) => [t.id, t.name]));

describe('mention tokens', () => {
  it('stay plain without a name and carry an encoded name with one', () => {
    expect(mentionToken('t1')).toBe('{{tag:t1}}');
    expect(mentionToken('t1', 'Ravi')).toBe('{{tag:t1|Ravi}}');
    expect(mentionToken('t2', 'Galle Fort')).toBe('{{tag:t2|Galle%20Fort}}');
    const label = /^\{\{tag:t3\|(.*)\}\}$/.exec(mentionToken('t3', 'a}|{b'))?.[1] ?? '';
    expect(label).not.toMatch(/[{}|\s]/);
    expect(decodeURIComponent(label)).toBe('a}|{b');
  });

  it('count as one word and are found by extractMentionIds, with or without a name', () => {
    const text = `met ${mentionToken('t2', 'Galle Fort')} with ${mentionToken('t1')}`;
    expect(countWords(text)).toBe(4);
    expect(extractMentionIds(text)).toEqual(['t2', 't1']);
  });

  it('are compared by id, so a renamed tag is not an addition', () => {
    const before = { freeNotes: `with ${mentionToken('t1', 'Ravi')}`, blocks: [] };
    const after = { freeNotes: `with ${mentionToken('t1', 'Ravindu')}`, blocks: [] };
    expect(markAdditions(before, after).addedWordCount).toBe(0);
  });
});

describe('toDisplayText', () => {
  it('shows a mention as @Name using the current tag name', () => {
    const stored = `Lunch with ${mentionToken('t1', 'Old name')} at ${mentionToken('t2')}.`;
    expect(toDisplayText(stored, names)).toBe('Lunch with @Ravi at @Galle Fort.');
  });

  it('falls back to the stored name when the tag is gone, then to a generic word', () => {
    expect(toDisplayText(mentionToken('gone', 'Nimal'), new Map())).toBe('@Nimal');
    expect(toDisplayText(mentionToken('gone'), new Map())).toBe('@tag');
  });

  it('leaves text without mentions alone', () => {
    expect(toDisplayText('plain {text}', names)).toBe('plain {text}');
    expect(storedSegments('', names)).toEqual([]);
  });
});

describe('fromDisplayText', () => {
  const targets = mentionTargets(tags, '');

  it('turns @Name of a known tag into a token that carries the name', () => {
    expect(fromDisplayText('Lunch with @Ravi today', targets)).toBe(
      `Lunch with ${mentionToken('t1', 'Ravi')} today`,
    );
  });

  it('handles names with spaces and punctuation after the mention', () => {
    expect(fromDisplayText('at @Galle Fort, then home', targets)).toBe(
      `at ${mentionToken('t2', 'Galle Fort')}, then home`,
    );
  });

  it('does not match inside a longer word or after a letter', () => {
    expect(fromDisplayText('@Ravindu and me@Ravi', targets)).toBe('@Ravindu and me@Ravi');
  });

  it('is case sensitive and leaves unknown names as text', () => {
    expect(fromDisplayText('@ravi and @Nimal', targets)).toBe('@ravi and @Nimal');
  });

  it('prefers the longest name when one contains another', () => {
    const list: MentionTarget[] = [
      { id: 'a', name: 'Ravi' },
      { id: 'b', name: 'Ravi Perera' },
    ];
    expect(fromDisplayText('@Ravi Perera', list)).toBe(mentionToken('b', 'Ravi Perera'));
    expect(fromDisplayText('@Ravi Silva', list)).toBe(`${mentionToken('a', 'Ravi')} Silva`);
  });

  it('keeps names with regular expression characters working', () => {
    const list: MentionTarget[] = [{ id: 'n', name: '077 (123) +94' }];
    expect(fromDisplayText('call @077 (123) +94 now', list)).toBe(
      `call ${mentionToken('n', '077 (123) +94')} now`,
    );
  });

  it('returns an empty string for empty text and the text itself with no targets', () => {
    expect(fromDisplayText('', targets)).toBe('');
    expect(fromDisplayText('@Ravi', [])).toBe('@Ravi');
  });

  it('round-trips stored text, including mentions of deleted tags', () => {
    const stored = `With ${mentionToken('t1', 'Ravi')} and ${mentionToken('gone', 'Nimal')}!`;
    const display = toDisplayText(stored, names);
    expect(display).toBe('With @Ravi and @Nimal!');
    expect(fromDisplayText(display, mentionTargets(tags, stored))).toBe(stored);
  });

  it('keeps the existing token of a mention when two tags share a name', () => {
    const other = tag('t9', 'Ravi', 'places');
    const stored = `with ${mentionToken('t9', 'Ravi')}`;
    const list = mentionTargets([ravi, other], stored);
    expect(fromDisplayText('with @Ravi', list)).toBe(stored);
  });
});

describe('displayToStoredOffset and replaceDisplayRange', () => {
  const stored = `Hi ${mentionToken('t1', 'Ravi')}, ok`;
  const targets = mentionTargets(tags, stored);
  const display = toDisplayText(stored, names);
  const segments = displaySegments(display, targets);

  it('maps plain offsets and offsets after a mention', () => {
    expect(displayToStoredOffset(segments, 2)).toBe(2);
    expect(displayToStoredOffset(segments, display.indexOf(',') + 1)).toBe(stored.indexOf(',') + 1);
    expect(displayToStoredOffset(segments, display.length)).toBe(stored.length);
  });

  it('moves a cursor inside a mention to its nearer edge', () => {
    const start = display.indexOf('@');
    expect(displayToStoredOffset(segments, start + 1)).toBe(stored.indexOf('{{'));
    expect(displayToStoredOffset(segments, start + 4)).toBe(stored.indexOf('}}') + 2);
  });

  it('replaces a typed @query with a token, even for a tag that is not in the targets', () => {
    const typing = 'Met @Ga';
    const result = replaceDisplayRange(
      typing,
      [],
      { start: 4, end: 7 },
      `${mentionToken('new', 'Galle')} `,
    );
    expect(result).toBe(`Met ${mentionToken('new', 'Galle')} `);
  });

  it('replaces a selection and keeps mentions outside it', () => {
    const text = '@Ravi saw a dog';
    const result = replaceDisplayRange(text, targets, { start: 12, end: 15 }, 'cat');
    expect(result).toBe(`${mentionToken('t1', 'Ravi')} saw a cat`);
  });

  it('accepts a reversed range', () => {
    expect(replaceDisplayRange('abcdef', [], { start: 4, end: 2 }, 'X')).toBe('abXef');
  });
});

describe('activeMention', () => {
  const targets = mentionTargets(tags, '');

  it('finds the @query before the cursor', () => {
    expect(activeMention('Lunch with @Ra', 14, targets)).toEqual({ start: 11, query: 'Ra' });
    expect(activeMention('@', 1, targets)).toEqual({ start: 0, query: '' });
  });

  it('uses only the text before the cursor', () => {
    expect(activeMention('hi @Ra and more', 6, targets)).toEqual({ start: 3, query: 'Ra' });
  });

  it('is null without an @, after whitespace, or for an e-mail address', () => {
    expect(activeMention('no mention', 10, targets)).toBeNull();
    expect(activeMention('@Ra and', 7, targets)).toBeNull();
    expect(activeMention('me@Ra', 5, targets)).toBeNull();
    expect(activeMention('', 0, targets)).toBeNull();
  });

  it('is null for a finished mention and for a very long query', () => {
    expect(activeMention('with @Ravi', 10, targets)).toBeNull();
    const long = `@${'x'.repeat(MAX_MENTION_QUERY + 1)}`;
    expect(activeMention(long, long.length, targets)).toBeNull();
  });
});

describe('suggestTags', () => {
  const places: TagCategory = DEFAULT_CATEGORIES[1] as TagCategory;
  const people: TagCategory = DEFAULT_CATEGORIES[0] as TagCategory;
  const many = [ravi, fort, tag('t3', 'Rani'), tag('t4', 'Ramesh')];

  it('groups matches by category in category order and drops empty groups', () => {
    const groups = suggestTags(many, [places, people], 'r');
    expect(groups.map((g) => g.category.id)).toEqual(['places', 'people']);
    expect(groups[0]?.tags.map((t) => t.name)).toEqual(['Galle Fort']);
    expect(groups[1]?.tags.map((t) => t.name)).toEqual(['Ramesh', 'Rani', 'Ravi']);
  });

  it('matches aliases and returns everything for an empty query', () => {
    expect(suggestTags(many, [places, people], 'the fort')[0]?.tags[0]?.id).toBe('t2');
    expect(suggestTags(many, [places, people], '')).toHaveLength(2);
  });

  it('limits the total number of tags', () => {
    const total = suggestTags(many, [places, people], '', 2).reduce((n, g) => n + g.tags.length, 0);
    expect(total).toBe(2);
  });

  it('returns nothing when nothing matches', () => {
    expect(suggestTags(many, [places, people], 'zzz')).toEqual([]);
  });
});

describe('mapContentText', () => {
  it('converts the free notes and every block and keeps the rest', () => {
    const content = {
      freeNotes: 'a',
      blocks: [{ hour: 9, minute: 25 as number | null, text: 'b' }],
    };
    expect(mapContentText(content, (t) => t.toUpperCase())).toEqual({
      freeNotes: 'A',
      blocks: [{ hour: 9, minute: 25, text: 'B' }],
    });
  });
});
