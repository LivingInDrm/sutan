const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  save: {
    write: (saveId, data) => ipcRenderer.invoke('save:write', saveId, data),
    read: (saveId) => ipcRenderer.invoke('save:read', saveId),
    list: () => ipcRenderer.invoke('save:list'),
    delete: (saveId) => ipcRenderer.invoke('save:delete', saveId),
  },
});
