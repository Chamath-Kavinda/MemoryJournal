import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Flame } from 'lucide-react-native';
import { StyleSheet, Text as NativeText } from 'react-native';

import { claimLoop, releaseLoop, resetLoops } from '@/motion/loops';
import { MAX_LOOPS } from '@/theme/motion';

import { Breathe } from './Breathe';
import { Button } from './Button';
import { Chip } from './Chip';
import { FadeUp } from './FadeUp';
import { IconButton } from './IconButton';
import { PressableCard } from './PressableCard';
import { PressableScale } from './PressableScale';
import { Skeleton } from './Skeleton';

let mockReduce = false;
jest.mock('@/motion/useReduceMotion', () => ({ useReduceMotion: () => mockReduce }));

/** The static style plus whatever reanimated has applied so far, which jest keeps on the node. */
function styleOf(testID: string) {
  const node = screen.getByTestId(testID, { includeHiddenElements: true });
  const animated = (node.props.jestAnimatedStyle as { value?: object } | undefined)?.value ?? {};
  return { ...StyleSheet.flatten(node.props.style), ...animated } as Record<string, unknown>;
}

/** Nothing may move, scale or turn (v0.2.5): the style must never carry a transform at all. */
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
  resetLoops();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('loop budget', () => {
  it('hands out at most two loop slots', () => {
    expect(MAX_LOOPS).toBe(2);
    expect(claimLoop()).toBe(true);
    expect(claimLoop()).toBe(true);
    expect(claimLoop()).toBe(false);
  });

  it('hands a slot out again once one is released', () => {
    claimLoop();
    claimLoop();
    releaseLoop();
    expect(claimLoop()).toBe(true);
  });

  it('never goes below zero when released too often', () => {
    releaseLoop();
    releaseLoop();
    expect(claimLoop()).toBe(true);
    expect(claimLoop()).toBe(true);
    expect(claimLoop()).toBe(false);
  });
});

describe('PressableScale', () => {
  it('shows its children and calls onPress', async () => {
    const onPress = jest.fn();
    await render(
      <PressableScale accessibilityLabel="Open" onPress={onPress}>
        <NativeText>Inside</NativeText>
      </PressableScale>,
    );
    expect(screen.getByText('Inside')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled and says so to the screen reader', async () => {
    const onPress = jest.fn();
    await render(
      <PressableScale accessibilityLabel="Open" disabled onPress={onPress}>
        <NativeText>Inside</NativeText>
      </PressableScale>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Open' }));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Open' })).toBeDisabled();
  });

  it('dims a little while pressed, comes back on release and never scales', async () => {
    await render(
      <PressableScale testID="press" accessibilityLabel="Open" innerStyle={{ width: 40 }}>
        <NativeText>Inside</NativeText>
      </PressableScale>,
    );
    const button = screen.getByRole('button', { name: 'Open' });
    expect(styleOf('press-scale').opacity).toBe(1);
    expect(hasTransform('press-scale')).toBe(false);

    await fireEvent(button, 'pressIn');
    await settle(300);
    expect(styleOf('press-scale').opacity as number).toBeLessThan(1);
    expect(hasTransform('press-scale')).toBe(false);

    await fireEvent(button, 'pressOut');
    await settle(300);
    expect(styleOf('press-scale').opacity).toBeCloseTo(1, 2);
    expect(hasTransform('press-scale')).toBe(false);
  });

  it('still never scales with reduce motion on', async () => {
    mockReduce = true;
    await render(
      <PressableScale testID="press" accessibilityLabel="Open">
        <NativeText>Inside</NativeText>
      </PressableScale>,
    );
    await fireEvent(screen.getByRole('button', { name: 'Open' }), 'pressIn');
    await settle(300);
    expect(hasTransform('press-scale')).toBe(false);
  });

  it('gives a function child the press state, which is not pressed at rest', async () => {
    await render(
      <PressableScale accessibilityLabel="Open">
        {({ pressed }) => <NativeText>{pressed ? 'Held' : 'Idle'}</NativeText>}
      </PressableScale>,
    );
    expect(screen.getByText('Idle')).toBeTruthy();
    expect(screen.queryByText('Held')).toBeNull();
  });
});

