@echo off
echo Starting AnimePro TV - WINDOWS SIMULATOR MODE...

:: Use the local D: drive pub cache
set PUB_CACHE=D:\flutterbuilftvnatoive\cache\pub

if not exist "D:\flutterbuilftvnatoive\cache\pub" mkdir "D:\flutterbuilftvnatoive\cache\pub"

echo Simulator starting in 16:9 aspect ratio...
echo Use ARROW KEYS for D-pad navigation.

"D:\flutterbuilftvnatoive\flutter zipextract\flutter\bin\flutter.bat" run -d windows
pause
