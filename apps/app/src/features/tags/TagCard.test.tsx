import { DEFAULT_CATEGORIES, type Tag, type TagCategory } from '@memory-journal/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ConfirmProvider } from '@/components/useConfirm';

import { categoryIcon } from './categoryIcon';
import { TagCard } from './TagCard';

const people = DEFAULT_CATEGORIES.find((c) => c.id === 'people') as TagCategory;
const songs: TagCategory = { id: 'c-songs', name: 'Songs', isDefault: false, order: 3 };

const ravi: Tag = {
  id: 't1',
  name: 'Ravi',
  categoryId: 'people',
  note: 'Met at the library',
  aliases: [],
  createdAt: 0,
};

const renderWithConfirm = (ui: ReactElement) => render(ui, { wrapper: ConfirmProvider });
const dialog = () => within(screen.getByTestId('confirm-dialog'));

describe('categoryIcon', () => {
  it('gives each default category its own icon', () => {
    const icons = ['people', 'places', 'numbers'].map((id) => categoryIcon({ id }));

    expect(new Set(icons).size).toBe(3);
  });

  it('falls back to the Tag icon for a custom category or no category', () => {
    const fallback = categoryIcon(undefined);

    expect(categoryIcon(songs)).toBe(fallback);
    expect(categoryIcon({ id: 'people' })).not.toBe(fallback);
  });
});

describe('TagCard', () => {
  const onOpen = jest.fn();
  const onDelete = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  const renderCard = (props: {
    mentions: number | undefined;
    category?: TagCategory | undefined;
  }) =>
    renderWithConfirm(
      <TagCard
        tag={ravi}
        category={'category' in props ? props.category : people}
        mentions={props.mentions}
        onOpen={onOpen}
        onDelete={onDelete}
      />,
    );

  it('shows the name, the note, the category and the mention count', async () => {
    await renderCard({ mentions: 3 });

    expect(screen.getByText('Ravi')).toBeTruthy();
    expect(screen.getByText('Met at the library')).toBeTruthy();
    expect(screen.getByText('People · 3 mentions')).toBeTruthy();
  });

  it('says mention in the singular for one and mentions for zero', async () => {
    const view = await renderCard({ mentions: 1 });
    expect(screen.getByText('People · 1 mention')).toBeTruthy();

    await view.rerender(
      <TagCard tag={ravi} category={people} mentions={0} onOpen={onOpen} onDelete={onDelete} />,
    );
    expect(screen.getByText('People · 0 mentions')).toBeTruthy();
  });

  it('leaves the count out while the counts load', async () => {
    await renderCard({ mentions: undefined });

    expect(screen.getByText('People')).toBeTruthy();
    expect(screen.queryByText(/mention/)).toBeNull();
  });

  it('names a tag without a category', async () => {
    await renderCard({ mentions: undefined, category: undefined });

    expect(screen.getByText('No category')).toBeTruthy();
  });

  it('opens the tag when the card is pressed', async () => {
    await renderCard({ mentions: 3 });

    await fireEvent.press(screen.getByLabelText('Ravi, People, 3 mentions'));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('asks before deleting, and Cancel leaves the tag alone', async () => {
    await renderCard({ mentions: 3 });

    await fireEvent.press(screen.getByLabelText('Delete Ravi'));

    expect(await screen.findByTestId('confirm-dialog')).toBeTruthy();
    expect(dialog().getByText('Delete tag?')).toBeTruthy();
    await fireEvent.press(dialog().getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(onDelete).not.toHaveBeenCalled();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('deletes once the dialog is confirmed', async () => {
    await renderCard({ mentions: 3 });

    await fireEvent.press(screen.getByLabelText('Delete Ravi'));
    await screen.findByTestId('confirm-dialog');
    await fireEvent.press(dialog().getByRole('button', { name: 'Delete tag' }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });
});
