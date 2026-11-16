import { act, render, screen } from '@testing-library/react-native';

import { paletteFor } from '@/theme/palette';
import { ThemeProvider } from '@/theme/ThemeProvider';

import { ThemeFade } from './ThemeFade';

let mockReduce = false;
jest.mock('@/motion/useReduceMotion', () => ({ useReduceMotion: () => mockReduce }));

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  mockReduce = false;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ThemeFade', () => {
  it('draws no layer until the theme changes', async () => {
    await render(
      <ThemeProvider preference="dark">
        <ThemeFade />
      </ThemeProvider>,
    );

    expect(screen.queryByTestId('theme-fade-layer', { includeHiddenElements: true })).toBeNull();
  });

  it('fades a layer in the old background over 250 ms and then removes it', async () => {
    const view = await render(
      <ThemeProvider preference="dark">
        <ThemeFade />
      </ThemeProvider>,
    );

    await view.rerender(
      <ThemeProvider preference="light">
        <ThemeFade />
      </ThemeProvider>,
    );

    const layer = screen.getByTestId('theme-fade-layer', { includeHiddenElements: true });
    expect(layer.props.pointerEvents).toBe('none');
    expect(JSON.stringify(layer.props.style)).toContain(paletteFor('dark').background);

    await advance(200);
    expect(
      screen.queryByTestId('theme-fade-layer', { includeHiddenElements: true }),
    ).not.toBeNull();

    await advance(150);
    expect(screen.queryByTestId('theme-fade-layer', { includeHiddenElements: true })).toBeNull();
  });

  it('shortens the fade to 100 ms when reduce motion is on', async () => {
    mockReduce = true;
    const view = await render(
      <ThemeProvider preference="dark">
        <ThemeFade />
      </ThemeProvider>,
    );

    await view.rerender(
      <ThemeProvider preference="light">
        <ThemeFade />
      </ThemeProvider>,
    );
    expect(
      screen.queryByTestId('theme-fade-layer', { includeHiddenElements: true }),
    ).not.toBeNull();

    await advance(200);
    expect(screen.queryByTestId('theme-fade-layer', { includeHiddenElements: true })).toBeNull();
  });
});
