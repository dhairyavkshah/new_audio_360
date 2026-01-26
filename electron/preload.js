const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  selectMusicFolder: () => ipcRenderer.invoke('select-music-folder'),
  scanMusicFolder: (folderPath) => ipcRenderer.invoke('scan-music-folder', folderPath),
  isElectron: true,
  platform: process.platform
});
