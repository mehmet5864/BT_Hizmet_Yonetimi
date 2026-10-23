@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0geri-yukle-docker.ps1" "%~1" "%~2"
if errorlevel 1 pause
endlocal
