import { existsSync, statSync } from 'node:fs';
import { join, normalize, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { BrowserWindow, app, ipcMain, net, protocol, shell } from 'electron';

import { googleSignIn } from './googleSignIn';

// In development, read the Google desktop client settings from apps/desktop/.env.
// Variables already set in the shell win over the file.
if (!app.isPackaged) {
  const envFile = resolve(__dirname, '..', '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

const APP_SCHEME = 'app';
const DEV_URL = process.env.MJ_DEV_URL;

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

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    minWidth: 420,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Links to other sites open in the system browser, never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });

  void win.loadURL(DEV_URL ?? `${APP_SCHEME}://bundle/`);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  void app.whenReady().then(() => {
    protocol.handle(APP_SCHEME, (request) => {
      const { pathname } = new URL(request.url);
      return net.fetch(pathToFileURL(resolveWebFile(pathname)).toString());
    });

    ipcMain.handle('auth:google-sign-in', () => googleSignIn());
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
