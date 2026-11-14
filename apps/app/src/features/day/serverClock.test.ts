const mockUpdateDoc = jest.fn();
const mockGetDocFromServer = jest.fn();

jest.mock('@/lib/firebase', () => ({ getFirebase: () => ({ db: {} }) }));
jest.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
  serverTimestamp: () => 'SERVER_TIME',
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  getDocFromServer: (...args: unknown[]) => mockGetDocFromServer(...args),
}));

import { measureServerOffset } from './serverClock';

describe('measureServerOffset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(10_000);
  });

  afterEach(() => jest.useRealTimers());

  it('stamps the user document and returns the offset from the device clock', async () => {
    mockUpdateDoc.mockResolvedValue(undefined);
    mockGetDocFromServer.mockImplementation(() => {
      jest.setSystemTime(10_200);
      return Promise.resolve({ get: () => ({ toMillis: () => 70_100 }) });
    });

    await expect(measureServerOffset('u1')).resolves.toBe(60_000);

    const [ref, data] = mockUpdateDoc.mock.calls[0] as [{ path: string }, Record<string, unknown>];
    expect(ref.path).toBe('users/u1');
    expect(data).toEqual({ clockProbeAt: 'SERVER_TIME' });
  });

  it('returns null when the server time is missing', async () => {
    mockUpdateDoc.mockResolvedValue(undefined);
    mockGetDocFromServer.mockResolvedValue({ get: () => undefined });

    await expect(measureServerOffset('u1')).resolves.toBeNull();
  });

  it('returns null when offline', async () => {
    mockUpdateDoc.mockRejectedValue(new Error('unavailable'));

    await expect(measureServerOffset('u1')).resolves.toBeNull();
    expect(mockGetDocFromServer).not.toHaveBeenCalled();
  });
});
