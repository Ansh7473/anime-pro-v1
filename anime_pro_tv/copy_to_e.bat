@echo off
set SOURCE=build\app\outputs\flutter-apk\app-release.apk
set DEST=E:\AnimeProTV.apk

echo ========================================
echo       APK TV TRANSFER TOOL
echo ========================================

:: Check if E: drive exists
if not exist "E:\" (
    echo [ERROR] Drive E:\ not found! 
    echo Please plug in your USB drive or check if E: is correct.
    goto end
)

:: Check if APK exists
if exist "%SOURCE%" (
    echo [FOUND] %SOURCE%
    echo [COPYING] Moving to E:\ ...
    copy /Y "%SOURCE%" "%DEST%"
    echo.
    echo [SUCCESS] Your TV APK is ready at: %DEST%
) else (
    echo [ERROR] Release APK not found!
    echo Please run build_release.bat before using this script.
)

:end
echo.
pause
