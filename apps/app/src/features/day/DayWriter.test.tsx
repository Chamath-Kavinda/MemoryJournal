import { emptyContent, setHourText, type DayContent } from '@memory-journal/core';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { DayWriter } from './DayWriter';

function Harness({
  initial = emptyContent(),
  editable = true,
  onChange,
}: {
  initial?: DayContent;
  editable?: boolean;
  onChange?: (content: DayContent) => void;
}) {
  const [content, setContent] = useState(initial);
  return (
    <DayWriter
      content={content}
      editable={editable}
      onChange={(next) => {
        setContent(next);
        onChange?.(next);
      }}
    />
  );
}

describe('DayWriter', () => {
  it('shows the free notes block and 24 collapsed hourly rows', async () => {
    await render(<Harness />);

    expect(screen.getByText('Free notes')).toBeTruthy();
    expect(screen.getByLabelText('Free notes')).toBeTruthy();
    expect(screen.getByLabelText('00:00, empty')).toBeTruthy();
    expect(screen.getByLabelText('23:00, empty')).toBeTruthy();
    expect(screen.queryByLabelText('Notes for 09:00')).toBeNull();
  });

  it('expands a row into an editor and keeps a preview after it collapses', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('09:00, empty'));
    await fireEvent.changeText(screen.getByLabelText('Notes for 09:00'), 'Breakfast with Amma');

    expect(onChange).toHaveBeenLastCalledWith({
      freeNotes: '',
      blocks: [{ hour: 9, minute: null, text: 'Breakfast with Amma' }],
    });

    await fireEvent.press(screen.getByLabelText('09:00, Breakfast with Amma'));
    expect(screen.queryByLabelText('Notes for 09:00')).toBeNull();
    expect(screen.getByText('Breakfast with Amma')).toBeTruthy();
  });

  it('opens only one row at a time', async () => {
    await render(<Harness />);

    await fireEvent.press(screen.getByLabelText('09:00, empty'));
    await fireEvent.press(screen.getByLabelText('10:00, empty'));

    expect(screen.queryByLabelText('Notes for 09:00')).toBeNull();
    expect(screen.getByLabelText('Notes for 10:00')).toBeTruthy();
  });

  it('saves free notes without touching the hourly rows', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);

    await fireEvent.changeText(screen.getByLabelText('Free notes'), 'Met someone, not sure when');

    expect(onChange).toHaveBeenLastCalledWith({
      freeNotes: 'Met someone, not sure when',
      blocks: [],
    });
  });

  it('lets a row be emptied again', async () => {
    const onChange = jest.fn();
    const initial = setHourText(emptyContent(), 9, 'Hello');
    await render(<Harness initial={initial} onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('09:00, Hello'));
    await fireEvent.changeText(screen.getByLabelText('Notes for 09:00'), '');

    expect(onChange).toHaveBeenLastCalledWith({ freeNotes: '', blocks: [] });
  });

  it('is read-only while the day is locked', async () => {
    const onChange = jest.fn();
    const initial = setHourText(emptyContent(), 9, 'Written earlier');
    await render(<Harness initial={initial} editable={false} onChange={onChange} />);

    expect(screen.getByLabelText('Free notes').props.editable).toBe(false);

    // Empty rows cannot be opened, so there is nothing to type into.
    await fireEvent.press(screen.getByLabelText('10:00, empty'));
    expect(screen.queryByLabelText('Notes for 10:00')).toBeNull();

    // Rows with text can be read but not edited.
    await fireEvent.press(screen.getByLabelText('09:00, Written earlier'));
    expect(screen.getByLabelText('Notes for 09:00').props.editable).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });
});
