import type { DayId, EpochMs, ThemePreference, UserSettings } from './types';

/** Settings a person has when nothing is stored yet: reminder on, theme Dark (section 15.7). */
export const DEFAULT_SETTINGS: UserSettings = { reminderEnabled: true, theme: 'dark' };

const THEMES: readonly ThemePreference[] = ['system', 'light', 'dark'];

/**
 * Reads the `settings` field of the user document. A missing field, or a value of the wrong
 * type, falls back to the default for that one setting, so a half-written document never
 * turns the reminder off by accident.
 */
export function readSettings(raw: unknown): UserSettings {
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    reminderEnabled:
      typeof source.reminderEnabled === 'boolean'
        ? source.reminderEnabled
        : DEFAULT_SETTINGS.reminderEnabled,
    theme: THEMES.includes(source.theme as ThemePreference)
      ? (source.theme as ThemePreference)
      : DEFAULT_SETTINGS.theme,
  };
}

export const EXPORT_FORMAT = 'memory-journal-export';
export const EXPORT_VERSION = 1;

/** One Firestore document, made safe for JSON, with the revisions that sit under it. */
export interface ExportNode {
  id: string;
  data: Record<string, unknown>;
  revisions: ExportNode[];
}

export interface ExportInput {
  exportedAt: EpochMs;
  profile: Record<string, unknown> | null;
  days: ExportNode[];
  library: ExportNode[];
  tags: ExportNode[];
  tagCategories: ExportNode[];
  tutorials: Record<string, unknown> | null;
}

export interface ExportBundle {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  profile: Record<string, unknown> | null;
  days: ExportNode[];
  library: ExportNode[];
  tags: ExportNode[];
  tagCategories: ExportNode[];
  tutorials: Record<string, unknown> | null;
}

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function hasToMillis(value: object): value is { toMillis: () => number } {
  return typeof (value as { toMillis?: unknown }).toMillis === 'function';
}

/**
 * Turns stored data into plain JSON. Firestore timestamps (anything with `toMillis`) become
 * ISO 8601 strings in UTC; `undefined` fields are left out; anything that cannot be written
 * as JSON (functions, symbols, non-finite numbers) becomes null.
 */
export function toJsonSafe(value: unknown): Json {
  if (value === null || value === undefined) return null;
  if (typeof value === 'boolean' || typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (typeof value === 'object') {
    if (hasToMillis(value)) return new Date(value.toMillis()).toISOString();
    const result: { [key: string]: Json } = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) result[key] = toJsonSafe(entry);
    }
    return result;
  }
  return null;
}

const byId = (a: ExportNode, b: ExportNode): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Revisions are numbered documents ("1", "2", "10"), so they sort as numbers, not as text. */
const byRevision = (a: ExportNode, b: ExportNode): number => {
  const left = Number(a.id);
  const right = Number(b.id);
  if (Number.isFinite(left) && Number.isFinite(right) && left !== right) return left - right;
  return byId(a, b);
};

function cleanNode(node: ExportNode): ExportNode {
  return {
    id: node.id,
    data: toJsonSafe(node.data) as Record<string, unknown>,
    revisions: [...node.revisions].sort(byRevision).map(cleanNode),
  };
}

/**
 * The file the person downloads for "export all data" (section 5.9). Everything they own is in
 * it: profile, every day and library page with all revisions, tags, categories and lesson
 * progress. Output order is fixed (days by date, revisions by number) so two exports of the
 * same data are identical, apart from `exportedAt`.
 */
export function buildExport(input: ExportInput): ExportBundle {
  const list = (nodes: ExportNode[]) => [...nodes].sort(byId).map(cleanNode);
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date(input.exportedAt).toISOString(),
    profile: input.profile === null ? null : (toJsonSafe(input.profile) as Record<string, unknown>),
    days: list(input.days),
    library: list(input.library),
    tags: list(input.tags),
    tagCategories: list(input.tagCategories),
    tutorials:
      input.tutorials === null ? null : (toJsonSafe(input.tutorials) as Record<string, unknown>),
  };
}

export function serializeExport(bundle: ExportBundle): string {
  return JSON.stringify(bundle, null, 2);
}

/** For example `memory-journal-export-2026-11-15.json`, dated with the person's local day. */
export function exportFileName(todayId: DayId): string {
  return `memory-journal-export-${todayId}.json`;
}

/** The word the person types to confirm deleting their account (second confirmation step). */
export const DELETE_CONFIRM_WORD = 'DELETE';

/** Case and surrounding spaces do not matter; the word itself does. */
export function isDeleteConfirmed(typed: string): boolean {
  return typed.trim().toUpperCase() === DELETE_CONFIRM_WORD;
}

/** Firestore allows 500 writes in one batch; deletions are grouped well under that. */
export const DELETE_BATCH_SIZE = 400;

/** Splits a list into groups of at most `size`. A size below 1 is treated as 1. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const step = Math.max(1, Math.floor(size));
  const groups: T[][] = [];
  for (let start = 0; start < items.length; start += step) {
    groups.push(items.slice(start, start + step));
  }
  return groups;
}
