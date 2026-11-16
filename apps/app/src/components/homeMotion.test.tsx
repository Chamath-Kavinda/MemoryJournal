import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text as NativeText } from 'react-native';

import { ErrorCard } from './ErrorCard';
import { GlowFlash } from './GlowFlash';
import { Ripple } from './Ripple';
import { SlideSwap } from './SlideSwap';

let mockReduce = false;
jest.mock('@/motion/useReduceMotion', () => ({ useReduceMotion: () => mockReduce }));

/** The static style plus whatever reanimated has applied so far, which jest keeps on the node. */
function styleOf(testID: string) {
  const node = screen.getByTestId(testID, { includeHiddenElements: true });
  const animated = (node.props.jestAnimatedStyle as { value?: object } | undefined)?.value ?? {};
  return { ...StyleSheet.flatten(node.props.style), ...animated } as Record<string, unknown>;
}

function translateXOf(testID: string): number {
  const transform = styleOf(testID).transform as { translateX?: number }[] | undefined;
  return transform?.find((t) => t.translateX !== undefined)?.translateX ?? 0;
}

function scaleOf(testID: string): number {
  const transform = styleOf(testID).transform as { scale?: number }[] | undefined;
  return transform?.find((t) => t.scale !== undefined)?.scale ?? 1;
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

describe('SlideSwap', () => {
  const child = <NativeText>Grid</NativeText>;

  it('rests in place the first time it is shown', async () => {
    await render(
      <SlideSwap testID="swap" swapKey="2026-11" direction={1}>
        {child}
      </SlideSwap>,
    );

    expect(styleOf('swap').opacity).toBe(1);
    expect(translateXOf('swap')).toBe(0);
  });

  it('starts off to the side when the key changes and ends back in place', async () => {
    const { rerender } = await render(
      <SlideSwap testID="swap" swapKey="2026-11" direction={1}>
        {child}
      </SlideSwap>,
    );
    await rerender(
      <SlideSwap testID="swap" swapKey="2026-12" direction={1}>
        {child}
      </SlideSwap>,
    );
    await settle(50);

    // Going forward the new content comes in from the right, so it starts at a positive offset.
    expect(translateXOf('swap')).toBeGreaterThan(0);

    await settle(1000);
    expect(translateXOf('swap')).toBeCloseTo(0, 2);
    expect(styleOf('swap').opacity).toBe(1);
  });

  it('comes in from the left when going back', async () => {
    const { rerender } = await render(
      <SlideSwap testID="swap" swapKey="2026-11" direction={-1}>
        {child}
      </SlideSwap>,
    );
    await rerender(
      <SlideSwap testID="swap" swapKey="2026-10" direction={-1}>
        {child}
      </SlideSwap>,
    );
    await settle(50);

    expect(translateXOf('swap')).toBeLessThan(0);
  });

  it('is a plain fade with no sideways movement with reduce motion on', async () => {
    mockReduce = true;
    const { rerender } = await render(
      <SlideSwap testID="swap" swapKey="2026-11" direction={1}>
        {child}
      </SlideSwap>,
    );
    await rerender(
      <SlideSwap testID="swap" swapKey="2026-12" direction={1}>
        {child}
      </SlideSwap>,
    );
    await settle(50);
    expect(translateXOf('swap')).toBe(0);

    await settle(300);
    expect(styleOf('swap').opacity).toBe(1);
  });
});

describe('Ripple', () => {
  it('is invisible until it is triggered, then spreads out and fades away', async () => {
    const { rerender } = await render(<Ripple testID="ripple" trigger={0} color="#000000" />);
    expect(styleOf('ripple').opacity).toBeCloseTo(0, 2);

    await rerender(<Ripple testID="ripple" trigger={1} color="#000000" />);
    await settle(100);
    expect(styleOf('ripple').opacity as number).toBeGreaterThan(0);

    await settle(1000);
    expect(styleOf('ripple').opacity).toBeCloseTo(0, 2);
    expect(scaleOf('ripple')).toBeGreaterThan(1);
  });

  it('does nothing with reduce motion on', async () => {
    mockReduce = true;
    const { rerender } = await render(<Ripple testID="ripple" trigger={0} color="#000000" />);
    await rerender(<Ripple testID="ripple" trigger={1} color="#000000" />);
    await settle(100);

    expect(styleOf('ripple').opacity).toBeCloseTo(0, 2);
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