describe('shared controls keep working on top of PressableScale', () => {
  it('Button still presses, blocks presses while loading and keeps its label', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} loading />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('Button calls onPress', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('IconButton calls onPress and keeps its label', async () => {
    const onPress = jest.fn();
    await render(<IconButton icon={Flame} accessibilityLabel="Streak" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Streak' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('Chip keeps its selected state', async () => {
    await render(<Chip label="People" selected onPress={() => {}} />);
    expect(screen.getByRole('button', { name: 'People' })).toBeSelected();
  });

  it('PressableCard shows its content and calls onPress', async () => {
    const onPress = jest.fn();
    await render(
      <PressableCard accessibilityLabel="Today" onPress={onPress}>
        <NativeText>Card body</NativeText>
      </PressableCard>,
    );
    expect(screen.getByText('Card body')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Today' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('FadeUp', () => {
  it('starts hidden and ends fully visible and in place', async () => {
    await render(
      <FadeUp testID="fade">
        <NativeText>Hello</NativeText>
      </FadeUp>,
    );
    expect(styleOf('fade').opacity).toBe(0);
    await settle(1000);
    expect(styleOf('fade').opacity).toBe(1);
    expect(hasTransform('fade')).toBe(false);
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('waits longer for later items in a list', async () => {
    await render(
      <>
        <FadeUp testID="first" index={0}>
          <NativeText>A</NativeText>
        </FadeUp>
        <FadeUp testID="third" index={3}>
          <NativeText>B</NativeText>
        </FadeUp>
      </>,
    );
    await settle(200);
    expect(styleOf('first').opacity as number).toBeGreaterThan(styleOf('third').opacity as number);
    await settle(1000);
    expect(styleOf('third').opacity).toBe(1);
  });

  it('is a plain 100 ms fade with reduce motion on, with no movement', async () => {
    mockReduce = true;
    await render(
      <FadeUp testID="fade" index={5}>
        <NativeText>Hello</NativeText>
      </FadeUp>,
    );
    await settle(150);
    expect(styleOf('fade').opacity).toBe(1);
    expect(hasTransform('fade')).toBe(false);
  });
});

describe('looping components', () => {
  it('render their children and rest at their normal look with reduce motion on', async () => {
    mockReduce = true;
    await render(
      <>
        <Breathe testID="breathe">
          <NativeText>Ring</NativeText>
        </Breathe>
        <Skeleton testID="skeleton" />
      </>,
    );
    await settle(3000);
    expect(screen.getByText('Ring')).toBeTruthy();
    expect(styleOf('breathe').opacity).toBe(1);
    expect(hasTransform('breathe')).toBe(false);
    expect(styleOf('skeleton').opacity).toBeCloseTo(0.45, 2);
  });

  it('keep a still look and release their slot when paused', async () => {
    await render(
      <Breathe testID="breathe" paused>
        <NativeText>Ring</NativeText>
      </Breathe>,
    );
    await settle(2000);
    expect(styleOf('breathe').opacity).toBe(1);
    // A paused component took no slot, so two other loops can still run.
    expect(claimLoop()).toBe(true);
    expect(claimLoop()).toBe(true);
  });

  it('take a slot while running and give it back on unmount', async () => {
    const { unmount } = await render(
      <Breathe testID="breathe">
        <NativeText>Ring</NativeText>
      </Breathe>,
    );
    expect(claimLoop()).toBe(true);
    expect(claimLoop()).toBe(false);
    releaseLoop();
    await unmount();
    expect(claimLoop()).toBe(true);
    expect(claimLoop()).toBe(true);
  });

  it('show a still block when both loop slots are already taken', async () => {
    claimLoop();
    claimLoop();
    await render(<Skeleton testID="skeleton" />);
    await settle(3000);
    expect(styleOf('skeleton').opacity).toBeCloseTo(0.45, 2);
  });
});
