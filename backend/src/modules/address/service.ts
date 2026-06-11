import { prisma } from '../../lib/prisma';
import { AppError } from '../../middleware/error';
import type { CreateAddressInput, UpdateAddressInput } from './schemas';

// Tra ward trong DB và kiểm tra nó thuộc đúng tỉnh đã chọn.
// Server tự lấy NAME từ DB theo CODE — không tin name do FE gửi lên
// (client có thể bị sửa request để gửi dữ liệu rác/lệch nhau).
async function findWardInProvince(provinceCode: string, wardCode: string) {
  const ward = await prisma.ward.findUnique({
    where: { code: wardCode },
    include: { province: true },
  });
  if (!ward || ward.province_code !== provinceCode) {
    throw new AppError(400, 'Phường/Xã không thuộc tỉnh/thành phố đã chọn');
  }
  return ward;
}

// Mọi thao tác sửa/xóa đều phải qua đây: chỉ tìm trong địa chỉ CỦA user đang đăng nhập.
// Trả 404 (không phải 403) — không tiết lộ "địa chỉ này tồn tại nhưng của người khác".
async function getOwnedAddress(userId: number, addressId: number) {
  const address = await prisma.address.findFirst({
    where: { id: addressId, user_id: userId },
  });
  if (!address) throw new AppError(404, 'Không tìm thấy địa chỉ');
  return address;
}

export function listAddresses(userId: number) {
  return prisma.address.findMany({
    where: { user_id: userId },
    orderBy: [{ is_default: 'desc' }, { id: 'desc' }], // mặc định lên đầu, còn lại mới nhất trước
  });
}

export async function createAddress(userId: number, input: CreateAddressInput) {
  const ward = await findWardInProvince(input.province_code, input.ward_code);

  // Địa chỉ đầu tiên của user luôn là mặc định (checkout cần ít nhất 1 default)
  const count = await prisma.address.count({ where: { user_id: userId } });
  const makeDefault = input.is_default === true || count === 0;

  // Transaction: "bỏ default cũ" + "tạo địa chỉ default mới" phải đi cùng nhau —
  // nếu chen ngang giữa 2 bước, user sẽ có 2 default hoặc 0 default
  return prisma.$transaction(async (tx) => {
    if (makeDefault) {
      await tx.address.updateMany({
        where: { user_id: userId, is_default: true },
        data: { is_default: false },
      });
    }
    return tx.address.create({
      data: {
        user_id: userId,
        recipient_name: input.recipient_name,
        phone: input.phone,
        province_code: input.province_code,
        ward_code: input.ward_code,
        province_name: ward.province.name, // name lấy từ DB, không phải từ client
        ward_name: ward.name,
        street_detail: input.street_detail,
        is_default: makeDefault,
      },
    });
  });
}

export async function updateAddress(userId: number, addressId: number, input: UpdateAddressInput) {
  await getOwnedAddress(userId, addressId);
  const ward = await findWardInProvince(input.province_code, input.ward_code);

  return prisma.address.update({
    where: { id: addressId },
    data: {
      recipient_name: input.recipient_name,
      phone: input.phone,
      province_code: input.province_code,
      ward_code: input.ward_code,
      province_name: ward.province.name,
      ward_name: ward.name,
      street_detail: input.street_detail,
    },
  });
}

export async function deleteAddress(userId: number, addressId: number) {
  const address = await getOwnedAddress(userId, addressId);

  // Invariant: user còn địa chỉ thì luôn phải có đúng 1 default.
  // Xóa default khi còn địa chỉ khác sẽ phá invariant → chặn, bắt đặt default mới trước.
  // Ngoại lệ: là địa chỉ DUY NHẤT thì cho xóa (còn 0 địa chỉ — không cần default).
  if (address.is_default) {
    const count = await prisma.address.count({ where: { user_id: userId } });
    if (count > 1) {
      throw new AppError(400, 'Hãy đặt địa chỉ khác làm mặc định trước khi xóa địa chỉ này');
    }
  }

  await prisma.address.delete({ where: { id: addressId } });
}

export async function setDefaultAddress(userId: number, addressId: number) {
  await getOwnedAddress(userId, addressId);

  // Array transaction: 2 lệnh chạy atomic — không bao giờ có 2 default cùng lúc
  await prisma.$transaction([
    prisma.address.updateMany({
      where: { user_id: userId, is_default: true },
      data: { is_default: false },
    }),
    prisma.address.update({ where: { id: addressId }, data: { is_default: true } }),
  ]);
}
