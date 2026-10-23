#Requires -Version 5.1
# Docker Compose icin tirnaksiz, BOM'suz .env yazar. Var olan degerlere dokunmaz; yalniz eksik anahtarlari ekler.

function New-Secret {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  -join ($bytes | ForEach-Object { $_.ToString("x2") })
}

function Write-AppEnv {
  param([Parameter(Mandatory = $true)][string]$Root)
  $path = Join-Path $Root ".env"
  $created = -not (Test-Path -LiteralPath $path)
  $lines = @()
  if (-not $created) { $lines = @([System.IO.File]::ReadAllLines($path)) }
  function Has-Key([string[]]$L, [string]$K) { return @($L | Where-Object { $_ -match ("^" + [regex]::Escape($K) + "=.+") }).Count -gt 0 }
  $defaults = [ordered]@{
    SESSION_SECRET    = { New-Secret }
    POSTGRES_PASSWORD = { New-Secret }
    SESSION_SECURE    = { "false" }
    APP_URL           = { "http://127.0.0.1:43130" }
    SEED_ON_START     = { "true" }
  }
  foreach ($k in $defaults.Keys) {
    if (-not (Has-Key $lines $k)) {
      $lines = @($lines | Where-Object { $_ -notmatch ("^" + [regex]::Escape($k) + "=") })
      $lines += ($k + "=" + (& $defaults[$k]))
    }
  }
  $utf8 = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($path, (($lines | Where-Object { $_ -ne "" }) -join "`n") + "`n", $utf8)
  if ($created) { Write-Host "Yerel .env olusturuldu (oturum anahtari ve veritabani parolasi uretildi)." }
}
