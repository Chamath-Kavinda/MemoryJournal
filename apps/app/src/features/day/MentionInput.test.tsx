import type { Tag, TagCategory, TagDraft } from '@memory-journal/core';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { ConfirmProvider } from '@/components/useConfirm';

import { MentionInput } from './MentionInput';

import type { Tagging } from './tagging';

const categories: TagCategory[] = [
  { id: 'people', name: 'People', isDefault: true, order: 0 },
  { id: 'places', name: 'Places', isDefault: true, order: 1 },
];

function tag(id: string, name: string, categoryId = 'people'): Tag {
  return { id, name, categoryId, note: null, aliases: [], createdAt: 1 };
}

function Harness({
  initial = '',
  tagging,
  onChange,
  editable = true,
}: {
  initial?: string;
  tagging?: Tagging;
  onChange?: (value: string) => void;
  editable?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    // The inline tag form asks through the shared confirm dialog, so it needs the provider.
    <ConfirmProvider>
      <MentionInput
        label="Notes"
        style={{}}
        editable={editable}
        tagging={tagging}
        value={value}
        onChangeValue={(next) => {
          setValue(next);
          onChange?.(next);
        }}
      />
    </ConfirmProvider>
  );
}

function selection(start: number, end: number = start) {
  return { nativeEvent: { selection: { start, end } } };
}

describe('MentionInput tag mentions', () => {
  it('lists matching tags after @ and inserts the chosen one as a mention', async () => {
    const onChange = jest.fn();
    await render(
      <Harness
        onChange={onChange}
        tagging={{ tags: [tag('t1', 'Ravi'), tag('t2', 'Galle Fort', 'places')], categories }}
      />,
    );

    const input = screen.getByLabelText('Notes');
    await fireEvent.changeText(input, 'Met @Ra');
    await fireEvent(input, 'selectionChange', selection(7));

    expect(screen.getByLabelText('Mention Ravi')).toBeTruthy();
    expect(screen.queryByLabelText('Mention Galle Fort')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Mention Ravi'));

    expect(onChange).toHaveBeenLastCalledWith('Met {{tag:t1|Ravi}} ');
    expect(screen.getByDisplayValue('Met @Ravi ')).toBeTruthy();
  });

  it('shows a mention with the current name of its tag', async () => {
    await render(
      <Harness
        initial="{{tag:t1|Ravi}} came by"
        tagging={{ tags: [tag('t1', 'Ravindu')], categories }}
      />,
    );

    expect(screen.getByDisplayValue('@Ravindu came by')).toBeTruthy();
  });

  it('keeps the stored name of a mention whose tag was deleted', async () => {
    await render(
      <Harness initial="Lunch with {{tag:gone|Ravi}}" tagging={{ tags: [], categories }} />,
    );

    expect(screen.getByDisplayValue('Lunch with @Ravi')).toBeTruthy();
  });

  it('keeps an existing mention as a token when text is typed after it', async () => {
    const onChange = jest.fn();
    await render(
      <Harness
        onChange={onChange}
        initial="{{tag:t1|Ravi}} "
        tagging={{ tags: [tag('t1', 'Ravi')], categories }}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Notes'), '@Ravi was late');

    expect(onChange).toHaveBeenLastCalledWith('{{tag:t1|Ravi}} was late');
  });

  it('turns a mention back into plain text when its name is edited', async () => {
    const onChange = jest.fn();
    await render(
      <Harness
        onChange={onChange}
        initial="{{tag:t1|Ravi}} "
        tagging={{ tags: [tag('t1', 'Ravi')], categories }}
      />,
    );

    await fireEvent.changeText(screen.getByLabelText('Notes'), '@Rav ');

    expect(onChange).toHaveBeenLastCalledWith('@Rav ');
  });

  it('inserts a space so a mention never touches the word before it', async () => {
    const onChange = jest.fn();
    await render(
      <Harness
        onChange={onChange}
        initial="Hello"
        tagging={{ tags: [tag('t1', 'Ravi')], categories }}
      />,
    );

    const input = screen.getByLabelText('Notes');
    await fireEvent(input, 'focus');
    await fireEvent(input, 'selectionChange', selection(5));
    await fireEvent.press(screen.getByLabelText('Insert tag'));
    await fireEvent.press(screen.getByLabelText('Mention Ravi'));

    expect(onChange).toHaveBeenLastCalledWith('Hello {{tag:t1|Ravi}} ');
  });

  it('searches the picker and offers every category', async () => {
    await render(
      <Harness
        tagging={{ tags: [tag('t1', 'Ravi'), tag('t2', 'Galle Fort', 'places')], categories }}
      />,
    );

    const input = screen.getByLabelText('Notes');
    await fireEvent(input, 'focus');
    await fireEvent.press(screen.getByLabelText('Insert tag'));

    expect(screen.getByLabelText('Mention Ravi')).toBeTruthy();
    expect(screen.getByLabelText('Mention Galle Fort')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Search tags'), 'galle');

    expect(screen.queryByLabelText('Mention Ravi')).toBeNull();
    expect(screen.getByLabelText('Mention Galle Fort')).toBeTruthy();
  });

  it('creates a new tag from the typed @name and mentions it at once', async () => {
    const onChange = jest.fn();
    const createTag = jest.fn((_draft: TagDraft) => 'new1');
    await render(<Harness onChange={onChange} tagging={{ tags: [], categories, createTag }} />);

    const input = screen.getByLabelText('Notes');
    await fireEvent.changeText(input, 'Hi @Sam');
    await fireEvent(input, 'selectionChange', selection(7));
    await fireEvent.press(screen.getByLabelText('Create new tag Sam'));

    expect(screen.getByLabelText('Name').props.value).toBe('Sam');
    await fireEvent.press(screen.getByText('Create tag'));

    expect(createTag).toHaveBeenCalledTimes(1);
    expect(createTag.mock.calls[0]?.[0]).toMatchObject({ name: 'Sam', categoryId: 'people' });
    expect(onChange).toHaveBeenLastCalledWith('Hi {{tag:new1|Sam}} ');
  });

  it('saves the selected text as a tag and replaces it with a mention', async () => {
    const onChange = jest.fn();
    const createTag = jest.fn((_draft: TagDraft) => 'new2');
    await render(
      <Harness
        onChange={onChange}
        initial="Walked around Galle Fort today"
        tagging={{ tags: [], categories, createTag }}
      />,
    );

    const input = screen.getByLabelText('Notes');
    await fireEvent(input, 'focus');
    await fireEvent(input, 'selectionChange', selection(14, 24));
    await fireEvent.press(screen.getByLabelText('Save as tag'));

    expect(screen.getByLabelText('Name').props.value).toBe('Galle Fort');
    await fireEvent.press(screen.getByText('Create tag'));

    expect(createTag.mock.calls[0]?.[0]).toMatchObject({ name: 'Galle Fort' });
    expect(onChange).toHaveBeenLastCalledWith('Walked around {{tag:new2|Galle%20Fort}} today');
  });

  it('does not offer tags while the field is read-only', async () => {
    await render(<Harness editable={false} tagging={{ tags: [tag('t1', 'Ravi')], categories }} />);

    const input = screen.getByLabelText('Notes');
    await fireEvent(input, 'focus');

    expect(screen.queryByLabelText('Insert tag')).toBeNull();
  });
});
