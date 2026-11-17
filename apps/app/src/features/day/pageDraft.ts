import { contentFromPage, pageOf, type DayContent } from '@memory-journal/core';

/**
 * The text of a pass as the editor shows it and as it would be stored (section 18.5): line
 * endings are `\n`, spaces at the end of a line and blank lines at the end are gone.
 */
function storedPage(content: DayContent): string {
  return contentFromPage(pageOf(content)).freeNotes;
}

/** True when the page being written differs from the saved pass. Typing a trailing space does not count. */
export function pageChanged(draft: DayContent, saved: DayContent): boolean {
  return storedPage(draft) !== storedPage(saved);
}

/**
 * What to save for the page being written. When the text did not change, the saved pass itself is
 * returned, so a day written before v0.2.4 is never rewritten into the new shape without an edit
 * (section 18.7). Otherwise the page is stored as one text with no blocks.
 */
export function contentToSave(draft: DayContent, saved: DayContent): DayContent {
  return pageChanged(draft, saved) ? contentFromPage(pageOf(draft)) : saved;
}

/** The draft as the page it shows: the text of the pass in the page shape, kept as typed. */
export function draftText(draft: DayContent): string {
  return pageOf(draft);
}

/** The draft after typing: the whole page in `freeNotes` with no blocks, spaces kept as typed. */
export function draftAfterTyping(text: string): DayContent {
  return { freeNotes: text, blocks: [] };
}
