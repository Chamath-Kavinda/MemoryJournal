import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { ProgressBar } from './ProgressBar';
import { ScoreRing } from './ScoreRing';
import { TrendLine, trendPoints } from './TrendLine';

let mockReduce = false;
jest.mock('@/motion/useReduceMotion', () => ({ useReduceMotion: () => mockReduce }));

/** The static style plus whatever reanimated has applied so far, which jest keeps on the node. */
function styleOf(testID: string) {
  const node = screen.getByTestId(testID, { includeHiddenElements: true });
  const animated = (node.props.jestAnimatedStyle as { value?: object } | undefined)?.value ?? {};
  return { ...StyleSheet.flatten(node.props.style), ...animated } as Record<string, unknown>;
}

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

describe('ProgressBar', () => {
  it('describes its value as a progress bar', async () => {
    await render(<ProgressBar progress={0.4} accessibilityLabel="Lessons done" testID="bar" />);

    const bar = screen.getByLabelText('Lessons done');
    expect(bar.props.accessibilityRole).toBe('progressbar');
    expect(bar.props.accessibilityValue).toMatchObject({ min: 0, max: 100, now: 40 });
  });

  it('fills to its width over time', async () => {
    await render(<ProgressBar progress={0.5} accessibilityLabel="Done" testID="bar" />);
    expect(styleOf('bar-fill').width).toBe('0%');

    await settle(600);

    expect(styleOf('bar-fill').width).toBe('50%');
  });

  it('with reduce motion is full width at once', async () => {
    mockReduce = true;
    await render(<ProgressBar progress={0.5} accessibilityLabel="Done" testID="bar" />);

    expect(styleOf('bar-fill').width).toBe('50%');
  });

  it('clamps values outside 0 to 1', async () => {
    mockReduce = true;
    const view = await render(<ProgressBar progress={3} accessibilityLabel="Done" testID="bar" />);
    expect(screen.getByLabelText('Done').props.accessibilityValue).toMatchObject({ now: 100 });

    await view.rerender(<ProgressBar progress={-1} accessibilityLabel="Done" testID="bar" />);
    expect(screen.getByLabelText('Done').props.accessibilityValue).toMatchObject({ now: 0 });
  });
});

describe('ScoreRing', () => {
  it('names the score for screen readers', async () => {
    await render(<ScoreRing score={72} testID="ring" />);

    expect(screen.getByLabelText('Recall score 72 out of 100')).toBeTruthy();
    expect(screen.getByText('out of 100')).toBeTruthy();
  });

  it('counts the number up to the score', async () => {
    await render(<ScoreRing score={72} testID="ring" />);
    expect(screen.getByText('0')).toBeTruthy();

    await settle(1500);

    expect(screen.getByText('72')).toBeTruthy();
  });

  it('with reduce motion shows the final number at once', async () => {
    mockReduce = true;
    await render(<ScoreRing score={72} testID="ring" />);

    expect(screen.getByText('72')).toBeTruthy();
  });

  it('keeps an out of range score inside 0 to 100', async () => {
    mockReduce = true;
    await render(<ScoreRing score={140} testID="ring" />);

    expect(screen.getByLabelText('Recall score 100 out of 100')).toBeTruthy();
  });
});

describe('trendPoints', () => {
  it('skips days without a score and spreads the rest across the width', () => {
    const points = trendPoints([0, null, 100], 116);

    expect(points).toHaveLength(2);
    // Padding of 8 on each side leaves 100 points of width.
    expect(points[0]?.x).toBe(8);
    expect(points[1]?.x).toBe(108);
    // A higher score sits higher, which is a smaller y.
    expect((points[1]?.y ?? 0) < (points[0]?.y ?? 0)).toBe(true);
  });

  it('returns nothing when no day has a score', () => {
    expect(trendPoints([null, null], 300)).toEqual([]);
  });

  it('puts a single point in the middle', () => {
    expect(trendPoints([50], 116)[0]?.x).toBe(58);
  });
});

describe('TrendLine', () => {
  const scores = [10, null, 40, 70];

  const layout = (testID: string) =>
    fireEvent(screen.getByTestId(testID), 'layout', {
      nativeEvent: { layout: { width: 300, height: 112 } },
    });

  it('names the trend for screen readers', async () => {
    await render(<TrendLine scores={scores} accessibilityLabel="Trend summary" testID="trend" />);

    expect(screen.getByLabelText('Trend summary')).toBeTruthy();
  });

  it('draws the line once it knows its width', async () => {
    await render(<TrendLine scores={scores} accessibilityLabel="Trend summary" testID="trend" />);
    expect(screen.queryByTestId('trend-line', { includeHiddenElements: true })).toBeNull();

    await layout('trend');

    expect(screen.getByTestId('trend-line', { includeHiddenElements: true })).toBeTruthy();
  });

  it('draws no line when fewer than two days have a score', async () => {
    await render(
      <TrendLine scores={[null, 50]} accessibilityLabel="Trend summary" testID="trend" />,
    );
    await layout('trend');

    expect(screen.queryByTestId('trend-line', { includeHiddenElements: true })).toBeNull();
  });

  it('renders with reduce motion on', async () => {
    mockReduce = true;
    await render(<TrendLine scores={scores} accessibilityLabel="Trend summary" testID="trend" />);
    await layout('trend');

    expect(screen.getByTestId('trend-line', { includeHiddenElements: true })).toBeTruthy();
  });
});
