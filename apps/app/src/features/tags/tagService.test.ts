const mockSetDoc = jest.fn();
const mockUpdateDoc = jest.fn();
const mockDeleteDoc = jest.fn();
const mockOnSnapshot = jest.fn();
const mockBatchSet = jest.fn();
const mockBatchCommit = jest.fn();

jest.mock('@/lib/firebase', () => ({ getFirebase: () => ({ db: {} }) }));
jest.mock('firebase/firestore', () => ({
  collection: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  doc: (parent: { path: string }, id?: string) => ({
    path: `${parent.path}/${id ?? 'auto-id'}`,
    id: id ?? 'auto-id',
  }),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  writeBatch: () => ({ set: mockBatchSet, commit: mockBatchCommit }),
}));

import {
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  renameCategory,
  seedDefaultCategories,
  subscribeCategories,
  subscribeTags,
  updateTag,
} from './tagService';

const draft = { name: 'Ravi', categoryId: 'people', note: null, aliases: ['Rav'] };

beforeEach(() => {
  jest.clearAllMocks();
  mockSetDoc.mockResolvedValue(undefined);
  mockUpdateDoc.mockResolvedValue(undefined);
  mockDeleteDoc.mockResolvedValue(undefined);
  mockBatchCommit.mockResolvedValue(undefined);
});

describe('subscribeCategories and subscribeTags', () => {
  it('maps documents to categories and drops ones with the wrong shape', () => {
    const onChange = jest.fn();
    subscribeCategories('u1', onChange, jest.fn());

    const [ref, next] = mockOnSnapshot.mock.calls[0] as [{ path: string }, (s: unknown) => void];
    expect(ref.path).toBe('users/u1/tagCategories');

    next({
      docs: [
        { id: 'people', data: () => ({ name: 'People', isDefault: true, order: 0 }) },
        { id: 'bad', data: () => ({ name: 5 }) },
      ],
    });
    expect(onChange).toHaveBeenCalledWith([
      { id: 'people', name: 'People', isDefault: true, order: 0 },
    ]);
  });

  it('maps documents to tags and passes errors on', () => {
    const onChange = jest.fn();
    const onError = jest.fn();
    subscribeTags('u1', onChange, onError);

    const [ref, next, fail] = mockOnSnapshot.mock.calls[0] as [
      { path: string },
      (s: unknown) => void,
      (e: Error) => void,
    ];
    expect(ref.path).toBe('users/u1/tags');

    const data = { name: 'Ravi', categoryId: 'people', note: null, aliases: [], createdAt: 5 };
    next({
      docs: [
        { id: 't1', data: () => data },
        { id: 'bad', data: () => ({}) },
      ],
    });
    expect(onChange).toHaveBeenCalledWith([{ id: 't1', ...data }]);

    const error = new Error('denied');
    fail(error);
    expect(onError).toHaveBeenCalledWith(error);
  });
});

describe('seedDefaultCategories', () => {
  it('writes all three defaults with their fixed ids when none exist', async () => {
    await seedDefaultCategories('u1', []);

    expect(mockBatchSet).toHaveBeenCalledTimes(3);
    const paths = mockBatchSet.mock.calls.map((call) => (call[0] as { path: string }).path);
    expect(paths).toEqual([
      'users/u1/tagCategories/people',
      'users/u1/tagCategories/places',
      'users/u1/tagCategories/numbers',
    ]);
    expect(mockBatchSet.mock.calls[0]![1]).toEqual({ name: 'People', isDefault: true, order: 0 });
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it('writes only the missing ones', async () => {
    await seedDefaultCategories('u1', [
      { id: 'people', name: 'People', isDefault: true, order: 0 },
    ]);
    expect(mockBatchSet).toHaveBeenCalledTimes(2);
  });

  it('writes nothing when all defaults exist', async () => {
    await seedDefaultCategories('u1', [
      { id: 'people', name: 'People', isDefault: true, order: 0 },
      { id: 'places', name: 'Places', isDefault: true, order: 1 },
      { id: 'numbers', name: 'Numbers', isDefault: true, order: 2 },
    ]);
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });
});

describe('categories', () => {
  it('creates a custom category that is not a default', async () => {
    await createCategory('u1', 'Songs', 3);
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: 'users/u1/tagCategories/auto-id', id: 'auto-id' },
      { name: 'Songs', isDefault: false, order: 3 },
    );
  });

  it('renames and deletes by id', async () => {
    await renameCategory('u1', 'c1', 'Tunes');
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: 'users/u1/tagCategories/c1', id: 'c1' },
      { name: 'Tunes' },
    );

    await deleteCategory('u1', 'c1');
    expect(mockDeleteDoc).toHaveBeenCalledWith({ path: 'users/u1/tagCategories/c1', id: 'c1' });
  });
});

describe('tags', () => {
  it('creates a tag with its creation date and returns the id before the write is confirmed', () => {
    const result = createTag('u1', draft, 1234);

    expect(result.id).toBe('auto-id');
    expect(mockSetDoc).toHaveBeenCalledWith(
      { path: 'users/u1/tags/auto-id', id: 'auto-id' },
      { ...draft, createdAt: 1234 },
    );
    return expect(result.saved).resolves.toBeUndefined();
  });

  it('updates only the checked fields and never createdAt', async () => {
    await updateTag('u1', 't1', draft);
    const [, data] = mockUpdateDoc.mock.calls[0] as [unknown, Record<string, unknown>];
    expect(data).toEqual(draft);
    expect(data).not.toHaveProperty('createdAt');
  });

  it('deletes the tag document', async () => {
    await deleteTag('u1', 't1');
    expect(mockDeleteDoc).toHaveBeenCalledWith({ path: 'users/u1/tags/t1', id: 't1' });
  });
});
