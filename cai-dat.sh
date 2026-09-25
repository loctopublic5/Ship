#!/usr/bin/env bash
# Cài bộ Ship (lệnh /ship + 4 agent + script kiểm tra) vào một dự án. Dùng trên macOS/Linux/Git Bash.
#
#   ./cai-dat.sh ~/code/du-an            # bỏ qua file trùng tên đã có
#   ./cai-dat.sh ~/code/du-an --ghi-de   # ghi đè
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Cách dùng: $0 <thư-mục-dự-án> [--ghi-de]" >&2
  exit 1
fi

nguon="$(cd "$(dirname "$0")" && pwd)"
dich="$(cd "$1" && pwd)/.claude"
ghi_de="${2:-}"

for f in commands/ship.md agents/planner.md agents/coder.md agents/tester.md agents/reviewer.md \
         scripts/bangiao.cjs scripts/ship-headless.ps1; do
  mkdir -p "$dich/$(dirname "$f")"
  if [ -e "$dich/$f" ] && [ "$ghi_de" != "--ghi-de" ]; then
    echo "Bỏ qua (đã có): $f   -- dùng --ghi-de để ghi đè"
    continue
  fi
  cp "$nguon/.claude/$f" "$dich/$f"
  echo "Đã cài: $f"
done

if [ -e "$dich/settings.json" ]; then
  cp "$nguon/mau/settings.json" "$dich/settings.ship.json"
  echo
  echo "Dự án đã có .claude/settings.json nên KHÔNG ghi đè."
  echo "Hãy gộp tay các quyền trong .claude/settings.ship.json vào settings.json rồi xoá file đó."
else
  cp "$nguon/mau/settings.json" "$dich/settings.json"
  echo "Đã cài: settings.json"
fi

echo
echo "Xong. Trong dự án: tạo nhánh tính năng, mở Claude Code, gõ /ship <yêu cầu>."
