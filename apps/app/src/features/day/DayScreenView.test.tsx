import { fireEvent, render, screen } from '@testing-library/react-native';

import { DayScreenView } from './DayScreenView';

function setup(access: Parameters<typeof DayScreenView>[0]['access'], dayId = '2026-11-14') {
  const onBack = jest.fn();
  return { onBack, element: <DayScreenView dayId={dayId} access={access} onBack={onBack} /> };
}

describe('DayScreenView', () => {
  it('shows the date and the lock chip, with no banner, when today is still locked', async () => {
    const unlocksAt = Date.UTC(2026, 10, 14, 15, 30);
    const { element } = setup({
      state: 'locked',
      unlocksAt,
      msUntilUnlock: 3 * 3_600_000 + 12 * 60_000 + 45_000,
    });
    await render(element);

    expect(screen.getByText('Saturday, 14 November 2026')).toBeTruthy();
    expect(screen.getByLabelText('Opens in 3:12:45')).toBeTruthy();
    expect(screen.queryByText('Read-only until 9:00 PM')).toBeNull();
    expect(screen.queryByText(/Opens for writing in/)).toBeNull();
  });

  it('shows the lock chip, with no banner, when the day can be written', async () => {
    const { element } = setup({ state: 'open' }, '2026-11-10');
    await render(element);

    expect(screen.getByText('Tuesday, 10 November 2026')).toBeTruthy();
    expect(screen.getByLabelText('Open for writing')).toBeTruthy();
    expect(screen.queryByText('This day is open for writing.')).toBeNull();
  });

  it('explains that a future day cannot be opened', async () => {
    const { element } = setup({ state: 'future' }, '2026-11-20');
    await render(element);

    expect(screen.getByText('This day has not arrived yet.')).toBeTruthy();
    expect(screen.getByText('Future days cannot be opened.')).toBeTruthy();
  });

  it('tells a guest to fix the device clock when it looks wrong', async () => {
    const { element } = setup({ state: 'clockWrong' });
    await render(element);

    expect(screen.getByText('Your device clock looks wrong.')).toBeTruthy();
    expect(screen.getByText('Fix it to write today.')).toBeTruthy();
    expect(screen.queryByText('This day is open for writing.')).toBeNull();
  });

  it('handles an invalid day id', async () => {
    const { element } = setup(null, 'nonsense');
    await render(element);

    expect(screen.getByText('nonsense')).toBeTruthy();
    expect(screen.getByText('This is not a valid day.')).toBeTruthy();
  });

  it('goes back when Back is pressed', async () => {
    const { element, onBack } = setup({ state: 'open' });
    await render(element);

    await fireEvent.press(screen.getByLabelText('Back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
