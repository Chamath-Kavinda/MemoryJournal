import { join } from 'node:path';

import { Menu, Tray, nativeImage } from 'electron';

export interface TrayActions {
  open: () => void;
  quit: () => void;
}

// Electron removes the icon when its Tray object is garbage collected, so one is always kept here.
const created: Tray[] = [];

/**
 * The system tray icon that keeps the app, and so the 21:00 reminder, alive after the window is
 * closed (section 5.8). Clicking the icon opens the window; the menu can also quit for good.
 * tray@2x.png next to tray.png is picked up by Electron on high-density screens.
 */
export function createTray(actions: TrayActions): Tray {
  const icon = nativeImage.createFromPath(join(__dirname, '..', 'assets', 'tray.png'));
  const tray = new Tray(icon);
  tray.setToolTip('Memory Journal');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open Memory Journal', click: actions.open },
      { type: 'separator' },
      { label: 'Quit', click: actions.quit },
    ]),
  );
  tray.on('click', actions.open);
  created.push(tray);
  return tray;
}
