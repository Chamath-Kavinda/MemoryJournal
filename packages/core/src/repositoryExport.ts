import { buildExport, chunk, type ExportBundle, type ExportNode } from './accountData';
import type { JournalRepository } from './journalRepository';
import type { EpochMs } from './types';

/** How many revision lists are read at the same time. */
const PARALLEL_READS = 20;

/** Plain-object copy, so typed records fit the loose `data` shape of an export node. */
const asData = (value: object): Record<string, unknown> => ({ ...value });

async function withRevisions<P extends object, R extends object>(
  parents: readonly P[],
  idOf: (parent: P) => string,
  readRevisions: (id: string) => Promise<R[]>,
  revisionId: (revision: R) => string,
): Promise<ExportNode[]> {
  const nodes: ExportNode[] = [];
  for (const group of chunk(parents, PARALLEL_READS)) {
    const built = await Promise.all(
      group.map(async (parent): Promise<ExportNode> => {
        const id = idOf(parent);
        const revisions = await readRevisions(id);
        return {
          id,
          data: asData(parent),
          revisions: revisions.map((revision) => ({
            id: revisionId(revision),
            data: asData(revision),
            revisions: [],
          })),
        };
      }),
    );
    nodes.push(...built);
  }
  return nodes;
}

/**
 * Builds the "export all data" file from a journal repository, in the same format as the
 * account export (docs section 5.9). A guest has no account document, so `profile` carries the
 * settings and stats the repository holds, or is null when neither exists. Any failed read
 * rejects, so a partial file is never handed over as complete.
 */
export async function exportFromRepository(
  repository: JournalRepository,
  exportedAt: EpochMs,
): Promise<ExportBundle> {
  const [days, library, tags, categories, tutorials, settings, stats] = await Promise.all([
    repository.listDays(),
    repository.listLibrary(),
    repository.listTags(),
    repository.listCategories(),
    repository.getTutorialProgress(),
    repository.getSettings(),
    repository.getStats(),
  ]);

  const [dayNodes, libraryNodes] = await Promise.all([
    withRevisions(
      days,
      (day) => day.date,
      (id) => repository.listRevisions(id),
      (revision) => String(revision.n),
    ),
    withRevisions(
      library,
      (item) => item.id,
      (id) => repository.listLibraryRevisions(id),
      (revision) => String(revision.n),
    ),
  ]);

  const entry = (item: { id: string }): ExportNode => ({
    id: item.id,
    data: asData(item),
    revisions: [],
  });

  return buildExport({
    exportedAt,
    profile: settings || stats ? { settings, stats } : null,
    days: dayNodes,
    library: libraryNodes,
    tags: tags.map(entry),
    tagCategories: categories.map(entry),
    tutorials: asData(tutorials),
  });
}
