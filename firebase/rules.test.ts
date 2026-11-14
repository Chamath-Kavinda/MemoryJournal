import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { addDays, dayIdFromUtc } from '@memory-journal/core';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';

// The emulator evaluates request.time with the real clock and it cannot be mocked.
// So each test picks a stored UTC offset that puts the user's local time a safe
// margin (30 minutes) away from 21:00. The exact 20:59 / 21:00 boundary is covered
// by the unit tests in packages/core.

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_DAY = 1440;

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-memory-journal',
    firestore: { rules: readFileSync(join(__dirname, 'firestore.rules'), 'utf8') },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

/** UTC offset (minutes) that makes the local time of day right now equal to `hour:minute`. */
function offsetForLocalTime(hour: number, minute: number): number {
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const exact = (hour * 60 + minute - utcMinutes + 2 * MINUTES_PER_DAY) % MINUTES_PER_DAY;
  // Real offsets are multiples of 15 minutes, which the rules require on profile writes.
  const raw = (Math.round(exact / 15) * 15) % MINUTES_PER_DAY;
  return raw > 840 ? raw - MINUTES_PER_DAY : raw;
}

const BEFORE_UNLOCK = offsetForLocalTime(20, 30);
const AFTER_UNLOCK = offsetForLocalTime(21, 30);

function todayFor(offset: number): string {
  return dayIdFromUtc(Date.now(), offset);
}

async function seedUser(uid: string, utcOffsetMinutes: number | null = AFTER_UNLOCK) {
  await env.withSecurityRulesDisabled(async (context) => {
    const data: Record<string, unknown> = { displayName: 'Test', createdAt: Date.now() };
    if (utcOffsetMinutes !== null) data['utcOffsetMinutes'] = utcOffsetMinutes;
    await setDoc(doc(context.firestore(), 'users', uid), data);
  });
}

function revisionData(extra: Record<string, unknown> = {}) {
  return {
    n: 1,
    createdAt: Timestamp.now(),
    closedAt: null,
    kind: 'first',
    freeNotes: 'something I remembered',
    blocks: [],
    mentions: [],
    wordCount: 3,
    addedWordCount: 3,
    ...extra,
  };
}

async function seedRevision(uid: string, dayId: string, n: string, extra = {}) {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', uid, 'days', dayId, 'revisions', n), {
      ...revisionData(),
      ...extra,
    });
  });
}

describe('owner-only access', () => {
  const paths: string[][] = [
    ['users', 'alice'],
    ['users', 'alice', 'days', '2020-01-01'],
    ['users', 'alice', 'days', '2020-01-01', 'revisions', '1'],
    ['users', 'alice', 'tagCategories', 'c1'],
    ['users', 'alice', 'tags', 't1'],
    ['users', 'alice', 'library', 'l1'],
    ['users', 'alice', 'library', 'l1', 'revisions', '1'],
    ['users', 'alice', 'progress', 'tutorials'],
  ];

  test.each(paths)('another user cannot read %s/%s…', async (...segments) => {
    await seedUser('alice');
    await env.withSecurityRulesDisabled(async (context) => {
      const [first, ...rest] = segments as [string, ...string[]];
      await setDoc(doc(context.firestore(), first, ...rest), { text: 'private' });
    });
    const bob = env.authenticatedContext('bob').firestore();
    const [first, ...rest] = segments as [string, ...string[]];
    await assertFails(getDoc(doc(bob, first, ...rest)));
  });

  test('another user cannot write into a user tree', async () => {
    await seedUser('alice');
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(setDoc(doc(bob, 'users', 'alice', 'tags', 't1'), { name: 'x' }));
    await assertFails(setDoc(doc(bob, 'users', 'alice'), { displayName: 'hijack' }));
  });

  test('signed-out clients cannot read or write', async () => {
    await seedUser('alice');
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, 'users', 'alice')));
    await assertFails(setDoc(doc(anon, 'users', 'alice', 'tags', 't1'), { name: 'x' }));
  });

  test('the owner can read and write their own tree', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(alice, 'users', 'alice'), { displayName: 'Alice' }));
    await assertSucceeds(setDoc(doc(alice, 'users', 'alice', 'tags', 't1'), { name: 'Mum' }));
    await assertSucceeds(getDoc(doc(alice, 'users', 'alice', 'tags', 't1')));
    await assertSucceeds(
      setDoc(doc(alice, 'users', 'alice', 'library', 'l1'), { type: 'movie', title: 'x' }),
    );
  });

  test('paths outside users/{uid} are denied even for signed-in users', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(alice, 'public', 'notes'), { text: 'x' }));
    await assertFails(setDoc(doc(alice, 'users', 'alice', 'unknown', 'u1'), { text: 'x' }));
  });
});

describe('user profile offset', () => {
  test('accepts a real time zone offset', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(alice, 'users', 'alice'), { utcOffsetMinutes: 330 }));
    await assertSucceeds(setDoc(doc(alice, 'users', 'alice'), { utcOffsetMinutes: -210 }));
  });

  test.each([841, -721, 7, 330.5, 1000000])('rejects offset %p', async (offset) => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(alice, 'users', 'alice'), { utcOffsetMinutes: offset }));
  });

  test('rejects a non-numeric offset', async () => {
    const alice = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(alice, 'users', 'alice'), { utcOffsetMinutes: '330' }));
  });
});

