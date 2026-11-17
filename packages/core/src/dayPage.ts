import { sortBlocks, type DayContent } from './revisions';
import { formatTimeLine, timeBlocksOf } from './timeLines';
import type { DayBlock } from './types';

/**
 * The day page (section 18.5). A pass saved from v0.2.4 holds the whole page as typed in
 * `freeNotes` and an empty `blocks` list, because `normalizeContent` sorts blocks into time order
 * and that would reorder what the person wrote. A pass written before then holds Free Notes plus
 * hourly blocks. These helpers read both the same way.
 */

/** True for a pass in the page shape (no blocks), which is also how a library page is stored. */
export function isPageContent(content: DayContent): boolean {
  return content.blocks.length === 0;
}

/**
 * The page text of any pass. A page-shaped pass is returned as it is. A legacy pass becomes its
 * Free Notes, then each block that has text in time order as a time line followed by its text.
 */
export function pageOf(content: DayContent): string {
  if (isPageContent(content)) return content.freeNotes;
  const parts: string[] = [];
  if (content.freeNotes.trim() !== '') parts.push(content.freeNotes.trimEnd());
  for (const block of sortBlocks(content.blocks)) {
    if (block.text.trim() === '') continue;
    parts.push(`${formatTimeLine(block.hour, block.minute)}\n${block.text.trim()}`);
  }
  return parts.join('\n\n');
}

/**
 * The content to store for a page typed by the person: line endings are `\n`, spaces at the end of
 * a line are removed, and blank lines at the end are dropped. `blocks` stays empty.
 */
export function contentFromPage(text: string): DayContent {
  const cleaned = text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\s+$/, '');
  return { freeNotes: cleaned, blocks: [] };
}

/**
 * Every time block of a pass that has text, for the score: the legacy blocks plus the blocks the
 * time lines of the page make. Text before the first time line is not a block.
 */
export function timeBlocksOfContent(content: DayContent): DayBlock[] {
  const fromPage = timeBlocksOf(content.freeNotes);
  return [...content.blocks, ...fromPage].filter((block) => block.text.trim() !== '');
}
