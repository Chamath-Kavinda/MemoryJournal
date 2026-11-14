import { fireEvent, render, screen } from '@testing-library/react-native';

import { MonthCalendar } from './MonthCalendar';

const NOV_2026 = { year: 2026, month: 11 };

function setup(overrides: Partial<Parameters<typeof MonthCalendar>[0]> = {}) {
  const onSelectDay = jest.fn();
  const onChangeMonth = jest.fn();
  const props = {
    month: NOV_2026,
    todayId: '2026-11-14',
    writtenDays: new Set(['2026-11-03']),
    onSelectDay,
    onChangeMonth,
    ...overrides,
  };
  return { onSelectDay, onChangeMonth, element: <MonthCalendar {...props} /> };
}

describe('MonthCalendar', () => {
  it('shows the month title and marks written days and today in the labels', async () => {
    const { element } = setup();
    await render(element);

    expect(screen.getByText('November 2026')).toBeTruthy();
    expect(screen.getByLabelText('3 November 2026, written')).toBeTruthy();
    expect(screen.getByLabelText('4 November 2026')).toBeTruthy();
    expect(screen.getByLabelText('14 November 2026, today')).toBeTruthy();
    expect(screen.getByLabelText('15 November 2026, not available yet')).toBeTruthy();
  });

  it('opens a past day when it is tapped', async () => {
    const { element, onSelectDay } = setup();
    await render(element);

    await fireEvent.press(screen.getByLabelText('3 November 2026, written'));
    await fireEvent.press(screen.getByLabelText('14 November 2026, today'));

    expect(onSelectDay).toHaveBeenNthCalledWith(1, '2026-11-03');
    expect(onSelectDay).toHaveBeenNthCalledWith(2, '2026-11-14');
  });

  it('ignores taps on future days', async () => {
    const { element, onSelectDay } = setup();
    await render(element);

    await fireEvent.press(screen.getByLabelText('15 November 2026, not available yet'));

    expect(onSelectDay).not.toHaveBeenCalled();
  });

  it('changes month and blocks going past the current month', async () => {
    const { element, onChangeMonth } = setup();
    await render(element);

    await fireEvent.press(screen.getByLabelText('Previous month'));
    await fireEvent.press(screen.getByLabelText('Next month'));

    expect(onChangeMonth).toHaveBeenCalledTimes(1);
    expect(onChangeMonth).toHaveBeenCalledWith(-1);
  });

  it('allows going forward from an earlier month', async () => {
    const { element, onChangeMonth } = setup({ month: { year: 2026, month: 10 } });
    await render(element);

    await fireEvent.press(screen.getByLabelText('Next month'));

    expect(onChangeMonth).toHaveBeenCalledWith(1);
  });
});
