/**
 * Preload bridge — exposes safe APIs from main process to renderer.
 * The renderer calls window.parasiteAPI.* to save/load/log.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('parasiteAPI', {
  saveGame: (data) => ipcRenderer.send('save-game', data),
  loadGame: () => ipcRenderer.sendSync('load-game'),
  logEvent: (event) => ipcRenderer.send('log-event', event),
  getDataDir: () => ipcRenderer.sendSync('get-data-dir'),
});
