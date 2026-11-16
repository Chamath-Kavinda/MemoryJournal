import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text as NativeText } from 'react-native';

import { SNACKBAR_DURATION, Snackbar } from './Snackbar';
import { DrawCheck } from './DrawCheck';
import { Reflow } from './Reflow';
import { Reveal } from './Reveal';
import { Rotate } from './Rotate';
import { Toggle } from './Toggle';

let mockReduce = false;
jest.mock('@/motion/useReduceMotion', () => ({ useReduceMotion: () => mockReduce }));

/** The static style plus whatever reanimated has applied so far, which jest keeps on the node. */
function styleOf(testID: string) {
  const node = screen.getByTestId(testID, { includeHiddenElements: true });
  const animated = (node.props.jestAnimatedStyle as { value?: object } | undefined)?.value ?? {};
  return { ...StyleSheet.flatten(node.props.style), ...animated } as Record<string, unknown>;
}

function transformOf(testID: string, key: string): unknown {
  const transform = styleOf(testID).transform as Record<string, unknown>[] | undefined;
  return transform?.find((t) => t[key] !== undefined)?.[key];
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
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('Toggle', () => {
  it('reports the opposite value when pressed', async () => {
    const onValueChange = jest.fn();
    await render(
      <Toggle value={false} onValueChange={onValueChange} accessibilityLabel="Notify" />,
    );

    await fireEvent.press(screen.getByLabelText('Notify'));

    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('exposes its state as a switch', async () => {
    await render(<Toggle value onValueChange={jest.fn()} accessibilityLabel="Notify" />);

    const node = screen.getByLabelText('Notify');
    expect(node.props.accessibilityRole).toBe('switch');
    expect(node.props.accessibilityState).toMatchObject({ checked: true });
  });

  it('does nothing when disabled', async () => {
    const onValueChange = jest.fn();
    await render(
      <Toggle value={false} disabled onValueChange={onValueChange} accessibilityLabel="Notify" />,
    );

    await fireEvent.press(screen.getByLabelText('Notify'));

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('slides the thumb to the right end when it turns on', async () => {
    const view = await render(
      <Toggle value={false} onValueChange={jest.fn()} accessibilityLabel="Notify" testID="t" />,
    );
    expect(transformOf('t-thumb', 'translateX')).toBe(0);

    await view.rerender(
      <Toggle value onValueChange={jest.fn()} accessibilityLabel="Notify" testID="t" />,
    );
    await settle();

    expect(transformOf('t-thumb', 'translateX') as number).toBeGreaterThan(15);
  });

  it('with reduce motion the thumb does not slide but still ends on the right side', async () => {
    mockReduce = true;
    await render(<Toggle value onValueChange={jest.fn()} accessibilityLabel="Notify" testID="t" />);
    await settle(300);

    expect(transformOf('t-thumb', 'translateX')).toBe(0);
    expect(styleOf('t-thumb').left as number).toBeGreaterThan(15);
  });
});

describe('Rotate', () => {
  it('rests at 0 degrees and turns to 180 when turned', async () => {
    const view = await render(
      <Rotate turned={false} testID="r">
        <NativeText>chevron</NativeText>
      </Rotate>,
    );
    expect(transformOf('r', 'rotate')).toBe('0deg');

    await view.rerender(
      <Rotate turned testID="r">
        <NativeText>chevron</NativeText>
      </Rotate>,
    );
    await settle(600);

    expect(transformOf('r', 'rotate')).toBe('180deg');
  });

  it('with reduce motion jumps straight to the final angle', async () => {
    mockReduce = true;
    await render(
      <Rotate turned testID="r">
        <NativeText>chevron</NativeText>
      </Rotate>,
    );

    expect(transformOf('r', 'rotate')).toBe('180deg');
  });
});

describe('DrawCheck', () => {
  it('is decoration, hidden from screen readers', async () => {
    await render(<DrawCheck color="#0f0" testID="check" />);

    const node = screen.getByTestId('check', { includeHiddenElements: true });
    expect(node.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('renders with reduce motion too', async () => {
    mockReduce = true;
    await render(<DrawCheck color="#0f0" testID="check" />);

    expect(screen.getByTestId('check', { includeHiddenElements: true })).toBeTruthy();
  });
});

describe('Reflow and Reveal', () => {
  it('render their children', async () => {
    await render(
      <Reflow>
        <Reveal>
          <NativeText>inside the row</NativeText>
        </Reveal>
      </Reflow>,
    );

    expect(screen.getByText('inside the row')).toBeTruthy();
  });

  it('render their children with reduce motion on', async () => {
    mockReduce = true;
    await render(
      <Reflow>
        <Reveal>
          <NativeText>inside the row</NativeText>
        </Reveal>
      </Reflow>,
    );

    expect(screen.getByText('inside the row')).toBeTruthy();
  });
});

describe('Snackbar', () => {
  it('shows nothing without a message', async () => {
    await render(<Snackbar message={null} id={0} onDismiss={jest.fn()} />);

    expect(screen.queryByTestId('snackbar')).toBeNull();
  });

  it('shows the message as a polite alert', async () => {
    await render(<Snackbar message="Saved" id={1} onDismiss={jest.fn()} />);

    expect(screen.getByText('Saved')).toBeTruthy();
    const node = screen.getByTestId('snackbar');
    expect(node.props.accessibilityRole).toBe('alert');
    expect(node.props.accessibilityLiveRegion).toBe('polite');
  });

  it('asks to be dismissed after its duration, and not before', async () => {
    const onDismiss = jest.fn();
    await render(<Snackbar message="Saved" id={1} onDismiss={onDismiss} />);

    await act(async () => {
      jest.advanceTimersByTime(SNACKBAR_DURATION - 100);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('restarts the timer when the same words are shown again', async () => {
    const onDismiss = jest.fn();
    const view = await render(<Snackbar message="Saved" id={1} onDismiss={onDismiss} />);

    await act(async () => {
      jest.advanceTimersByTime(SNACKBAR_DURATION - 500);
    });
    await view.rerender(<Snackbar message="Saved" id={2} onDismiss={onDismiss} />);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('works with reduce motion on', async () => {
    mockReduce = true;
    await render(<Snackbar message="Saved" id={1} onDismiss={jest.fn()} />);

    expect(screen.getByText('Saved')).toBeTruthy();
  });
});
