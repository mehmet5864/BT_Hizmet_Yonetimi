# Kullanim: .\geri-yukle-docker.bat yedekler\db-YYYYMMDD-HHMMSS.sql.gz [yedekler\dosyalar-YYYYMMDD-HHMMSS.tar.gz]
param([string]$DbFile = "", [string]$FilesFile = "")
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$project = if ($env:COMPOSE_PROJECT_NAME) { $env:COMPOSE_PROJECT_NAME } else { "bt-hizmet-yonetimi-v4" }
$dbc = if ($env:DB_CONTAINER) { $env:DB_CONTAINER } else { "bt-postgres-v4" }
if (-not $DbFile -or -not (Test-Path $DbFile)) {
  Write-Host "Kullanim: .\geri-yukle-docker.bat yedekler\db-....sql.gz [yedekler\dosyalar-....tar.gz]"
  exit 1
}
$ans = Read-Host "Mevcut veritabaninin USTUNE yazilacak. Devam? (evet/hayir)"
if ($ans -ne "evet") { Write-Host "Iptal."; exit 1 }

docker compose stop envanter
docker cp (Resolve-Path $DbFile) "${dbc}:/tmp/geri.sql.gz"
docker exec $dbc sh -c "gunzip -c /tmp/geri.sql.gz | psql -U bt -d bt -q"
docker exec $dbc rm -f /tmp/geri.sql.gz

if ($FilesFile -and (Test-Path $FilesFile)) {
  $full = Resolve-Path $FilesFile
  $dir = Split-Path $full -Parent
  $name = Split-Path $full -Leaf
  docker run --rm -v "${project}_envanter-data:/data" -v "${project}_envanter-uploads:/uploads" -v "${dir}:/in:ro" postgres:16-alpine tar xzf "/in/$name" -C /
}
docker compose start envanter
Write-Host "Geri yukleme tamam."
