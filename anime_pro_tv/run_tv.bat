@echo off
echo Starting AnimePro TV Build (D: Drive Isolated Mode)...

:: Force Pub Cache to D: drive
set PUB_CACHE=D:\flutterbuilftvnatoive\cache\pub

:: Ensure local cache directories exist
if not exist "D:\flutterbuilftvnatoive\cache\gradle" mkdir "D:\flutterbuilftvnatoive\cache\gradle"
if not exist "D:\flutterbuilftvnatoive\cache\pub" mkdir "D:\flutterbuilftvnatoive\cache\pub"

echo Cache set to D:\flutterbuilftvnatoive\cache
echo Gradle Home set via gradle.properties

"D:\flutterbuilftvnatoive\flutter zipextract\flutter\bin\flutter.bat" run
pause
