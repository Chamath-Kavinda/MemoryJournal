import { contextBridge, ipcRenderer } from 'electron';

// Only the helpers the renderer needs are exposed (documentation section 10).
contextBridge.exposeInMainWorld('memoryJournal', {
  signInWithGoogle: (): Promise<unknown> => ipcRenderer.invoke('auth:google-sign-in'),
});
