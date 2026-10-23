#Requires -Version 5.1
# Docker Desktop motorunu bulur, gerekirse acar, Compose V2 kullanir.
. (Join-Path $PSScriptRoot "write-env.ps1")

function Get-DockerDesktopExe {
  $candidates = @(
    "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
    "${env:ProgramFiles(x86)}\Docker\Docker\Docker Desktop.exe",
    "$env:LOCALAPPDATA\Programs\Docker\Docker\Docker Desktop.exe"
  )
  foreach ($path in $candidates) {
    if ($path -and (Test-Path -LiteralPath $path)) { return $path }
  }
  return $null
}

function Test-DockerEngine {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { return $false }
  docker info *> $null
  return ($LASTEXITCODE -eq 0)
}

function Set-ComposeNoTty {
  # Docker Desktop Bake, .bat -> powershell zincirinde "failed to get console" verir.
  $env:COMPOSE_BAKE = "false"
  $env:COMPOSE_ANSI = "never"
  $env:BUILDKIT_PROGRESS = "plain"
  $env:DOCKER_CLI_HINTS = "false"
}

function Get-DockerCli {
  $cmd = Get-Command docker.exe -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source -and ($cmd.Source -like "*.exe")) { return $cmd.Source }
  foreach ($path in @(
      "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe",
      "$env:ProgramFiles\Docker\Docker\resources\com.docker.cli.exe"
    )) {
    if ($path -and (Test-Path -LiteralPath $path)) { return $path }
  }
  return $null
}

function Get-ComposePlugin {
  foreach ($path in @(
      "$env:ProgramFiles\Docker\Docker\resources\cli-plugins\docker-compose.exe",
      "$env:ProgramFiles\Docker\cli-plugins\docker-compose.exe",
      "$env:USERPROFILE\.docker\cli-plugins\docker-compose.exe",
      "$env:ProgramFiles\Docker\Docker\resources\bin\docker-compose.exe"
    )) {
    if (Test-Path -LiteralPath $path) { return $path }
  }
  return $null
}

function Invoke-NativeExe {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Argv
  )
  # Windows PowerShell 5.1: asla "compose up --build --detach" tek arguman yapma.
  $quoted = foreach ($part in $Argv) {
    if ($part -match '[\s"]') { '"{0}"' -f ($part -replace '"', '\"') } else { $part }
  }
  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo.FileName = $FilePath
  $proc.StartInfo.Arguments = ($quoted -join " ")
  $proc.StartInfo.UseShellExecute = $false
  if (-not $proc.Start()) { return 1 }
  $proc.WaitForExit()
  return $proc.ExitCode
}

function Invoke-AppCompose {
  param([Parameter(Mandatory = $true)][string[]]$ComposeArgs)
  Set-ComposeNoTty
  $docker = Get-DockerCli
  if (-not $docker) {
    Write-Host "docker.exe bulunamadi. Docker Desktop kurulu ve PATH'te olmali."
    return 1
  }

  Write-Host ("Calisiyor: " + $docker + " compose " + ($ComposeArgs -join " "))

  $code = Invoke-NativeExe -FilePath $docker -Argv (@("compose", "--progress", "plain") + $ComposeArgs)
  if ($code -eq 0) { return 0 }

  $code = Invoke-NativeExe -FilePath $docker -Argv (@("compose") + $ComposeArgs)
  if ($code -eq 0) { return 0 }

  $plugin = Get-ComposePlugin
  if ($plugin) {
    Write-Host "Compose eklentisi deneniyor: $plugin"
    return (Invoke-NativeExe -FilePath $plugin -Argv $ComposeArgs)
  }

  Write-Host "Docker Compose calismadi (unknown docker command / compose yok)."
  Write-Host "Docker Desktop > Settings > General > Use Docker Compose V2  isaretleyin."
  Write-Host "Sonra Docker Desktop'ta Restart'a basin, balina sabitlenince yukle-docker.bat'i tekrar calistirin."
  return 1
}

