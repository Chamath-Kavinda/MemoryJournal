import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ConfirmProvider } from '@/components/useConfirm';

import { LibraryItemForm } from './LibraryItemForm';

const renderWithConfirm = (ui: ReactElement) => render(ui, { wrapper: ConfirmProvider });
const dialog = () => within(screen.getByTestId('confirm-dialog'));

describe('LibraryItemForm', () => {
  const onSubmit = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  const renderForm = (initial?: { title: string; date: null }) =>
    renderWithConfirm(
      <LibraryItemForm
        type="movie"
        {...(initial ? { initial } : {})}
        submitLabel="Add movie"
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

  it('saves a trimmed title with no date', async () => {
    await renderForm();

    await fireEvent.changeText(screen.getByLabelText('Title of the movie'), '  Arrival ');
    await fireEvent.press(screen.getByRole('button', { name: 'Add movie' }));

    expect(onSubmit).toHaveBeenCalledWith({ title: 'Arrival', date: null });
  });

  it('shows a message and saves nothing when the title is empty', async () => {
    await renderForm();

    await fireEvent.press(screen.getByRole('button', { name: 'Add movie' }));

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('closes at once, with no dialog, when nothing was changed', async () => {
    await renderForm({ title: 'Arrival', date: null });

    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('asks before discarding edits, and Cancel keeps the form open', async () => {
    await renderForm({ title: 'Arrival', date: null });

    await fireEvent.changeText(screen.getByLabelText('Title of the movie'), 'Arrival 2');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByTestId('confirm-dialog')).toBeTruthy();
    expect(dialog().getByText('Discard changes?')).toBeTruthy();
    await fireEvent.press(dialog().getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Arrival 2')).toBeTruthy();
  });

  it('discards the edits once the dialog is confirmed', async () => {
    await renderForm();

    await fireEvent.changeText(screen.getByLabelText('Title of the movie'), 'Dune');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByTestId('confirm-dialog');
    await fireEvent.press(dialog().getByRole('button', { name: 'Discard changes' }));

    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });
});
