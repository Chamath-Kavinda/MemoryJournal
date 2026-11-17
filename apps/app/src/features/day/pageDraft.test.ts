import type { DayContent } from '@memory-journal/core';

import { contentToSave, draftAfterTyping, draftText, pageChanged } from './pageDraft';

const legacy: DayContent = {
  freeNotes: 'Woke early.',
  blocks: [{ hour: 21, minute: 25, text: 'Dinner' }],
};
const page: DayContent = { freeNotes: 'Woke early.\n⏱ 21:25\nDinner', blocks: [] };

describe('pageDraft', () => {
  it('shows a legacy pass as its page', () => {
    expect(draftText(legacy)).toBe('Woke early.\n\n⏱ 21:25\nDinner');
    expect(draftText(page)).toBe(page.freeNotes);
  });

  it('keeps what was typed, including a trailing space or line break', () => {
    expect(draftAfterTyping('hello \n')).toEqual({ freeNotes: 'hello \n', blocks: [] });
  });

  it('does not count trailing spaces or blank lines as a change', () => {
    expect(
      pageChanged(draftAfterTyping('Woke early.   \n\n'), { freeNotes: 'Woke early.', blocks: [] }),
    ).toBe(false);
    expect(
      pageChanged(draftAfterTyping('Woke late.'), { freeNotes: 'Woke early.', blocks: [] }),
    ).toBe(true);
  });

  it('saves the saved pass itself when nothing changed, so a legacy day is not rewritten', () => {
    expect(contentToSave(legacy, legacy)).toBe(legacy);
    expect(contentToSave(draftAfterTyping(draftText(legacy)), legacy)).toBe(legacy);
  });

  it('saves a changed page in the page shape with no blocks and no trailing blanks', () => {
    expect(contentToSave(draftAfterTyping('New text  \n\n'), legacy)).toEqual({
      freeNotes: 'New text',
      blocks: [],
    });
  });
});
