#!/usr/bin/env node
// Bộ kiểm tra bàn giao cho dây chuyền /ship.
// Quyết định đi tiếp/dừng bằng luật cố định, để nhạc trưởng không phải tự suy diễn.
//
//   node .claude/scripts/bangiao.cjs chuan-bi
//   node .claude/scripts/bangiao.cjs kiem-tra <ke-hoach|thay-doi|ket-qua-test|danh-gia>
//
// Mã thoát: 0 tiếp tục · 1 file thiếu/sai khuôn · 2 bị chặn · 3 dây chuyền phải dừng
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const THU_MUC = path.resolve('.bangiao');
const TRANG_THAI = path.join(THU_MUC, 'trang-thai.json');
const NHANH_CHINH = ['main', 'master'];
const FILE_BAN_GIAO = {
  'ke-hoach': 'ke-hoach.md',
  'thay-doi': 'thay-doi.md',
  'ket-qua-test': 'ket-qua-test.md',
  'danh-gia': 'danh-gia.md',
};

const MA = { TIEP_TUC: 0, LOI: 1, CHAN: 2, DUNG: 3 };

function git(...args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

// Không trim: dòng porcelain bắt đầu bằng khoảng trắng có nghĩa (" M file").
function thayDoiHienTai() {
  try {
    const ra = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return ra.split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

// Bỏ dấu tiếng Việt và viết hoa, để "Kết luận: Đạt" và "KET LUAN: DAT" đều khớp.
function chuanHoa(s) {
  return s
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

// Tìm mục theo tiêu đề markdown; nội dung kéo tới tiêu đề cùng cấp hoặc cao hơn.
function timMuc(vanBan, tieuDe) {
  const dong = vanBan.split(/\r?\n/);
  const mauTieuDe = new RegExp('^(#{1,6})[^A-Z0-9\\n]*' + tieuDe + '\\b');
  for (let i = 0; i < dong.length; i++) {
    const m = chuanHoa(dong[i]).trim().match(mauTieuDe);
    if (!m) continue;
    const cap = m[1].length;
    let j = i + 1;
    while (j < dong.length) {
      const h = dong[j].trim().match(/^(#{1,6})\s/);
      if (h && h[1].length <= cap) break;
      j++;
    }
    return dong.slice(i + 1, j).join('\n').trim();
  }
  return null;
}

// "Không có", "(trống)", "- N/A"... coi như mục rỗng.
function rongNghia(noiDung) {
  if (noiDung === null) return true;
  const gon = chuanHoa(noiDung).replace(/[^A-Z0-9/ ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return ['', 'KHONG', 'KHONG CO', 'KHONG CON', 'TRONG', 'NONE', 'N/A', 'NA'].includes(gon);
}

function timGiaTri(vanBan, nhan, cacGiaTri) {
  const mau = new RegExp('\\b' + nhan + '\\s*[:：]\\s*\\**\\s*(' + cacGiaTri.join('|') + ')\\b');
  for (const dong of vanBan.split(/\r?\n/)) {
    const m = chuanHoa(dong).match(mau);
    if (!m) continue;
    // Dòng chép nguyên mẫu ("ĐẠT hoặc RỚT") là mơ hồ, coi như chưa có.
    const conLai = chuanHoa(dong).slice(m.index);
    const soGiaTri = cacGiaTri.filter((g) => new RegExp('\\b' + g + '\\b').test(conLai)).length;
    return soGiaTri === 1 ? m[1] : null;
  }
  return null;
}

function docTrangThai() {
  try {
    return JSON.parse(fs.readFileSync(TRANG_THAI, 'utf8'));
  } catch {
    return { lichSu: [] };
  }
}

function ghiTrangThai(chang, ketQua, them = {}) {
  const tt = docTrangThai();
  const luc = new Date().toISOString();
  Object.assign(tt, them, { chang, ketQua, capNhat: luc });
  tt.lichSu = [...(tt.lichSu || []), { chang, ketQua, luc }];
  fs.mkdirSync(THU_MUC, { recursive: true });
  fs.writeFileSync(TRANG_THAI, JSON.stringify(tt, null, 2) + '\n');
}

function ketThuc(ketQua, thongDiep) {
  if (thongDiep) console.log(thongDiep);
  console.log('KET_QUA=' + ketQua);
  process.exit(MA[ketQua]);
}

function chuanBi() {
  if (git('rev-parse', '--is-inside-work-tree') !== 'true') {
    ketThuc('CHAN', 'Thư mục hiện tại không phải repo git. Dừng.');
  }
  const nhanh = git('symbolic-ref', '--short', '-q', 'HEAD');
  if (!nhanh) {
    ketThuc('CHAN', 'HEAD đang ở trạng thái rời (detached), không đứng trên nhánh nào. Dừng.');
  }
  console.log('NHANH=' + nhanh);
  if (NHANH_CHINH.includes(nhanh)) {
    ketThuc('CHAN', `Đang đứng trên nhánh chính "${nhanh}". Hãy tạo nhánh tính năng rồi chạy lại.`);
  }

  fs.mkdirSync(THU_MUC, { recursive: true });
  for (const ten of [...Object.values(FILE_BAN_GIAO), 'trang-thai.json']) {
    fs.rmSync(path.join(THU_MUC, ten), { force: true });
  }

  // Giữ .bangiao/ ngoài git mà không đụng .gitignore của dự án.
  const fileExclude = git('rev-parse', '--git-path', 'info/exclude');
  if (fileExclude) {
    const cu = fs.existsSync(fileExclude) ? fs.readFileSync(fileExclude, 'utf8') : '';
    if (!cu.split(/\r?\n/).includes('.bangiao/')) {
      fs.mkdirSync(path.dirname(fileExclude), { recursive: true });
      fs.appendFileSync(fileExclude, (cu && !cu.endsWith('\n') ? '\n' : '') + '.bangiao/\n');
    }
  }

  const thayDoiCoSan = thayDoiHienTai();
  if (thayDoiCoSan.length) {
    console.log(`CANH_BAO=Cây làm việc có sẵn ${thayDoiCoSan.length} thay đổi chưa commit từ trước khi chạy:`);
    thayDoiCoSan.forEach((d) => console.log('  ' + d));
  }

  ghiTrangThai('chuan-bi', 'TIEP_TUC', {
    nhanh,
    commitGoc: git('rev-parse', 'HEAD'),
    batDau: new Date().toISOString(),
    thayDoiCoSan,
    ketThuc: null,
    lichSu: [],
  });
  ketThuc('TIEP_TUC', 'Đã dọn .bangiao/, sẵn sàng chạy dây chuyền.');
}

// Mỗi chặng trả về { ketQua, thongDiep, ketThuc? }.
const LUAT = {
  'ke-hoach'(vb) {
    if (timMuc(vb, 'CAC BUOC') === null) {
      return { ketQua: 'LOI', thongDiep: 'ke-hoach.md thiếu mục "## CÁC BƯỚC".' };
    }
    const cauHoi = timMuc(vb, 'CAU HOI CON BO NGO');
    if (!rongNghia(cauHoi)) {
      return {
        ketQua: 'DUNG',
        ketThuc: 'cau-hoi-bo-ngo',
        thongDiep: 'Kế hoạch còn CÂU HỎI BỎ NGỎ, cần người dùng trả lời:\n\n' + cauHoi,
      };
    }
    return { ketQua: 'TIEP_TUC', thongDiep: 'Kế hoạch hợp lệ, không còn câu hỏi bỏ ngỏ.' };
  },

  'thay-doi'(vb) {
    if (timMuc(vb, 'FILE DA SUA') === null) {
      return { ketQua: 'LOI', thongDiep: 'thay-doi.md thiếu mục "## FILE ĐÃ SỬA".' };
    }
    const vuongMac = timMuc(vb, 'VUONG MAC');
    if (!rongNghia(vuongMac)) {
      return { ketQua: 'DUNG', ketThuc: 'vuong-mac', thongDiep: 'Coder báo VƯỚNG MẮC:\n\n' + vuongMac };
    }
    const truoc = new Set(docTrangThai().thayDoiCoSan || []);
    const moi = thayDoiHienTai().filter((d) => !truoc.has(d));
    const canhBao = moi.length ? '' : '\nCANH_BAO=Không thấy thay đổi mới nào trong cây làm việc.';
    return { ketQua: 'TIEP_TUC', thongDiep: `Bàn giao của coder hợp lệ, ${moi.length} file thay đổi mới.` + canhBao };
  },

  'ket-qua-test'(vb) {
    const kl = timGiaTri(vb, 'KET LUAN', ['DAT', 'ROT']);
    if (!kl) {
      return { ketQua: 'LOI', thongDiep: 'ket-qua-test.md thiếu dòng "KẾT LUẬN: ĐẠT" hoặc "KẾT LUẬN: RỚT".' };
    }
    if (kl === 'ROT') {
      const phanRot = timMuc(vb, 'TEST ROT');
      return {
        ketQua: 'DUNG',
        ketThuc: 'test-rot',
        thongDiep: 'KẾT LUẬN: RỚT\n\n' + (rongNghia(phanRot) ? vb.trim() : phanRot),
      };
    }
    return { ketQua: 'TIEP_TUC', thongDiep: 'KẾT LUẬN: ĐẠT' };
  },

  'danh-gia'(vb) {
    const pq = timGiaTri(vb, 'PHAN QUYET', ['CHAP THUAN', 'CAN SUA', 'TU CHOI']);
    if (!pq) {
      return { ketQua: 'LOI', thongDiep: 'danh-gia.md thiếu dòng "PHÁN QUYẾT: CHẤP THUẬN | CẦN SỬA | TỪ CHỐI".' };
    }
    const hienThi = { 'CHAP THUAN': 'CHẤP THUẬN', 'CAN SUA': 'CẦN SỬA', 'TU CHOI': 'TỪ CHỐI' }[pq];
    console.log('PHAN_QUYET=' + pq.replace(' ', '_'));
    return {
      ketQua: 'TIEP_TUC',
      ketThuc: pq.toLowerCase().replace(' ', '-'),
      thongDiep: 'PHÁN QUYẾT: ' + hienThi,
    };
  },
};

function kiemTra(chang) {
  if (!LUAT[chang]) {
    ketThuc('LOI', `Chặng không hợp lệ: "${chang}". Chọn một trong: ${Object.keys(LUAT).join(', ')}.`);
  }
  const file = path.join(THU_MUC, FILE_BAN_GIAO[chang]);
  if (!fs.existsSync(file) || !fs.readFileSync(file, 'utf8').trim()) {
    ghiTrangThai(chang, 'LOI', { ketThuc: 'loi-ban-giao' });
    ketThuc('LOI', `Chưa có file bàn giao .bangiao/${FILE_BAN_GIAO[chang]} (hoặc file rỗng).`);
  }
  const kq = LUAT[chang](fs.readFileSync(file, 'utf8'));
  ghiTrangThai(chang, kq.ketQua, { ketThuc: kq.ketThuc || (kq.ketQua === 'LOI' ? 'loi-ban-giao' : null) });
  ketThuc(kq.ketQua, kq.thongDiep);
}

const [lenh, doiSo] = process.argv.slice(2);
if (lenh === 'chuan-bi') chuanBi();
else if (lenh === 'kiem-tra') kiemTra(doiSo);
else ketThuc('LOI', 'Cách dùng: bangiao.cjs chuan-bi | kiem-tra <ke-hoach|thay-doi|ket-qua-test|danh-gia>');
