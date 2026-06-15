import { prisma } from '../../lib/prisma';
import { calcDiscount } from '../../lib/voucher';
import { AppError } from '../../middleware/error';
import { getCart } from '../cart/service';
import type { CreateVoucherInput, UpdateVoucherInput } from './schemas';

function formatVnd(n: number): string {
  return `${n.toLocaleString('vi-VN')}đ`;
}

// Chuẩn hóa mã: bỏ khoảng trắng + viết HOA. Lưu DB và đối chiếu đều UPPERCASE → "sale20k"
// và "SALE20K" là một mã.
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

// Kiểm 1 voucher có dùng được cho (user, subtotal) không. Trả { voucher, discount }
// hoặc ném AppError với thông báo tiếng Việt rõ (FE hiển thị thẳng). Thứ tự kiểm từ
// "rẻ" tới "đắt" (query DB cuối). Dùng chung cho preview (Lát 2) lẫn createOrder (Lát 3).
export async function validateVoucher(params: { code: string; userId: number; subtotal: number }) {
  const code = normalizeCode(params.code);
  const voucher = await prisma.voucher.findUnique({ where: { code } });

  // Gộp "không tồn tại" và "đã tắt" thành 1 message — không tiết lộ mã nào có thật
  if (!voucher || !voucher.is_active) throw new AppError(400, 'Mã giảm giá không hợp lệ');

  if (voucher.expire_at && voucher.expire_at.getTime() < Date.now()) {
    throw new AppError(400, 'Mã giảm giá đã hết hạn');
  }
  if (params.subtotal < voucher.min_order) {
    throw new AppError(400, `Đơn tối thiểu ${formatVnd(voucher.min_order)} để dùng mã này`);
  }
  if (voucher.usage_limit !== null && voucher.used_count >= voucher.usage_limit) {
    throw new AppError(400, 'Mã giảm giá đã hết lượt sử dụng');
  }

  // per_user_limit: đếm số lần user này đã dùng mã (qua bảng VoucherUsage)
  const userUsed = await prisma.voucherUsage.count({
    where: { voucher_id: voucher.id, user_id: params.userId },
  });
  if (userUsed >= voucher.per_user_limit) {
    throw new AppError(400, 'Bạn đã dùng mã này rồi');
  }

  return { voucher, discount: calcDiscount(voucher, params.subtotal) };
}

// Preview cho trang checkout: server TỰ lấy subtotal từ giỏ DB (không tin số client gửi — D40).
export async function previewVoucher(userId: number, code: string) {
  const { subtotal } = await getCart(userId);
  if (subtotal <= 0) throw new AppError(400, 'Giỏ hàng đang trống');

  const { voucher, discount } = await validateVoucher({ code, userId, subtotal });
  return {
    code: voucher.code,
    discount_type: voucher.discount_type,
    discount_value: voucher.discount_value,
    discount,
  };
}

// ---------- Admin CRUD ----------

export function listVouchers() {
  return prisma.voucher.findMany({ orderBy: { created_at: 'desc' } });
}

export async function getVoucher(id: number) {
  const voucher = await prisma.voucher.findUnique({ where: { id } });
  if (!voucher) throw new AppError(404, 'Không tìm thấy mã giảm giá');
  return voucher;
}

export async function createVoucher(input: CreateVoucherInput) {
  const code = normalizeCode(input.code);
  const existing = await prisma.voucher.findUnique({ where: { code } });
  if (existing) throw new AppError(409, 'Mã giảm giá đã tồn tại');
  return prisma.voucher.create({ data: { ...input, code } });
}

export async function updateVoucher(id: number, input: UpdateVoucherInput) {
  await getVoucher(id);

  // Đổi code thì chuẩn hóa + kiểm trùng (loại trừ chính nó)
  let code: string | undefined;
  if (input.code !== undefined) {
    code = normalizeCode(input.code);
    const dup = await prisma.voucher.findFirst({ where: { code, id: { not: id } } });
    if (dup) throw new AppError(409, 'Mã giảm giá đã tồn tại');
  }

  return prisma.voucher.update({
    where: { id },
    data: { ...input, ...(code !== undefined ? { code } : {}) },
  });
}

export async function toggleVoucher(id: number) {
  const voucher = await getVoucher(id);
  return prisma.voucher.update({ where: { id }, data: { is_active: !voucher.is_active } });
}

export async function deleteVoucher(id: number) {
  await getVoucher(id);
  // Mã đã có đơn dùng thì KHÔNG xóa cứng (giữ liên kết phân tích) — admin TẮT thay vì xóa.
  // Giống tinh thần chặn xóa Author còn sách (D36).
  const orderCount = await prisma.order.count({ where: { voucher_id: id } });
  if (orderCount > 0) {
    throw new AppError(400, 'Mã đã có đơn sử dụng — hãy tắt mã thay vì xóa');
  }
  await prisma.voucher.delete({ where: { id } });
}
