# Ship: nhạc trưởng điều phối 4 agent

Lệnh `/ship <yêu cầu>` cho Claude Code chạy trọn dây chuyền làm tính năng:
**planner → coder → tester → reviewer**, có vòng sửa tự động. Các agent bàn giao
cho nhau qua file trong `.bangiao/`. Việc đi tiếp, sửa hay dừng do một script
quyết theo luật cố định, không để model tự cảm nhận.

```
chặng 0  chuan-bi     nhánh chính / HEAD rời / không phải git ──► DỪNG
chặng 1  planner  ──► ke-hoach.md      có CÂU HỎI CÒN BỎ NGỎ ──► DỪNG, hỏi bạn
chặng 2  coder    ──► thay-doi.md      có VƯỚNG MẮC          ──► DỪNG
chặng 3  tester   ──► ket-qua-test.md  KẾT LUẬN: RỚT         ──► VÒNG SỬA
chặng 4  reviewer ──► danh-gia.md      CHẤP THUẬN            ──► XONG
                                       CẦN SỬA               ──► VÒNG SỬA
                                       TỪ CHỐI               ──► DỪNG

VÒNG SỬA (tối đa 2, đếm chung cho test rớt và CẦN SỬA):
  bàn giao cũ ─► .bangiao/vong-N/ ─► coder sửa ─► quay lại chặng 3 ─► chặng 4
  hết vòng mà vẫn rớt / vẫn CẦN SỬA ─► DỪNG, cho bạn xem
```

Không merge, không push, không tạo PR, không commit. Nhánh để nguyên cho bạn xem.

## Cấu trúc repo

| File | Vai trò |
|---|---|
| `.claude/commands/ship.md` | Nhạc trưởng: điều phối, không tự làm việc chuyên môn |
| `.claude/agents/planner.md` | Đọc codebase, lập kế hoạch và tiêu chí nghiệm thu. Chỉ ghi `ke-hoach.md` |
| `.claude/agents/coder.md` | Làm đúng kế hoạch; ở vòng sửa thì chỉ sửa lỗi được nêu. Không commit |
| `.claude/agents/tester.md` | Viết và chạy test. Không sửa code sản phẩm |
| `.claude/agents/reviewer.md` | Soi diff so với kế hoạch và test. Chỉ ghi `danh-gia.md` |
| `.claude/scripts/bangiao.cjs` | Kiểm tra bàn giao, quyết định tiếp/sửa/dừng, đếm vòng sửa |
| `.claude/scripts/ship-headless.ps1` | Chạy không tương tác, trả mã thoát (cho tự động hoá) |
| `mau/settings.json` | Rào chắn cài vào dự án: cấm `git push/merge/rebase/reset --hard`, `gh pr create/merge` |
| `cai-dat.ps1`, `cai-dat.sh` | Cài bộ này vào một dự án (Windows / macOS, Linux) |

`mau/settings.json` được để ngoài `.claude/` có chủ đích: rào chắn chỉ áp dụng
cho dự án được cài, không chặn việc push chính repo Ship này.

## Cài trên một máy mới

Cần: Git, Node.js (bất kỳ bản LTS nào), Claude Code.

```bash
git clone <URL-repo-ship> ~/ship
```

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File $HOME\ship\cai-dat.ps1 -DuAn D:\CODE\du-an-cua-toi
```

macOS / Linux / Git Bash:

```bash
~/ship/cai-dat.sh ~/code/du-an-cua-toi
```

Nếu dự án đã có `.claude/settings.json`, script cài không ghi đè mà để lại
`settings.ship.json` cho bạn gộp tay.

**Cập nhật khi Ship có bản mới:** `git pull` trong repo Ship, rồi chạy lại script
cài với `-GhiDe` (Windows) hoặc `--ghi-de` (macOS/Linux).

Nên commit thư mục `.claude/` của dự án, để cả nhóm và các máy khác clone dự án
về là có `/ship` ngay, không cần cài lại.

## Dùng tương tác

```bash
git switch -c tinh-nang/xuat-csv
```

Rồi trong Claude Code: `/ship thêm nút xuất CSV cho bảng đơn hàng`

## Dùng tự động (headless)

Chạy từ thư mục gốc dự án, cần lệnh `claude` trong PATH:

```powershell
.claude/scripts/ship-headless.ps1 "them nut xuat CSV" -ChoPhepThem "Bash(npm test:*)" -SoVongSua 2
```

- `-SoVongSua`: số vòng sửa tối đa, mặc định 2, đặt 0 để tắt. Khi dùng tương
  tác, đặt biến môi trường `SHIP_SO_VONG_SUA` trước khi mở Claude Code.
- `-PermissionMode`: mặc định `acceptEdits`. Ở chế độ headless, lệnh Bash nào chưa
  được cho phép sẽ bị từ chối, nên hãy thêm lệnh test/build của dự án qua
  `-ChoPhepThem` (hoặc vào `permissions.allow` trong settings.json).
- Toàn bộ output được ghi vào `.bangiao/headless-<thời điểm>.log`.
- Tránh dấu nháy kép `"` trong yêu cầu (PowerShell 5.1 truyền đối số kém với ký tự này).

| Mã thoát | Ý nghĩa |
|---|---|
| 0 | Reviewer CHẤP THUẬN |
| 10 | Nhánh chính / HEAD rời / không phải git |
| 11 | Kế hoạch còn câu hỏi bỏ ngỏ |
| 12 | Coder báo vướng mắc |
| 13 | Test rớt, đã hết vòng sửa |
| 14 | Reviewer CẦN SỬA, đã hết vòng sửa |
| 15 | Reviewer TỪ CHỐI |
| 16 | File bàn giao thiếu hoặc sai khuôn (sau một lần gọi lại) |
| 1 | Lỗi khác |

## `.bangiao/`

- Tự được thêm vào `.git/info/exclude` (chỉ trên máy bạn, không sửa `.gitignore`).
- `chuan-bi` xoá 4 file bàn giao, `trang-thai.json` và các thư mục `vong-N/` của lần chạy trước.
- `vong-N/` giữ bàn giao của vòng bị sửa, để xem lại vòng nào sửa gì.
- `trang-thai.json` lưu nhánh, commit gốc, các thay đổi có sẵn trước khi chạy
  (để reviewer không đánh giá nhầm), số vòng sửa, lịch sử từng chặng và trường
  `ketThuc`. Script headless đọc trường này để trả mã thoát.

## Hướng tự động hoá tiếp theo

- **Hàng đợi yêu cầu:** vòng lặp trên danh sách yêu cầu, mỗi yêu cầu một nhánh
  và một worktree riêng, gọi `ship-headless.ps1` rồi gom mã thoát.
- **Lịch chạy:** Task Scheduler hoặc CI gọi `ship-headless.ps1`.
