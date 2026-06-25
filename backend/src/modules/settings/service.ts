import { prisma } from '../../lib/prisma';

// Các thiết lập thông tin shop + giá trị MẶC ĐỊNH (dùng khi DB chưa có dòng tương ứng).
// Trước đây các giá trị này viết cứng trong Footer/Navbar; nay đưa vào DB để admin sửa được.
// Thêm thiết lập mới chỉ cần thêm 1 dòng ở đây (key = id trong bảng SiteSetting).
export const SITE_SETTING_DEFAULTS = {
  shop_hotline: '1900 1234',
  shop_email: 'hello@anhsach.vn',
  shop_address: '123 Lê Lợi, Q.1, TP.HCM',
} as const;

export type SiteSettingKey = keyof typeof SITE_SETTING_DEFAULTS;
export type SiteSettings = Record<SiteSettingKey, string>;

// Đọc toàn bộ thiết lập: lấy dòng trong DB rồi PHỦ lên bộ mặc định (thiếu dòng nào giữ
// mặc định) → endpoint công khai + FE luôn nhận đủ giá trị, không bao giờ undefined.
export async function getSiteSettings(): Promise<SiteSettings> {
  const rows = await prisma.siteSetting.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r.value]));

  const result = { ...SITE_SETTING_DEFAULTS } as SiteSettings;
  for (const key of Object.keys(SITE_SETTING_DEFAULTS) as SiteSettingKey[]) {
    const value = byKey.get(key);
    if (value !== undefined) result[key] = value;
  }
  return result;
}

// Cập nhật một phần thiết lập (admin). CHỈ nhận đúng các key đã định nghĩa (bỏ qua key lạ —
// chống mass assignment). upsert theo key: chưa có thì tạo, có rồi thì sửa.
export async function updateSiteSettings(input: Partial<SiteSettings>): Promise<SiteSettings> {
  const entries = (Object.keys(SITE_SETTING_DEFAULTS) as SiteSettingKey[])
    .filter((key) => input[key] !== undefined)
    .map((key) => ({ key, value: String(input[key]).trim() }));

  if (entries.length > 0) {
    await prisma.$transaction(
      entries.map((e) =>
        prisma.siteSetting.upsert({
          where: { key: e.key },
          update: { value: e.value },
          create: { key: e.key, value: e.value },
        }),
      ),
    );
  }
  return getSiteSettings();
}
