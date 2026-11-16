import { watchJournal } from './watchJournal';

const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

function fakeRepository() {
  const listeners = new Set<() => void>();
  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    notify: () => listeners.forEach((listener) => listener()),
    count: () => listeners.size,
  };
}

describe('watchJournal', () => {
  it('reads at once and again after every change', async () => {
    const repository = fakeRepository();
    let value = 1;
    const onChange = jest.fn();

    watchJournal(repository, () => Promise.resolve(value), onChange, jest.fn());
    await settle();
    value = 2;
    repository.notify();
    await settle();

    expect(onChange.mock.calls).toEqual([[1], [2]]);
  });

  it('drops a slow read that a newer one has overtaken', async () => {
    const repository = fakeRepository();
    const resolvers: Array<(value: string) => void> = [];
    const onChange = jest.fn();

    watchJournal(
      repository,
      () => new Promise<string>((resolve) => resolvers.push(resolve)),
      onChange,
      jest.fn(),
    );
    repository.notify();
    resolvers[1]!('new');
    await settle();
    resolvers[0]!('old');
    await settle();

    expect(onChange.mock.calls).toEqual([['new']]);
  });

  it('passes errors on, as an Error even when something else was thrown', async () => {
    const repository = fakeRepository();
    const onError = jest.fn();

    watchJournal(repository, () => Promise.reject('offline'), jest.fn(), onError);
    await settle();

    expect(onError).toHaveBeenCalledWith(new Error('offline'));
  });

  it('stops listening and ignores a read still in flight', async () => {
    const repository = fakeRepository();
    let resolve: (value: string) => void = () => {};
    const onChange = jest.fn();

    const stop = watchJournal(
      repository,
      () => new Promise<string>((r) => (resolve = r)),
      onChange,
      jest.fn(),
    );
    stop();
    resolve('late');
    await settle();

    expect(repository.count()).toBe(0);
    expect(onChange).not.toHaveBeenCalled();
  });
});
