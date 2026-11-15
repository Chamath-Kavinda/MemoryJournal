import { useTagErrorStore, watchWrite } from './tagErrors';

beforeEach(() => useTagErrorStore.getState().clear());

describe('watchWrite', () => {
  it('reports a refused write', async () => {
    watchWrite(Promise.reject(new Error('denied')), 'The tag could not be saved.');
    await Promise.resolve();
    await Promise.resolve();
    expect(useTagErrorStore.getState().message).toBe('The tag could not be saved.');
  });

  it('stays quiet when the write succeeds', async () => {
    watchWrite(Promise.resolve(), 'unused');
    await Promise.resolve();
    expect(useTagErrorStore.getState().message).toBeNull();
  });

  it('can be cleared', () => {
    useTagErrorStore.getState().report('x');
    useTagErrorStore.getState().clear();
    expect(useTagErrorStore.getState().message).toBeNull();
  });
});
