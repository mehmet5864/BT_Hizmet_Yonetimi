@echo off
setlocal
cd /d "%~dp0"
set COMPOSE_BAKE=false
set COMPOSE_ANSI=never
set BUILDKIT_PROGRESS=plain
set DOCKER_CLI_HINTS=false
echo BT Hizmet Yonetimi - Docker Desktop yukleme / guncelleme
echo Zip'i Docker'a suruklemeyin. Bu dosyaya cift tiklayin.
echo Node.js gerekmez. Eski kayitlar volume'da kalir.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-docker.ps1"
if errorlevel 1 pause
endlocal
