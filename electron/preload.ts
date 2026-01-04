import { contextBridge, ipcRenderer } from 'electron';

const updaterApi = {
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  onUpdateStatus: (callback: (payload: any) => void) => {
    const listener = (_event: any, payload: any) => callback(payload);
    ipcRenderer.on('updater:status', listener);
    return () => ipcRenderer.removeListener('updater:status', listener);
  }
};

contextBridge.exposeInMainWorld('__APP_BRIDGE__', {
  updater: updaterApi
});
