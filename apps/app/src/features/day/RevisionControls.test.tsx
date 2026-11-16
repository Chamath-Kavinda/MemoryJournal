import { revisionOptions } from '@memory-journal/core';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { RevisionToggle } from './RevisionToggle';
import { SaveBar } from './SaveBar';

describe('RevisionToggle', () => {
  it('draws nothing for a day with a single pass', async () => {
    await render(
      <RevisionToggle options={revisionOptions(1)} selected="latest" onSelect={jest.fn()} />,
    );

    expect(screen.queryByLabelText('Revisions')).toBeNull();
  });

  it('offers Latest and every pass, and marks the selected one', async () => {
    await render(<RevisionToggle options={revisionOptions(3)} selected={2} onSelect={jest.fn()} />);

    expect(screen.getByLabelText('Latest')).toBeTruthy();
    expect(screen.getByLabelText('1st pass')).toBeTruthy();
    expect(screen.getByLabelText('3rd pass')).toBeTruthy();
    expect(screen.getByLabelText('2nd pass').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByLabelText('Latest').props.accessibilityState).toMatchObject({
      selected: false,
    });
  });

  it('has a sliding thumb behind the options', async () => {
    await render(
      <RevisionToggle options={revisionOptions(3)} selected="latest" onSelect={jest.fn()} />,
    );

    expect(screen.getByTestId('revision-thumb')).toBeTruthy();
  });

  it('reports the chosen pass', async () => {
    const onSelect = jest.fn();
    await render(
      <RevisionToggle options={revisionOptions(3)} selected="latest" onSelect={onSelect} />,
    );

    await fireEvent.press(screen.getByLabelText('1st pass'));
    expect(onSelect).toHaveBeenLastCalledWith(1);

    await fireEvent.press(screen.getByLabelText('Latest'));
    expect(onSelect).toHaveBeenLastCalledWith('latest');
  });
});

describe('SaveBar', () => {
  const base = {
    canSave: true,
    saving: false,
    failed: false,
    pendingSync: false,
    onSave: jest.fn(),
  };
  const hidden = { includeHiddenElements: true } as const;

  beforeEach(() => jest.clearAllMocks());

  it('saves when there is something new to save', async () => {
    await render(<SaveBar {...base} />);

    await fireEvent.press(screen.getByLabelText('Save'));

    expect(base.onSave).toHaveBeenCalledTimes(1);
  });

  it('is shown to screen readers when there is something to save', async () => {
    await render(<SaveBar {...base} />);

    expect(screen.getByTestId('save-bar').props.importantForAccessibility).toBe('auto');
  });

  it('slides away and hides from screen readers when everything is saved', async () => {
    await render(<SaveBar {...base} canSave={false} />);

    const bar = screen.getByTestId('save-bar', hidden);
    expect(bar.props.pointerEvents).toBe('none');
    expect(bar.props.importantForAccessibility).toBe('no-hide-descendants');
    expect(screen.getByLabelText('Save', hidden).props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it('is disabled while a save is waiting for the server', async () => {
    await render(<SaveBar {...base} saving />);

    expect(screen.getByLabelText('Save').props.accessibilityState).toMatchObject({
      disabled: true,
    });
    expect(screen.getByText('Saving…')).toBeTruthy();
  });

  it('allows saving again when the first save is safe on the device and waiting to sync', async () => {
    await render(<SaveBar {...base} saving pendingSync />);

    expect(screen.getByLabelText('Save').props.accessibilityState).toMatchObject({
      disabled: false,
    });
    expect(
      screen.getByText('Saved on this device. It will sync when you are online.'),
    ).toBeTruthy();
  });

  it('warns when a save failed and keeps Save available', async () => {
    await render(<SaveBar {...base} failed />);

    expect(screen.getByText('Could not save. Your text is still on this device.')).toBeTruthy();
    expect(screen.getByLabelText('Save').props.accessibilityState).toMatchObject({
      disabled: false,
    });
  });
});
