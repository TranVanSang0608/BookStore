// Unit test cho auth-email — kiểm URL trong email đúng path + token được encode.
// Mock mailer để bắt nội dung html mà không gửi thật.
jest.mock('../lib/mailer', () => ({ sendMailSafe: jest.fn() }));

import { sendMailSafe } from '../lib/mailer';
import { sendPasswordResetEmail, sendVerificationEmail } from '../modules/notification/auth-email';

const OLD = process.env.FRONTEND_ORIGIN;
beforeEach(() => {
  jest.clearAllMocks();
  process.env.FRONTEND_ORIGIN = 'https://shop.test';
});
afterAll(() => {
  if (OLD === undefined) delete process.env.FRONTEND_ORIGIN;
  else process.env.FRONTEND_ORIGIN = OLD;
});

describe('sendVerificationEmail', () => {
  it('gửi tới đúng email + URL /verify-email có token đã encode', async () => {
    await sendVerificationEmail('a@test.com', 'A', 'tok en+/');
    const arg = (sendMailSafe as jest.Mock).mock.calls[0][0];
    expect(arg.to).toBe('a@test.com');
    expect(arg.html).toContain('https://shop.test/verify-email?token=tok%20en%2B%2F');
  });
});

describe('sendPasswordResetEmail', () => {
  it('URL /reset-password có token đã encode', async () => {
    await sendPasswordResetEmail('b@test.com', 'B', 'r/e t');
    const arg = (sendMailSafe as jest.Mock).mock.calls[0][0];
    expect(arg.to).toBe('b@test.com');
    expect(arg.html).toContain('https://shop.test/reset-password?token=r%2Fe%20t');
  });
});
