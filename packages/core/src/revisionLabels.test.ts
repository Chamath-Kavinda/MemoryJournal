import { ordinal, pickRevision, previousRevision, revisionOptions } from './revisionLabels';
import type { DayRevision } from './types';

function revision(n: number): DayRevision {
  return {
    n,
    createdAt: n * 1000,
    closedAt: null,
    kind: n === 1 ? 'first' : 'later',
    freeNotes: '',
    blocks: [],
    mentions: [],
    wordCount: 0,
    addedWordCount: 0,
  };
}

describe('ordinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [10, '10th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [23, '23rd'],
    [101, '101st'],
    [111, '111th'],
  ])('writes %i as %s', (n, label) => {
    expect(ordinal(n)).toBe(label);
  });
});

describe('revisionOptions', () => {
  it('has no choices for a day with fewer than two passes', () => {
    expect(revisionOptions(0)).toEqual([]);
    expect(revisionOptions(1)).toEqual([]);
    expect(revisionOptions(-3)).toEqual([]);
    expect(revisionOptions(2.5)).toEqual([]);
  });

  it('lists Latest and then every pass in order', () => {
    expect(revisionOptions(3)).toEqual([
      { key: 'latest', label: 'Latest' },
      { key: 1, label: '1st' },
      { key: 2, label: '2nd' },
      { key: 3, label: '3rd' },
    ]);
  });
});

describe('pickRevision', () => {
  const list = [revision(2), revision(1), revision(3)];

  it('picks the highest number for latest, whatever the order', () => {
    expect(pickRevision(list, 'latest')?.n).toBe(3);
  });

  it('picks a numbered pass', () => {
    expect(pickRevision(list, 2)?.n).toBe(2);
  });

  it('returns null for a missing pass or an empty day', () => {
    expect(pickRevision(list, 4)).toBeNull();
    expect(pickRevision([], 'latest')).toBeNull();
    expect(pickRevision([], 1)).toBeNull();
  });
});

describe('previousRevision', () => {
  const list = [revision(3), revision(1), revision(2)];

  it('is the pass just before the given one', () => {
    expect(previousRevision(list, 3)?.n).toBe(2);
    expect(previousRevision(list, 2)?.n).toBe(1);
  });

  it('is null for the first pass', () => {
    expect(previousRevision(list, 1)).toBeNull();
    expect(previousRevision([], 1)).toBeNull();
  });

  it('skips a gap in the numbers', () => {
    expect(previousRevision([revision(1), revision(4)], 4)?.n).toBe(1);
  });
});
