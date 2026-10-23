#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
. (Join-Path $Root "scripts\docker-desktop.ps1")
Assert-DockerDesktop
Write-AppEnv -Root $Root

if (-not (Test-Path (Join-Path $Root "docker-compose.yml"))) {
  Write-Host "docker-compose.yml yok. Zip'i tam cikarin, sonra install-docker.bat calistirin."
  exit 1
}

Write-Host "Konteyner baslatiliyor (yeniden derlenmez, veriler volume'da)..."
if ((Invoke-AppCompose -ComposeArgs @("up", "--detach")) -ne 0) { exit 1 }

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  try {
    $code = (Invoke-WebRequest -Uri "http://127.0.0.1:43130/giris" -UseBasicParsing -TimeoutSec 3).StatusCode
    if ($code -ge 200 -and $code -lt 400) { $ready = $true; break }
  } catch {
    Write-Host "Bekleniyor ($($i + 1)/30)..."
  }
}

Start-Process "http://127.0.0.1:43130/giris"
if ($ready) {
  Write-Host "Hazir: http://127.0.0.1:43130"
} else {
  Write-Host "Motor calisiyor. Tarayiciyi biraz sonra yenileyin: http://127.0.0.1:43130/giris"
}
