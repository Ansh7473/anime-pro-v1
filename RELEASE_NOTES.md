# 🚀 AnimePro v2.0.4 — Windows + Android Release

The ultimate anime streaming experience is now available on **both desktop and mobile**. This release brings major player compatibility fixes, fullscreen video support, and the first-ever Android APK.

---

## 📥 Downloads

| Platform | File | Size |
|----------|------|------|
| 🖥️ Windows 10/11 (x64) | `AnimePro-Setup-2.0.4.exe` | ~85 MB |
| 📱 Android 7.0+ | `AnimePro-v2.0.4.apk` | ~4 MB |

---

## ✨ What's New

### 🖥️ Desktop (Windows)
- **Fixed Player Compatibility** — Resolved the "AdBlock/Sandbox" error that prevented embedded video players from loading.
- **Fullscreen Video Support** — The player's fullscreen button now correctly makes the video go edge-to-edge on Windows.
- **Smart Popup Handling** — Ad popups required by streaming servers are silently handled and auto-closed, so you can watch without interruptions.
- **Improved Stability** — Updated User-Agent and disabled site isolation to prevent Vercel bot detection and player blocking.
- **UI Polish** — Player controls (Theater Mode, Rotate, Auto-Next, PiP) moved to the left side for better accessibility.
- **System Tray** — Minimizes to system tray instead of closing. Right-click the tray icon for quick options.

### 📱 Android (NEW!)
- **First Android Release** — Watch your favorite anime on the go with a native Android app.
- **Fullscreen Video** — True immersive fullscreen with hidden nav/status bars when playing video.
- **Auto-Rotate** — Seamlessly switches between portrait and landscape based on your device orientation.
- **Optimized WebView** — Hardware-accelerated rendering, DOM storage, and Chrome-compatible User-Agent for maximum player compatibility.
- **Back Button Support** — Android back button navigates within the app instead of closing it.
- **Keep Screen Awake** — Screen stays on while you're watching.
- **Dark Theme Splash** — Matches the AnimePro dark aesthetic from launch.

---

## 🛠️ Installation

### Windows
1. Download `AnimePro-Setup-2.0.4.exe`
2. Run the installer (if SmartScreen warns, click **More Info** → **Run anyway**)
3. Launch AnimePro from the Start Menu or Desktop shortcut

### Android
1. Download `AnimePro-v2.0.4.apk` to your phone
2. Open the file and tap **Install** (enable *Install from unknown sources* if prompted)
3. Open AnimePro and start watching!

---

## ⚙️ Technical Details

| | Windows | Android |
|---|---------|---------|
| **Engine** | Electron 36 | Capacitor + Android WebView |
| **Min OS** | Windows 10 | Android 7.0 (API 24) |
| **Architecture** | x64 | Universal |
| **Auto-Update** | Loads latest from Vercel | Loads latest from Vercel |
| **Package** | NSIS Installer | Debug APK |

---

## 🐛 Known Issues
- **Windows SmartScreen** — Since the app is not code-signed, Windows may show a warning on first install. This is normal for unsigned apps.
- **Android "Unknown Sources"** — You need to allow installation from unknown sources since the APK is not from the Play Store.
- **Some Streaming Servers** — A few providers may still not load on certain devices. Try switching servers from the player controls.

---

**Full Changelog**: https://github.com/Ansh7473/anime-pro-v1/compare/v2.0.3...v2.0.4
