import { addDays, buildInsights, type DayRevision, type Insights } from '@memory-journal/core';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { StatsBar } from './StatsBar';

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

describe('StatsBar', () => {
  it('shows dashes and says it is loading before the first read', async () => {
    await render(<StatsBar insights={null} status="loading" onOpen={() => {}} />);

    expect(screen.getAllByText('\u2013')).toHaveLength(2);
    expect(
      screen.getByLabelText(
        'Streak not available. Recall score not available. Loading. Open insights',
      ),
    ).toBeTruthy();
  });

  it('shows dashes and says so when the first read failed', async () => {
    await render(<StatsBar insights={null} status="error" onOpen={() => {}} />);

    expect(screen.getAllByText('\u2013')).toHaveLength(2);
    expect(
      screen.getByLabelText(
        'Streak not available. Recall score not available. Could not be refreshed. Open insights',
      ),
    ).toBeTruthy();
  });

  it('shows a zero streak and no score for an empty journal', async () => {
    await render(<StatsBar insights={insightsFor([])} status="ready" onOpen={() => {}} />);

    expect(screen.getByText('0 days')).toBeTruthy();
    expect(screen.getByText('\u2013')).toBeTruthy();
    expect(screen.getByLabelText('Streak 0 days. No recall score yet. Open insights')).toBeTruthy();
  });

  it('shows the streak and the score from the journal', async () => {
    const insights = insightsFor([addDays(TODAY, -2), addDays(TODAY, -1), TODAY]);
    await render(<StatsBar insights={insights} status="ready" onOpen={() => {}} />);

    expect(screen.getByText('3 days')).toBeTruthy();
    expect(screen.getByText(String(insights.score))).toBeTruthy();
    expect(
      screen.getByLabelText(
        `Streak 3 days. Recall score ${insights.score} out of 100. Open insights`,
      ),
    ).toBeTruthy();
  });

  it('uses the singular for a streak of one day', async () => {
    const insights = insightsFor([TODAY]);
    await render(<StatsBar insights={insights} status="ready" onOpen={() => {}} />);

    expect(screen.getByText('1 day')).toBeTruthy();
  });

  it('keeps the last numbers and notes the failure when a refresh fails', async () => {
    const insights = insightsFor([TODAY]);
    await render(<StatsBar insights={insights} status="error" onOpen={() => {}} />);

    expect(screen.getByText('1 day')).toBeTruthy();
    expect(screen.getByLabelText(/Could not be refreshed\. Open insights$/)).toBeTruthy();
  });

  it('opens the insights screen when pressed', async () => {
    const onOpen = jest.fn();
    await render(<StatsBar insights={insightsFor([])} status="ready" onOpen={onOpen} />);

    await fireEvent.press(screen.getByRole('button'));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
