import { fireEvent, render, screen } from '@testing-library/react-native';

import { DatePickerModal } from './DatePickerModal';

const onPick = jest.fn();
const onClose = jest.fn();

function renderPicker(value = '', visible = true) {
  return render(
    <DatePickerModal
      visible={visible}
      value={value}
      todayId="2026-11-17"
      title="Pick date watched"
      onPick={onPick}
      onClose={onClose}
    />,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('DatePickerModal', () => {
  it('renders nothing while it is closed', async () => {
    await renderPicker('', false);

    expect(screen.queryByText('November 2026')).toBeNull();
  });

  it("opens on today's month when the input is empty", async () => {
    await renderPicker();

    expect(screen.getByText('November 2026')).toBeTruthy();
  });

  it('opens on the month of a valid typed date and marks that date', async () => {
    await renderPicker('2026-09-05');

    expect(screen.getByText('September 2026')).toBeTruthy();
    expect(screen.getByLabelText('5 September 2026, selected')).toBeTruthy();
  });

  it('falls back to the current month for an invalid typed date', async () => {
    await renderPicker('not a date');

    expect(screen.getByText('November 2026')).toBeTruthy();
  });

  it('returns the day id of the tapped date', async () => {
    await renderPicker();

    await fireEvent.press(screen.getByLabelText('10 November 2026'));

    expect(onPick).toHaveBeenCalledWith('2026-11-10');
  });

  it('does not let a future date be picked', async () => {
    await renderPicker();

    const future = screen.getByLabelText('18 November 2026, not available yet');
    await fireEvent.press(future);

    expect(onPick).not.toHaveBeenCalled();
  });

  it('moves between months, and stops at the current month', async () => {
    await renderPicker();

    await fireEvent.press(screen.getByLabelText('Previous month'));
    expect(screen.getByText('October 2026')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Next month'));
    expect(screen.getByText('November 2026')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Next month'));
    expect(screen.getByText('November 2026')).toBeTruthy();
  });

  it('closes with no change from Cancel', async () => {
    await renderPicker();

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPick).not.toHaveBeenCalled();
  });
});
