import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error';

// Đọc từ bảng Province/Ward tự host (D32) — KHÔNG gọi API ngoài

export function listProvinces() {
  return prisma.province.findMany({ orderBy: { name: 'asc' } });
}

export async function listWardsOfProvince(provinceCode: string) {
  const province = await prisma.province.findUnique({ where: { code: provinceCode } });
  if (!province) throw new AppError(404, 'Không tìm thấy tỉnh/thành phố');

  return prisma.ward.findMany({
    where: { province_code: provinceCode },
    orderBy: { name: 'asc' },
  });
}
