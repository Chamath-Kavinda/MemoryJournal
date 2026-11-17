import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ConfirmProvider } from '@/components/useConfirm';

import { LibraryItemForm } from './LibraryItemForm';

jest.mock('@/features/calendar/useTodayId', () => ({ useTodayId: () => '2026-11-17' }));

const renderWithConfirm = (ui: ReactElement) => render(ui, { wrapper: ConfirmProvider });

describe('LibraryItemForm date picker', () => {
  const onSubmit = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  const renderForm = (type: 'movie' | 'book' = 'movie') =>
    renderWithConfirm(
      <LibraryItemForm type={type} submitLabel="Save" onSubmit={onSubmit} onCancel={jest.fn()} />,
    );

  it('shows a calendar button named for a movie or a book', async () => {
    const view = await renderForm('movie');
    expect(screen.getByLabelText('Pick date watched')).toBeTruthy();

    await view.unmount();
    await renderForm('book');
    expect(screen.getByLabelText('Pick date read')).toBeTruthy();
  });

  it('fills the input with the picked date and closes the picker', async () => {
    await renderForm();

    await fireEvent.press(screen.getByLabelText('Pick date watched'));
    await fireEvent.press(screen.getByLabelText('10 November 2026'));

    expect(screen.getByDisplayValue('2026-11-10')).toBeTruthy();
    expect(screen.queryByText('November 2026')).toBeNull();
  });

  it('leaves the input unchanged when the picker is cancelled', async () => {
    await renderForm();
    await fireEvent.changeText(screen.getByLabelText('Date watched'), '2026-05-01');

    await fireEvent.press(screen.getByLabelText('Pick date watched'));
    expect(screen.getByText('May 2026')).toBeTruthy();
    await fireEvent.press(screen.getAllByRole('button', { name: 'Cancel' })[0]!);

    expect(screen.getByDisplayValue('2026-05-01')).toBeTruthy();
  });

  it('still accepts a typed date, which is saved with the item', async () => {
    await renderForm();

    await fireEvent.changeText(screen.getByLabelText('Title of the movie'), 'Arrival');
    await fireEvent.changeText(screen.getByLabelText('Date watched'), '2026-03-02');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Arrival', date: '2026-03-02' });
  });
});
