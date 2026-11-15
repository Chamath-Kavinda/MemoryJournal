import {
  checkLibraryDraft,
  libraryContent,
  libraryItemsOfType,
  mentionedLibraryItems,
  toDayRevision,
  toLibraryRevision,
} from './library';
import { buildRevision, planSave } from './revisions';
import type { LibraryRevision } from './types';

describe('checkLibraryDraft', () => {
  it('trims and collapses the title and turns an empty date into null', () => {
    expect(checkLibraryDraft({ type: 'movie', title: '  The   Matrix ', date: ' ' })).toEqual({
      ok: true,
      value: { type: 'movie', title: 'The Matrix', date: null },
    });
  });

  it('keeps a real date', () => {
    expect(checkLibraryDraft({ type: 'book', title: 'Dune', date: '2026-02-28' })).toEqual({
      ok: true,
      value: { type: 'book', title: 'Dune', date: '2026-02-28' },
    });
  });

  it('rejects an empty title, a long title and an impossible date', () => {
    expect(checkLibraryDraft({ type: 'book', title: '   ', date: '' })).toEqual({
      ok: false,
      error: 'title-empty',
    });
    expect(checkLibraryDraft({ type: 'book', title: 'x'.repeat(121), date: '' })).toEqual({
      ok: false,
      error: 'title-too-long',
    });
    expect(checkLibraryDraft({ type: 'book', title: 'Dune', date: '2026-02-30' })).toEqual({
      ok: false,
      error: 'date-invalid',
    });
    expect(checkLibraryDraft({ type: 'book', title: 'Dune', date: 'yesterday' })).toEqual({
      ok: false,
      error: 'date-invalid',
    });
  });
});

describe('page revisions reuse the day rules', () => {
  const stored: LibraryRevision = {
    n: 1,
    createdAt: 1_000,
    closedAt: null,
    kind: 'first',
    text: 'Loved the ending',
    mentions: [],
    wordCount: 3,
    addedWordCount: 3,
  };

  it('round-trips between the page and day shapes', () => {
    expect(toLibraryRevision(toDayRevision(stored))).toEqual(stored);
    expect(toDayRevision(stored)).toMatchObject({ freeNotes: 'Loved the ending', blocks: [] });
  });

  it('builds a first revision with counts and mentions', () => {
    const content = libraryContent('Saw it with {{tag:ravi|Ravi}} and loved it');
    const plan = planSave({ latest: null, lastActivityAt: null, content, now: 5_000 });
    if (plan.action !== 'create') throw new Error('expected a new revision');
    const revision = toLibraryRevision(
      buildRevision({ plan, content, previous: null, existing: null, now: 5_000 }),
    );

    expect(revision).toMatchObject({
      n: 1,
      kind: 'first',
      closedAt: null,
      mentions: ['ravi'],
      wordCount: 7,
      addedWordCount: 7,
    });
  });

  it('does nothing for an empty page and starts a later pass after the sitting ends', () => {
    expect(
      planSave({ latest: null, lastActivityAt: null, content: libraryContent('  '), now: 1 }),
    ).toEqual({ action: 'none' });

    const closed = { ...toDayRevision(stored), closedAt: 2_000 };
    const plan = planSave({
      latest: closed,
      lastActivityAt: 2_000,
      content: libraryContent('Loved the ending and the music'),
      now: 3_000,
    });
    expect(plan).toEqual({ action: 'create', n: 2, kind: 'later' });
  });
});

describe('libraryItemsOfType', () => {
  it('keeps one type, newest change first, then by title', () => {
    const items = [
      { type: 'movie' as const, title: 'B', updatedAt: 10 },
      { type: 'book' as const, title: 'Z', updatedAt: 99 },
      { type: 'movie' as const, title: 'A', updatedAt: 10 },
      { type: 'movie' as const, title: 'C', updatedAt: 20 },
    ];
    expect(libraryItemsOfType(items, 'movie').map((item) => item.title)).toEqual(['C', 'A', 'B']);
  });
});

describe('mentionedLibraryItems', () => {
  const item = (
    id: string,
    mentions: string[] | undefined,
    date: string | null,
    updatedAt: number,
  ) => ({
    id,
    type: 'movie' as const,
    title: id.toUpperCase(),
    date,
    wordCount: 5,
    updatedAt,
    ...(mentions === undefined ? {} : { mentions }),
  });

  it('lists items that mention the tag, dated ones by date and the rest by last change', () => {
    const result = mentionedLibraryItems(
      [
        item('a', ['t1'], '2026-01-05', 100),
        item('b', ['t1'], '2026-03-01', 50),
        item('c', ['t2'], '2026-04-01', 500),
        item('d', ['t1'], null, 75),
        item('e', undefined, null, 900),
      ],
      't1',
    );
    expect(result.map((entry) => entry.itemId)).toEqual(['b', 'a', 'd']);
  });
});
