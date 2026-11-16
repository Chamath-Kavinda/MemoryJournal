import {
  emptyContent,
  setFreeNotes,
  setHourText,
  setMinuteText,
  type DayContent,
} from '@memory-journal/core';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { HighlightedDay } from './HighlightedDay';
import { HighlightSwitch } from './HighlightSwitch';

const text = (value: string): DayContent => setHourText(emptyContent(), 9, value);

describe('HighlightedDay', () => {
  it('marks the words that were not in the previous pass', async () => {
    await render(
      <HighlightedDay
        previous={text('Breakfast with Amma')}
        current={text('Breakfast with Amma and Ravi')}
        previousN={1}
      />,
    );

    const added = screen.getAllByTestId('added-text');
    expect(added).toHaveLength(1);
    expect(screen.getByText('and Ravi')).toBeTruthy();
    expect(screen.getByText('2 new words since the 1st pass, shown in bold.')).toBeTruthy();
  });

  it('says so when nothing was added', async () => {
    await render(
      <HighlightedDay previous={text('Same words')} current={text('Same words')} previousN={2} />,
    );

    expect(screen.queryAllByTestId('added-text')).toHaveLength(0);
    expect(screen.getByText('Nothing new since the 2nd pass.')).toBeTruthy();
  });

  it('uses the singular for a single new word', async () => {
    await render(
      <HighlightedDay previous={text('Tea')} current={text('Tea yesterday')} previousN={1} />,
    );

    expect(screen.getByText('1 new word since the 1st pass, shown in bold.')).toBeTruthy();
  });

  it('ignores case and punctuation when comparing, so only real additions are marked', async () => {
    await render(
      <HighlightedDay
        previous={text('met amma, then lunch')}
        current={text('Met Amma then lunch.')}
        previousN={1}
      />,
    );

    expect(screen.getByText('Nothing new since the 1st pass.')).toBeTruthy();
  });

  it('marks additions in free notes and in minute markers', async () => {
    const previous = setMinuteText(setFreeNotes(text('Breakfast'), 'A song'), 9, 25, 'Phone call');
    const current = setMinuteText(
      setFreeNotes(text('Breakfast'), 'A song in the car'),
      9,
      25,
      'Phone call from Amma',
    );

    await render(<HighlightedDay previous={previous} current={current} previousN={1} />);

    expect(screen.getByText('Free notes')).toBeTruthy();
    expect(screen.getByText('in the car')).toBeTruthy();
    expect(screen.getByText('from Amma')).toBeTruthy();
    expect(screen.getAllByTestId('added-text')).toHaveLength(2);
    expect(screen.getByText('5 new words since the 1st pass, shown in bold.')).toBeTruthy();
  });

  it('marks everything as new when the previous pass was empty', async () => {
    await render(
      <HighlightedDay previous={emptyContent()} current={text('Only now')} previousN={1} />,
    );

    expect(screen.getByText('Only now')).toBeTruthy();
    expect(screen.getByText('2 new words since the 1st pass, shown in bold.')).toBeTruthy();
  });

  it('lists only the parts of the day that have text', async () => {
    await render(
      <HighlightedDay previous={emptyContent()} current={text('Only one hour')} previousN={1} />,
    );

    expect(screen.queryByText('Free notes')).toBeNull();
    expect(screen.getByText('09:00')).toBeTruthy();
    expect(screen.queryByText('10:00')).toBeNull();
  });
});

describe('HighlightSwitch', () => {
  it('reports the new value when switched', async () => {
    const onChange = jest.fn();
    await render(
      <HighlightSwitch value={false} onChange={onChange} disabled={false} readOnlyNote={false} />,
    );

    await fireEvent.press(screen.getByLabelText('Highlight additions'));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('explains why it is off for the first pass', async () => {
    await render(
      <HighlightSwitch value={true} onChange={jest.fn()} disabled readOnlyNote={false} />,
    );

    expect(screen.getByText('The first pass has nothing earlier to compare with.')).toBeTruthy();
    expect(screen.getByLabelText('Highlight additions').props.accessibilityState).toMatchObject({
      checked: false,
      disabled: true,
    });
  });

  it('tells the writer that the highlighted view is read-only', async () => {
    await render(<HighlightSwitch value onChange={jest.fn()} disabled={false} readOnlyNote />);

    expect(screen.getByText('Showing the saved pass. Switch off to keep writing.')).toBeTruthy();
  });

  it('shows no hint when it is off or when the pass is not editable', async () => {
    await render(
      <HighlightSwitch value={false} onChange={jest.fn()} disabled={false} readOnlyNote />,
    );

    expect(screen.queryByText(/Switch off/)).toBeNull();
    expect(screen.queryByText(/nothing earlier/)).toBeNull();
  });
});
