import { chunkRows, columnsFor, layoutFor, sizeClassFor } from './sizeClass';

describe('sizeClassFor', () => {
  it('is compact below 600, medium from 600 to 899 and expanded from 900', () => {
    expect(sizeClassFor(360)).toBe('compact');
    expect(sizeClassFor(599)).toBe('compact');
    expect(sizeClassFor(600)).toBe('medium');
    expect(sizeClassFor(899)).toBe('medium');
    expect(sizeClassFor(900)).toBe('expanded');
    expect(sizeClassFor(1920)).toBe('expanded');
  });
});

describe('layoutFor', () => {
  it('uses one column on a phone', () => {
    const layout = layoutFor(412, 915);
    expect(layout.columns).toBe(1);
    expect(layout.contentMaxWidth).toBe(720);
    expect(layout.shortScreen).toBe(false);
  });

  it('uses two columns centred at 720 on a small tablet', () => {
    const layout = layoutFor(600, 960);
    expect(layout.sizeClass).toBe('medium');
    expect(layout.columns).toBe(2);
    expect(layout.contentMaxWidth).toBe(720);
  });

  it('uses up to three columns and 960 wide on desktop', () => {
    const layout = layoutFor(1280, 800);
    expect(layout.sizeClass).toBe('expanded');
    expect(layout.columns).toBe(3);
    expect(layout.contentMaxWidth).toBe(960);
  });

  it('marks a phone in landscape as a short screen', () => {
    expect(layoutFor(915, 412).shortScreen).toBe(true);
    expect(layoutFor(640, 360).shortScreen).toBe(true);
    expect(layoutFor(1024, 500).shortScreen).toBe(false);
  });

  it('follows the window, so a resize changes the class', () => {
    expect(layoutFor(480, 640).sizeClass).toBe('compact');
    expect(layoutFor(1920, 1080).sizeClass).toBe('expanded');
  });
});

describe('columnsFor', () => {
  it('never exceeds what the cards can use', () => {
    expect(columnsFor(layoutFor(1280, 800), 2)).toBe(2);
    expect(columnsFor(layoutFor(700, 900), 3)).toBe(2);
    expect(columnsFor(layoutFor(360, 640), 3)).toBe(1);
  });
});

describe('chunkRows', () => {
  it('splits into rows of the given length', () => {
    expect(chunkRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('keeps one row per item with one column and handles empty input', () => {
    expect(chunkRows(['a', 'b'], 1)).toEqual([['a'], ['b']]);
    expect(chunkRows([], 3)).toEqual([]);
  });
});
