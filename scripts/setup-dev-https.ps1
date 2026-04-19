$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoDir = Resolve-Path (Join-Path $scriptDir "..")
$certDir = Join-Path $repoDir "certs"
$certPath = Join-Path $certDir "dev-cert.pem"
$keyPath = Join-Path $certDir "dev-key.pem"

if (-not (Get-Command mkcert -ErrorAction SilentlyContinue)) {
  Write-Error "mkcert is required. Install it first, then rerun this script."
}

if (-not (Test-Path $certDir)) {
  New-Item -ItemType Directory -Path $certDir | Out-Null
}

# Install or update local CA if needed.
mkcert -install | Out-Null

$hosts = @("localhost", "127.0.0.1", "::1")

try {
  $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
    Where-Object {
      $_.IPAddress -ne "127.0.0.1" -and
      $_.PrefixOrigin -ne "WellKnown" -and
      $_.IPAddress -notlike "169.254.*"
    } |
    Select-Object -ExpandProperty IPAddress -Unique
  if ($ips) {
    $hosts += $ips
  }
} catch {
  # If IP detection fails, continue with localhost entries.
}

Write-Host "Generating cert for:" ($hosts -join ", ")
mkcert -key-file $keyPath -cert-file $certPath @hosts

Write-Host "Done."
Write-Host "Cert: $certPath"
Write-Host "Key : $keyPath"
