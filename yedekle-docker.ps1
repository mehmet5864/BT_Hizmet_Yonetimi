# Veritabanı (PostgreSQL) + dosyalar (lisans, yüklemeler) yedeği -> .\yedekler
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$project = if ($env:COMPOSE_PROJECT_NAME) { $env:COMPOSE_PROJECT_NAME } else { "bt-hizmet-yonetimi-v4" }
$dbc = if ($env:DB_CONTAINER) { $env:DB_CONTAINER } else { "bt-postgres-v4" }
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
New-Item -ItemType Directory -Force -Path "yedekler" | Out-Null

Write-Host "Veritabani yedegi aliniyor..."
docker exec $dbc sh -c "pg_dump -U bt -d bt --clean --if-exists | gzip > /tmp/yedek.sql.gz"
if ($LASTEXITCODE -ne 0) { throw "pg_dump basarisiz" }
docker cp "${dbc}:/tmp/yedek.sql.gz" "yedekler/db-$ts.sql.gz"
docker exec $dbc rm -f /tmp/yedek.sql.gz

Write-Host "Dosyalar (lisans, yuklemeler) yedegi aliniyor..."
$out = Join-Path $PSScriptRoot "yedekler"
docker run --rm -v "${project}_envanter-data:/data:ro" -v "${project}_envanter-uploads:/uploads:ro" -v "${out}:/out" postgres:16-alpine tar czf "/out/dosyalar-$ts.tar.gz" -C / data uploads
if ($LASTEXITCODE -ne 0) { throw "dosya yedegi basarisiz" }

Write-Host "Tamam: yedekler\db-$ts.sql.gz  ve  yedekler\dosyalar-$ts.tar.gz"
