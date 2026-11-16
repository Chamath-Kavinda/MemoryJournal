import type { GuestDayAccess } from '@memory-journal/core';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { TodayCardView } from './TodayCardView';

jest.mock('@/motion/useReduceMotion', () => ({ useReduceMotion: () => true }));

const locked = (msUntilUnlock: number): GuestDayAccess => ({
  state: 'locked',
  unlocksAt: 0,
  msUntilUnlock,
});

describe('TodayCardView', () => {
  it('shows the lock, the unlock time and a live countdown before 21:00', async () => {
    await render(<TodayCardView access={locked(5_400_000)} onWrite={() => {}} />);

    expect(screen.getByText('Opens at 9:00 PM')).toBeTruthy();
    expect(screen.getByText('1:30:00')).toBeTruthy();
    expect(screen.getByRole('timer')).toHaveProp('accessibilityLabel', 'Opens in 1:30:00');
    expect(screen.queryByRole('button', { name: 'Write today' })).toBeNull();
  });

  it('follows the countdown as the access updates', async () => {
    const { rerender } = await render(<TodayCardView access={locked(61_000)} onWrite={() => {}} />);
    expect(screen.getByText('0:01:01')).toBeTruthy();

    await rerender(<TodayCardView access={locked(60_000)} onWrite={() => {}} />);
    expect(screen.getByText('0:01:00')).toBeTruthy();
  });

  it('offers Write today once today is open and calls onWrite', async () => {
    const onWrite = jest.fn();
    await render(<TodayCardView access={{ state: 'open' }} onWrite={onWrite} />);

    expect(screen.getByText('Today is open')).toBeTruthy();
    expect(screen.queryByText('Opens at 9:00 PM')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Write today' }));

    expect(onWrite).toHaveBeenCalledTimes(1);
  });

  it('switches from the countdown to Write today when 21:00 arrives', async () => {
    const { rerender } = await render(<TodayCardView access={locked(1000)} onWrite={() => {}} />);
    expect(screen.getByText('Opens at 9:00 PM')).toBeTruthy();

    await rerender(<TodayCardView access={{ state: 'open' }} onWrite={() => {}} />);

    expect(screen.queryByText('Opens at 9:00 PM')).toBeNull();
    expect(screen.getByRole('button', { name: 'Write today' })).toBeTruthy();
  });

  it('says why today stays closed when the device clock looks wrong', async () => {
    await render(<TodayCardView access={{ state: 'clockWrong' }} onWrite={() => {}} />);

    expect(screen.getByText('Your device clock looks wrong. Fix it to write today.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Write today' })).toBeNull();
  });

  it('shows nothing while the lock state is unknown or for a future day', async () => {
    const { rerender } = await render(<TodayCardView access={null} onWrite={() => {}} />);
    expect(screen.queryByTestId('today-card')).toBeNull();

    await rerender(<TodayCardView access={{ state: 'future' }} onWrite={() => {}} />);
    expect(screen.queryByTestId('today-card')).toBeNull();
  });
});
