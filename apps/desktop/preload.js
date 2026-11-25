// Ponte mínima e segura entre a página offline e o app (sem acesso ao Node na página).
const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("locar", { retry: () => ipcRenderer.send("locar:retry") });
