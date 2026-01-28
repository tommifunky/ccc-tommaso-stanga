const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  getCPUUsage: () => ipcRenderer.invoke('get-cpu-usage')
});