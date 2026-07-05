# Android TV Build Guide

## Overview

WatchAnimez supports Android TV (and Fire TV) natively from the same Flutter codebase. The app automatically detects TV mode and adapts the UI for 10-foot (D-pad/remote) navigation.

## How TV Detection Works

1. **Native platform channel** (`com.watchanimez/platform`) — queries Android's `UiModeManager` for `UI_MODE_TYPE_TELEVISION`. Called once at startup via `DeviceInfo.init()`.
2. **Heuristic fallback** — for web/desktop testing: screens ≥960dp wide, landscape, ≤2.0 DPR are treated as TV.
3. **Debug toggle** — set `DeviceInfo.forceTv = true` to test TV layout on any device.

## Building for TV

```bash
# Regular APK (works on phone + TV)
flutter build apk --release

# App bundle (recommended for Play Store, includes TV)
flutter build appbundle --release

# Run on a connected Android TV / emulator
flutter run -d <tv-device-id>
```

### Fire TV

Same APK works. The app also detects Fire TV via `amazon.hardware.fire_tv` feature for potential future Fire-TV-specific tweaks.

```bash
# Install on Fire TV via ADB
adb install build/app/outputs/flutter-apk/app-release.apk
```

## TV-Specific UI Adaptations

| Feature | Phone | TV |
|---------|-------|-----|
| Navigation | Bottom nav bar | Left rail with D-pad focus |
| Cards | Tap to open | Focus ring + scale on D-pad |
| Home hero | Touch swipe | Auto-rotate with backdrop |
| Details | Scroll layout | Side-by-side cinematic layout |
| Video controls | Touch overlay | Remote key handling (play/pause/seek) |
| Search | Keyboard | On-screen keyboard + genre chips |

## Key Files

- `lib/core/device/device_info.dart` — Detection logic
- `lib/core/router/app_shell.dart` — TV navigation rail
- `lib/features/watch/tv_remote_handler.dart` — Remote key mapping
- `lib/features/watch/tv_video_overlay.dart` — TV playback overlay
- `lib/shared/widgets/tv_button.dart` — Reusable TV-focused button
- `android/app/src/main/kotlin/.../MainActivity.kt` — Native TV detection
- `android/app/src/main/AndroidManifest.xml` — Leanback launcher

## Testing TV Layout on Desktop/Web

Two options:
1. Set `DeviceInfo.forceTv = true` in `device_info.dart`
2. Resize browser/window to ≥960px wide with landscape aspect ratio

## Manifest Requirements (already configured)

```xml
<uses-feature android:name="android.software.leanback" android:required="false"/>
<uses-feature android:name="android.hardware.touchscreen" android:required="false"/>
<category android:name="android.intent.category.LEANBACK_LAUNCHER"/>
```

## TV Banner

`android/app/src/main/res/drawable/tv_banner.xml` — 320×180dp vector used on TV launcher home screen. Replace with a raster `tv_banner.png` (320×180px) for custom branding.
