import { fireEvent, render, screen } from '@testing-library/react-native';

import { BackButton } from './BackButton';

jest.useFakeTimers();

describe('BackButton', () => {
  it('is an icon button labelled Back, with no visible text', async () => {
    await render(<BackButton onBack={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
    expect(screen.queryByText('Back')).toBeNull();
  });

  it('goes back when pressed', async () => {
    const onBack = jest.fn();
    await render(<BackButton onBack={onBack} />);

    await fireEvent.press(screen.getByLabelText('Back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
