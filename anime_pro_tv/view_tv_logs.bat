@echo off
echo ============================================================
echo           ANIMEPRO TV - REAL-TIME DEBUGGER
echo ============================================================
echo.

:: Auto-detect ADB if not in PATH
set ADB=adb
where adb >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
        set ADB="%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
    ) else (
        echo [ERROR] ADB not found in your PATH or default SDK folder.
        echo Please ensure Android SDK Platform Tools are installed.
        pause
        exit /b
    )
)

echo [STEP 1] Checking for Connected TV or Emulator...
%ADB% devices
echo.

echo [STEP 2] Starting Log Stream...
echo (I am filtering for Player, Chromium, and Security errors)
echo (Press Ctrl+C to stop at any time)
echo.
echo ------------------------------------------------------------
echo.

:: This filters for Chromium, Flutter, and potential rendering errors (ViewRootImpl)
:: We removed *:S to catch more system-level failures that cause black screens.
%ADB% logcat -c
%ADB% logcat -v time *:W chromium:V flutter:V WebViewFactory:V WebContentsDelegateAdapter:E ViewRootImpl:V System.out:V

echo.
echo Log stream ended.
pause
