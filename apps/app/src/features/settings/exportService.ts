import {
  buildExport,
  chunk,
  exportFileName,
  serializeExport,
  type ExportBundle,
  type ExportNode,
} from '@memory-journal/core';
import { collection, doc, getDoc, getDocs, type DocumentData } from 'firebase/firestore';

import { getFirebase } from '@/lib/firebase';

import { deliverExport, type DeliveryResult } from './exportDelivery';

/** How many revision lists are read at the same time, so a long journal does not open hundreds of reads at once. */
const PARALLEL_READS = 20;

const userPath = (uid: string, ...rest: string[]): [string, ...string[]] => ['users', uid, ...rest];

async function readDocuments(uid: string, name: string): Promise<ExportNode[]> {
  const { db } = getFirebase();
  const snapshot = await getDocs(collection(db, ...userPath(uid, name)));
  return snapshot.docs.map((entry) => ({ id: entry.id, data: entry.data(), revisions: [] }));
}

/** Days and library pages: each document with every revision stored under it. */
async function readWithRevisions(uid: string, name: string): Promise<ExportNode[]> {
  const { db } = getFirebase();
  const parents = await readDocuments(uid, name);
  for (const group of chunk(parents, PARALLEL_READS)) {
    await Promise.all(
      group.map(async (parent) => {
        const snapshot = await getDocs(
          collection(db, ...userPath(uid, name, parent.id, 'revisions')),
        );
        parent.revisions = snapshot.docs.map((entry) => ({
          id: entry.id,
          data: entry.data(),
          revisions: [],
        }));
      }),
    );
  }
  return parents;
}

/**
 * Reads everything the signed-in user owns and returns it as an export (section 5.9). Any read
 * that fails rejects, so a partial file is never handed over as if it were complete.
 */
export async function loadExport(uid: string, nowMs: number = Date.now()): Promise<ExportBundle> {
  const { db } = getFirebase();
  const [profile, tutorials, days, library, tags, tagCategories] = await Promise.all([
    getDoc(doc(db, ...userPath(uid))),
    getDoc(doc(db, ...userPath(uid, 'progress', 'tutorials'))),
    readWithRevisions(uid, 'days'),
    readWithRevisions(uid, 'library'),
    readDocuments(uid, 'tags'),
    readDocuments(uid, 'tagCategories'),
  ]);
  const data = (snapshot: { exists: () => boolean; data: () => DocumentData | undefined }) =>
    snapshot.exists() ? (snapshot.data() ?? null) : null;

  return buildExport({
    exportedAt: nowMs,
    profile: data(profile),
    tutorials: data(tutorials),
    days,
    library,
    tags,
    tagCategories,
  });
}

/** Reads everything, then saves or shares it as one JSON file named for the person's local day. */
export async function exportAllData(
  uid: string,
  todayId: string,
  nowMs: number = Date.now(),
): Promise<DeliveryResult> {
  const bundle = await loadExport(uid, nowMs);
  return deliverExport(exportFileName(todayId), serializeExport(bundle));
}
