import { detectImageFormat } from '../lib/image-signature';

describe('detectImageFormat (magic bytes)', () => {
  it('nhận diện JPEG (FF D8 FF)', () => {
    expect(detectImageFormat(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe('jpg');
  });

  it('nhận diện PNG (89 50 4E 47 0D 0A 1A 0A)', () => {
    expect(detectImageFormat(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]))).toBe('png');
  });

  it('nhận diện WebP (RIFF....WEBP)', () => {
    const buf = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0x00, 0x00, 0x00, 0x00]), // 4 byte kích thước (bỏ qua)
      Buffer.from('WEBP', 'ascii'),
    ]);
    expect(detectImageFormat(buf)).toBe('webp');
  });

  it('từ chối nội dung không phải ảnh (vd file giả mạo .png nhưng là text)', () => {
    expect(detectImageFormat(Buffer.from('GIF89a hoac text bat ky', 'ascii'))).toBeNull();
  });

  it('từ chối buffer quá ngắn', () => {
    expect(detectImageFormat(Buffer.from([0xff, 0xd8]))).toBeNull();
  });

  it('RIFF nhưng không phải WEBP (vd .wav) → null', () => {
    const buf = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from('WAVE', 'ascii'),
    ]);
    expect(detectImageFormat(buf)).toBeNull();
  });
});
