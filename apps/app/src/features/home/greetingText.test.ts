import { dayPartOfHour, firstNameOf, greetingFor } from './greetingText';

describe('dayPartOfHour', () => {
  it('splits the day at 05:00, 12:00, 17:00 and 21:00', () => {
    expect(dayPartOfHour(4)).toBe('night');
    expect(dayPartOfHour(5)).toBe('morning');
    expect(dayPartOfHour(11)).toBe('morning');
    expect(dayPartOfHour(12)).toBe('afternoon');
    expect(dayPartOfHour(16)).toBe('afternoon');
    expect(dayPartOfHour(17)).toBe('evening');
    expect(dayPartOfHour(20)).toBe('evening');
    expect(dayPartOfHour(21)).toBe('night');
    expect(dayPartOfHour(0)).toBe('night');
  });
});

describe('firstNameOf', () => {
  it('takes the first word of a name', () => {
    expect(firstNameOf('Sam Perera')).toBe('Sam');
    expect(firstNameOf('  Sam  ')).toBe('Sam');
  });

  it('returns null when there is no usable name', () => {
    expect(firstNameOf(null)).toBeNull();
    expect(firstNameOf(undefined)).toBeNull();
    expect(firstNameOf('   ')).toBeNull();
  });
});

describe('greetingFor', () => {
  it('adds the first name for a signed-in person', () => {
    expect(greetingFor(9, 'Sam Perera')).toBe('Good morning, Sam');
    expect(greetingFor(20, 'Sam Perera')).toBe('Good evening, Sam');
  });

  it('is the greeting alone for a guest or an account without a name', () => {
    expect(greetingFor(9)).toBe('Good morning');
    expect(greetingFor(13, null)).toBe('Good afternoon');
    expect(greetingFor(23, '')).toBe('Good night');
  });
});
