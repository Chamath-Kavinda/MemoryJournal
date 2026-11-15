import {
  DEFAULT_SETTINGS,
  DELETE_BATCH_SIZE,
  EXPORT_FORMAT,
  EXPORT_VERSION,
  buildExport,
  chunk,
  exportFileName,
  isDeleteConfirmed,
  readSettings,
  serializeExport,
  toJsonSafe,
  type ExportInput,
  type ExportNode,
} from './accountData';

const node = (id: string, data: Record<string, unknown> = {}, revisions: ExportNode[] = []) => ({
  id,
  data,
  revisions,
});

const input = (overrides: Partial<ExportInput> = {}): ExportInput => ({
  exportedAt: Date.UTC(2026, 10, 15, 5, 30),
  profile: null,
  days: [],
  library: [],
  tags: [],
  tagCategories: [],
  tutorials: null,
  ...overrides,
});

describe('readSettings', () => {
  it('uses the defaults when nothing is stored', () => {
    expect(readSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual({ reminderEnabled: true, theme: 'system' });
  });

  it('reads stored values', () => {
    expect(readSettings({ reminderEnabled: false, theme: 'dark' })).toEqual({
      reminderEnabled: false,
      theme: 'dark',
    });
  });

  it('falls back for each setting on its own', () => {
    expect(readSettings({ reminderEnabled: 'no', theme: 'light' })).toEqual({
      reminderEnabled: true,
      theme: 'light',
    });
    expect(readSettings({ reminderEnabled: false, theme: 'purple' })).toEqual({
      reminderEnabled: false,
      theme: 'system',
    });
  });

  it('ignores a settings value that is not an object', () => {
    expect(readSettings('dark')).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(7)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('toJsonSafe', () => {
  it('turns timestamps into ISO strings in UTC', () => {
    const stamp = { toMillis: () => Date.UTC(2026, 10, 14, 21, 5) };
    expect(toJsonSafe({ createdAt: stamp })).toEqual({ createdAt: '2026-11-14T21:05:00.000Z' });
  });

  it('keeps plain values and nested data', () => {
    const value = { a: 1, b: 'x', c: true, d: [1, { e: null }], f: { g: 'h' } };
    expect(toJsonSafe(value)).toEqual(value);
  });

  it('leaves out undefined fields and nulls what JSON cannot hold', () => {
    expect(toJsonSafe({ a: undefined, b: Number.NaN, c: () => 1, d: Infinity })).toEqual({
      b: null,
      c: null,
      d: null,
    });
  });

  it('converts timestamps inside arrays', () => {
    const stamp = { toMillis: () => 0 };
    expect(toJsonSafe([stamp])).toEqual(['1970-01-01T00:00:00.000Z']);
  });
});

describe('buildExport', () => {
  it('labels the file with its format, version and time', () => {
    const bundle = buildExport(input());
    expect(bundle.format).toBe(EXPORT_FORMAT);
    expect(bundle.version).toBe(EXPORT_VERSION);
    expect(bundle.exportedAt).toBe('2026-11-15T05:30:00.000Z');
  });

  it('exports an empty account as empty lists', () => {
    const bundle = buildExport(input());
    expect(bundle.days).toEqual([]);
    expect(bundle.library).toEqual([]);
    expect(bundle.tags).toEqual([]);
    expect(bundle.tagCategories).toEqual([]);
    expect(bundle.profile).toBeNull();
    expect(bundle.tutorials).toBeNull();
  });

  it('puts days in date order and revisions in number order', () => {
    const bundle = buildExport(
      input({
        days: [
          node('2026-11-14', {}, [node('10'), node('2'), node('1')]),
          node('2026-11-02'),
          node('2026-10-30'),
        ],
      }),
    );
    expect(bundle.days.map((day) => day.id)).toEqual(['2026-10-30', '2026-11-02', '2026-11-14']);
    expect(bundle.days[2]!.revisions.map((revision) => revision.id)).toEqual(['1', '2', '10']);
  });

  it('converts timestamps in profile, days and revisions', () => {
    const stamp = { toMillis: () => Date.UTC(2026, 10, 14, 21, 0) };
    const bundle = buildExport(
      input({
        profile: { createdAt: stamp, email: 'a@example.com' },
        days: [node('2026-11-14', { updatedAt: stamp }, [node('1', { createdAt: stamp })])],
      }),
    );
    expect(bundle.profile).toEqual({
      createdAt: '2026-11-14T21:00:00.000Z',
      email: 'a@example.com',
    });
    expect(bundle.days[0]!.data).toEqual({ updatedAt: '2026-11-14T21:00:00.000Z' });
    expect(bundle.days[0]!.revisions[0]!.data).toEqual({ createdAt: '2026-11-14T21:00:00.000Z' });
  });

  it('keeps the journal text exactly as written', () => {
    const text = 'Met {{tag:abc}} at the café — “hello”\nsecond line';
    const bundle = buildExport(input({ library: [node('m1', { text })] }));
    expect(bundle.library[0]!.data.text).toBe(text);
  });

  it('does not change the data it was given', () => {
    const days = [node('2026-11-14', {}, [node('2'), node('1')])];
    buildExport(input({ days }));
    expect(days[0]!.revisions.map((revision) => revision.id)).toEqual(['2', '1']);
  });

  it('gives identical output for the same data', () => {
    const data = input({ days: [node('2026-11-02'), node('2026-11-01')] });
    expect(serializeExport(buildExport(data))).toBe(serializeExport(buildExport(data)));
  });
});

describe('serializeExport', () => {
  it('writes indented JSON that reads back to the same bundle', () => {
    const bundle = buildExport(input({ tags: [node('t1', { name: 'Ana' })] }));
    const text = serializeExport(bundle);
    expect(text).toContain('\n  "format"');
    expect(JSON.parse(text)).toEqual(bundle);
  });
});

describe('exportFileName', () => {
  it('is dated with the given local day', () => {
    expect(exportFileName('2026-11-15')).toBe('memory-journal-export-2026-11-15.json');
  });
});

describe('isDeleteConfirmed', () => {
  it('accepts the confirmation word', () => {
    expect(isDeleteConfirmed('DELETE')).toBe(true);
  });

  it('ignores case and surrounding spaces', () => {
    expect(isDeleteConfirmed('  delete ')).toBe(true);
    expect(isDeleteConfirmed('Delete')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isDeleteConfirmed('')).toBe(false);
    expect(isDeleteConfirmed('DELET')).toBe(false);
    expect(isDeleteConfirmed('delete my account')).toBe(false);
    expect(isDeleteConfirmed('DEL ETE')).toBe(false);
  });
});

describe('chunk', () => {
  it('splits a list into groups of at most the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns no groups for an empty list', () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it('keeps a short list in one group', () => {
    expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
  });

  it('treats a size below one as one', () => {
    expect(chunk([1, 2], 0)).toEqual([[1], [2]]);
  });

  it('keeps the batch size under the Firestore limit of 500 writes', () => {
    expect(DELETE_BATCH_SIZE).toBeLessThanOrEqual(500);
  });
});
