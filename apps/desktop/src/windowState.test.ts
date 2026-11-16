import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  DEFAULT_STATE,
  MIN_HEIGHT,
  MIN_WIDTH,
  loadWindowState,
  sanitizeState,
  saveWindowState,
} from './windowState';

const screen = { x: 0, y: 0, width: 1920, height: 1080 };

describe('window state', () => {
  it('uses the defaults when nothing usable was saved', () => {
    expect(sanitizeState(null, [screen])).toEqual(DEFAULT_STATE);
    expect(sanitizeState('nope', [screen])).toEqual(DEFAULT_STATE);
    expect(sanitizeState({ width: 'wide' }, [screen])).toEqual(DEFAULT_STATE);
  });

  it('never goes below the 480 by 640 minimum', () => {
    const state = sanitizeState({ width: 200, height: 300 }, [screen]);
    expect(state.width).toBe(MIN_WIDTH);
    expect(state.height).toBe(MIN_HEIGHT);
  });

  it('never exceeds the largest display', () => {
    const state = sanitizeState({ width: 5000, height: 4000 }, [screen]);
    expect(state.width).toBe(1920);
    expect(state.height).toBe(1080);
  });

  it('keeps a position that is still on a display', () => {
    const state = sanitizeState({ width: 900, height: 700, x: 100, y: 50 }, [screen]);
    expect(state).toMatchObject({ x: 100, y: 50 });
  });

  it('drops a position whose display was disconnected', () => {
    const state = sanitizeState({ width: 900, height: 700, x: 3000, y: 100 }, [screen]);
    expect(state.x).toBeUndefined();
    expect(state.y).toBeUndefined();
  });

  it('remembers the maximized flag only when it is exactly true', () => {
    expect(sanitizeState({ maximized: true }, [screen]).maximized).toBe(true);
    expect(sanitizeState({ maximized: 'yes' }, [screen]).maximized).toBe(false);
  });

  describe('on disk', () => {
    let dir: string;
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'mj-window-'));
    });
    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it('saves and loads the same state', () => {
      const file = join(dir, 'window-state.json');
      saveWindowState(file, { width: 1000, height: 800, x: 10, y: 20, maximized: false });
      expect(JSON.parse(readFileSync(file, 'utf8'))).toMatchObject({ width: 1000 });
      expect(loadWindowState(file, [screen])).toEqual({
        width: 1000,
        height: 800,
        x: 10,
        y: 20,
        maximized: false,
      });
    });

    it('falls back to the defaults for a missing or broken file', () => {
      expect(loadWindowState(join(dir, 'missing.json'), [screen])).toEqual(DEFAULT_STATE);
      const broken = join(dir, 'broken.json');
      writeFileSync(broken, '{not json', 'utf8');
      expect(loadWindowState(broken, [screen])).toEqual(DEFAULT_STATE);
    });
  });
});
