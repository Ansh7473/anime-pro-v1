/**
 * AnimePro Desktop — Preload Script
 * 
 * Securely exposes limited Node.js/Electron APIs to the renderer process
 * via contextBridge. This follows Electron security best practices:
 *   - contextIsolation: true
 *   - nodeIntegration: false
 *   - Only whitelisted APIs are exposed
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App metadata
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => process.platform,
  
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  
  // System
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),

  // Check if running in Electron
  isElectron: true
});

// Inject Electron identifier into navigator for web app detection
// The web app checks for 'Electron' in userAgent (see +layout.svelte line 25)
