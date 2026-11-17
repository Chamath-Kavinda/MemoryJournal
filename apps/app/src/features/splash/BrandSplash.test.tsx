import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';

import { BrandSplash } from './BrandSplash';
import { useSplashGate } from './useSplashGate';

let mockReduce = false;
jest.mock('@/motion/useReduceMotion', () => ({ useReduceMotion: () => mockReduce }));

const mockHide = jest.fn();
jest.mock('./nativeSplash', () => ({
  hideNativeSplash: () => mockHide(),
  keepNativeSplash: () => {},
}));

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  mockReduce = false;
  mockHide.mockClear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('BrandSplash', () => {
  it('shows the app name and a loading bar, with no image', async () => {
    await render(<BrandSplash />);

    expect(screen.getByText('Memory Journal')).toBeTruthy();
    expect(screen.getByLabelText('Memory Journal, loading')).toBeTruthy();
    expect(screen.queryByRole('image')).toBeNull();
    expect(screen.queryByText('Loading')).toBeNull();
  });

  it('says Loading and keeps the bar still when reduce motion is on', async () => {
    mockReduce = true;
    await render(<BrandSplash />);

    expect(screen.getByText('Loading')).toBeTruthy();
  });

  it('hides the native splash once it has been laid out', async () => {
    await render(<BrandSplash />);
    expect(mockHide).not.toHaveBeenCalled();

    await fireEvent(screen.getByTestId('brand-splash'), 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 640 } },
    });

    expect(mockHide).toHaveBeenCalled();
  });

  it('stops taking touches while it fades out', async () => {
    await render(<BrandSplash fading />);

    expect(screen.getByTestId('brand-splash').props.pointerEvents).toBe('none');
  });
});

describe('useSplashGate', () => {
  it('stays at least 500 ms even when everything is ready at once', async () => {
    const { result } = await renderHook(() => useSplashGate(true));

    await advance(499);
    expect(result.current).toBe('showing');

    await advance(1);
    expect(result.current).toBe('fading');
  });

  it('fades for 200 ms and is then done', async () => {
    const { result } = await renderHook(() => useSplashGate(true));
    await advance(500);
    expect(result.current).toBe('fading');

    await advance(199);
    expect(result.current).toBe('fading');
    await advance(1);
    expect(result.current).toBe('done');
  });

  it('waits for the app to be ready, but never longer than 3 seconds', async () => {
    const { result } = await renderHook(() => useSplashGate(false));

    await advance(2999);
    expect(result.current).toBe('showing');

    await advance(1);
    expect(result.current).toBe('fading');
  });

  it('leaves 200 ms after the app becomes ready, once 500 ms have passed', async () => {
    const { result, rerender } = await renderHook(
      ({ ready }: { ready: boolean }) => useSplashGate(ready),
      { initialProps: { ready: false } },
    );
    await advance(1200);
    expect(result.current).toBe('showing');

    await rerender({ ready: true });
    expect(result.current).toBe('fading');
  });
});
