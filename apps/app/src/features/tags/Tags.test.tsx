import { DEFAULT_CATEGORIES, type Tag, type TagCategory } from '@memory-journal/core';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { ConfirmProvider } from '@/components/useConfirm';

import { CategoryManager } from './CategoryManager';
import { TagBrowser } from './TagBrowser';
import { TagForm } from './TagForm';

const songs: TagCategory = { id: 'c-songs', name: 'Songs', isDefault: false, order: 3 };
const categories: TagCategory[] = [...DEFAULT_CATEGORIES, songs];

function tag(id: string, name: string, categoryId: string, extra: Partial<Tag> = {}): Tag {
  return { id, name, categoryId, note: null, aliases: [], createdAt: 0, ...extra };
}

const ravi = tag('t1', 'Ravi', 'people', { note: 'Met at the library', aliases: ['Rav'] });
const tags = [ravi, tag('t2', 'Galle Fort', 'places'), tag('t3', '0771234567', 'numbers')];

/** The forms ask through the confirmation dialog, so they need its provider above them. */
const renderWithConfirm = (ui: ReactElement) => render(ui, { wrapper: ConfirmProvider });

const dialog = () => within(screen.getByTestId('confirm-dialog'));

describe('TagBrowser', () => {
  const handlers = { onOpenTag: jest.fn(), onNewTag: jest.fn(), onManageCategories: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('lists tags with their category and note', async () => {
    await render(<TagBrowser categories={categories} tags={tags} {...handlers} />);

    expect(screen.getByText('Ravi')).toBeTruthy();
    expect(screen.getByText('People · Met at the library')).toBeTruthy();
    expect(screen.getByText('Also: Rav')).toBeTruthy();
    expect(screen.getByText('Galle Fort')).toBeTruthy();
  });

  it('filters by category', async () => {
    await render(<TagBrowser categories={categories} tags={tags} {...handlers} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Places' }));

    expect(screen.getByText('Galle Fort')).toBeTruthy();
    expect(screen.queryByText('Ravi')).toBeNull();

    await fireEvent.press(screen.getByText('All'));
    expect(screen.getByText('Ravi')).toBeTruthy();
  });

  it('searches names and aliases', async () => {
    await render(<TagBrowser categories={categories} tags={tags} {...handlers} />);

    await fireEvent.changeText(screen.getByLabelText('Search tags'), 'rav');
    expect(screen.getByText('Ravi')).toBeTruthy();
    expect(screen.queryByText('Galle Fort')).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Search tags'), 'zzz');
    expect(screen.getByText('No tags match.')).toBeTruthy();
  });

  it('explains the empty state when there are no tags at all', async () => {
    await render(<TagBrowser categories={categories} tags={[]} {...handlers} />);
    expect(screen.getByText(/No tags yet/)).toBeTruthy();
  });

  it('opens a tag and reaches the other screens', async () => {
    await render(<TagBrowser categories={categories} tags={tags} {...handlers} />);

    await fireEvent.press(screen.getByLabelText('Galle Fort, Places'));
    expect(handlers.onOpenTag).toHaveBeenCalledWith('t2');

    await fireEvent.press(screen.getByText('New tag'));
    expect(handlers.onNewTag).toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Manage categories'));
    expect(handlers.onManageCategories).toHaveBeenCalled();
  });
});

describe('TagForm', () => {
  const onSubmit = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('creates a tag with the chosen category, note and aliases', async () => {
    await renderWithConfirm(
      <TagForm categories={categories} tags={tags} onSubmit={onSubmit} onCancel={onCancel} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Name'), '  Nimal ');
    await fireEvent.press(screen.getByText('Places'));
    await fireEvent.changeText(screen.getByLabelText('Note'), 'Next door');
    await fireEvent.changeText(screen.getByLabelText('Aliases'), 'Nim, Nimal P');
    await fireEvent.press(screen.getByText('Create tag'));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Nimal',
      categoryId: 'places',
      note: 'Next door',
      aliases: ['Nim', 'Nimal P'],
    });
  });

  it('shows the reason and does not submit when the name is missing', async () => {
    await renderWithConfirm(
      <TagForm categories={categories} tags={tags} onSubmit={onSubmit} onCancel={onCancel} />,
    );

    await fireEvent.press(screen.getByText('Create tag'));

    expect(screen.getByText('Give the tag a name.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a duplicate name in the same category', async () => {
    await renderWithConfirm(
      <TagForm categories={categories} tags={tags} onSubmit={onSubmit} onCancel={onCancel} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Name'), 'ravi');
    await fireEvent.press(screen.getByText('Create tag'));

    expect(screen.getByText('This category already has a tag with this name.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('starts from the tag being edited and lets it keep its own name', async () => {
    await renderWithConfirm(
      <TagForm
        categories={categories}
        tags={tags}
        initial={ravi}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByLabelText('Name').props.value).toBe('Ravi');
    expect(screen.getByLabelText('Aliases').props.value).toBe('Rav');

    await fireEvent.press(screen.getByText('Save changes'));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Ravi',
      categoryId: 'people',
      note: 'Met at the library',
      aliases: ['Rav'],
    });
  });

  it('asks in the dialog before deleting, and Cancel leaves the tag alone', async () => {
    const onDelete = jest.fn();
    await renderWithConfirm(
      <TagForm
        categories={categories}
        tags={tags}
        initial={ravi}
        onSubmit={onSubmit}
        onCancel={onCancel}
        onDelete={onDelete}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Delete tag' }));

    expect(await screen.findByTestId('confirm-dialog')).toBeTruthy();
    expect(dialog().getByText('Delete tag?')).toBeTruthy();
    expect(
      dialog().getByText('Ravi will be deleted. Mentions in your old entries stay as plain text.'),
    ).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();

    await fireEvent.press(dialog().getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('deletes the tag once the dialog is confirmed', async () => {
    const onDelete = jest.fn();
    await renderWithConfirm(
      <TagForm
        categories={categories}
        tags={tags}
        initial={ravi}
        onSubmit={onSubmit}
        onCancel={onCancel}
        onDelete={onDelete}
      />,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Delete tag' }));
    await screen.findByTestId('confirm-dialog');
    await fireEvent.press(dialog().getByRole('button', { name: 'Delete tag' }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('offers no delete when creating', async () => {
    await renderWithConfirm(
      <TagForm categories={categories} tags={tags} onSubmit={onSubmit} onCancel={onCancel} />,
    );
    expect(screen.queryByText('Delete tag')).toBeNull();
  });

  it('cancels without asking when nothing was changed', async () => {
    await renderWithConfirm(
      <TagForm categories={categories} tags={tags} onSubmit={onSubmit} onCancel={onCancel} />,
    );
    await fireEvent.press(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('asks before discarding changes, and Cancel keeps the form open', async () => {
    await renderWithConfirm(
      <TagForm
        categories={categories}
        tags={tags}
        initial={ravi}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Note'), 'Met at the market');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));

    expect(await screen.findByTestId('confirm-dialog')).toBeTruthy();
    expect(dialog().getByText('Discard changes?')).toBeTruthy();
    expect(dialog().getByText('Your changes to Ravi will not be saved.')).toBeTruthy();
    expect(onCancel).not.toHaveBeenCalled();

    await fireEvent.press(dialog().getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Note').props.value).toBe('Met at the market');
  });

  it('leaves the form once discarding is confirmed', async () => {
    await renderWithConfirm(
      <TagForm categories={categories} tags={tags} onSubmit={onSubmit} onCancel={onCancel} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Nimal');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByTestId('confirm-dialog');
    expect(dialog().getByText('This new tag will not be saved.')).toBeTruthy();
    await fireEvent.press(dialog().getByRole('button', { name: 'Discard changes' }));

    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });

  it('asks before an edit removes an alias, and saves once confirmed', async () => {
    await renderWithConfirm(
      <TagForm
        categories={categories}
        tags={tags}
        initial={ravi}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Aliases'), '');
    await fireEvent.press(screen.getByText('Save changes'));

    expect(await screen.findByTestId('confirm-dialog')).toBeTruthy();
    expect(dialog().getByText('Remove alias?')).toBeTruthy();
    expect(dialog().getByText('Rav will be removed from Ravi.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.press(dialog().getByRole('button', { name: 'Remove alias' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Ravi',
        categoryId: 'people',
        note: 'Met at the library',
        aliases: [],
      }),
    );
  });

  it('does not save the edit when the alias removal is cancelled', async () => {
    await renderWithConfirm(
      <TagForm
        categories={categories}
        tags={tags}
        initial={ravi}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Aliases'), '');
    await fireEvent.press(screen.getByText('Save changes'));
    await screen.findByTestId('confirm-dialog');
    await fireEvent.press(dialog().getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('does not ask when an edit only adds an alias', async () => {
    await renderWithConfirm(
      <TagForm
        categories={categories}
        tags={tags}
        initial={ravi}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Aliases'), 'Rav, Ravindu');
    await fireEvent.press(screen.getByText('Save changes'));

    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ aliases: ['Rav', 'Ravindu'] }));
  });

  it('tells the screen around it when it holds unsaved changes', async () => {
    const onDirtyChange = jest.fn();
    await renderWithConfirm(
      <TagForm
        categories={categories}
        tags={tags}
        initial={ravi}
        onSubmit={onSubmit}
        onCancel={onCancel}
        onDirtyChange={onDirtyChange}
      />,
    );
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);

    await fireEvent.changeText(screen.getByLabelText('Note'), 'Met at the market');
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);

    await fireEvent.changeText(screen.getByLabelText('Note'), 'Met at the library');
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });
});

describe('CategoryManager', () => {
  const handlers = { onCreate: jest.fn(), onRename: jest.fn(), onDelete: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('shows tag counts and marks the built-in categories', async () => {
    await renderWithConfirm(<CategoryManager categories={categories} tags={tags} {...handlers} />);

    expect(screen.getByText('People')).toBeTruthy();
    expect(screen.getAllByText('1 tag').length).toBe(3);
    expect(screen.getByText('0 tags')).toBeTruthy();
    expect(screen.getAllByText('Built in')).toHaveLength(3);
    expect(screen.queryByLabelText('Rename People')).toBeNull();
    expect(screen.queryByText('Delete People')).toBeNull();
  });

  it('adds a category with a trimmed name', async () => {
    await renderWithConfirm(<CategoryManager categories={categories} tags={tags} {...handlers} />);

    await fireEvent.changeText(screen.getByLabelText('New category name'), '  Foods ');
    await fireEvent.press(screen.getByText('Add'));

    expect(handlers.onCreate).toHaveBeenCalledWith('Foods');
  });

  it('refuses a duplicate or empty category name', async () => {
    await renderWithConfirm(<CategoryManager categories={categories} tags={tags} {...handlers} />);

    await fireEvent.changeText(screen.getByLabelText('New category name'), 'people');
    await fireEvent.press(screen.getByText('Add'));
    expect(screen.getByText('A category with this name already exists.')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('New category name'), ' ');
    await fireEvent.press(screen.getByText('Add'));
    expect(screen.getByText('Give the category a name.')).toBeTruthy();
    expect(handlers.onCreate).not.toHaveBeenCalled();
  });

  it('renames a custom category', async () => {
    await renderWithConfirm(<CategoryManager categories={categories} tags={[]} {...handlers} />);

    await fireEvent.press(screen.getByText('Rename Songs'));
    await fireEvent.changeText(screen.getByLabelText('Rename Songs'), 'Tunes');
    await fireEvent.press(screen.getByText('Save'));

    expect(handlers.onRename).toHaveBeenCalledWith('c-songs', 'Tunes');
  });

  it('does not save a rename that changes nothing', async () => {
    await renderWithConfirm(<CategoryManager categories={categories} tags={[]} {...handlers} />);

    await fireEvent.press(screen.getByText('Rename Songs'));
    await fireEvent.press(screen.getByText('Save'));

    expect(handlers.onRename).not.toHaveBeenCalled();
  });

  it('asks in the dialog before deleting, and Cancel leaves the category alone', async () => {
    await renderWithConfirm(<CategoryManager categories={categories} tags={[]} {...handlers} />);

    await fireEvent.press(screen.getByText('Delete Songs'));

    expect(await screen.findByTestId('confirm-dialog')).toBeTruthy();
    expect(dialog().getByText('Delete category?')).toBeTruthy();
    expect(dialog().getByText(/Songs will be deleted\. It has no tags/)).toBeTruthy();
    expect(handlers.onDelete).not.toHaveBeenCalled();

    await fireEvent.press(dialog().getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByTestId('confirm-dialog')).toBeNull());
    expect(handlers.onDelete).not.toHaveBeenCalled();
  });

  it('deletes an empty custom category once the dialog is confirmed', async () => {
    await renderWithConfirm(<CategoryManager categories={categories} tags={[]} {...handlers} />);

    await fireEvent.press(screen.getByText('Delete Songs'));
    await screen.findByTestId('confirm-dialog');
    await fireEvent.press(dialog().getByRole('button', { name: 'Delete category' }));

    await waitFor(() => expect(handlers.onDelete).toHaveBeenCalledWith('c-songs'));
  });

  it('blocks deleting a category that tags still use', async () => {
    const used = [tag('t9', 'Hello', 'c-songs')];
    await renderWithConfirm(<CategoryManager categories={categories} tags={used} {...handlers} />);

    await fireEvent.press(screen.getByText('Delete Songs'));

    expect(screen.getByText('1 tag uses this category. Move or delete them first.')).toBeTruthy();
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
    expect(handlers.onDelete).not.toHaveBeenCalled();
  });
});
