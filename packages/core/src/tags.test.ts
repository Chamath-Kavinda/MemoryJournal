import {
  DEFAULT_CATEGORIES,
  canDeleteCategory,
  canRenameCategory,
  filterTags,
  missingDefaultCategories,
  nextCategoryOrder,
  normalizeName,
  parseAliases,
  sortCategories,
  validateCategoryName,
  validateTagInput,
} from './tags';
import type { Tag, TagCategory } from './types';

const people = DEFAULT_CATEGORIES[0]!;
const places = DEFAULT_CATEGORIES[1]!;
const songs: TagCategory = { id: 'c-songs', name: 'Songs', isDefault: false, order: 3 };
const categories = [...DEFAULT_CATEGORIES, songs];

function tag(id: string, name: string, categoryId: string, aliases: string[] = []): Tag {
  return { id, name, categoryId, note: null, aliases, createdAt: 0 };
}

const input = (over: Partial<Parameters<typeof validateTagInput>[0]> = {}) => ({
  name: 'Ravi',
  categoryId: 'people',
  note: '',
  aliasesText: '',
  ...over,
});

describe('default categories', () => {
  it('are People, Places and Numbers in that order, all marked default', () => {
    expect(DEFAULT_CATEGORIES.map((c) => c.name)).toEqual(['People', 'Places', 'Numbers']);
    expect(DEFAULT_CATEGORIES.every((c) => c.isDefault)).toBe(true);
    expect(DEFAULT_CATEGORIES.map((c) => c.order)).toEqual([0, 1, 2]);
  });

  it('reports only the ones that are not stored yet', () => {
    expect(missingDefaultCategories([]).map((c) => c.id)).toEqual(['people', 'places', 'numbers']);
    expect(missingDefaultCategories([people, songs]).map((c) => c.id)).toEqual([
      'places',
      'numbers',
    ]);
    expect(missingDefaultCategories(categories)).toEqual([]);
  });
});

describe('normalizeName', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeName('  Ravi \n  Perera ')).toBe('Ravi Perera');
  });
});

describe('parseAliases', () => {
  it('splits on commas and new lines and drops empties', () => {
    expect(parseAliases('Rav, Ravi P\n\n , ', 'Ravindu')).toEqual(['Rav', 'Ravi P']);
  });

  it('drops repeats and the name itself, ignoring case', () => {
    expect(parseAliases('ravi, RAVI, Rav, rav', 'Ravi')).toEqual(['Rav']);
  });
});

describe('validateCategoryName', () => {
  it('accepts a new name and returns it trimmed', () => {
    expect(validateCategoryName('  Foods ', categories)).toEqual({ ok: true, value: 'Foods' });
  });

  it('refuses an empty name', () => {
    expect(validateCategoryName('   ', categories)).toEqual({
      ok: false,
      error: 'Give the category a name.',
    });
  });

  it('refuses a name that is too long', () => {
    const result = validateCategoryName('x'.repeat(61), categories);
    expect(result.ok).toBe(false);
  });

  it('refuses a duplicate ignoring case, including default names', () => {
    expect(validateCategoryName('songs', categories).ok).toBe(false);
    expect(validateCategoryName('PEOPLE', categories).ok).toBe(false);
  });

  it('lets a category keep its own name when renaming', () => {
    expect(validateCategoryName('Songs', categories, 'c-songs')).toEqual({
      ok: true,
      value: 'Songs',
    });
  });
});

