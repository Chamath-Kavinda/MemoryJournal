import { existsSync, statSync } from 'node:fs';
import { join, normalize, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { BrowserWindow, Menu, app, ipcMain, net, protocol, shell } from 'electron';

import { setupDesktopReminder } from './desktopReminder';
import { googleSignIn } from './googleSignIn';
import { createTray } from './tray';

// In development, read the Google desktop client settings from apps/desktop/.env.
// Variables already set in the shell win over the file.
if (!app.isPackaged) {
  const envFile = resolve(__dirname, '..', '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const APP_SCHEME = 'app';
const APP_NAME = 'Memory Journal';
const DEV_URL = process.env.MJ_DEV_URL;

// Windows shows notifications under this id once the app is installed. In development the default
// id of the Electron executable is kept, because a made-up id with no shortcut shows nothing.
if (app.isPackaged) app.setAppUserModelId('com.memoryjournal.desktop');

// The static Expo export lives next to the packaged app, or in apps/app/dist in development.
const webRoot = app.isPackaged
  ? join(process.resourcesPath, 'web')
  : resolve(__dirname, '..', '..', 'app', 'dist');

protocol.registerSchemesAsPrivileged([
  { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

function resolveWebFile(pathname: string): string {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, '');
  const candidates = [relative, `${relative}.html`, join(relative, 'index.html')];
  for (const candidate of candidates) {
    const full = resolve(webRoot, candidate);
    // Never serve anything outside the web root.
    if (!full.startsWith(webRoot + sep) && full !== webRoot) continue;
    if (existsSync(full) && statSync(full).isFile()) return full;
  }
  return join(webRoot, 'index.html');
}

let mainWindow: BrowserWindow | null = null;
// True once the app is really quitting; until then closing the window only hides it to the tray.
let quitting = false;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 420,
    minHeight: 600,
    title: APP_NAME,
    icon: join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // The window keeps the app name; the page must not rename it.
  win.on('page-title-updated', (event) => event.preventDefault());

  // Links to other sites open in the system browser, never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });

  // Closing the window keeps the app in the system tray so the 21:00 reminder still comes (5.8).
  win.on('close', (event) => {
    if (quitting) return;
    event.preventDefault();
    win.hide();
  });
  // Windows asks every app to end when the person logs off or shuts down; do not stand in the way.
  win.on('session-end', () => {
    quitting = true;
  });
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null;
  });

  // Diagnostics for a blank window: page errors and load failures go to the terminal, and
  // MJ_DEBUG=1 also opens the developer tools.
  win.webContents.on('did-fail-load', (_event, code, description, url) => {
    console.error(`[window] load failed (${code} ${description}): ${url}`);
  });
  win.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[window] renderer gone: ${details.reason}`);
  });
  win.webContents.on('console-message', (event) => {
    console.log(`[page:${event.level}] ${event.message} (${event.sourceId}:${event.lineNumber})`);
  });
  if (process.env.MJ_DEBUG === '1') win.webContents.openDevTools({ mode: 'detach' });

  void win.loadURL(DEV_URL ?? `${APP_SCHEME}://bundle/`);
  mainWindow = win;
  return win;
}

/** Brings the window to the front, from the tray or minimised, and makes one if there is none. */
function showMainWindow(): BrowserWindow {
  const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : createWindow();
  if (win.isMinimized()) win.restore();
  if (!win.isVisible()) win.show();
  win.focus();
  return win;
}

/** What a click on the reminder does: show the window and have the app open today's page. */
function openToday(): void {
  const win = showMainWindow();
  const send = (): void => win.webContents.send('reminder:open-today');
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', send);
  else send();
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });

  app.on('before-quit', () => {
    quitting = true;
  });

  void app.whenReady().then(() => {
    // No File / Edit / View / Window menu bar. Copy and paste still work inside the page.
    Menu.setApplicationMenu(null);
    protocol.handle(APP_SCHEME, (request) => {
      const { pathname } = new URL(request.url);
      return net.fetch(pathToFileURL(resolveWebFile(pathname)).toString());
    });

    ipcMain.handle('auth:google-sign-in', () => googleSignIn());
    createWindow();
    createTray({
      open: () => {
        showMainWindow();
      },
      quit: () => app.quit(),
    });
    setupDesktopReminder(openToday);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
