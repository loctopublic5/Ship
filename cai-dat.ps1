<#
.SYNOPSIS
  Cai bo Ship (lenh /ship + 4 agent + script kiem tra) vao mot du an.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File D:\CODE\Ship\cai-dat.ps1 -DuAn D:\CODE\du-an-cua-toi

.EXAMPLE
  .\cai-dat.ps1 -DuAn ..\du-an -GhiDe    # ghi de file trung ten da co
#>
param(
  [Parameter(Mandatory = $true)][string]$DuAn,
  [switch]$GhiDe
)

$ErrorActionPreference = 'Stop'
$nguon = Join-Path $PSScriptRoot '.claude'
$dich = Join-Path (Resolve-Path $DuAn) '.claude'

$cacFile = @(
  'commands/ship.md',
  'agents/planner.md',
  'agents/coder.md',
  'agents/tester.md',
  'agents/reviewer.md',
  'scripts/bangiao.cjs',
  'scripts/ship-headless.ps1'
)

foreach ($f in $cacFile) {
  $tu = Join-Path $nguon $f
  $toi = Join-Path $dich $f
  New-Item -ItemType Directory -Force (Split-Path $toi) | Out-Null
  if ((Test-Path $toi) -and -not $GhiDe) {
    Write-Host "Bo qua (da co): $f   -- dung -GhiDe de ghi de"
    continue
  }
  Copy-Item $tu $toi -Force
  Write-Host "Da cai: $f"
}

$settingsDich = Join-Path $dich 'settings.json'
if (Test-Path $settingsDich) {
  Copy-Item (Join-Path $nguon 'settings.json') (Join-Path $dich 'settings.ship.json') -Force
  Write-Host ''
  Write-Host 'Du an da co .claude/settings.json nen KHONG ghi de.'
  Write-Host 'Hay gop tay cac quyen trong .claude/settings.ship.json vao settings.json roi xoa file do.'
} else {
  Copy-Item (Join-Path $nguon 'settings.json') $settingsDich
  Write-Host 'Da cai: settings.json'
}

Write-Host ''
Write-Host 'Xong. Trong du an: tao nhanh tinh nang, mo Claude Code, go /ship <yeu cau>.'
