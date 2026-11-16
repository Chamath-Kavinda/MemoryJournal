import type { LibraryItem } from '@memory-journal/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ConfirmProvider } from '@/components/useConfirm';

import { LibraryBrowser } from './LibraryBrowser';

function item(
  id: string,
  type: LibraryItem['type'],
  title: string,
  extra: Partial<LibraryItem> = {},
) {
  return {
    id,
    type,
    title,
    date: null,
    text: '',
    latestRevision: 0,
    updatedAt: 0,
    wordCount: 0,
    mentions: [],
    ...extra,
  } satisfies LibraryItem;
}

const items: LibraryItem[] = [
  item('m1', 'movie', 'Inception', { date: '2026-11-02', latestRevision: 2, wordCount: 120 }),
  item('m2', 'movie', 'Up', { latestRevision: 1, wordCount: 1 }),
  item('m3', 'movie', 'Heat'),
  item('b1', 'book', 'Dune', { date: '2026-10-20', latestRevision: 1, wordCount: 480 }),
];

describe('LibraryBrowser', () => {
  const onOpen = jest.fn();
  const onCreate = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  const renderBrowser = (
    props: { items?: LibraryItem[]; status?: 'loading' | 'ready' | 'error' } = {},
  ) =>
    render(
      <LibraryBrowser
        items={props.items ?? items}
        status={props.status ?? 'ready'}
        onOpen={onOpen}
        onCreate={onCreate}
      />,
      // The add form asks through the confirmation dialog, so it needs its provider above it.
      { wrapper: ConfirmProvider },
    );

  it('opens on Movies and lists only movies', async () => {
    await renderBrowser();

    expect(screen.getByLabelText('Movies').props.accessibilityState).toMatchObject({
      selected: true,
    });
    expect(screen.getByText('Inception')).toBeTruthy();
    expect(screen.getByText('Heat')).toBeTruthy();
    expect(screen.queryByText('Dune')).toBeNull();
    expect(screen.getByText('Add movie')).toBeTruthy();
  });

  it('shows the date and the word count on each card', async () => {
    await renderBrowser();

    expect(screen.getByLabelText('Inception, 2026-11-02 · 120 words')).toBeTruthy();
    // One word is singular, and a page with no saved pass shows no count.
    expect(screen.getByLabelText('Up, 1 word')).toBeTruthy();
    expect(screen.getByLabelText('Heat')).toBeTruthy();
  });

  it('switches to Books and changes the button to match', async () => {
    await renderBrowser();

    await fireEvent.press(screen.getByLabelText('Books'));

    expect(await screen.findByText('Dune')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Inception')).toBeNull());
    expect(screen.getByText('Add book')).toBeTruthy();
    expect(screen.getByLabelText('Dune, 2026-10-20 · 480 words')).toBeTruthy();
  });

  it('opens an item when its card is pressed', async () => {
    await renderBrowser();

    await fireEvent.press(screen.getByLabelText('Heat'));

    expect(onOpen).toHaveBeenCalledWith('m3');
  });

  it('shows an empty state for a type with no items', async () => {
    await renderBrowser({ items: items.filter((i) => i.type === 'movie') });

    await fireEvent.press(screen.getByLabelText('Books'));

    expect(await screen.findByTestId('library-empty')).toBeTruthy();
    expect(screen.getByText(/No books yet/)).toBeTruthy();
  });

  it('shows skeletons while loading and no empty state yet', async () => {
    await renderBrowser({ items: [], status: 'loading' });

    expect(screen.getByTestId('library-loading')).toBeTruthy();
    expect(screen.queryByTestId('library-empty')).toBeNull();
  });

  it('shows an error card when the library could not be loaded', async () => {
    await renderBrowser({ items: [], status: 'error' });

    expect(screen.getByText('Could not load your library.')).toBeTruthy();
    expect(screen.queryByTestId('library-empty')).toBeNull();
  });

  it('replaces the Add button with the form, and the Books tab closes it again', async () => {
    await renderBrowser();

    await fireEvent.press(screen.getByText('Add movie'));
    expect(onCreate).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Books'));

    expect(await screen.findByText('Add book')).toBeTruthy();
    expect(screen.queryByText('Add movie')).toBeNull();
  });
});
