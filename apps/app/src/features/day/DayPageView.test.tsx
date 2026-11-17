import { mentionToken, type DayContent } from '@memory-journal/core';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { DayPageView } from './DayPageView';
import { DayScreenView } from './DayScreenView';
import { EmptyDay } from './EmptyDay';

const TIME = '⏱';
const page = (freeNotes: string): DayContent => ({ freeNotes, blocks: [] });

describe('DayPageView', () => {
  it('shows time lines as clock chips and never the raw symbol', async () => {
    await render(<DayPageView content={page(`${TIME} 21\nwent out\n${TIME} 21:25\nhome`)} />);

    expect(screen.getAllByTestId('time-chip')).toHaveLength(2);
    expect(screen.getByText('21:00')).toBeTruthy();
    expect(screen.getByText('21:25')).toBeTruthy();
    expect(screen.getByText('went out')).toBeTruthy();
    expect(screen.queryByText(new RegExp(TIME))).toBeNull();
  });

  it('keeps the symbol as plain text when it sits inside a sentence', async () => {
    await render(<DayPageView content={page(`the ${TIME} 21 clock`)} />);

    expect(screen.queryByTestId('time-chip')).toBeNull();
    expect(screen.getByText(`the ${TIME} 21 clock`)).toBeTruthy();
  });

  it('shows a tag mention as a chip that opens the tag', async () => {
    const onOpenTag = jest.fn();
    const text = `met ${mentionToken('abc123', 'Ravi')} today`;
    await render(<DayPageView content={page(text)} onOpenTag={onOpenTag} />);

    await fireEvent.press(screen.getByTestId('tag-chip'));

    expect(screen.getByText('@Ravi')).toBeTruthy();
    expect(onOpenTag).toHaveBeenCalledWith('abc123');
  });

  it('uses the current tag name instead of the stored one', async () => {
    const text = mentionToken('abc123', 'Ravi');
    await render(<DayPageView content={page(text)} names={new Map([['abc123', 'Ravindu']])} />);

    expect(screen.getByText('@Ravindu')).toBeTruthy();
  });

  it('shows a legacy day with its Free Notes first, then its rows in time order', async () => {
    const legacy: DayContent = {
      freeNotes: 'general thoughts',
      blocks: [
        { hour: 21, minute: 25, text: 'late note' },
        { hour: 9, minute: null, text: 'early note' },
      ],
    };
    await render(<DayPageView content={legacy} />);

    const chips = screen.getAllByTestId('time-chip');
    expect(chips).toHaveLength(2);
    expect(screen.getByText('general thoughts')).toBeTruthy();
    expect(screen.getByText('09:00')).toBeTruthy();
    expect(screen.getByText('21:25')).toBeTruthy();
    expect(screen.getByText('early note')).toBeTruthy();
    expect(screen.getByText('late note')).toBeTruthy();
  });

  it('marks only new words, never a time line', async () => {
    const previous = page(`${TIME} 21\nwalk`);
    const current = page(`${TIME} 21\nwalk home\n${TIME} 22:10\nread`);
    await render(<DayPageView content={current} previous={previous} previousN={1} />);

    expect(screen.getByText(/2 new words since the 1st pass/)).toBeTruthy();
    const added = screen.getAllByTestId('added-text');
    expect(added.length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('time-chip')).toHaveLength(2);
  });

  it('says when nothing is new', async () => {
    const same = page('walk');
    await render(<DayPageView content={same} previous={same} previousN={2} />);

    expect(screen.getByText(/Nothing new since the 2nd pass/)).toBeTruthy();
    expect(screen.queryByTestId('added-text')).toBeNull();
  });
});

describe('EmptyDay', () => {
  it('says nothing is written and starts writing from the Write button', async () => {
    const onWrite = jest.fn();
    await render(<EmptyDay onWrite={onWrite} disabled={false} />);

    expect(screen.getByText('Nothing written for this day yet.')).toBeTruthy();
    await fireEvent.press(screen.getByText('Write'));

    expect(onWrite).toHaveBeenCalledTimes(1);
  });

  it('does not start writing while the day is closed', async () => {
    const onWrite = jest.fn();
    await render(<EmptyDay onWrite={onWrite} disabled />);

    await fireEvent.press(screen.getByText('Write'));

    expect(onWrite).not.toHaveBeenCalled();
  });
});

describe('DayScreenView pencil', () => {
  const access = { state: 'open' } as const;

  it('shows an Edit day pencil that starts editing', async () => {
    const onEdit = jest.fn();
    await render(
      <DayScreenView dayId="2026-11-10" access={access} onBack={jest.fn()} onEdit={onEdit} />,
    );

    await fireEvent.press(screen.getByLabelText('Edit day'));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('keeps the pencil disabled while the day cannot be written', async () => {
    const onEdit = jest.fn();
    await render(
      <DayScreenView
        dayId="2026-11-14"
        access={{ state: 'locked', unlocksAt: 0, msUntilUnlock: 60_000 }}
        onBack={jest.fn()}
        onEdit={onEdit}
        editDisabled
      />,
    );

    await fireEvent.press(screen.getByLabelText('Edit day'));

    expect(onEdit).not.toHaveBeenCalled();
  });

  it('has no pencil when nothing can be edited', async () => {
    await render(<DayScreenView dayId="2026-11-10" access={access} onBack={jest.fn()} />);

    expect(screen.queryByLabelText('Edit day')).toBeNull();
  });
});
