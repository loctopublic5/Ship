<#
.SYNOPSIS
  Chay day chuyen /ship khong can tuong tac (headless), tra ma thoat theo ket qua.

.DESCRIPTION
  Dung cho tu dong hoa: CI, Task Scheduler, hoac vong lap nhieu yeu cau.
  Chay tu thu muc goc cua du an (noi co .claude/).

  Vong sua: test ROT hoac reviewer CAN SUA thi coder tu sua roi test/review lai,
  toi da -SoVongSua vong (mac dinh 2, dat 0 de tat).

  Ma thoat:
    0  Reviewer CHAP THUAN
    10 Dang o nhanh chinh / khong phai repo git / HEAD roi
    11 Ke hoach con CAU HOI BO NGO
    12 Coder bao VUONG MAC
    13 Test ROT (da het vong sua)
    14 Reviewer CAN SUA (da het vong sua)
    15 Reviewer TU CHOI
    16 File ban giao thieu hoac sai khuon
    1  Loi khac (khong co claude, day chuyen dung giua chung...)

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .claude/scripts/ship-headless.ps1 "them nut xuat CSV cho bang don hang"

.EXAMPLE
  .claude/scripts/ship-headless.ps1 "..." -ChoPhepThem "Bash(npm test:*)","Bash(npx vitest:*)"
#>
param(
  [Parameter(Mandatory = $true, Position = 0)][string]$YeuCau,
  [string]$PermissionMode = 'acceptEdits',
  [string[]]$ChoPhepThem = @(),
  [ValidateRange(0, 10)][int]$SoVongSua = 2
)

# Khong dung 'Stop': o PS 5.1, chuyen huong stderr cua lenh native (2>&1) se nem loi dung script.
$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$OutputEncoding = [Text.Encoding]::UTF8

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  Write-Host 'Khong tim thay lenh "claude" trong PATH. Cai Claude Code CLI truoc.' -ForegroundColor Red
  exit 1
}
if (-not (Test-Path '.claude/commands/ship.md')) {
  Write-Host 'Khong thay .claude/commands/ship.md. Hay chay tu thu muc goc cua du an da cai Ship.' -ForegroundColor Red
  exit 1
}

# Chan som, khoi ton mot phien model neu dang o nhanh chinh.
$nhanh = (git symbolic-ref --short -q HEAD 2>$null)
if (-not $nhanh -or @('main', 'master') -contains $nhanh) {
  Write-Host "Dung: nhanh hien tai la '$nhanh'. Hay tao nhanh tinh nang truoc."
  exit 10
}

$env:SHIP_SO_VONG_SUA = "$SoVongSua"
New-Item -ItemType Directory -Force '.bangiao' | Out-Null
$trangThai = '.bangiao/trang-thai.json'
Remove-Item $trangThai -ErrorAction SilentlyContinue
$nhatKy = ".bangiao/headless-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"

$doiSo = @('-p', "/ship $YeuCau", '--permission-mode', $PermissionMode)
if ($ChoPhepThem.Count -gt 0) { $doiSo += @('--allowedTools') + $ChoPhepThem }

Write-Host "Nhanh: $nhanh | Nhat ky: $nhatKy"
# ForEach "$_": doi dong stderr (bi PS 5.1 boc thanh ErrorRecord) ve chuoi thuong.
& claude @doiSo 2>&1 | ForEach-Object { "$_" } | Tee-Object -FilePath $nhatKy

if (-not (Test-Path $trangThai)) {
  Write-Host 'Khong co trang-thai.json: day chuyen khong chay toi chang chuan bi.'
  exit 1
}
$tt = Get-Content $trangThai -Raw -Encoding UTF8 | ConvertFrom-Json

$maThoat = @{
  'chap-thuan'     = 0
  'cau-hoi-bo-ngo' = 11
  'vuong-mac'      = 12
  'test-rot'       = 13
  'can-sua'        = 14
  'tu-choi'        = 15
  'loi-ban-giao'   = 16
}
$ma = 1
if ($tt.ketThuc -and $maThoat.ContainsKey($tt.ketThuc)) { $ma = $maThoat[$tt.ketThuc] }

Write-Host "Chang cuoi: $($tt.chang) | Vong sua: $($tt.vongSua)/$SoVongSua | Ket thuc: $($tt.ketThuc) | Ma thoat: $ma"
exit $ma
