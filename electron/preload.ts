import { contextBridge, ipcRenderer } from 'electron';

const updaterApi = {
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  onUpdateStatus: (callback: (payload: any) => void) => {
    const listener = (_event: any, payload: any) => callback(payload);
    ipcRenderer.on('updater:status', listener);
    return () => ipcRenderer.removeListener('updater:status', listener);
  },
  onUpdateAvailable: (callback: (info: any) => void) => {
    const listener = (_event: any, info: any) => callback(info);
    ipcRenderer.on('updater:available', listener);
    return () => ipcRenderer.removeListener('updater:available', listener);
  },
  openReleasePage: () => ipcRenderer.invoke('updater:openReleasePage')
};

contextBridge.exposeInMainWorld('__APP_BRIDGE__', {
  updater: updaterApi
});
