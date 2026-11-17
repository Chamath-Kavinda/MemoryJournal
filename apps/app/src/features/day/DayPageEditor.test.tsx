import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';

import { DayPageToolbar, useDayPageTools, type DayPageTools } from './DayPageEditor';

function fakeTools(overrides: Partial<DayPageTools> = {}): DayPageTools {
  return {
    handle: { current: null },
    sheet: null,
    now: new Date(2026, 10, 17, 21, 25),
    selected: '',
    openTime: jest.fn(),
    openTag: jest.fn(),
    close: jest.fn(),
    ...overrides,
  };
}

describe('DayPageToolbar', () => {
  it('opens the Add time sheet from the Clock button', async () => {
    const tools = fakeTools();
    await render(<DayPageToolbar tools={tools} canTag />);

    await fireEvent.press(screen.getByLabelText('Add time'));

    expect(tools.openTime).toHaveBeenCalledTimes(1);
    expect(tools.openTag).not.toHaveBeenCalled();
  });

  it('opens the Add tag sheet from the Tag button', async () => {
    const tools = fakeTools();
    await render(<DayPageToolbar tools={tools} canTag />);

    await fireEvent.press(screen.getByLabelText('Add tag'));

    expect(tools.openTag).toHaveBeenCalledTimes(1);
    expect(tools.openTime).not.toHaveBeenCalled();
  });

  it('does not open Add tag while the tags are not loaded', async () => {
    const tools = fakeTools();
    await render(<DayPageToolbar tools={tools} canTag={false} />);

    await fireEvent.press(screen.getByLabelText('Add tag'));

    expect(tools.openTag).not.toHaveBeenCalled();
  });
});

describe('useDayPageTools', () => {
  it('opens and closes one sheet at a time', async () => {
    const { result } = await renderHook(() => useDayPageTools());
    expect(result.current.sheet).toBeNull();

    await act(async () => result.current.openTime());
    expect(result.current.sheet).toBe('time');

    await act(async () => result.current.close());
    expect(result.current.sheet).toBeNull();

    await act(async () => result.current.openTag());
    expect(result.current.sheet).toBe('tag');
  });

  it('takes the selected text from the field when Add tag opens', async () => {
    const { result } = await renderHook(() => useDayPageTools());
    result.current.handle.current = {
      focus: jest.fn(),
      insertTag: jest.fn(),
      insertTime: jest.fn(),
      selectedText: () => 'Ravi',
    };

    await act(async () => result.current.openTag());

    expect(result.current.selected).toBe('Ravi');
  });

  it('starts the Add time sheet from the current device time each time it opens', async () => {
    const { result } = await renderHook(() => useDayPageTools());
    const before = result.current.now;

    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 17, 22, 5));
    await act(async () => result.current.openTime());
    jest.useRealTimers();

    expect(result.current.now.getTime()).toBeGreaterThan(before.getTime());
  });
});
