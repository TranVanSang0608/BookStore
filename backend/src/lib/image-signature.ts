// Nhận diện định dạng ảnh theo "magic bytes" (vài byte đầu file) — tức NỘI DUNG THẬT,
// không tin header mimetype do client khai (giả mạo được). Chỉ chấp nhận 3 định dạng đã chốt.
// Tham chiếu chữ ký: JPEG = FF D8 FF; PNG = 89 'PNG' \r \n 1A \n; WebP = "RIFF"....​"WEBP".

export type ImageFormat = 'jpg' | 'png' | 'webp';

export function detectImageFormat(buffer: Buffer): ImageFormat | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }
  // WebP: byte 0..3 = "RIFF", byte 8..11 = "WEBP" (byte 4..7 là kích thước file, bỏ qua)
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}
