import { contextBridge, ipcRenderer } from 'electron';

// Only the helpers the renderer needs are exposed (documentation section 10).
contextBridge.exposeInMainWorld('memoryJournal', {
  signInWithGoogle: (): Promise<unknown> => ipcRenderer.invoke('auth:google-sign-in'),
  // Tells the main process whether the daily reminder is wanted (signed in, Settings toggle on).
  setReminderEnabled: (enabled: boolean): Promise<void> =>
    ipcRenderer.invoke('reminder:set-enabled', enabled),
  // Runs the callback when the person clicks the reminder; returns a function that stops listening.
  onOpenToday: (callback: () => void): (() => void) => {
    const listener = (): void => callback();
    ipcRenderer.on('reminder:open-today', listener);
    return () => {
      ipcRenderer.removeListener('reminder:open-today', listener);
    };
  },
});
