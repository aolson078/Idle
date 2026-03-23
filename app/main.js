/**
 * Electron main process — window creation, IPC handlers, OS-level tricks.
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { EventLog } = require('../src/core/event-log');
const { SaveManager } = require('../src/game/save');

let mainWindow;
let eventLog;
let saveManager;

function createWindow() {
  const dataDir = app.getPath('userData');

  eventLog = new EventLog(dataDir);
  saveManager = new SaveManager(dataDir);

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    resizable: true,
    title: 'The Parasite',
    backgroundColor: '#0d1f0d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'ui', 'index.html'));
  mainWindow.setMenuBarVisibility(false);

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  ipcMain.on('save-game', (event, data) => {
    saveManager.save(data);
  });

  ipcMain.on('load-game', (event) => {
    event.returnValue = saveManager.load();
  });

  ipcMain.on('log-event', (event, data) => {
    eventLog.append(data);
  });

  ipcMain.on('get-data-dir', (event) => {
    event.returnValue = app.getPath('userData');
  });

  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
