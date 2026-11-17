import { fireEvent, render, screen } from '@testing-library/react-native';

import { HighlightSwitch } from './HighlightSwitch';

describe('HighlightSwitch', () => {
  it('reports the new value when switched', async () => {
    const onChange = jest.fn();
    await render(
      <HighlightSwitch value={false} onChange={onChange} disabled={false} readOnlyNote={false} />,
    );

    await fireEvent.press(screen.getByLabelText('Highlight additions'));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('explains why it is off for the first pass', async () => {
    await render(
      <HighlightSwitch value={true} onChange={jest.fn()} disabled readOnlyNote={false} />,
    );

    expect(screen.getByText('The first pass has nothing earlier to compare with.')).toBeTruthy();
    expect(screen.getByLabelText('Highlight additions').props.accessibilityState).toMatchObject({
      checked: false,
      disabled: true,
    });
  });

  it('tells the writer that the highlighted view is read-only', async () => {
    await render(<HighlightSwitch value onChange={jest.fn()} disabled={false} readOnlyNote />);

    expect(screen.getByText('Showing the saved pass. Switch off to keep writing.')).toBeTruthy();
  });

  it('shows no hint when it is off or when the pass is not editable', async () => {
    await render(
      <HighlightSwitch value={false} onChange={jest.fn()} disabled={false} readOnlyNote />,
    );

    expect(screen.queryByText(/Switch off/)).toBeNull();
    expect(screen.queryByText(/nothing earlier/)).toBeNull();
  });
});
