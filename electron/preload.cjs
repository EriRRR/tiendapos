const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config) => ipcRenderer.invoke('set-config', config),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  getIPLocal: () => ipcRenderer.invoke('get-ip-local'),
  getTunnelUrl: () => ipcRenderer.invoke('get-tunnel-url'), // ← nuevo
  onTunnelUrl: (cb) => {
    ipcRenderer.on('tunnel-url', (_, url) => cb(url))
    return () => ipcRenderer.removeAllListeners('tunnel-url')
  },
  invoke: (c, d) => ipcRenderer.invoke(c, d),
  onScannerCodigo: (cb) => {
    ipcRenderer.on('scanner-codigo', (_, codigo) => cb(codigo))
    return () => ipcRenderer.removeAllListeners('scanner-codigo')
  },
})