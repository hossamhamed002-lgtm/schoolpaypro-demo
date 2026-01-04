import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as url from 'url';

process.env.DESKTOP_TEST = process.env.DESKTOP_TEST || 'true';

const isDev = !app.isPackaged;
const allowUpdates = process.env.DESKTOP_TEST === 'true' || process.env.NODE_ENV === 'production';

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL || 'http://localhost:3000');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = url.pathToFileURL(path.join(__dirname, '..', '..', 'dist', 'index.html')).toString();
    win.loadURL(indexPath);
  }
};

app.whenReady().then(() => {
  createWindow();

  if (allowUpdates) {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('checking-for-update', () => {
      BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('updater:status', { status: 'checking' }));
    });

    autoUpdater.on('update-available', (info) => {
      BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('updater:status', { status: 'available', info }));
    });

    autoUpdater.on('update-not-available', () => {
      BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('updater:status', { status: 'not-available' }));
    });

    autoUpdater.on('error', (err) => {
      if (isDev) console.warn('[AUTOUPDATE][ERROR]', err?.message || err);
      BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('updater:status', { status: 'error' }));
    });

    autoUpdater.on('download-progress', (progress) => {
      BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('updater:status', { status: 'downloading', progress }));
    });

    autoUpdater.on('update-downloaded', (info) => {
      BrowserWindow.getAllWindows().forEach((w) => w.webContents.send('updater:status', { status: 'downloaded', info }));
    });

    ipcMain.handle('updater:check', async () => {
      try {
        await autoUpdater.checkForUpdates();
        return true;
      } catch (e) {
        if (isDev) console.warn('[AUTOUPDATE][CHECK][ERROR]', e);
        return false;
      }
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
