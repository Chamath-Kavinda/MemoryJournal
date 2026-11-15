import {
  LESSONS,
  TRY_IT_HEADING,
  cleanCompleted,
  exerciseOf,
  getLesson,
  learnProgress,
  nextLesson,
  parseLesson,
  toggleCompleted,
  type Lesson,
} from './index';

const IDS = LESSONS.map((lesson) => lesson.id);
const wordsIn = (text: string) => text.split(/\s+/).filter(Boolean).length;

describe('the bundled lessons', () => {
  it('holds the seven required lessons in teaching order', () => {
    expect(LESSONS.map((lesson) => lesson.title)).toEqual([
      'What memory actually is',
      'The memory palace',
      'Linking and visual stories',
      'Chunking numbers',
      'Names and faces',
      'Spaced recall',
      'Evening review habit',
    ]);
  });

  it('gives every lesson a unique id, a summary and a believable reading time', () => {
    expect(new Set(IDS).size).toBe(IDS.length);
    for (const lesson of LESSONS) {
      expect(lesson.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(lesson.summary.length).toBeGreaterThan(10);
      expect(Number.isInteger(lesson.minutes)).toBe(true);
      expect(lesson.minutes).toBeGreaterThanOrEqual(Math.ceil(wordsIn(lesson.body) / 250));
      expect(lesson.minutes).toBeLessThanOrEqual(5);
    }
  });

  it.each(LESSONS.map((lesson) => [lesson.title, lesson] as const))(
    '%s starts with a section and ends with Try it tonight',
    (_title, lesson) => {
      const blocks = parseLesson(lesson.body);
      const headings = blocks.filter((block) => block.type === 'heading');

      expect(blocks[0]?.type).toBe('heading');
      expect(headings.length).toBeGreaterThanOrEqual(4);
      expect(headings[headings.length - 1]).toEqual({ type: 'heading', text: TRY_IT_HEADING });
      expect(headings.filter((block) => block.text === TRY_IT_HEADING)).toHaveLength(1);

      // The exercise is plain paragraphs, so it can be shown under the button to the Day screen.
      const afterHeading = blocks.slice(
        blocks.findIndex((block) => block.type === 'heading' && block.text === TRY_IT_HEADING) + 1,
      );
      expect(afterHeading.length).toBeGreaterThan(0);
      expect(afterHeading.every((block) => block.type === 'paragraph')).toBe(true);
      expect(exerciseOf(lesson).length).toBeGreaterThan(40);
    },
  );

  it.each(LESSONS.map((lesson) => [lesson.title, lesson] as const))(
    '%s uses only the markdown subset the app can draw',
    (_title, lesson) => {
      expect(lesson.body).toBe(lesson.body.trim());
      for (const line of lesson.body.split('\n')) {
        if (line.startsWith('## ')) continue;
        expect(line.startsWith('#')).toBe(false);
        expect(line).not.toMatch(/[*_`[\]|>]/);
      }
    },
  );

  it('keeps the memory palace on your own home', () => {
    const palace = getLesson('memory-palace');
    expect(palace?.body).toMatch(/own home/i);
    expect(palace?.body).toMatch(/walk/i);
  });

  it('teaches recall first and checking after in the spaced recall lesson', () => {
    const body = getLesson('spaced-recall')?.body ?? '';
    expect(body).toMatch(/before you look/i);
    expect(body).toMatch(/check/i);
  });

  it('says the score is a motivation tool in the first lesson', () => {
    expect(getLesson('what-memory-is')?.body).toMatch(/motivation tool, not a medical measure/);
  });
});

describe('getLesson', () => {
  it('finds a lesson by id and returns undefined for an unknown one', () => {
    expect(getLesson('chunking-numbers')?.title).toBe('Chunking numbers');
    expect(getLesson('nope')).toBeUndefined();
  });
});

describe('parseLesson', () => {
  it('returns nothing for an empty body', () => {
    expect(parseLesson('')).toEqual([]);
    expect(parseLesson('\n  \n')).toEqual([]);
  });

  it('reads headings, paragraphs and lists', () => {
    const body = [
      '## First',
      '',
      'One line',
      'and another.',
      '',
      '- a',
      '- b',
      '',
      '## Second',
    ].join('\n');

    expect(parseLesson(body)).toEqual([
      { type: 'heading', text: 'First' },
      { type: 'paragraph', text: 'One line and another.' },
      { type: 'list', items: ['a', 'b'] },
      { type: 'heading', text: 'Second' },
    ]);
  });

  it('ends a paragraph where a list starts, and a list where a paragraph starts', () => {
    expect(parseLesson(['Before', '- a', '- b', 'After'].join('\n'))).toEqual([
      { type: 'paragraph', text: 'Before' },
      { type: 'list', items: ['a', 'b'] },
      { type: 'paragraph', text: 'After' },
    ]);
  });

  it('ends a section at the next heading even without a blank line', () => {
    expect(parseLesson(['Text', '## Next', '- item', '## Last'].join('\n'))).toEqual([
      { type: 'paragraph', text: 'Text' },
      { type: 'heading', text: 'Next' },
      { type: 'list', items: ['item'] },
      { type: 'heading', text: 'Last' },
    ]);
  });
});

describe('exerciseOf', () => {
  const lessonWith = (body: string): Lesson => ({
    id: 'x',
    title: 'X',
    summary: 'A lesson for the tests.',
    minutes: 1,
    body,
  });

  it('returns the paragraphs after Try it tonight and skips lists', () => {
    const lesson = lessonWith(
      ['## Idea', 'Not this.', '## Try it tonight', 'Do this.', '- not this', 'Then this.'].join(
        '\n',
      ),
    );

    expect(exerciseOf(lesson)).toBe('Do this.\n\nThen this.');
  });

  it('returns an empty string when a lesson has no exercise', () => {
    expect(exerciseOf(lessonWith('## Idea\nText.'))).toBe('');
  });
});

describe('progress', () => {
  it('cleans a stored list to known lessons, once each, in teaching order', () => {
    expect(
      cleanCompleted(['spaced-recall', 'gone', 'memory-palace', 'spaced-recall', 7, null]),
    ).toEqual(['memory-palace', 'spaced-recall']);
  });

  it('treats anything that is not a list as no progress', () => {
    expect(cleanCompleted(undefined)).toEqual([]);
    expect(cleanCompleted(null)).toEqual([]);
    expect(cleanCompleted('memory-palace')).toEqual([]);
    expect(cleanCompleted({ 0: 'memory-palace' })).toEqual([]);
  });

  it('toggles a lesson on and off', () => {
    const once = toggleCompleted([], 'names-and-faces');
    const twice = toggleCompleted(once, 'what-memory-is');

    expect(once).toEqual(['names-and-faces']);
    expect(twice).toEqual(['what-memory-is', 'names-and-faces']);
    expect(toggleCompleted(twice, 'names-and-faces')).toEqual(['what-memory-is']);
  });

  it('ignores an unknown lesson id and still cleans the list', () => {
    expect(toggleCompleted(['memory-palace', 'gone'], 'also-gone')).toEqual(['memory-palace']);
  });

  it('counts finished lessons out of all of them', () => {
    expect(learnProgress([])).toEqual({ done: 0, total: 7 });
    expect(learnProgress(['memory-palace', 'gone', 'memory-palace'])).toEqual({
      done: 1,
      total: 7,
    });
    expect(learnProgress(IDS)).toEqual({ done: 7, total: 7 });
  });

  it('suggests the first lesson that is not finished', () => {
    expect(nextLesson([])?.id).toBe('what-memory-is');
    expect(nextLesson(['what-memory-is', 'linking-stories'])?.id).toBe('memory-palace');
    expect(nextLesson(IDS.slice(0, 6))?.id).toBe('evening-review');
    expect(nextLesson(IDS)).toBeNull();
  });
});
