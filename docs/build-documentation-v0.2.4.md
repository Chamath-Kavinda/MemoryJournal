# Memory Journal App: Build Documentation v0.2.4

> [Index](build-documentation.md) | Previous: [v0.2.3](build-documentation-v0.2.3.md) | Next: [v0.2.5](build-documentation-v0.2.5.md)
> Where the numbered sections live: see the table in the [index](build-documentation.md). Section numbers are the same as in the old single file, so references such as "section 15.16" still point to the right place.

> This file holds section 18 (18.1 to 18.10): Day page with one free writing space.

## 18. Version 0.2.4: Day page with one free writing space

This section is the plan for release v0.2.4. It was written after v0.2.3 was used on a real device. It replaces the way a day is shown and written: no more Free Notes block and 24 hourly rows. A day opens as a read-only page, and a pencil turns it into one free writing space. It does not change the journal rules (21:00 unlock, revisions, tags, score, streak). Where this section and sections 1 to 17 disagree, this section wins. Sections 5.3 and 15.11 (Day) describe the old screen and are replaced by 18.2 to 18.6.

This change is documentation only. No code is written until the plan below is committed.

### 18.1 What was seen

- Tapping a date opens a writer straight away, with a Free Notes block and 24 hourly rows. The person only wants to read the day and does not want the rows.
- The person wants to write anything in one free space, mark a time (the hour only, or the hour with minutes) only where it is useful, and add tags from the same categories as the Tags screen.

### 18.2 The Day screen has two modes

The route stays `/day/[dayId]`. The mode is state of the screen, not part of the address.

**View mode (the default).** Tapping a date, or any link to a day, opens this.

- Header: Back icon, the date, the lock chip (section 15.11) and a Pencil icon button (accessibility label "Edit day"). Nothing in view mode can be typed into.
- Body: the saved page, in the order it was written. A time line shows as a small clock chip (`21:00` for an hour only, `21:25` for hour and minutes) with the text under it. A tag mention shows as a tag chip with the tag name, and pressing it opens the tag detail screen. Legacy days (18.7) show their Free Notes first, then their time rows in time order, in the same style.
- The revision toggle (Latest, 1st, 2nd and so on) and the Highlight additions switch stay here, exactly as in section 5.3 and D-021. Older passes are always read-only.
- An empty day shows a large icon, the sentence "Nothing written for this day yet." and a gradient Write button (PenLine) that does the same as the pencil. A future day is not openable (section 5.3). Today before 21:00 stays read-only: the Pencil is disabled, the lock chip shows the countdown, and a day that already has text can still be read.
- Home's Write today button opens today in edit mode when it is writable.

**Edit mode.** Pressing the Pencil (or Write) on the Latest pass switches the same screen to editing.

- Header: a Close icon (X, label "Cancel") and a gradient Save button. The Pencil is hidden.
- One large multiline text field fills the screen under the header, with no Free Notes block, no hourly rows and no required structure. The person can write anything, in any order, and the field grows with the text and scrolls with the page.
- A toolbar sits above the keyboard, or at the bottom of the window, with two icon buttons: Clock (label "Add time") and Tag (label "Add tag"). Both insert at the cursor. If the person selects text first, Save as tag (section 5.3) stays available from the Tag sheet.
- Typing `@` still opens the suggestion list of saved tags, grouped by category (D-023).
- Draft autosave stays as in D-019: the text is kept on the device every few seconds and offered again after the app closes.
- Save writes a new pass or updates the open one by the same sitting rules as D-020, shows "All changes saved", and returns to View mode on the Latest pass. If nothing changed, Save just returns to View mode.
- Cancel or Back with unsaved changes opens the confirmation dialog of section 15.10: title "Discard changes?", buttons Keep editing and Discard changes. Discarding removes the draft and returns to View mode. Without changes it returns at once. Esc means Cancel on the web build and in the Windows app.

### 18.3 Add time

The Clock button opens a sheet (a bottom sheet on phones, a centered dialog on wide windows) with two choices, shown as a segmented control:

