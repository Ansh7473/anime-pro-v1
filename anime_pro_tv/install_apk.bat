@echo off
echo ============================================================
echo           ANIMEPRO TV - ONE-CLICK INSTALLER
echo ============================================================
echo.

:: Auto-detect ADB
set ADB=adb
where adb >nul 2>&1
if %errorlevel% neq 0 (
    set ADB="%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
)

set APK_PATH=build\app\outputs\flutter-apk\app-release.apk

:: Check if APK exists
if not exist "%APK_PATH%" (
    echo [ERROR] Release APK not found!
    echo Please run build_release.bat first.
    pause
    exit /b
)

echo [STEP 1] Checking for Connected Devices...
%ADB% devices
echo.

echo [STEP 2] Installing APK...
%ADB% install -r "%APK_PATH%"
echo.

if %errorlevel% equ 0 (
    echo SUCCESS! The app is now installed on your device.
) else (
    echo ERROR! Installation failed. Check if your emulator is turned on.
)

echo.
pause
