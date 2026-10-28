#Requires -Version 5.1
param(
  [Parameter(Position = 0)]
  [string]$Hedef
)
$ErrorActionPreference = "Stop"
$Source = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Source
. (Join-Path $Source "scripts\docker-desktop.ps1")
Assert-DockerDesktop

# Docker verisi klasorde degil volume'dadir. Yeni zip klasorunden derlemek yeter.
# Node.js gerekmez. Eski 1.1.x yolu istege baglidir.
$Root = $Source
if ($Hedef) {
  $Hedef = (Resolve-Path $Hedef).Path
  if ((Resolve-Path $Source).Path -ne $Hedef) {
    Write-Host "Dosyalar kopyalaniyor (Node.js yok, volume'a dokunulmaz)..."
    Copy-ReleaseOverlay -Source $Source -Target $Hedef
    $Root = $Hedef
  }
} else {
  Write-Host "Bu paket klasorunden imaj derlenecek. Kayitlar PostgreSQL volume'unda kalir."
}

# Guncellemeden once otomatik yedek (veritabani + lisans/yuklemeler). Yedek alinamazsa guncelleme DURUR.
# Bilerek atlamak icin: $env:BT_YEDEKSIZ = "1"
if ($env:BT_YEDEKSIZ -ne "1") {
  $dbc = if ($env:DB_CONTAINER) { $env:DB_CONTAINER } else { "bt-postgres-v4" }
  $running = $null
  try { $running = docker ps --filter "name=^$dbc$" --format "{{.Names}}" 2>$null } catch { }
  if ($running) {
    Write-Host "Guncellemeden once otomatik yedek aliniyor (yedekler klasoru)..."
    & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Source "yedekle-docker.ps1")
    if ($LASTEXITCODE -ne 0) {
      Write-Host "Yedek ALINAMADI, guncelleme durduruldu. Verilere dokunulmadi."
      Write-Host "Sorunu giderin ya da bilerek yedeksiz devam etmek icin: `$env:BT_YEDEKSIZ='1'"
      exit 1
    }
  } else {
    Write-Host "Veritabani konteyneri calismiyor (ilk kurulum olabilir); otomatik yedek atlandi."
  }
}

if (-not (Start-BtDockerBuild -Root $Root)) { exit 1 }
Finish-BtDocker -Root $Root
