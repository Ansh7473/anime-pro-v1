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

const APP_URL = 'https://anime-pro-v1.anshsoni310.workers.dev';
const IS_DEV = process.env.ELECTRON_ENV === 'development';

// ─── User Agent Override ──────────────────────────────────────────────────────
// Vercel's bot protection blocks Electron's default user agent (contains "Electron").
// We set a clean Chrome user agent so Vercel treats us as a normal browser.
// The web app detects Electron via window.electronAPI (set by preload.js) instead.
const CHROME_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
app.userAgentFallback = CHROME_UA;

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
    fullscreenable: true, // Allow embedded player fullscreen to work
    autoHideMenuBar: true, // Hide menu bar for clean look
    icon: getAppIcon(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Disable sandbox — embedded video players detect sandbox as ad-blocker
      sandbox: false,
      // Allow all cross-origin requests — streaming, API, images all work seamlessly
      webSecurity: false,
      // Allow iframes/embeds to run scripts, popups, etc.
      allowRunningInsecureContent: true,
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

  // ─── Fullscreen support for embedded player iframes ─────────────────────
  // When the embedded video player requests fullscreen (via Fullscreen API),
  // Electron must handle it by making the actual window fullscreen.

  mainWindow.webContents.on('enter-html-full-screen', () => {
    mainWindow.setFullScreen(true);
    mainWindow.setMenuBarVisibility(false);
  });

  mainWindow.webContents.on('leave-html-full-screen', () => {
    mainWindow.setFullScreen(false);
    mainWindow.setMenuBarVisibility(false); // keep menu hidden
  });

  // ─── Handle external links ────────────────────────────────────────────────
  // Allow player popups (ads) silently, open other external URLs in browser

  // Known streaming/player domains that need popup/window permission
  const PLAYER_DOMAINS = [
    'anvod.pro', 'uwucdn.top', 'anivid.icu', 'embed.', 'player.',
    'vidstream', 'rapid-cloud', 'megacloud', 'filemoon', 'streamtape',
    'mp4upload', 'mixdrop', 'doodstream', 'vidoza', 'streamsb',
    'vidplay', 'mcloud', 'rabbitstream', 'watchsb', 'upstream',
    'animelok', 'desidub', 'animehindidubbed', 'cdn.',
    'googlevideo', 'googleapis', 'gstatic',
  ];

  function isPlayerDomain(url) {
    try {
      return PLAYER_DOMAINS.some(d => url.includes(d));
    } catch { return false; }
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Allow navigation within our app
    if (url.startsWith(APP_URL) || url.startsWith('http://localhost')) {
      return { action: 'allow' };
    }
    // ALLOW ALL popups — embedded video players test window.open() to detect ad-blockers.
    // If we deny ANY popup, the player thinks ads are blocked and refuses to play.
    // Popup windows will be handled by 'did-create-window' event below.
    return { action: 'allow' };
  });

  // Handle popup windows that get created — hide them or close ad popups quickly
  mainWindow.webContents.on('did-create-window', (childWindow) => {
    // Make popup windows minimal and hidden (player ad checks)
    childWindow.setSize(1, 1);
    childWindow.setPosition(-100, -100);
    childWindow.setSkipTaskbar(true);
    // Close ad popup windows after a short delay
    setTimeout(() => {
      if (!childWindow.isDestroyed()) {
        childWindow.close();
      }
    }, 3000);
  });

  // Handle in-page navigation to external domains
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow internal navigation
    if (url.startsWith(APP_URL) || url.startsWith('http://localhost')) {
      return;
    }
    // Allow player domain navigation inside the window
    if (isPlayerDomain(url)) {
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

  // ─── Electron Detection ────────────────────────────────────────────────────
  // The web app detects Electron via window.electronAPI.isElectron (from preload.js)
  // We do NOT put "Electron" in the user agent, as Vercel's bot protection blocks it.

  // ─── Handle permission requests ───────────────────────────────────────────
  // Allow ALL permissions — media player embeds need scripts, popups, etc.

  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    // Allow everything — desktop app is trusted
    callback(true);
  });

  // Also allow permission checks (some players use this API)
  mainWindow.webContents.session.setPermissionCheckHandler(() => true);

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

// ─── Security: Handle new window creation ───────────────────────────────────
// Allow player popups, open unknown URLs externally

app.on('web-contents-created', (_, contents) => {
  // Allow iframes/embeds to run fully (no sandbox restrictions)
  contents.on('will-attach-webview', (event, webPreferences) => {
    // Remove any sandbox-like restrictions on webviews
    webPreferences.preload = undefined;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    webPreferences.sandbox = false;
    webPreferences.webSecurity = false;
  });
});

// ─── Hardware Acceleration & Player Compatibility ───────────────────────────

// Enable hardware acceleration for video playback
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-certificate-errors', 'true');
// Disable CORS blocking for cross-origin streaming requests
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
// Disable site isolation — prevents embedded players from detecting sandbox/adblock
app.commandLine.appendSwitch('disable-site-isolation-trials');
// Allow third-party cookies (some players need them)
app.commandLine.appendSwitch('disable-features', 'SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure');
// Disable popup blocking for player ads
app.commandLine.appendSwitch('disable-popup-blocking');
