@echo off
setlocal
cd /d "%~dp0"
set COMPOSE_BAKE=false
set COMPOSE_ANSI=never
set BUILDKIT_PROGRESS=plain
set DOCKER_CLI_HINTS=false
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-docker.ps1"
if errorlevel 1 pause
endlocal
