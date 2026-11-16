import { act, render, screen } from '@testing-library/react-native';

import { CountUp } from './CountUp';

let mockReduce = false;
jest.mock('@/motion/useReduceMotion', () => ({ useReduceMotion: () => mockReduce }));

/** Advances fake time in 50 ms steps, so the count gets frames in between. */
async function settle(ms = 1500) {
  for (let elapsed = 0; elapsed < ms; elapsed += 50) {
    await act(async () => {
      jest.advanceTimersByTime(50);
    });
  }
}

beforeEach(() => {
  mockReduce = false;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('CountUp', () => {
  it('starts at zero and ends on its value', async () => {
    await render(<CountUp value={14} />);
    expect(screen.getByText('0')).toBeTruthy();

    await settle();

    expect(screen.getByText('14')).toBeTruthy();
  });

  it('formats the number it shows', async () => {
    await render(<CountUp value={7} format={(days) => `${days} days`} />);
    await settle();

    expect(screen.getByText('7 days')).toBeTruthy();
  });

  it('counts on from the number it is showing when the value changes', async () => {
    const { rerender } = await render(<CountUp value={3} />);
    await settle();
    expect(screen.getByText('3')).toBeTruthy();

    await rerender(<CountUp value={5} />);
    await settle();

    expect(screen.getByText('5')).toBeTruthy();
  });

  it('shows the final value at once with reduce motion on', async () => {
    mockReduce = true;
    await render(<CountUp value={30} />);

    expect(screen.getByText('30')).toBeTruthy();
  });
});
