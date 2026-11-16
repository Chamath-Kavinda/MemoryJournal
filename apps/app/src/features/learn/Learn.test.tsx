import { LESSONS, parseLesson, TRY_IT_HEADING } from '@memory-journal/core';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { LessonList } from './LessonList';
import { LessonView } from './LessonView';

const FIRST = LESSONS[0]!;
const SECOND = LESSONS[1]!;

describe('LessonList', () => {
  it('shows every lesson in teaching order with its summary and reading time', async () => {
    await render(<LessonList lessons={LESSONS} completed={[]} onOpen={jest.fn()} />);

    for (const lesson of LESSONS) {
      expect(screen.getByText(lesson.title)).toBeTruthy();
      expect(screen.getByText(lesson.summary)).toBeTruthy();
    }
    expect(screen.getAllByText(/min read$/)).toHaveLength(LESSONS.length);
  });

  it('says how many lessons are done and which one is next', async () => {
    await render(<LessonList lessons={LESSONS} completed={[FIRST.id]} onOpen={jest.fn()} />);

    expect(
      screen.getByText(`1 of ${LESSONS.length} lessons done. Up next: ${SECOND.title}.`),
    ).toBeTruthy();
  });

  it('marks finished lessons with a check', async () => {
    await render(<LessonList lessons={LESSONS} completed={[FIRST.id]} onOpen={jest.fn()} />);

    expect(screen.getAllByLabelText('Done')).toHaveLength(1);
    expect(
      screen.getByLabelText(`${FIRST.title}, ${FIRST.minutes} minute read, done`),
    ).toBeTruthy();
    expect(screen.getByLabelText(`${SECOND.title}, ${SECOND.minutes} minute read`)).toBeTruthy();
  });

  it('numbers the lessons in teaching order', async () => {
    await render(<LessonList lessons={LESSONS} completed={[]} onOpen={jest.fn()} />);

    for (let number = 1; number <= LESSONS.length; number += 1) {
      expect(screen.getByText(String(number))).toBeTruthy();
    }
  });

  it('fills the progress bar to the share of lessons done', async () => {
    await render(<LessonList lessons={LESSONS} completed={[FIRST.id]} onOpen={jest.fn()} />);

    const bar = screen.getByTestId('learn-progress-bar');
    expect(bar.props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: Math.round(100 / LESSONS.length),
    });
  });

  it('says so when every lesson is done', async () => {
    const all = LESSONS.map((lesson) => lesson.id);
    await render(<LessonList lessons={LESSONS} completed={all} onOpen={jest.fn()} />);

    expect(screen.getByText(`All ${LESSONS.length} lessons done.`)).toBeTruthy();
    expect(screen.queryByText(/Up next/)).toBeNull();
  });

  it('opens the lesson that is pressed', async () => {
    const onOpen = jest.fn();
    await render(<LessonList lessons={LESSONS} completed={[]} onOpen={onOpen} />);

    await fireEvent.press(screen.getByText(SECOND.title));

    expect(onOpen).toHaveBeenCalledWith(SECOND.id);
  });
});

describe('LessonView', () => {
  const props = { onToggleDone: jest.fn(), onTryIt: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('draws the headings and the Try it tonight section of the lesson', async () => {
    await render(<LessonView lesson={FIRST} done={false} {...props} />);

    const headings = parseLesson(FIRST.body).flatMap((block) =>
      block.type === 'heading' ? [block.text] : [],
    );
    for (const heading of headings) expect(screen.getByText(heading)).toBeTruthy();
    expect(headings).toContain(TRY_IT_HEADING);
    expect(screen.getByText(`${FIRST.minutes} min read`)).toBeTruthy();
  });

  it.each(LESSONS.map((lesson) => [lesson.title, lesson] as const))(
    'draws the lesson %s and ends it with the Try it tonight section',
    async (_title, lesson) => {
      await render(<LessonView lesson={lesson} done={false} {...props} />);

      expect(screen.getByText(TRY_IT_HEADING)).toBeTruthy();
      expect(screen.getByText("Open today's page")).toBeTruthy();
    },
  );

  it('opens today\u2019s page from the Try it tonight button', async () => {
    await render(<LessonView lesson={FIRST} done={false} {...props} />);

    await fireEvent.press(screen.getByText("Open today's page"));

    expect(props.onTryIt).toHaveBeenCalledTimes(1);
  });

  it('offers Mark as done for an unfinished lesson and calls the toggle', async () => {
    await render(<LessonView lesson={FIRST} done={false} {...props} />);

    await fireEvent.press(screen.getByText('Mark as done'));

    expect(props.onToggleDone).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Mark as not done')).toBeNull();
  });

  it('offers to undo a finished lesson', async () => {
    await render(<LessonView lesson={FIRST} done={true} {...props} />);

    expect(screen.getByText('Mark as not done')).toBeTruthy();
    expect(screen.queryByText('Mark as done')).toBeNull();

    await fireEvent.press(screen.getByText('Mark as not done'));
    expect(props.onToggleDone).toHaveBeenCalledTimes(1);
  });
});
