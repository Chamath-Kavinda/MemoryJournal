import {
  signOutAndWipe,
  signOutDialog,
  waitForPendingWrites,
  type SignOutSteps,
} from './signOutService';

const noSleep = async () => undefined;

function steps(order: string[], overrides: Partial<SignOutSteps> = {}): SignOutSteps {
  const record = (name: string) => async () => {
    order.push(name);
  };
  return {
    signOut: record('signOut'),
    shutDown: record('shutDown'),
    clearDrafts: record('clearDrafts'),
    clearReminder: record('clearReminder'),
    forgetRepository: () => {
      order.push('forgetRepository');
    },
    restartAuthListener: () => {
      order.push('restartAuthListener');
    },
    ...overrides,
  };
}

describe('waitForPendingWrites', () => {
  it('returns 0 at once when nothing is pending', async () => {
    expect(await waitForPendingWrites({ pendingWriteCount: () => 0 }, 5000, noSleep)).toBe(0);
  });

  it('returns 0 when the writes finish in time', async () => {
    let pending = 2;
    const count = await waitForPendingWrites(
      {
        pendingWriteCount: () => pending,
      },
      5000,
      async () => {
        pending -= 1;
      },
    );
    expect(count).toBe(0);
  });

  it('gives up after the wait and reports what is left', async () => {
    let sleeps = 0;
    const count = await waitForPendingWrites({ pendingWriteCount: () => 3 }, 5000, async () => {
      sleeps += 1;
    });
    expect(count).toBe(3);
    expect(sleeps).toBe(50);
  });
});

describe('signOutDialog', () => {
  it('names the account and says the journal leaves this device', () => {
    const dialog = signOutDialog('a@example.com', 0);
    expect(dialog.message).toContain('Sign out of a@example.com?');
    expect(dialog.message).toContain('removes the journal from this device');
    expect(dialog.confirmLabel).toBe('Sign out');
  });

  it('warns about changes that are not uploaded and changes the button', () => {
    const dialog = signOutDialog('a@example.com', 2);
    expect(dialog.message).toContain('2 changes are not uploaded yet and will be lost');
    expect(dialog.confirmLabel).toBe('Sign out anyway');
    expect(signOutDialog(null, 1).message).toContain('1 change is not uploaded yet');
  });
});

describe('signOutAndWipe', () => {
  it('signs out, then wipes the device in order', async () => {
    const order: string[] = [];
    expect(await signOutAndWipe(steps(order))).toEqual({ status: 'signed-out' });
    expect(order).toEqual([
      'signOut',
      'shutDown',
      'clearDrafts',
      'clearReminder',
      'forgetRepository',
      'restartAuthListener',
    ]);
  });

  it('still wipes everything when one step fails, and reports the failure', async () => {
    const order: string[] = [];
    const result = await signOutAndWipe(
      steps(order, {
        shutDown: async () => {
          throw new Error('terminate failed');
        },
      }),
    );
    expect(result).toEqual({ status: 'error', message: 'terminate failed' });
    expect(order).toContain('clearDrafts');
    expect(order).toContain('restartAuthListener');
  });
});