function Assert-DockerDesktop {
  Set-ComposeNoTty
  $exe = Get-DockerDesktopExe

  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    if ($exe) {
      Write-Host "Docker komutu henuz PATH'te yok. Docker Desktop aciliyor..."
      Start-Process -FilePath $exe
    } else {
      Write-Host "Docker Desktop kurulu degil."
      Write-Host "Indirin: https://www.docker.com/products/docker-desktop/"
      Write-Host "Kurulumda 'Use WSL 2' isaretli kalsin. Bitince oturumu kapatip acin, Docker Desktop'i baslatin."
      try { Start-Process "https://www.docker.com/products/docker-desktop/" } catch { }
      exit 1
    }
  }

  if (Test-DockerEngine) { return }

  if ($exe) {
    Write-Host "Docker Desktop motoru kapali. Baslatiliyor (balina sabitlenene kadar bekleyin)..."
    Start-Process -FilePath $exe
  } else {
    Write-Host "Docker Desktop acik degil. Sistem tepsisindeki balina ikonundan baslatin."
    exit 1
  }

  for ($i = 1; $i -le 40; $i++) {
    Start-Sleep -Seconds 3
    if (Test-DockerEngine) {
      Write-Host "Docker Desktop hazir."
      return
    }
    Write-Host "Docker Desktop bekleniyor ($i/40)..."
  }

  Write-Host "Motor ayaga kalkmadi."
  Write-Host "- Docker Desktop'ta Linux containers secili olsun (sistem tepsisi > Switch to Linux containers)."
  Write-Host "- WSL 2 yoksa yonetici PowerShell: wsl --install   sonra bilgisayari yeniden baslatin."
  Write-Host "- Docker Desktop'i kapatip tekrar acin; balina durana kadar bekleyin."
  exit 1
}

function Wait-AppHttp {
  param([int]$Tries = 40, [int]$DelaySec = 3)
  for ($i = 0; $i -lt $Tries; $i++) {
    Start-Sleep -Seconds $DelaySec
    try {
      $code = (Invoke-WebRequest -Uri "http://127.0.0.1:43130/giris" -UseBasicParsing -TimeoutSec 3).StatusCode
      if ($code -ge 200 -and $code -lt 400) { return $true }
    } catch {
      Write-Host "Bekleniyor ($($i + 1)/$Tries)..."
    }
  }
  return $false
}

function Copy-ReleaseOverlay {
  param([string]$Source, [string]$Target)
  $skipDir = @(
    ".git", ".next", "node_modules", "release", "yedek", "coverage", ".vercel", ".cursor"
  )
  $walk = {
    param($From)
    Get-ChildItem -LiteralPath $From -Force | ForEach-Object {
      $rel = $_.FullName.Substring($Source.Length).TrimStart("\", "/")
      $name = $_.Name
      if ($skipDir -contains $name) { return }
      if ($name -eq ".env" -or $name -eq ".kurulum-ok") { return }
      if ($name -like "*.db" -or $name -like "*.db-journal" -or $name -like "*.db-wal") { return }
      if ($rel -like "public\uploads\*" -and $name -ne ".gitkeep") { return }
      $dst = Join-Path $Target $rel
      if ($_.PSIsContainer) {
        New-Item -ItemType Directory -Path $dst -Force | Out-Null
        & $walk $_.FullName
      } else {
        New-Item -ItemType Directory -Path (Split-Path $dst) -Force | Out-Null
        Copy-Item -LiteralPath $_.FullName -Destination $dst -Force
      }
    }
  }
  & $walk $Source
}

function Start-BtDockerBuild {
  param([string]$Root)
  Write-AppEnv -Root $Root
  Set-Location $Root
  Write-Host ""
  Write-Host "Kayitlar PostgreSQL volume'dadir (bt-hizmet-yonetimi-v4_pgdata)."
  Write-Host "Node.js gerekmez."
  Write-Host "Ilk derleme birkac dakika surer. Pencereyi kapatmayin."
  Write-Host "docker compose down -v YAZMAYIN."
  Write-Host ""
  docker rm -f envanter-yonetim-v4 2>$null | Out-Null
  if ((Invoke-AppCompose -ComposeArgs @("up", "--build", "--detach")) -ne 0) { return $false }
  return $true
}

function Finish-BtDocker {
  param([string]$Root)
  $ready = Wait-AppHttp
  try { Start-Process "http://127.0.0.1:43130/giris" } catch { }
  if ($ready) {
    Write-Host "Hazir: http://127.0.0.1:43130"
  } else {
    Write-Host "Konteyner kalkti. Bir dakika sonra yenileyin: http://127.0.0.1:43130/giris"
  }
  Write-Host "Sonraki acilis: baslat-docker.bat"
  Write-Host "Durdurmak: durdur-docker.bat"
  Set-Content -Path (Join-Path $Root ".kurulum-ok") -Value (Get-Date -Format o)
}
