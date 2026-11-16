import { Film, BookOpen, Tag } from 'lucide-react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text as NativeText } from 'react-native';

import { EmptyState } from './EmptyState';
import { Removable } from './Removable';
import { SearchField } from './SearchField';
import { SegmentedControl, type Segment } from './SegmentedControl';

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

type Kind = 'movie' | 'book';
const segments: readonly Segment<Kind>[] = [
  { value: 'movie', label: 'Movies', icon: Film },
  { value: 'book', label: 'Books', icon: BookOpen },
];

/** The track only knows its width after layout, so tests give it one. */
async function layoutTrack(testID: string, width = 300) {
  await fireEvent(screen.getByTestId(testID), 'layout', {
    nativeEvent: { layout: { width, height: 48 } },
  });
}

describe('SegmentedControl', () => {
  it('exposes a tab per segment and marks the selected one', async () => {
    await render(
      <SegmentedControl
        testID="seg"
        accessibilityLabel="Library type"
        segments={segments}
        value="book"
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('Library type').props.accessibilityRole).toBe('tablist');
    expect(screen.getByLabelText('Movies').props.accessibilityState).toMatchObject({
      selected: false,
    });
    expect(screen.getByLabelText('Books').props.accessibilityState).toMatchObject({
      selected: true,
    });
  });

  it('reports the segment that was pressed', async () => {
    const onChange = jest.fn();
    await render(
      <SegmentedControl
        accessibilityLabel="Library type"
        segments={segments}
        value="movie"
        onChange={onChange}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Books'));

    expect(onChange).toHaveBeenCalledWith('book');
  });

  it('slides the thumb to the second segment with the spring', async () => {
    const view = await render(
      <SegmentedControl
        testID="seg"
        accessibilityLabel="Library type"
        segments={segments}
        value="movie"
        onChange={jest.fn()}
      />,
    );
    await layoutTrack('seg');
    expect(transformOf('seg-thumb', 'translateX')).toBe(0);

    await view.rerender(
      <SegmentedControl
        testID="seg"
        accessibilityLabel="Library type"
        segments={segments}
        value="book"
        onChange={jest.fn()}
      />,
    );
    await settle(3000);

    // Track 300 wide, minus the border and inset on both sides, split in two: 146 per segment.
    // The spring may still be settling around it, so allow its small overshoot.
    const x = transformOf('seg-thumb', 'translateX') as number;
    expect(x).toBeGreaterThan(140);
    expect(x).toBeLessThan(160);
  });

  it('with reduce motion the thumb jumps to the new segment and fades back in', async () => {
    mockReduce = true;
    const view = await render(
      <SegmentedControl
        testID="seg"
        accessibilityLabel="Library type"
        segments={segments}
        value="movie"
        onChange={jest.fn()}
      />,
    );
    await layoutTrack('seg');

    await view.rerender(
      <SegmentedControl
        testID="seg"
        accessibilityLabel="Library type"
        segments={segments}
        value="book"
        onChange={jest.fn()}
      />,
    );
    await settle(300);

    expect(transformOf('seg-thumb', 'translateX') as number).toBeCloseTo(146, 0);
    expect(styleOf('seg-thumb').opacity).toBe(1);
  });
});

describe('SearchField', () => {
  const renderField = (value: string, onChangeText = jest.fn()) =>
    render(
      <SearchField
        testID="search"
        value={value}
        onChangeText={onChangeText}
        placeholder="Search by name"
        accessibilityLabel="Search tags"
      />,
    );

  it('reports typed text', async () => {
    const onChangeText = jest.fn();
    await renderField('', onChangeText);

    await fireEvent.changeText(screen.getByLabelText('Search tags'), 'rav');

    expect(onChangeText).toHaveBeenCalledWith('rav');
  });

  it('shows the clear button only once there is text, and clears with it', async () => {
    const onChangeText = jest.fn();
    const view = await renderField('', onChangeText);
    expect(screen.queryByLabelText('Clear search')).toBeNull();

    await view.rerender(
      <SearchField
        testID="search"
        value="rav"
        onChangeText={onChangeText}
        placeholder="Search by name"
        accessibilityLabel="Search tags"
      />,
    );
    await fireEvent.press(screen.getByLabelText('Clear search'));

    expect(onChangeText).toHaveBeenCalledWith('');
  });

  it('fades the gradient border in on focus and out on blur', async () => {
    await renderField('');
    expect(styleOf('search-border').opacity).toBe(0);

    await fireEvent(screen.getByLabelText('Search tags'), 'focus');
    await settle(600);
    expect(styleOf('search-border').opacity).toBe(1);

    await fireEvent(screen.getByLabelText('Search tags'), 'blur');
    await settle(600);
    expect(styleOf('search-border').opacity).toBe(0);
  });

  it('with reduce motion the border still ends focused, after the 100 ms fade', async () => {
    mockReduce = true;
    await renderField('');

    await fireEvent(screen.getByLabelText('Search tags'), 'focus');
    await settle(200);

    expect(styleOf('search-border').opacity).toBe(1);
  });
});

describe('EmptyState', () => {
  it('shows the message and runs the primary action', async () => {
    const onAction = jest.fn();
    await render(
      <EmptyState
        icon={Tag}
        message="No tags yet."
        actionLabel="New tag"
        onAction={onAction}
        testID="empty"
      />,
    );

    expect(screen.getByText('No tags yet.')).toBeTruthy();
    await fireEvent.press(screen.getByText('New tag'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('has no button when there is no action to offer', async () => {
    await render(<EmptyState icon={Tag} message="Nothing here." testID="empty" />);

    expect(screen.getByText('Nothing here.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders with reduce motion on, so nothing floats', async () => {
    mockReduce = true;
    await render(
      <EmptyState icon={Tag} message="No tags yet." actionLabel="New tag" onAction={jest.fn()} />,
    );

    expect(screen.getByText('No tags yet.')).toBeTruthy();
    expect(screen.getByText('New tag')).toBeTruthy();
  });
});

describe('Removable', () => {
  it('renders its children', async () => {
    await render(
      <Removable testID="row">
        <NativeText>a card</NativeText>
      </Removable>,
    );

    expect(screen.getByText('a card')).toBeTruthy();
  });

  it('renders its children with reduce motion on', async () => {
    mockReduce = true;
    await render(
      <Removable testID="row">
        <NativeText>a card</NativeText>
      </Removable>,
    );

    expect(screen.getByText('a card')).toBeTruthy();
  });

  it('keeps the remaining items when one is removed', async () => {
    const view = await render(
      <>
        <Removable key="a">
          <NativeText>first</NativeText>
        </Removable>
        <Removable key="b">
          <NativeText>second</NativeText>
        </Removable>
      </>,
    );

    await view.rerender(
      <>
        <Removable key="b">
          <NativeText>second</NativeText>
        </Removable>
      </>,
    );
    await settle(400);

    expect(screen.getByText('second')).toBeTruthy();
  });
});
