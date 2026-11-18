import { fireEvent, render, screen } from '@testing-library/react-native';

import { AddTimeSheet, hourColumns, hourRows } from './AddTimeSheet';

describe('hour grid layout', () => {
  it('uses 6 columns below 600 px and 8 columns from 600 px up', () => {
    expect(hourColumns(360)).toBe(6);
    expect(hourColumns(599)).toBe(6);
    expect(hourColumns(600)).toBe(8);
    expect(hourColumns(1024)).toBe(8);
  });

  it('splits the 24 hours into rows of equal length', () => {
    const phone = hourRows(6);
    expect(phone).toHaveLength(4);
    expect(phone.every((row) => row.length === 6)).toBe(true);

    const wide = hourRows(8);
    expect(wide).toHaveLength(3);
    expect(wide.every((row) => row.length === 8)).toBe(true);

    expect(phone.flat()).toEqual(Array.from({ length: 24 }, (_, hour) => hour));
  });
});

describe('AddTimeSheet', () => {
  const now = new Date(2026, 10, 18, 21, 25);

  it('shows all 24 hours and inserts the chosen hour', async () => {
    const onInsert = jest.fn();
    await render(<AddTimeSheet now={now} onInsert={onInsert} onClose={jest.fn()} />);

    for (let hour = 0; hour < 24; hour += 1) {
      expect(screen.getByTestId(`hour-${String(hour).padStart(2, '0')}`)).toBeTruthy();
    }

    await fireEvent.press(screen.getByLabelText('Insert time'));
    expect(onInsert).toHaveBeenCalledWith(21, null);
  });

  it('inserts hour and minutes from the quick chips', async () => {
    const onInsert = jest.fn();
    await render(<AddTimeSheet now={now} onInsert={onInsert} onClose={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Hour and minutes'));
    await fireEvent.press(screen.getByTestId('minute-30'));
    await fireEvent.press(screen.getByLabelText('Insert time'));

    expect(onInsert).toHaveBeenCalledWith(21, 30);
  });

  it('keeps only digits in the minute field', async () => {
    await render(<AddTimeSheet now={now} onInsert={jest.fn()} onClose={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Hour and minutes'));
    await fireEvent.changeText(screen.getByLabelText('Minute'), '4a');

    expect(screen.getByLabelText('Minute').props.value).toBe('4');
  });
});
