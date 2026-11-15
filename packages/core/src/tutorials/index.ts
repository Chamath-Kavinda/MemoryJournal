import { LESSONS, type Lesson } from './lessons';

export { LESSONS, type Lesson } from './lessons';

/** The heading every lesson ends with (section 5.7). The app links the exercise to the Day screen. */
export const TRY_IT_HEADING = 'Try it tonight';

export type LessonBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] };

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.id === id);
}

/**
 * Splits a lesson body into headings, paragraphs and lists, so every screen draws a lesson the
 * same way. The format is the small subset described in lessons.ts. A paragraph's lines are joined
 * with a space, and a list or a paragraph also ends where the other kind starts.
 */
export function parseLesson(body: string): LessonBlock[] {
  const blocks: LessonBlock[] = [];
  let paragraph: string[] = [];
  let items: string[] = [];

  const flush = (): void => {
    if (paragraph.length > 0) blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
    if (items.length > 0) blocks.push({ type: 'list', items });
    paragraph = [];
    items = [];
  };

  for (const raw of body.split('\n')) {
    const line = raw.trim();
    if (line === '') {
      flush();
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push({ type: 'heading', text: line.slice(3).trim() });
    } else if (line.startsWith('- ')) {
      if (paragraph.length > 0) flush();
      items.push(line.slice(2).trim());
    } else {
      if (items.length > 0) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

/** The text of the Try it tonight section: its paragraphs, separated by a blank line. */
export function exerciseOf(lesson: Lesson): string {
  const blocks = parseLesson(lesson.body);
  const start = blocks.findIndex(
    (block) => block.type === 'heading' && block.text === TRY_IT_HEADING,
  );
  if (start === -1) return '';
  return blocks
    .slice(start + 1)
    .flatMap((block) => (block.type === 'paragraph' ? [block.text] : []))
    .join('\n\n');
}

/**
 * The saved list of finished lessons, cleaned: only lessons that exist, each once, in the order the
 * lessons are taught. Whatever is stored, anything else is dropped (a lesson removed in a later
 * version, a repeat, a value of the wrong type).
 */
export function cleanCompleted(stored: unknown): string[] {
  if (!Array.isArray(stored)) return [];
  const finished = new Set<unknown>(stored);
  return LESSONS.filter((lesson) => finished.has(lesson.id)).map((lesson) => lesson.id);
}

/** The Mark as done toggle: finished lessons become unfinished and the other way round. */
export function toggleCompleted(completed: readonly string[], lessonId: string): string[] {
  if (getLesson(lessonId) === undefined) return cleanCompleted(completed);
  return cleanCompleted(
    completed.includes(lessonId)
      ? completed.filter((id) => id !== lessonId)
      : [...completed, lessonId],
  );
}

export interface LearnProgress {
  done: number;
  total: number;
}

export function learnProgress(completed: readonly string[]): LearnProgress {
  return { done: cleanCompleted(completed).length, total: LESSONS.length };
}

/** The first lesson that is not finished, or null when all of them are. */
export function nextLesson(completed: readonly string[]): Lesson | null {
  const finished = new Set(cleanCompleted(completed));
  return LESSONS.find((lesson) => !finished.has(lesson.id)) ?? null;
}
