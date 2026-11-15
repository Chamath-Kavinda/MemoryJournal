import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Flame } from 'lucide-react-native';
import { StyleSheet, Text as NativeText } from 'react-native';

import { claimLoop, releaseLoop, resetLoops } from '@/motion/loops';
import { MAX_LOOPS } from '@/theme/motion';

import { Breathe } from './Breathe';
import { Button } from './Button';
import { Chip } from './Chip';
import { FadeUp } from './FadeUp';
import { Float } from './Float';
import { IconButton } from './IconButton';
import { Pop } from './Pop';
import { PressableCard } from './PressableCard';
import { PressableScale } from './PressableScale';
import { Shake } from './Shake';
import { Skeleton } from './Skeleton';

let mockReduce = false;
jest.mock('@/motion/useReduceMotion', () => ({ useReduceMotion: () => mockReduce }));

/** The static style plus whatever reanimated has applied so far, which jest keeps on the node. */
function styleOf(testID: string) {
  const node = screen.getByTestId(testID, { includeHiddenElements: true });
  const animated = (node.props.jestAnimatedStyle as { value?: object } | undefined)?.value ?? {};
  return { ...StyleSheet.flatten(node.props.style), ...animated } as Record<string, unknown>;
}

function scaleOf(testID: string): number {
  const transform = styleOf(testID).transform as { scale?: number }[] | undefined;
  return transform?.find((t) => t.scale !== undefined)?.scale ?? 1;
}

/** Advances fake time in 50 ms steps, so animations that chain (springs) get frames in between. */
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

  it('scales to 0.97 while pressed and springs back to 1 on release', async () => {
    await render(
      <PressableScale testID="press" accessibilityLabel="Open" innerStyle={{ width: 40 }}>
        <NativeText>Inside</NativeText>
      </PressableScale>,
    );
    const button = screen.getByRole('button', { name: 'Open' });
    expect(scaleOf('press-scale')).toBe(1);
    await fireEvent(button, 'pressIn');
    await settle(300);
    expect(scaleOf('press-scale')).toBeCloseTo(0.97, 2);
    await fireEvent(button, 'pressOut');
    await settle(1500);
    expect(scaleOf('press-scale')).toBeCloseTo(1, 2);
  });

  it('does not scale with reduce motion on', async () => {
    mockReduce = true;
    await render(
      <PressableScale testID="press" accessibilityLabel="Open">
        <NativeText>Inside</NativeText>
      </PressableScale>,
    );
    await fireEvent(screen.getByRole('button', { name: 'Open' }), 'pressIn');
    await settle(300);
    expect(scaleOf('press-scale')).toBe(1);
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
    const transform = styleOf('fade').transform as { translateY?: number }[] | undefined;
    expect(transform?.find((t) => t.translateY !== undefined)?.translateY ?? 0).toBe(0);
  });
});

describe('Pop', () => {
  it('grows past 1 on a pop and comes back to rest at 1', async () => {
    const { rerender } = await render(
      <Pop testID="pop" trigger={false}>
        <NativeText>Done</NativeText>
      </Pop>,
    );
    expect(scaleOf('pop')).toBe(1);
    await rerender(
      <Pop testID="pop" trigger>
        <NativeText>Done</NativeText>
      </Pop>,
    );
    let peak = 1;
    for (let step = 0; step < 100; step += 1) {
      await settle(50);
      peak = Math.max(peak, scaleOf('pop'));
    }
    expect(peak).toBeGreaterThan(1.1);
    expect(scaleOf('pop')).toBeCloseTo(1, 2);
  });

  it('does not move with reduce motion on', async () => {
    mockReduce = true;
    const { rerender } = await render(
      <Pop testID="pop" trigger={1}>
        <NativeText>Done</NativeText>
      </Pop>,
    );
    await rerender(
      <Pop testID="pop" trigger={2}>
        <NativeText>Done</NativeText>
      </Pop>,
    );
    await settle(300);
    expect(scaleOf('pop')).toBe(1);
  });
});

describe('Shake', () => {
  it('rests in place before and after a shake', async () => {
    const { rerender } = await render(
      <Shake testID="shake" trigger={0}>
        <NativeText>Oops</NativeText>
      </Shake>,
    );
    const offset = () =>
      (styleOf('shake').transform as { translateX?: number }[] | undefined)?.find(
        (t) => t.translateX !== undefined,
      )?.translateX ?? 0;
    expect(offset()).toBe(0);
    await rerender(
      <Shake testID="shake" trigger={1}>
        <NativeText>Oops</NativeText>
      </Shake>,
    );
    await settle(1000);
    expect(offset()).toBeCloseTo(0, 2);
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
        <Float testID="float">
          <NativeText>Icon</NativeText>
        </Float>
        <Skeleton testID="skeleton" />
      </>,
    );
    await settle(3000);
    expect(screen.getByText('Ring')).toBeTruthy();
    expect(screen.getByText('Icon')).toBeTruthy();
    expect(styleOf('breathe').opacity).toBe(1);
    expect(scaleOf('breathe')).toBe(1);
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
      <Float testID="float">
        <NativeText>Icon</NativeText>
      </Float>,
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
