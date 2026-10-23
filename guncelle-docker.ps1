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

if (-not (Start-BtDockerBuild -Root $Root)) { exit 1 }
Finish-BtDocker -Root $Root
