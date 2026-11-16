import {
  LocalRepository,
  type JournalRepository,
  type KeyValueStore,
  type Tag,
  type TagCategory,
} from '@memory-journal/core';

import {
  createCategory,
  createTag,
  deleteCategory,
  deleteTag,
  renameCategory,
  seedDefaultCategories,
  subscribeTagData,
  updateTag,
} from './tagService';

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    getItem: (key) => Promise.resolve(data.get(key) ?? null),
    setItem: (key, value) => {
      data.set(key, value);
      return Promise.resolve();
    },
    removeItem: (key) => {
      data.delete(key);
      return Promise.resolve();
    },
    getAllKeys: () => Promise.resolve([...data.keys()]),
  };
}

const newRepository = (): JournalRepository => new LocalRepository(memoryStore());

const draft = { name: 'Ravi', categoryId: 'people', note: null, aliases: ['Rav'] };

const people: TagCategory = { id: 'people', name: 'People', isDefault: true, order: 0 };
const places: TagCategory = { id: 'places', name: 'Places', isDefault: true, order: 1 };
const numbers: TagCategory = { id: 'numbers', name: 'Numbers', isDefault: true, order: 2 };

describe('subscribeTagData', () => {
  it('reports the categories and tags now and again after a change', async () => {
    const repository = newRepository();
    await repository.putCategory(people);
    const onChange = jest.fn();

    const stop = subscribeTagData(repository, onChange, jest.fn());
    await settle();
    expect(onChange).toHaveBeenLastCalledWith({ categories: [people], tags: [] });

    const { saved } = createTag(repository, draft, 5);
    await saved;
    await settle();
    expect(onChange.mock.calls.at(-1)![0].tags).toHaveLength(1);

    stop();
  });

  it('passes errors on', async () => {
    const repository = newRepository();
    const failure = new Error('denied');
    repository.listTags = () => Promise.reject(failure);
    const onError = jest.fn();

    subscribeTagData(repository, jest.fn(), onError);
    await settle();

    expect(onError).toHaveBeenCalledWith(failure);
  });
});

describe('seedDefaultCategories', () => {
  it('stores all three defaults with their fixed ids when none exist', async () => {
    const repository = newRepository();

    await seedDefaultCategories(repository, []);

    const stored = await repository.listCategories();
    expect(stored.map((c) => c.id).sort()).toEqual(['numbers', 'people', 'places']);
    expect(stored.find((c) => c.id === 'people')).toEqual(people);
  });

  it('stores only the missing ones', async () => {
    const repository = newRepository();
    const put = jest.spyOn(repository, 'putCategory');

    await seedDefaultCategories(repository, [people]);

    expect(put).toHaveBeenCalledTimes(2);
    expect(put).not.toHaveBeenCalledWith(people);
  });

  it('stores nothing when all defaults exist', async () => {
    const repository = newRepository();
    const put = jest.spyOn(repository, 'putCategory');

    await seedDefaultCategories(repository, [people, places, numbers]);

    expect(put).not.toHaveBeenCalled();
  });
});

describe('categories', () => {
  it('creates a custom category that is not a default', async () => {
    const repository = newRepository();

    await createCategory(repository, 'Songs', 3);

    expect(await repository.listCategories()).toEqual([
      { id: expect.stringMatching(/^[A-Za-z0-9]{20}$/), name: 'Songs', isDefault: false, order: 3 },
    ]);
  });

  it('renames a category and keeps everything else', async () => {
    const repository = newRepository();
    await repository.putCategory({ id: 'c1', name: 'Songs', isDefault: false, order: 3 });

    await renameCategory(repository, 'c1', 'Tunes');

    expect(await repository.listCategories()).toEqual([
      { id: 'c1', name: 'Tunes', isDefault: false, order: 3 },
    ]);
  });

  it('refuses to rename a category that is gone', async () => {
    await expect(renameCategory(newRepository(), 'nope', 'Tunes')).rejects.toThrow(
      'This category no longer exists.',
    );
  });

  it('deletes by id', async () => {
    const repository = newRepository();
    await repository.putCategory(people);
    await repository.putCategory(places);

    await deleteCategory(repository, 'places');

    expect(await repository.listCategories()).toEqual([people]);
  });
});

describe('tags', () => {
  it('creates a tag with its creation date and returns the id before the write is confirmed', async () => {
    const repository = newRepository();

    const { id, saved } = createTag(repository, draft, 1234);
    expect(id).toMatch(/^[A-Za-z0-9]{20}$/);
    await saved;

    expect(await repository.listTags()).toEqual([{ id, ...draft, createdAt: 1234 }]);
  });

  it('gives every tag its own id', () => {
    const repository = newRepository();
    expect(createTag(repository, draft, 1).id).not.toBe(createTag(repository, draft, 1).id);
  });

  it('updates the checked fields and never createdAt', async () => {
    const repository = newRepository();
    const { id, saved } = createTag(repository, draft, 1234);
    await saved;

    await updateTag(repository, id, { ...draft, name: 'Ravindu', note: 'Neighbour', aliases: [] });

    const [tag] = (await repository.listTags()) as [Tag];
    expect(tag).toEqual({
      id,
      name: 'Ravindu',
      categoryId: 'people',
      note: 'Neighbour',
      aliases: [],
      createdAt: 1234,
    });
  });

  it('refuses to update a tag that is gone', async () => {
    await expect(updateTag(newRepository(), 'nope', draft)).rejects.toThrow(
      'This tag no longer exists.',
    );
  });

  it('deletes the tag', async () => {
    const repository = newRepository();
    const { id, saved } = createTag(repository, draft, 1);
    await saved;

    await deleteTag(repository, id);

    expect(await repository.listTags()).toEqual([]);
  });
});
