# 📺 AnimePro TV App Setup Guide

This folder contains the separate Capacitor wrapper for the **Android TV** version of AnimePro.

## 🚀 Getting Started

1.  **Install Dependencies**:
    ```bash
    cd tv-app
    npm install
    ```

2.  **Initialize Android Project**:
    ```bash
    npx cap add android
    ```

3.  **Enable Android TV (Leanback) Support**:
    Open `android/app/src/main/AndroidManifest.xml` and make the following changes:

    *   **Add Leanback Feature Requirement**:
        Add this inside the `<manifest>` tag but outside `<application>`:
        ```xml
        <uses-feature android:name="android.software.leanback" android:required="false" />
        <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
        ```

    *   **Update Activity Intent Filter**:
        Change the `<intent-filter>` of the `MainActivity` to include the Leanback launcher:
        ```xml
        <intent-filter>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
            <!-- ADD THIS LINE FOR TV SUPPORT -->
            <category android:name="android.intent.category.LEANBACK_LAUNCHER" />
        </intent-filter>
        ```

4.  **Add TV Banner Icon**:
    Android TV requires a wide banner (320x180). Place your banner in:
    `android/app/src/main/res/drawable-xhdpi/itv_banner.png`
    And reference it in the `<application>` tag of `AndroidManifest.xml`:
    ```xml
    <application
        android:banner="@drawable/itv_banner"
        ... >
    ```

5.  **Run the App**:
    ```bash
    npx cap run android
    ```

## 🎯 Distinguishing Features
- **App ID**: `com.animepro.ultra.tv` (Prevents conflict with mobile app).
- **Start Route**: Automatically loads `/tv` Hub.
- **Navigation**: Optimized for D-pad/Remote control via the `tv-mode` CSS class.
