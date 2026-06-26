import cloudinary, { isOwnCloudinaryUrl } from '../lib/cloudinary';

// Chặn admin nhập URL ảnh ngoài: chỉ chấp nhận URL của chính Cloudinary account mình.
describe('isOwnCloudinaryUrl', () => {
  beforeAll(() => {
    cloudinary.config({ cloud_name: 'mycloud' }); // giả lập cloud_name cho test (không cần env thật)
  });

  it('chấp nhận URL thuộc cloud account mình', () => {
    expect(isOwnCloudinaryUrl('https://res.cloudinary.com/mycloud/image/upload/v1/bookstore/x.jpg')).toBe(true);
  });

  it('từ chối host ngoài (tracking/bypass)', () => {
    expect(isOwnCloudinaryUrl('https://evil-tracker.example.com/pixel.png')).toBe(false);
  });

  it('từ chối Cloudinary account KHÁC', () => {
    expect(isOwnCloudinaryUrl('https://res.cloudinary.com/othercloud/image/upload/x.jpg')).toBe(false);
  });

  it('từ chối http (không https)', () => {
    expect(isOwnCloudinaryUrl('http://res.cloudinary.com/mycloud/x.jpg')).toBe(false);
  });
});
