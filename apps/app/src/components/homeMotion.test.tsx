import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text as NativeText } from 'react-native';

import { ErrorCard } from './ErrorCard';
import { FadeSwap } from './FadeSwap';
import { GlowFlash } from './GlowFlash';

let mockReduce = false;
jest.mock('@/motion/useReduceMotion', () => ({ useReduceMotion: () => mockReduce }));

/** The static style plus whatever reanimated has applied so far, which jest keeps on the node. */
function styleOf(testID: string) {
  const node = screen.getByTestId(testID, { includeHiddenElements: true });
  const animated = (node.props.jestAnimatedStyle as { value?: object } | undefined)?.value ?? {};
  return { ...StyleSheet.flatten(node.props.style), ...animated } as Record<string, unknown>;
}

/** Nothing may move (v0.2.5): the style must never carry a transform at all. */
function hasTransform(testID: string): boolean {
  const transform = styleOf(testID).transform as unknown[] | undefined;
  return Array.isArray(transform) && transform.length > 0;
}

/** Advances fake time in 50 ms steps, so animations that chain get frames in between. */
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

describe('FadeSwap', () => {
  const child = <NativeText>Grid</NativeText>;

  it('is fully visible and in place the first time it is shown', async () => {
    await render(
      <FadeSwap testID="swap" swapKey="2026-11">
        {child}
      </FadeSwap>,
    );

    expect(styleOf('swap').opacity).toBe(1);
    expect(hasTransform('swap')).toBe(false);
  });

  it('cross-fades when the key changes and never moves', async () => {
    const { rerender } = await render(
      <FadeSwap testID="swap" swapKey="2026-11">
        {child}
      </FadeSwap>,
    );
    await rerender(
      <FadeSwap testID="swap" swapKey="2026-12">
        {child}
      </FadeSwap>,
    );
    await settle(50);

    expect(styleOf('swap').opacity as number).toBeLessThan(1);
    expect(hasTransform('swap')).toBe(false);

    await settle(500);
    expect(styleOf('swap').opacity).toBe(1);
    expect(hasTransform('swap')).toBe(false);
  });

  it('behaves the same going back a month: a fade with no sideways movement', async () => {
    const { rerender } = await render(
      <FadeSwap testID="swap" swapKey="2026-11">
        {child}
      </FadeSwap>,
    );
    await rerender(
      <FadeSwap testID="swap" swapKey="2026-10">
        {child}
      </FadeSwap>,
    );
    await settle(50);

    expect(hasTransform('swap')).toBe(false);
  });

  it('ends fully visible with reduce motion on', async () => {
    mockReduce = true;
    const { rerender } = await render(
      <FadeSwap testID="swap" swapKey="2026-11">
        {child}
      </FadeSwap>,
    );
    await rerender(
      <FadeSwap testID="swap" swapKey="2026-12">
        {child}
      </FadeSwap>,
    );
    await settle(300);

    expect(styleOf('swap').opacity).toBe(1);
    expect(hasTransform('swap')).toBe(false);
  });
});

describe('GlowFlash', () => {
  it('is dark at rest, lights up on a trigger and fades out again', async () => {
    const { rerender } = await render(
      <GlowFlash testID="flash" trigger={0} color="#A78BFA" scheme="dark" />,
    );
    expect(styleOf('flash').opacity).toBe(0);

    await rerender(<GlowFlash testID="flash" trigger={1} color="#A78BFA" scheme="dark" />);
    await settle(150);
    expect(styleOf('flash').opacity as number).toBeGreaterThan(0.5);

    await settle(1500);
    expect(styleOf('flash').opacity).toBeCloseTo(0, 2);
  });

  it('stays dark with reduce motion on', async () => {
    mockReduce = true;
    const { rerender } = await render(
      <GlowFlash testID="flash" trigger={0} color="#A78BFA" scheme="dark" />,
    );
    await rerender(<GlowFlash testID="flash" trigger={1} color="#A78BFA" scheme="dark" />);
    await settle(300);

    expect(styleOf('flash').opacity).toBe(0);
  });
});

describe('ErrorCard', () => {
  it('shows the message as an alert', async () => {
    await render(<ErrorCard testID="error" message="Could not load this month." />);

    // The alert role sits on a plain wrapper, so the Retry button inside stays reachable.
    expect(screen.getByTestId('error')).toHaveProp('accessibilityRole', 'alert');
    expect(screen.getByText('Could not load this month.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('offers Retry and calls it when pressed', async () => {
    const onRetry = jest.fn();
    await render(<ErrorCard message="Could not load this month." onRetry={onRetry} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
