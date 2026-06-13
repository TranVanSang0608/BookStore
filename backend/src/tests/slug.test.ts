// Unit test cho toSlug — hàm thuần (không DB) nên test thẳng, không cần mock
import { toSlug } from '../lib/slug';

describe('toSlug', () => {
  it('bỏ dấu tiếng Việt và nối bằng gạch ngang', () => {
    expect(toSlug('Đắc Nhân Tâm')).toBe('dac-nhan-tam');
  });

  it('xử lý đ/Đ (không phải "d có dấu" nên NFD không tách được)', () => {
    expect(toSlug('Dế Mèn Phiêu Lưu Ký')).toBe('de-men-phieu-luu-ky');
    expect(toSlug('ĐÀ NẴNG')).toBe('da-nang');
  });

  it('gom ký tự đặc biệt liên tiếp thành 1 gạch, giữ chữ số', () => {
    expect(toSlug('Nhà Giả Kim — bản đặc biệt 2024!')).toBe('nha-gia-kim-ban-dac-biet-2024');
  });

  it('cắt gạch thừa ở 2 đầu chuỗi', () => {
    expect(toSlug('   ---Mắt Biếc---   ')).toBe('mat-biec');
  });

  it('chuỗi toàn ký tự đặc biệt → slug rỗng (service sẽ thay bằng fallback)', () => {
    expect(toSlug('!@#$%')).toBe('');
  });
});
