import { addDays, buildInsights, type DayRevision, type Insights } from '@memory-journal/core';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { InsightsView } from './InsightsView';

const OFFSET = 330;
const TODAY = '2026-11-14';

function at(dayId: string, hour: number, minute = 0): number {
  const [year, month, day] = dayId.split('-').map(Number) as [number, number, number];
  return Date.UTC(year, month - 1, day, hour, minute) - OFFSET * 60_000;
}

/** A day written that evening at 21:30 with 30 words. */
const evening = (dayId: string) => {
  const first: DayRevision = {
    n: 1,
    createdAt: at(dayId, 21, 30),
    closedAt: null,
    kind: 'first',
    freeNotes: '',
    blocks: [{ hour: 9, minute: null, text: 'Breakfast with a friend' }],
    mentions: [],
    wordCount: 30,
    addedWordCount: 0,
  };
  return { dayId, revisions: [first] };
};

function insightsFor(dayIds: string[]): Insights {
  return buildInsights({
    today: TODAY,
    utcOffsetMinutes: OFFSET,
    days: dayIds.map(evening),
    library: { itemCount: 0, lastSavedAt: null },
  });
}

const withStreak = (insights: Insights, currentStreak: number): Insights => ({
  ...insights,
  streak: { ...insights.streak, currentStreak },
});

const MESSAGE = 'You wrote 30 words today.';

describe('InsightsView', () => {
  it('shows the message and an empty state for a new journal', async () => {
    await render(<InsightsView insights={insightsFor([])} message={MESSAGE} />);

    expect(screen.getByText(MESSAGE)).toBeTruthy();
    expect(screen.getByText(/No score yet/)).toBeTruthy();
    expect(screen.getByLabelText('Current: 0 days')).toBeTruthy();
    expect(screen.getByLabelText('Longest: 0 days')).toBeTruthy();
    expect(screen.getByLabelText('Freezes banked: 0')).toBeTruthy();
    expect(screen.getByText('Next milestone: 3 days (3 to go).')).toBeTruthy();
    expect(screen.getByLabelText('No scores yet. The trend fills in as you write.')).toBeTruthy();
  });

  it('shows the score, the streak and the next milestone from the journal', async () => {
    const insights = insightsFor([addDays(TODAY, -2), addDays(TODAY, -1), TODAY]);
    await render(<InsightsView insights={insights} message={MESSAGE} />);

    expect(screen.getByLabelText(`Recall score ${insights.score} out of 100`)).toBeTruthy();
    expect(screen.getByText('out of 100')).toBeTruthy();
    expect(screen.getByLabelText('Current: 3 days')).toBeTruthy();
    expect(screen.getByLabelText('Longest: 3 days')).toBeTruthy();
    expect(screen.getByText('Next milestone: 7 days (4 to go).')).toBeTruthy();
  });

  it('describes the trend from the first score to the latest', async () => {
    const insights = insightsFor([addDays(TODAY, -1), TODAY]);
    const scores = insights.trend.flatMap((point) => (point.score === null ? [] : [point.score]));
    await render(<InsightsView insights={insights} message={MESSAGE} />);

    const summary = `Recall score over the last 30 days: ${scores[0]} at the start, ${scores[scores.length - 1]} now.`;
    expect(screen.getByLabelText(summary)).toBeTruthy();
    expect(screen.getByText(summary)).toBeTruthy();
    expect(screen.getByText('30 days ago')).toBeTruthy();
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it.each([
    [4, '+4 compared with a week ago'],
    [-3, '\u22123 compared with a week ago'],
    [0, 'Same as a week ago'],
  ])('shows a weekly change of %i', async (delta, text) => {
    const insights = { ...insightsFor([TODAY]), scoreDelta: delta };
    await render(<InsightsView insights={insights} message={MESSAGE} />);

    expect(screen.getByText(text)).toBeTruthy();
  });

  it('shows no weekly change when there is nothing to compare with', async () => {
    const insights = { ...insightsFor([TODAY]), scoreDelta: null };
    await render(<InsightsView insights={insights} message={MESSAGE} />);

    expect(screen.queryByText(/compared with a week ago|Same as a week ago/)).toBeNull();
  });

  it('opens and closes the note that the score is not a medical measure', async () => {
    await render(<InsightsView insights={insightsFor([TODAY])} message={MESSAGE} />);
    expect(screen.queryByText(/not a medical measure/)).toBeNull();

    await fireEvent.press(screen.getByText('About the score'));
    expect(screen.getByText(/motivation tool, not a medical measure/)).toBeTruthy();

    await fireEvent.press(screen.getByText('Hide score info'));
    expect(screen.queryByText(/not a medical measure/)).toBeNull();
    expect(screen.getByText('About the score')).toBeTruthy();
  });

  it('says so when every milestone has been reached', async () => {
    const insights = withStreak(insightsFor([TODAY]), 400);
    await render(<InsightsView insights={insights} message={MESSAGE} />);

    expect(screen.getByText('You have reached every milestone.')).toBeTruthy();
    expect(screen.queryByText(/Next milestone/)).toBeNull();
  });

  it('uses the singular for one day', async () => {
    await render(<InsightsView insights={insightsFor([TODAY])} message={MESSAGE} />);

    expect(screen.getByLabelText('Current: 1 day')).toBeTruthy();
  });
});
