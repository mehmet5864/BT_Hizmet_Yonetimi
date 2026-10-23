#Requires -Version 5.1
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
. (Join-Path $Root "scripts\docker-desktop.ps1")
Assert-DockerDesktop

if (-not (Start-BtDockerBuild -Root $Root)) { exit 1 }
Finish-BtDocker -Root $Root
