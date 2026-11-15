import type { MentionedDay } from '@memory-journal/core';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { MentionHistory } from './MentionHistory';

const days: MentionedDay[] = [
  { dayId: '2026-11-13', wordCount: 42 },
  { dayId: '2026-11-10', wordCount: 1 },
];

describe('MentionHistory', () => {
  const onOpenDay = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('lists the days in the order given, with a readable date and word count', async () => {
    await render(<MentionHistory days={days} status="ready" onOpenDay={onOpenDay} />);

    const rows = screen.getAllByRole('button');
    expect(rows).toHaveLength(2);
    expect(screen.getByText('Friday 13 November 2026')).toBeTruthy();
    expect(screen.getByText('42 words')).toBeTruthy();
    expect(screen.getByText('Tuesday 10 November 2026')).toBeTruthy();
    expect(screen.getByText('1 word')).toBeTruthy();
    expect(screen.getAllByText(/2026$/).map((element) => element.props.children)).toEqual([
      'Friday 13 November 2026',
      'Tuesday 10 November 2026',
    ]);
  });

  it('opens the day that is pressed', async () => {
    await render(<MentionHistory days={days} status="ready" onOpenDay={onOpenDay} />);

    await fireEvent.press(screen.getByLabelText('Tuesday 10 November 2026, 1 word'));

    expect(onOpenDay).toHaveBeenCalledWith('2026-11-10');
  });

  it('explains the empty state once loaded', async () => {
    await render(<MentionHistory days={[]} status="ready" onOpenDay={onOpenDay} />);

    expect(screen.getByText(/No day mentions this tag yet/)).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('shows a spinner while loading, not the empty message', async () => {
    await render(<MentionHistory days={[]} status="loading" onOpenDay={onOpenDay} />);

    expect(screen.getByLabelText('Loading mentions')).toBeTruthy();
    expect(screen.queryByText(/No day mentions this tag yet/)).toBeNull();
  });

  it('says so when the days could not be loaded', async () => {
    await render(<MentionHistory days={[]} status="error" onOpenDay={onOpenDay} />);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Could not load the days that mention this tag.')).toBeTruthy();
  });
});