describe('validateTagInput', () => {
  it('accepts a tag and stores an empty note as null', () => {
    const result = validateTagInput(input({ aliasesText: 'Rav' }), categories, []);
    expect(result).toEqual({
      ok: true,
      value: { name: 'Ravi', categoryId: 'people', note: null, aliases: ['Rav'] },
    });
  });

  it('keeps a trimmed note', () => {
    const result = validateTagInput(input({ note: '  Met at the library ' }), categories, []);
    expect(result.ok && result.value.note).toBe('Met at the library');
  });

  it('refuses an empty name and an unknown category', () => {
    expect(validateTagInput(input({ name: ' ' }), categories, []).ok).toBe(false);
    expect(validateTagInput(input({ categoryId: 'gone' }), categories, []).ok).toBe(false);
  });

  it('refuses a duplicate name in the same category but allows it in another', () => {
    const existing = [tag('t1', 'Ravi', 'people')];
    expect(validateTagInput(input({ name: ' ravi ' }), categories, existing).ok).toBe(false);
    expect(
      validateTagInput(input({ name: 'Ravi', categoryId: 'places' }), categories, existing).ok,
    ).toBe(true);
  });

  it('lets a tag keep its own name when editing it', () => {
    const existing = [tag('t1', 'Ravi', 'people')];
    expect(validateTagInput(input(), categories, existing, 't1').ok).toBe(true);
  });

  it('refuses a note that is too long and too many aliases', () => {
    expect(validateTagInput(input({ note: 'n'.repeat(501) }), categories, []).ok).toBe(false);
    const many = Array.from({ length: 11 }, (_, i) => `a${i}`).join(',');
    expect(validateTagInput(input({ aliasesText: many }), categories, []).ok).toBe(false);
  });

  it('refuses an alias that is too long', () => {
    expect(validateTagInput(input({ aliasesText: 'a'.repeat(61) }), categories, []).ok).toBe(false);
  });

  it('accepts numbers as tag names', () => {
    const result = validateTagInput(
      input({ name: '077 123 4567', categoryId: 'numbers' }),
      categories,
      [],
    );
    expect(result.ok && result.value.name).toBe('077 123 4567');
  });
});

describe('categories', () => {
  it('sorts defaults first, then custom ones by order', () => {
    const late: TagCategory = { id: 'c-b', name: 'Birds', isDefault: false, order: 9 };
    const early: TagCategory = { id: 'c-a', name: 'Dreams', isDefault: false, order: 4 };
    expect(
      sortCategories([late, songs, early, ...DEFAULT_CATEGORIES].reverse()).map((c) => c.id),
    ).toEqual(['people', 'places', 'numbers', 'c-songs', 'c-a', 'c-b']);
  });

  it('puts a new category after every existing one', () => {
    expect(nextCategoryOrder([])).toBe(0);
    expect(nextCategoryOrder(categories)).toBe(4);
  });

  it('does not allow renaming a default category', () => {
    expect(canRenameCategory(people).ok).toBe(false);
    expect(canRenameCategory(songs)).toEqual({ ok: true });
  });

  it('does not allow deleting a default category', () => {
    expect(canDeleteCategory(places, [])).toEqual({
      ok: false,
      error: 'People, Places and Numbers cannot be deleted.',
    });
  });

  it('allows deleting an empty custom category', () => {
    expect(canDeleteCategory(songs, [tag('t1', 'Ravi', 'people')])).toEqual({ ok: true });
  });

  it('blocks deleting a custom category that tags still use, with the count', () => {
    const one = canDeleteCategory(songs, [tag('t1', 'Hello', 'c-songs')]);
    expect(one).toEqual({
      ok: false,
      error: '1 tag uses this category. Move or delete them first.',
    });
    const two = canDeleteCategory(songs, [tag('t1', 'A', 'c-songs'), tag('t2', 'B', 'c-songs')]);
    expect(two.ok === false && two.error).toBe(
      '2 tags use this category. Move or delete them first.',
    );
  });
});

describe('filterTags', () => {
  const tags = [
    tag('t1', 'Ravi', 'people', ['Rav']),
    tag('t2', 'amma', 'people'),
    tag('t3', 'Galle Fort', 'places', ['the fort']),
    tag('t4', '0771234567', 'numbers'),
  ];

  it('returns everything sorted by name for an empty filter', () => {
    const result = filterTags(tags, { query: '', categoryId: null });
    expect(result.map((t) => t.id)).toEqual(['t4', 't2', 't3', 't1']);
  });

  it('filters by category', () => {
    expect(filterTags(tags, { query: '', categoryId: 'people' }).map((t) => t.id)).toEqual([
      't2',
      't1',
    ]);
  });

  it('matches names and aliases ignoring case', () => {
    expect(filterTags(tags, { query: 'FORT', categoryId: null }).map((t) => t.id)).toEqual(['t3']);
    expect(filterTags(tags, { query: 'rav', categoryId: null }).map((t) => t.id)).toEqual(['t1']);
  });

  it('combines query and category', () => {
    expect(filterTags(tags, { query: 'a', categoryId: 'places' }).map((t) => t.id)).toEqual(['t3']);
    expect(filterTags(tags, { query: 'fort', categoryId: 'people' })).toEqual([]);
  });

  it('does not change the input array', () => {
    const copy = [...tags];
    filterTags(tags, { query: '', categoryId: null });
    expect(tags).toEqual(copy);
  });
});