- **Hour only:** a grid of the 24 hours (00 to 23). Choosing one inserts the line for that hour.
- **Hour and minutes:** the same hour grid, plus a minute field that takes 0 to 59 (typed, with quick chips :00, :15, :30 and :45). The Insert button is enabled when both are chosen.

Both start with the device's current hour (and minute) preselected. The time uses the same 24-hour clock as the rest of the app.

A time is stored in the text as its own line: `⏱ 21` for an hour only and `⏱ 21:25` for hour and minutes (two digits for the hour, two for the minutes). A line is a time only when the whole line is exactly that, so the symbol inside a sentence stays plain text. The insert puts the line on its own line at the cursor, with a line break before it when the cursor is in the middle of a line, and puts the cursor on the next line. If the same time line already exists in the page, Add time moves the cursor to it instead of adding a second one. Two identical lines typed by hand are both kept; they are just text.

### 18.4 Add tag

The Tag button opens the existing searchable tag picker (D-023) as a sheet:

- Chips for every category on the Tags screen: All, People, Places, Numbers and every custom category, with the same icons (section 15.11). Choosing a chip filters the list; the search field matches the name or an alias.
- Choosing a tag inserts its mention at the cursor as `@Name`, stored as `{{tag:ID|Name}}`, with the spacing rules of D-023.
- A Create new tag row opens the tag form without leaving the Day screen (as in D-023), and the new tag is inserted at once.

### 18.5 Storage: no change to the schema or the rules

The text field is one string, so the revision stores the page as it was typed. To avoid a schema change and a rules change, the existing revision fields are used:

- A pass saved by v0.2.4 puts the whole page in `freeNotes` and saves `blocks` as an empty list. `normalizeContent` sorts blocks into time order, which would reorder what the person wrote, so new passes do not use blocks. Older versions of the app that read such a pass show it as plain free text, with the time lines readable as they are.
- `packages/core` gets a new module `dayPage.ts`, with tests:
  - `pageOf(content)` returns the page text of any pass: for a legacy pass, the Free Notes, then each non-empty block in time order as a time line followed by its text; for a v0.2.4 pass, `freeNotes` itself.
  - `contentFromPage(text)` returns the content to store: `freeNotes` is the text with line endings normalised to `\n` and trailing spaces and blank lines at the end removed, and `blocks` is empty.
  - `timeBlocksOf(text)` splits a page at its time lines into blocks (hour, minute or null, text) in the order written, which the score uses (18.6). The text before the first time line is not a block.
  - `parseTimeLine(line)` and `formatTimeLine(hour, minute)` read and write the time line, and `insertTimeLine(text, cursor, hour, minute)` and `insertAtCursor(text, cursor, insert)` do the cursor edits of 18.3 and 18.4, returning the new text and the new cursor.
- `countContentWords` and the Highlight additions comparison work on `pageOf(content)` with time lines left out, so a pass written in the old shape and one in the new shape compare fairly, and a time line never counts as a word.
- The day document keeps writing `mentions` (D-024) from the page text, so the tag screen still lists the day.

### 18.6 Score and streak

The recall score and the streak keep their rules, but they now read a pass through the helpers above:

- Detail uses the word count of revision 1 (time lines not counted).
- Coverage counts the distinct hours that have a time line followed by non-blank text before the next time line, from `timeBlocksOf(pageOf(content))`, so legacy blocks and new time lines count the same way.
- Precision counts the time lines that have minutes plus the distinct tags mentioned, as before.
- Later recall, Consistency and the streak (20 words, saved in the 21:00 window) are unchanged.
- Writing with no time lines is fine: Coverage and the minute part of Precision are then 0 for that day, which is the cost of not marking times, and the Insights text does not mention it as a fault.

### 18.7 Days written before v0.2.4

- Existing days and their passes are never rewritten. View mode shows them through `pageOf`, so nothing is lost and the order of a legacy day is its Free Notes, then its rows in time order.
- Pressing the Pencil on a legacy Latest pass starts the editor with `pageOf(content)`. Saving creates the next pass (or updates the open one) in the new shape, so the older pass stays as it was and the revision toggle and Highlight additions compare them through `pageOf`.
- Library items are not changed. They already are one free page (section 5.5).

