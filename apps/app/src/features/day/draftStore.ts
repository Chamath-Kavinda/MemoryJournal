import { isContentEmpty, type DayContent, type EpochMs } from '@memory-journal/core';
import { z } from 'zod';

/** The part of AsyncStorage the drafts need, so tests can use an in-memory fake. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface StoredDraft {
  content: DayContent;
  savedAt: EpochMs;
}

const draftSchema = z.object({
  version: z.literal(1),
  savedAt: z.number(),
  content: z.object({
    freeNotes: z.string(),
    blocks: z.array(
      z.object({
        hour: z.number().int().min(0).max(23),
        minute: z.number().int().min(0).max(59).nullable(),
        text: z.string(),
      }),
    ),
  }),
});

/** One draft per user and day, so two accounts on one device never see each other's text. */
export function draftKey(uid: string, dayId: string): string {
  return `draft:v1:${uid}:${dayId}`;
}

/** The owner name used for a guest's drafts. A Firebase account id never looks like this. */
export const GUEST_DRAFT_OWNER = 'guest';

/** Who a draft belongs to: the signed-in account, or the guest when nobody is signed in. */
export function draftOwner(uid: string | undefined): string {
  return uid ?? GUEST_DRAFT_OWNER;
}

/**
 * The local draft of a day, or null if there is none. A draft that cannot be parsed or does
 * not match the expected shape is treated as missing instead of crashing the screen. A
 * failure of the storage itself is not hidden: it rejects, so the caller can tell the user.
 */
export async function loadDraft(
  storage: KeyValueStorage,
  uid: string,
  dayId: string,
): Promise<StoredDraft | null> {
  const raw = await storage.getItem(draftKey(uid, dayId));
  if (raw === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = draftSchema.safeParse(json);
  return parsed.success ? { content: parsed.data.content, savedAt: parsed.data.savedAt } : null;
}

/** Saves the draft. A day with nothing written has no draft, so any old one is removed. */
export async function saveDraft(
  storage: KeyValueStorage,
  uid: string,
  dayId: string,
  content: DayContent,
  now: EpochMs,
): Promise<void> {
  const key = draftKey(uid, dayId);
  if (isContentEmpty(content)) {
    await storage.removeItem(key);
    return;
  }
  await storage.setItem(key, JSON.stringify({ version: 1, savedAt: now, content }));
}

export async function clearDraft(
  storage: KeyValueStorage,
  uid: string,
  dayId: string,
): Promise<void> {
  await storage.removeItem(draftKey(uid, dayId));
}
