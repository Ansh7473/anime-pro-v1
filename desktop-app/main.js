/**
 * AnimePro Desktop — Main Process
 * 
 * Professional Electron wrapper for the AnimePro streaming platform.
 * 
 * Architecture:
 *   - Loads the deployed Vercel frontend URL
 *   - webSecurity disabled so all cross-origin requests (API, streaming, images) work natively
 *   - System tray integration with minimize-to-tray
 *   - Secure preload script with contextIsolation
 *   - Clean window management and lifecycle handling
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, shell, Notification, nativeImage } = require('electron');
const path = require('path');

// ─── Configuration ────────────────────────────────────────────────────────────

const APP_URL = 'https://anime-pro-v1-frontend.vercel.app';
const IS_DEV = process.env.ELECTRON_ENV === 'development';

// ─── Globals ──────────────────────────────────────────────────────────────────

let mainWindow = null;
let tray = null;
let isQuitting = false;

// ─── Single Instance Lock ─────────────────────────────────────────────────────
// Prevent multiple instances — if user opens the app again, focus existing window

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ─── Window Creation ──────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 820,
    minWidth: 940,
    minHeight: 600,
    title: 'AnimePro',
    backgroundColor: '#0a0a0f',
    show: false, // Don't show until ready (prevents white flash)
    autoHideMenuBar: true, // Hide menu bar for clean look
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Allow all cross-origin requests — streaming, API, images all work seamlessly
      webSecurity: false,
      // Allow media autoplay (for video streaming)
      autoplayPolicy: 'no-user-gesture-required',
      // Enable hardware acceleration for smooth video playback
      acceleratedCanvas: true,
    },
  });

  // ─── Load the App ─────────────────────────────────────────────────────────

  if (IS_DEV) {
    // In dev mode, load local dev server if running
    mainWindow.loadURL('http://localhost:5174').catch(() => {
      // Fallback to deployed URL if local server isn't running
      mainWindow.loadURL(APP_URL);
    });
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadURL(APP_URL);
  }

  // ─── Show window gracefully ───────────────────────────────────────────────

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // ─── Handle external links ────────────────────────────────────────────────
  // Open external URLs (social links, etc.) in the default browser

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow navigation within our app
    if (url.startsWith(APP_URL) || url.startsWith('http://localhost')) {
      return { action: 'allow' };
    }
    // Open everything else in default browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Handle in-page navigation to external domains
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow internal navigation
    if (url.startsWith(APP_URL) || url.startsWith('http://localhost')) {
      return;
    }
    // Block and open externally
    event.preventDefault();
    shell.openExternal(url);
  });

  // ─── Minimize to tray instead of closing ──────────────────────────────────

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      
      // Show a notification the first time (windows behavior hint)
      if (tray && !app._trayNotified) {
        tray.displayBalloon({
          title: 'AnimePro',
          content: 'App minimized to system tray. Right-click tray icon for options.',
          iconType: 'info',
        });
        app._trayNotified = true;
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // ─── Inject custom CSS for scrollbar styling ──────────────────────────────

  mainWindow.webContents.on('did-finish-load', () => {
    // Set a custom user-agent suffix so the web app knows it's Electron
    // (The layout.svelte checks for 'Electron' in userAgent)
    mainWindow.webContents.setUserAgent(
      mainWindow.webContents.getUserAgent() + ' Electron/' + app.getVersion()
    );
  });

  // ─── Handle permission requests ───────────────────────────────────────────

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    // Allow media, notifications, fullscreen
    const allowedPermissions = ['media', 'notifications', 'fullscreen', 'pointerLock'];
    callback(allowedPermissions.includes(permission));
  });

  // ─── Handle certificate errors gracefully ─────────────────────────────────

  mainWindow.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
    if (IS_DEV) {
      // In dev, accept all certificates
      event.preventDefault();
      callback(true);
    } else {
      callback(false);
    }
  });
}

// ─── System Tray ──────────────────────────────────────────────────────────────

function createTray() {
  const icon = getAppIcon();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open AnimePro',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Reload',
      click: () => {
        if (mainWindow) {
          mainWindow.reload();
        }
      },
    },
    {
      label: 'Clear Cache & Reload',
      click: () => {
        if (mainWindow) {
          mainWindow.webContents.session.clearCache().then(() => {
            mainWindow.reload();
          });
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit AnimePro',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('AnimePro — Anime Streaming');
  tray.setContextMenu(contextMenu);

  // Double-click tray icon to show window
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// ─── App Icon Helper ──────────────────────────────────────────────────────────

function getAppIcon() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  try {
    return nativeImage.createFromPath(iconPath);
  } catch {
    // Return a small default icon if custom icon not found
    return nativeImage.createEmpty();
  }
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

function setupIPC() {
  ipcMain.handle('get-app-version', () => app.getVersion());

  ipcMain.handle('open-external', async (_, url) => {
    await shell.openExternal(url);
  });

  ipcMain.handle('show-notification', (_, { title, body }) => {
    if (Notification.isSupported()) {
      new Notification({ title, body, icon: getAppIcon() }).show();
    }
  });

  ipcMain.on('window-minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow?.close();
  });
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  setupIPC();
  createWindow();
  createTray();

  // macOS: re-create window on dock click (standard behavior)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});

// Quit when all windows are closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit — we have system tray
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

// ─── Security: Restrict new window creation ─────────────────────────────────

app.on('web-contents-created', (_, contents) => {
  contents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });
});

// ─── Hardware Acceleration ──────────────────────────────────────────────────

// Enable hardware acceleration for video playback
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
