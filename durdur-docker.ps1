#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
. (Join-Path $Root "scripts\docker-desktop.ps1")
Assert-DockerDesktop

Write-Host "Konteyner duruyor. Volume'lar (veri) kaliyor. down -v KULLANILMIYOR."
if ((Invoke-AppCompose -ComposeArgs @("down")) -ne 0) { exit 1 }
Write-Host "Durdu. Tekrar: baslat-docker.bat"