describe('revision create: future days and the 21:00 unlock', () => {
  const revisionRef = (uid: string, dayId: string, n = '1') =>
    doc(env.authenticatedContext(uid).firestore(), 'users', uid, 'days', dayId, 'revisions', n);

  test('today before 21:00 local is denied', async () => {
    await seedUser('alice', BEFORE_UNLOCK);
    await assertFails(setDoc(revisionRef('alice', todayFor(BEFORE_UNLOCK)), revisionData()));
  });

  test('today at or after 21:00 local is allowed', async () => {
    await seedUser('alice', AFTER_UNLOCK);
    await assertSucceeds(setDoc(revisionRef('alice', todayFor(AFTER_UNLOCK)), revisionData()));
  });

  test('a future day is denied, even after 21:00', async () => {
    await seedUser('alice', AFTER_UNLOCK);
    const tomorrow = addDays(todayFor(AFTER_UNLOCK), 1);
    await assertFails(setDoc(revisionRef('alice', tomorrow), revisionData()));
    await assertFails(
      setDoc(revisionRef('alice', addDays(todayFor(AFTER_UNLOCK), 400)), revisionData()),
    );
  });

  test('a past day is always allowed, also before 21:00', async () => {
    await seedUser('alice', BEFORE_UNLOCK);
    const yesterday = addDays(todayFor(BEFORE_UNLOCK), -1);
    await assertSucceeds(setDoc(revisionRef('alice', yesterday), revisionData()));
    await assertSucceeds(setDoc(revisionRef('alice', '2020-02-29', '2'), revisionData({ n: 2 })));
  });

  test('changing the device clock cannot unlock today: only the stored offset and server time count', async () => {
    await seedUser('alice', BEFORE_UNLOCK);
    // The client sends a createdAt far in the future; the rules ignore it.
    const forged = revisionData({
      createdAt: Timestamp.fromMillis(Date.now() + 12 * 60 * MS_PER_MINUTE),
    });
    await assertFails(setDoc(revisionRef('alice', todayFor(BEFORE_UNLOCK)), forged));
  });

  test('a malformed day id is denied', async () => {
    await seedUser('alice', AFTER_UNLOCK);
    for (const bad of [
      '2020-1-1',
      'yesterday',
      '2020-13-01',
      '2020-00-10',
      '2020-01-32',
      '20200101',
    ]) {
      await assertFails(setDoc(revisionRef('alice', bad), revisionData()));
    }
  });

  test('is denied when the user has no profile or no stored offset', async () => {
    await assertFails(setDoc(revisionRef('alice', '2020-01-01'), revisionData()));
    await seedUser('alice', null);
    await assertFails(setDoc(revisionRef('alice', '2020-01-01'), revisionData()));
  });

  test('another user cannot create a revision in alice’s day', async () => {
    await seedUser('alice', AFTER_UNLOCK);
    await seedUser('bob', AFTER_UNLOCK);
    const bob = env.authenticatedContext('bob').firestore();
    await assertFails(
      setDoc(doc(bob, 'users', 'alice', 'days', '2020-01-01', 'revisions', '1'), revisionData()),
    );
  });
});

describe('revision immutability after the sitting closes', () => {
  const ref = (uid: string, dayId: string, n = '1') =>
    doc(env.authenticatedContext(uid).firestore(), 'users', uid, 'days', dayId, 'revisions', n);

  test('an open revision can be updated and then closed', async () => {
    await seedUser('alice');
    await seedRevision('alice', '2020-01-01', '1');
    await assertSucceeds(updateDoc(ref('alice', '2020-01-01'), { freeNotes: 'more detail' }));
    await assertSucceeds(updateDoc(ref('alice', '2020-01-01'), { closedAt: Timestamp.now() }));
  });

  test('a revision without a closedAt field counts as open', async () => {
    await seedUser('alice');
    await env.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), 'users', 'alice', 'days', '2020-01-01', 'revisions', '1'),
        {
          n: 1,
          freeNotes: 'x',
        },
      );
    });
    await assertSucceeds(updateDoc(ref('alice', '2020-01-01'), { freeNotes: 'y' }));
  });

  test('a closed revision cannot be updated or deleted', async () => {
    await seedUser('alice');
    await seedRevision('alice', '2020-01-01', '1', { closedAt: Timestamp.now() });
    await assertFails(updateDoc(ref('alice', '2020-01-01'), { freeNotes: 'rewrite history' }));
    await assertFails(updateDoc(ref('alice', '2020-01-01'), { closedAt: null }));
    await assertFails(deleteDoc(ref('alice', '2020-01-01')));
  });

  test('a closed revision can still be read by its owner', async () => {
    await seedUser('alice');
    await seedRevision('alice', '2020-01-01', '1', { closedAt: Timestamp.now() });
    await assertSucceeds(getDoc(ref('alice', '2020-01-01')));
  });

  test('an open revision can be deleted', async () => {
    await seedUser('alice');
    await seedRevision('alice', '2020-01-01', '1');
    await assertSucceeds(deleteDoc(ref('alice', '2020-01-01')));
  });

  test('closed revisions can be deleted once account deletion has been requested', async () => {
    await seedUser('alice');
    await seedRevision('alice', '2020-01-01', '1', { closedAt: Timestamp.now() });
    const alice = env.authenticatedContext('alice').firestore();
    await assertFails(deleteDoc(ref('alice', '2020-01-01')));
    await assertSucceeds(
      updateDoc(doc(alice, 'users', 'alice'), { deletionRequestedAt: Timestamp.now() }),
    );
    await assertSucceeds(deleteDoc(ref('alice', '2020-01-01')));
  });

  test('another user cannot unlock deletion for someone else', async () => {
    await seedUser('alice');
    await seedUser('bob');
    await seedRevision('alice', '2020-01-01', '1', { closedAt: Timestamp.now() });
    const bob = env.authenticatedContext('bob').firestore();
    await assertSucceeds(
      updateDoc(doc(bob, 'users', 'bob'), { deletionRequestedAt: Timestamp.now() }),
    );
    await assertFails(
      deleteDoc(doc(bob, 'users', 'alice', 'days', '2020-01-01', 'revisions', '1')),
    );
  });
});
