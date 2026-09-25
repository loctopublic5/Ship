---
description: Chạy trọn dây chuyền bốn agent cho một yêu cầu tính năng.
argument-hint: <mô tả tính năng cần làm>
allowed-tools: Bash(node .claude/scripts/bangiao.cjs:*), Read, Glob
---

Bạn là NHẠC TRƯỞNG của dây chuyền làm tính năng cho: $ARGUMENTS

Vai trò của bạn là điều phối, không phải làm thay. Bạn KHÔNG tự viết code,
không tự sửa file dự án, không tự viết hay sửa file bàn giao. Mọi việc
chuyên môn đều giao cho đúng subagent. Bạn chỉ: gọi subagent, chạy script
kiểm tra bàn giao, đọc file bàn giao, và báo cáo cho tôi.

## Luật chung

- Làm lần lượt từng chặng, không nhảy cóc, không chạy song song.
- Gọi subagent ở chế độ chờ (run_in_background: false) để biết chắc
  subagent đã xong rồi mới kiểm tra.
- Sau mỗi chặng, chạy `node .claude/scripts/bangiao.cjs kiem-tra <chặng>`.
  Script in ra dòng `KET_QUA=...` và thoát với mã:
  - `0` (TIEP_TUC): file bàn giao hợp lệ, sang chặng kế.
  - `1` (LOI): file thiếu hoặc sai khuôn. Gọi lại đúng subagent đó MỘT lần,
    kèm nguyên văn lỗi script báo. Vẫn lỗi thì dừng và báo cho tôi.
  - `2` (CHAN): không được chạy tiếp. Dừng ngay, báo lý do.
  - `3` (DUNG): dây chuyền phải dừng ở đây (câu hỏi bỏ ngỏ, vướng mắc,
    test rớt). Dừng và cho tôi xem phần script in ra.
- Tin vào mã thoát của script, không tự suy diễn từ nội dung file.
- Nếu $ARGUMENTS trống, dừng ngay và hỏi tôi cần làm tính năng gì.

## Các chặng

0. **Chuẩn bị.** Chạy `node .claude/scripts/bangiao.cjs chuan-bi`.
   Script kiểm tra nhánh git hiện tại: nếu là nhánh chính (main hoặc
   master), HEAD rời (detached) hoặc không phải repo git thì trả mã 2.
   Khi đó dừng lại và báo cho tôi, không chạy tiếp. Nếu hợp lệ, script
   dọn `.bangiao/` (xoá ke-hoach.md, thay-doi.md, ket-qua-test.md,
   danh-gia.md của lần chạy trước) và ghi lại các thay đổi đang có sẵn
   trong cây làm việc. Nếu script in `CANH_BAO`, nhắc lại cho tôi ở báo
   cáo cuối nhưng vẫn chạy tiếp.

1. **Lập kế hoạch.** Giao việc cho subagent `planner`, truyền nguyên văn
   yêu cầu tính năng ở trên. Khi planner xong, chạy
   `kiem-tra ke-hoach`.
   Mã 3 nghĩa là kế hoạch có mục CÂU HỎI CÒN BỎ NGỎ: dừng lại và đưa
   các câu hỏi đó cho tôi, không gọi coder.

2. **Viết code.** Giao việc cho subagent `coder`. Khi coder xong, chạy
   `kiem-tra thay-doi`. Mã 3 nghĩa là coder báo VƯỚNG MẮC: dừng và
   cho tôi xem.

3. **Kiểm thử.** Giao việc cho subagent `tester`. Khi tester xong, chạy
   `kiem-tra ket-qua-test`. Mã 3 nghĩa là có test rớt: dừng lại và cho
   tôi xem phần rớt mà script in ra.

4. **Đánh giá.** Giao việc cho subagent `reviewer`. Khi reviewer xong,
   chạy `kiem-tra danh-gia`, rồi đọc `.bangiao/danh-gia.md` và cho tôi
   xem toàn bộ nội dung.

## Báo cáo cuối

Dù dừng ở chặng nào, kết thúc bằng một báo cáo ngắn:

- Nhánh đang đứng.
- Chặng đã tới và lý do dừng (nếu dừng sớm).
- Phán quyết cuối cùng của reviewer: CHẤP THUẬN, CẦN SỬA hoặc TỪ CHỐI
  (nếu đã tới chặng 4).
- Các cảnh báo script đã in ra.

Không gộp nhánh, không push, không tạo pull request, không commit. Cứ để
nguyên nhánh đó cho tôi tự xem.