### 18.8 Removed

- The Free Notes card, the 24 hourly rows, the row preview and expand behaviour, the Add minute and Remove minute buttons (D-017, D-018) and the old toolbar. The code for them is removed with the new screen, including their tests, and `minuteMarkers.ts` in core is removed because nothing uses it any more.
- The lesson text that says "write the six items in the Free Notes" changes to "write the six items in today's page" (`packages/core/src/tutorials/lessons.ts`).
- Section 11's Day screen component tests are replaced by tests for view mode, edit mode, Add time, Add tag, Save and Cancel.

### 18.9 Version and commits

- The version goes from `0.2.3` to `0.2.4`, a patch bump, because the journal rules and the data shape are unchanged. Version rules are as in sections 15.13 and 16.4: no version-only commit, and the version fields change together with the release notes, the README and `LICENSE.txt`.
- Commits on `main`, one logical change each, each passing lint, typecheck and tests:
  1. `docs: plan v0.2.4 day page with one free writing space`
  2. `feat(core): add day page helpers for time lines, cursor inserts and legacy days`
  3. `refactor(core): read passes through the day page in score, words and highlights`
  4. `feat(app): show a day as a read-only page with an edit pencil`
  5. `feat(app): write a day in one free space with add time and add tag`
  6. `refactor(app): remove the hourly rows and Free Notes writer`
  7. `docs: update the lesson text and the QA checklist for the day page`
  8. `chore: release v0.2.4 with notes`
- Record the decisions in `docs/decisions.md` as D-043 onwards: the page stored in `freeNotes` with empty `blocks` instead of a schema change; the time line format; the score reading time lines; the legacy conversion on first edit.

### 18.10 Acceptance criteria for v0.2.4

1. Tapping a past date opens the Day screen in view mode: the saved text, with nothing that can be typed into, and a Pencil in the header. A future date does not open.
2. Today before 21:00 has a disabled Pencil and the countdown chip, and a day with text can still be read. At 21:00 the Pencil works without leaving the screen.
3. Pressing the Pencil shows one large writing field with no Free Notes block and no hourly rows, plus Add time and Add tag buttons. The person can type anything in any order.
4. Add time offers Hour only and Hour and minutes. Hour only inserts `⏱ 21`, hour and minutes inserts `⏱ 21:25`, each on its own line at the cursor, and in View mode they show as clock chips with the same times. Adding a time that is already in the page moves the cursor to it.
5. Add tag lists the categories of the Tags screen (People, Places, Numbers and every custom one), filters by category and search, inserts `@Name` at the cursor, and Create new tag works without leaving the screen. In View mode a mention shows as a tag chip that opens the tag.
6. Save writes the pass, shows "All changes saved" and returns to View mode on the Latest pass with the new text. The tag screen lists the day. Cancel or Back with changes asks "Discard changes?" and Keep editing leaves the text as it is.
7. The draft is restored after the app is closed without saving. Esc cancels on the web build and in the Windows app.
8. A day written before v0.2.4 shows its Free Notes and its rows in time order in View mode, and opening it with the Pencil gives one text with the rows as time lines. Saving makes a new pass, and the older pass is unchanged and still readable through the revision toggle.
9. Highlight additions marks only the new words between two passes, also when one pass is old and one is new, and time lines are never marked or counted as words.
10. The recall score and the streak still work: a pass with time lines raises Coverage and Precision, a pass with none still counts for Detail, the streak and Consistency, and the 20-word rule ignores time lines.
11. No change was needed in `firebase/firestore.rules`, and the rules tests pass unchanged.
12. The Settings footer shows v0.2.4 and the version is 0.2.4 in all five `package.json` files, the app config and `LICENSE.txt`. There is no version-only commit and the tag is on the final commit.
13. Core tests, app tests, rules tests and CI pass.
