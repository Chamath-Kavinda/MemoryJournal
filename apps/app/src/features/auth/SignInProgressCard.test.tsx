import { render, screen } from '@testing-library/react-native';

import { SIGN_IN_STEPS, SignInProgressCard, completedSteps } from './SignInProgressCard';

describe('completedSteps', () => {
  it('is 0 before the first step starts', () => {
    expect(completedSteps(null, false)).toBe(0);
  });

  it('counts the steps before the one that is running', () => {
    expect(completedSteps('signing-in', false)).toBe(0);
    expect(completedSteps('adding', false)).toBe(1);
    expect(completedSteps('cleaning', false)).toBe(2);
  });

  it('is 3 once everything has finished', () => {
    expect(completedSteps('cleaning', true)).toBe(SIGN_IN_STEPS.length);
    expect(completedSteps(null, true)).toBe(SIGN_IN_STEPS.length);
  });
});

describe('SignInProgressCard', () => {
  it('lists the three steps in order', async () => {
    await render(<SignInProgressCard current={null} />);

    expect(screen.getByText('Signing in')).toBeTruthy();
    expect(screen.getByText('Adding your journal')).toBeTruthy();
    expect(screen.getByText('Cleaning up')).toBeTruthy();
  });

  it('marks only the running step as busy, and none as done at the start', async () => {
    await render(<SignInProgressCard current="signing-in" />);

    expect(screen.getByTestId('sign-in-step-signing-in').props.accessibilityState.busy).toBe(true);
    expect(screen.getByTestId('sign-in-step-adding').props.accessibilityState.busy).toBe(false);
    expect(screen.getByTestId('sign-in-progressbar').props.accessibilityValue.now).toBe(0);
  });

  it('moves on: finished steps stop being busy and the bar value goes up', async () => {
    await render(<SignInProgressCard current="adding" />);

    expect(screen.getByTestId('sign-in-step-signing-in').props.accessibilityState.busy).toBe(false);
    expect(screen.getByTestId('sign-in-step-adding').props.accessibilityState.busy).toBe(true);
    expect(screen.getByTestId('sign-in-progressbar').props.accessibilityValue).toEqual({
      min: 0,
      max: 3,
      now: 1,
    });
  });

  it('shows all three steps complete when finished', async () => {
    await render(<SignInProgressCard current="cleaning" finished />);

    expect(screen.getByTestId('sign-in-progressbar').props.accessibilityValue.now).toBe(3);
    for (const { step } of SIGN_IN_STEPS) {
      expect(screen.getByTestId(`sign-in-step-${step}`).props.accessibilityState.busy).toBe(false);
    }
  });
});
