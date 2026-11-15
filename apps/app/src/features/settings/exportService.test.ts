const mockDeliver = jest.fn();
const mockCollections: Record<string, { id: string; data: Record<string, unknown> }[]> = {};
const mockDocuments: Record<string, Record<string, unknown> | undefined> = {};
let mockFailPath: string | null = null;

const mockJoin = (base: unknown, rest: string[]) => ({
  path: [(base as { path?: string }).path, ...rest].filter(Boolean).join('/'),
});

jest.mock('@/lib/firebase', () => ({ getFirebase: () => ({ db: {} }) }));
jest.mock('firebase/firestore', () => ({
  collection: (base: unknown, ...rest: string[]) => mockJoin(base, rest),
  doc: (base: unknown, ...rest: string[]) => mockJoin(base, rest),
  getDocs: (ref: { path: string }) => {
    if (ref.path === mockFailPath) return Promise.reject(new Error('unavailable'));
    return Promise.resolve({
      docs: (mockCollections[ref.path] ?? []).map((entry) => ({
        id: entry.id,
        data: () => entry.data,
      })),
    });
  },
  getDoc: (ref: { path: string }) =>
    Promise.resolve({
      exists: () => mockDocuments[ref.path] !== undefined,
      data: () => mockDocuments[ref.path],
    }),
}));
jest.mock('./exportDelivery', () => ({
  deliverExport: (...args: unknown[]) => mockDeliver(...args),
}));

import { exportAllData, loadExport } from './exportService';

const stamp = (ms: number) => ({ toMillis: () => ms });

function seed(): void {
  mockDocuments['users/u1'] = { email: 'a@example.com', createdAt: stamp(Date.UTC(2026, 10, 1)) };
  mockDocuments['users/u1/progress/tutorials'] = { completed: ['memory-palace'] };
  mockCollections['users/u1/days'] = [
    { id: '2026-11-14', data: { wordCount: 30 } },
    { id: '2026-11-13', data: { wordCount: 12 } },
  ];
  mockCollections['users/u1/days/2026-11-14/revisions'] = [
    { id: '2', data: { n: 2, freeNotes: 'later' } },
    { id: '1', data: { n: 1, freeNotes: 'first', createdAt: stamp(Date.UTC(2026, 10, 14, 15)) } },
  ];
  mockCollections['users/u1/library'] = [{ id: 'm1', data: { title: 'Heat', type: 'movie' } }];
  mockCollections['users/u1/library/m1/revisions'] = [{ id: '1', data: { text: 'page' } }];
  mockCollections['users/u1/tags'] = [{ id: 't1', data: { name: 'Ana' } }];
  mockCollections['users/u1/tagCategories'] = [{ id: 'people', data: { name: 'People' } }];
}

describe('exportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(mockCollections)) delete mockCollections[key];
    for (const key of Object.keys(mockDocuments)) delete mockDocuments[key];
    mockFailPath = null;
    mockDeliver.mockResolvedValue('delivered');
  });

  it('collects everything the user owns, with revisions, in a fixed order', async () => {
    seed();

    const bundle = await loadExport('u1', Date.UTC(2026, 10, 15));

    expect(bundle.profile).toEqual({
      email: 'a@example.com',
      createdAt: '2026-11-01T00:00:00.000Z',
    });
    expect(bundle.tutorials).toEqual({ completed: ['memory-palace'] });
    expect(bundle.days.map((day) => day.id)).toEqual(['2026-11-13', '2026-11-14']);
    expect(bundle.days[1]!.revisions.map((revision) => revision.id)).toEqual(['1', '2']);
    expect(bundle.days[1]!.revisions[0]!.data.createdAt).toBe('2026-11-14T15:00:00.000Z');
    expect(bundle.library[0]!.revisions[0]!.data).toEqual({ text: 'page' });
    expect(bundle.tags[0]!.data).toEqual({ name: 'Ana' });
    expect(bundle.tagCategories[0]!.data).toEqual({ name: 'People' });
  });

  it('exports an account with no data as empty lists', async () => {
    mockDocuments['users/u1'] = { email: 'a@example.com' };

    const bundle = await loadExport('u1');

    expect(bundle.days).toEqual([]);
    expect(bundle.library).toEqual([]);
    expect(bundle.tutorials).toBeNull();
  });

  it('hands one JSON file named for the local day to the platform', async () => {
    seed();

    const result = await exportAllData('u1', '2026-11-15', Date.UTC(2026, 10, 15));

    expect(result).toBe('delivered');
    const [fileName, text] = mockDeliver.mock.calls[0] as [string, string];
    expect(fileName).toBe('memory-journal-export-2026-11-15.json');
    const parsed = JSON.parse(text) as { format: string; days: unknown[] };
    expect(parsed.format).toBe('memory-journal-export');
    expect(parsed.days).toHaveLength(2);
  });

  it('never hands over a partial file when a read fails', async () => {
    seed();
    mockFailPath = 'users/u1/days/2026-11-14/revisions';

    await expect(exportAllData('u1', '2026-11-15')).rejects.toThrow('unavailable');

    expect(mockDeliver).not.toHaveBeenCalled();
  });

  it('reports a cancelled share as cancelled', async () => {
    seed();
    mockDeliver.mockResolvedValue('cancelled');

    await expect(exportAllData('u1', '2026-11-15')).resolves.toBe('cancelled');
  });
});
