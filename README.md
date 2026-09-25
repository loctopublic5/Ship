# Ship: nhạc trưởng điều phối 4 agent

Lệnh `/ship <yêu cầu>` cho Claude Code chạy trọn dây chuyền làm tính năng:
**planner → coder → tester → reviewer**. Các agent bàn giao cho nhau qua file
trong `.bangiao/`. Việc đi tiếp hay dừng do một script quyết theo luật cố định,
không để model tự cảm nhận.

```
chặng 0  chuan-bi       nhánh chính / HEAD rời / không phải git ─► DỪNG
chặng 1  planner   ─► ke-hoach.md      có CÂU HỎI CÒN BỎ NGỎ ─► DỪNG, hỏi bạn
chặng 2  coder     ─► thay-doi.md      có VƯỚNG MẮC          ─► DỪNG
chặng 3  tester    ─► ket-qua-test.md  KẾT LUẬN: RỚT         ─► DỪNG, cho xem phần rớt
chặng 4  reviewer  ─► danh-gia.md      PHÁN QUYẾT: CHẤP THUẬN | CẦN SỬA | TỪ CHỐI
```

Không merge, không push, không tạo PR, không commit. Nhánh để nguyên cho bạn xem.

## Cấu trúc

| File | Vai trò |
|---|---|
| `.claude/commands/ship.md` | Nhạc trưởng: điều phối, không tự làm việc chuyên môn |
| `.claude/agents/planner.md` | Đọc codebase, lập kế hoạch và tiêu chí nghiệm thu. Chỉ ghi `ke-hoach.md` |
| `.claude/agents/coder.md` | Làm đúng kế hoạch. Không viết test mới, không commit |
| `.claude/agents/tester.md` | Viết và chạy test. Không sửa code sản phẩm |
| `.claude/agents/reviewer.md` | Soi diff so với kế hoạch và test. Chỉ ghi `danh-gia.md` |
| `.claude/scripts/bangiao.cjs` | Kiểm tra bàn giao, ra quyết định tiếp/dừng, ghi `trang-thai.json` |
| `.claude/scripts/ship-headless.ps1` | Chạy không tương tác, trả mã thoát (cho tự động hoá) |
| `.claude/settings.json` | Rào chắn: cấm `git push/merge/rebase/reset --hard`, `gh pr create/merge` |
| `cai-dat.ps1` | Cài bộ này vào một dự án |

## Cài vào dự án

```powershell
powershell -ExecutionPolicy Bypass -File D:\CODE\Ship\cai-dat.ps1 -DuAn D:\CODE\du-an-cua-toi
```

Nếu dự án đã có `.claude/settings.json`, script không ghi đè mà để lại
`settings.ship.json` cho bạn gộp tay. Cần Node.js (script kiểm tra viết bằng Node,
không có dependency).

## Dùng tương tác

```bash
git switch -c tinh-nang/xuat-csv
```

Rồi trong Claude Code: `/ship thêm nút xuất CSV cho bảng đơn hàng`

## Dùng tự động (headless)

Chạy từ thư mục gốc dự án, cần lệnh `claude` trong PATH:

```powershell
.claude/scripts/ship-headless.ps1 "them nut xuat CSV" -ChoPhepThem "Bash(npm test:*)"
```

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
| 13 | Test rớt |
| 14 | Reviewer CẦN SỬA |
| 15 | Reviewer TỪ CHỐI |
| 16 | File bàn giao thiếu hoặc sai khuôn (sau một lần gọi lại) |
| 1 | Lỗi khác |

## `.bangiao/`

- Tự được thêm vào `.git/info/exclude` (chỉ trên máy bạn, không sửa `.gitignore`).
- `chuan-bi` xoá 4 file bàn giao và `trang-thai.json` của lần chạy trước.
- `trang-thai.json` lưu nhánh, commit gốc, các thay đổi có sẵn trước khi chạy
  (để reviewer không đánh giá nhầm), chặng cuối, lịch sử từng chặng và trường
  `ketThuc`. Script headless đọc trường này để trả mã thoát.

## Hướng tự động hoá tiếp theo

- **Vòng sửa tự động:** khi test RỚT hoặc reviewer CẦN SỬA thì gọi lại coder kèm
  `ket-qua-test.md`/`danh-gia.md`, giới hạn N vòng. Hiện tại dây chuyền dừng lại
  chờ bạn, đúng theo đặc tả.
- **Hàng đợi yêu cầu:** vòng lặp trên danh sách yêu cầu, mỗi yêu cầu một nhánh
  và một worktree riêng, gọi `ship-headless.ps1` rồi gom mã thoát.
- **Lịch chạy:** Task Scheduler hoặc CI gọi `ship-headless.ps1`.
