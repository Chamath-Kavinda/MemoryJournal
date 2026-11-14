import {
  addMinuteMarker,
  emptyContent,
  setHourText,
  setMinuteText,
  type DayContent,
} from '@memory-journal/core';
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

function selection(start: number) {
  return { nativeEvent: { selection: { start, end: start } } };
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

describe('DayWriter minute markers', () => {
  const written = setHourText(emptyContent(), 9, 'Breakfast then a phone call');

  async function addMinute(minute: string) {
    await fireEvent.press(screen.getByLabelText('Add minute'));
    await fireEvent.changeText(screen.getByLabelText('Minute'), minute);
    await fireEvent.press(screen.getByLabelText('Insert minute marker'));
  }

  it('inserts a marker at the cursor and moves the following text into it', async () => {
    const onChange = jest.fn();
    await render(<Harness initial={written} onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('09:00, Breakfast then a phone call'));
    await fireEvent(screen.getByLabelText('Notes for 09:00'), 'selectionChange', selection(14));
    await addMinute('25');

    expect(onChange).toHaveBeenLastCalledWith({
      freeNotes: '',
      blocks: [
        { hour: 9, minute: null, text: 'Breakfast then' },
        { hour: 9, minute: 25, text: 'a phone call' },
      ],
    });
    expect(screen.getByText(':25')).toBeTruthy();
    expect(screen.getByLabelText('Notes at 09:25').props.value).toBe('a phone call');
    // The form closes after inserting.
    expect(screen.queryByLabelText('Minute')).toBeNull();
    expect(screen.getByLabelText('Add minute')).toBeTruthy();
  });

  it('adds an empty marker when nothing was typed yet and lets it be filled', async () => {
    const onChange = jest.fn();
    await render(<Harness onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('14:00, empty'));
    await addMinute('5');
    expect(onChange).toHaveBeenLastCalledWith({
      freeNotes: '',
      blocks: [{ hour: 14, minute: 5, text: '' }],
    });
    expect(screen.getByText(':05')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Notes at 14:05'), 'Tea with Nimal');
    expect(onChange).toHaveBeenLastCalledWith({
      freeNotes: '',
      blocks: [{ hour: 14, minute: 5, text: 'Tea with Nimal' }],
    });
  });

  it('splits the text of a marker when the cursor is inside it', async () => {
    const onChange = jest.fn();
    const initial = setMinuteText(written, 9, 10, 'Left home bus came');
    await render(<Harness initial={initial} onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('09:00, Breakfast then a phone call'));
    await fireEvent(screen.getByLabelText('Notes at 09:10'), 'selectionChange', selection(9));
    await addMinute('20');

    expect(onChange).toHaveBeenLastCalledWith({
      freeNotes: '',
      blocks: [
        { hour: 9, minute: null, text: 'Breakfast then a phone call' },
        { hour: 9, minute: 10, text: 'Left home' },
        { hour: 9, minute: 20, text: 'bus came' },
      ],
    });
  });

  it('edits the text of a marker', async () => {
    const onChange = jest.fn();
    const initial = setMinuteText(setHourText(emptyContent(), 9, 'Morning'), 9, 25, 'Call');
    await render(<Harness initial={initial} onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('09:00, Morning'));
    await fireEvent.changeText(screen.getByLabelText('Notes at 09:25'), 'Call Amma');

    expect(onChange).toHaveBeenLastCalledWith({
      freeNotes: '',
      blocks: [
        { hour: 9, minute: null, text: 'Morning' },
        { hour: 9, minute: 25, text: 'Call Amma' },
      ],
    });
  });

  it('removes a marker and keeps its text', async () => {
    const onChange = jest.fn();
    const initial = setMinuteText(setHourText(emptyContent(), 9, 'Morning'), 9, 25, 'Call Amma');
    await render(<Harness initial={initial} onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('09:00, Morning'));
    await fireEvent.press(screen.getByLabelText('Remove 09:25'));

    expect(onChange).toHaveBeenLastCalledWith({
      freeNotes: '',
      blocks: [{ hour: 9, minute: null, text: 'Morning\nCall Amma' }],
    });
    expect(screen.queryByLabelText('Notes at 09:25')).toBeNull();
  });

  it('rejects a minute outside 0 to 59 and keeps the form open', async () => {
    const onChange = jest.fn();
    await render(<Harness initial={written} onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('09:00, Breakfast then a phone call'));
    await addMinute('75');

    expect(screen.getByText('Enter a minute from 0 to 59.')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();

    // Typing again clears the message.
    await fireEvent.changeText(screen.getByLabelText('Minute'), '7');
    expect(screen.queryByText('Enter a minute from 0 to 59.')).toBeNull();
  });

  it('rejects a minute that already has a marker', async () => {
    const onChange = jest.fn();
    await render(<Harness initial={written} onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('09:00, Breakfast then a phone call'));
    await addMinute('25');
    onChange.mockClear();
    await addMinute('25');

    expect(screen.getByText('09:25 already has a marker.')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('closes the minute form on cancel', async () => {
    const onChange = jest.fn();
    await render(<Harness initial={written} onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('09:00, Breakfast then a phone call'));
    await fireEvent.press(screen.getByLabelText('Add minute'));
    expect(screen.getByLabelText('Minute')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Cancel adding a minute'));
    expect(screen.queryByLabelText('Minute')).toBeNull();
    expect(screen.getByLabelText('Add minute')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows markers read-only while the day is locked, with no way to add or remove', async () => {
    const onChange = jest.fn();
    const initial = addMinuteMarker(written, 9, 25, { minute: null, cursor: 14 });
    await render(<Harness initial={initial} editable={false} onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('09:00, Breakfast then'));

    expect(screen.getByText(':25')).toBeTruthy();
    expect(screen.getByLabelText('Notes at 09:25').props.editable).toBe(false);
    expect(screen.queryByLabelText('Add minute')).toBeNull();
    expect(screen.queryByLabelText('Remove 09:25')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('starts a fresh cursor when another row is opened', async () => {
    const onChange = jest.fn();
    const initial = setHourText(written, 10, 'Lunch plans');
    await render(<Harness initial={initial} onChange={onChange} />);

    await fireEvent.press(screen.getByLabelText('09:00, Breakfast then a phone call'));
    await fireEvent(screen.getByLabelText('Notes for 09:00'), 'selectionChange', selection(5));
    await fireEvent.press(screen.getByLabelText('10:00, Lunch plans'));
    await addMinute('30');

    // The old cursor (offset 5 in hour 9) must not split the text of hour 10.
    expect(onChange).toHaveBeenLastCalledWith({
      freeNotes: '',
      blocks: [
        { hour: 9, minute: null, text: 'Breakfast then a phone call' },
        { hour: 10, minute: null, text: 'Lunch plans' },
        { hour: 10, minute: 30, text: '' },
      ],
    });
  });
});
