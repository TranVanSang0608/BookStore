// Unit test cho lib/mailer — cam kết FAIL-SOFT: sendMailSafe KHÔNG bao giờ ném lỗi.
// Mock 'resend' (constructor) + logger (tránh ghi file log thật khi test).
jest.mock('../lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock('resend', () => ({ Resend: jest.fn() }));

import { Resend } from 'resend';
import { sendMail, sendMailSafe } from '../lib/mailer';

const ResendMock = Resend as unknown as jest.Mock;

// Đặt hành vi cho resend.emails.send trong từng test (mỗi `new Resend()` trả emails.send này)
function setSend(impl: (...args: unknown[]) => unknown) {
  ResendMock.mockImplementation(() => ({ emails: { send: jest.fn(impl) } }));
}

const OLD_KEY = process.env.RESEND_API_KEY;
afterAll(() => {
  if (OLD_KEY === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = OLD_KEY;
});
beforeEach(() => {
  jest.clearAllMocks();
  process.env.RESEND_API_KEY = 're_test';
  setSend(async () => ({ data: { id: 'default' }, error: null }));
});

const mail = { to: 'a@test.com', subject: 's', html: 'h' };

describe('sendMailSafe (fail-soft)', () => {
  it('thiếu RESEND_API_KEY → trả false, KHÔNG gọi Resend, KHÔNG throw', async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendMailSafe(mail)).resolves.toBe(false);
    expect(ResendMock).not.toHaveBeenCalled();
  });

  it('Resend trả error → nuốt lỗi, trả false', async () => {
    setSend(async () => ({ data: null, error: { message: 'domain not verified' } }));
    await expect(sendMailSafe(mail)).resolves.toBe(false);
  });

  it('Resend ném lỗi (mạng) → nuốt lỗi, trả false', async () => {
    setSend(async () => {
      throw new Error('network down');
    });
    await expect(sendMailSafe(mail)).resolves.toBe(false);
  });

  it('gửi OK → trả true', async () => {
    setSend(async () => ({ data: { id: 'msg_1' }, error: null }));
    await expect(sendMailSafe(mail)).resolves.toBe(true);
  });
});

describe('sendMail (ném lỗi khi thất bại — dùng cho smoke test)', () => {
  it('Resend trả error → throw', async () => {
    setSend(async () => ({ data: null, error: { message: 'bad' } }));
    await expect(sendMail(mail)).rejects.toThrow();
  });

  it('gửi OK → trả id thư', async () => {
    setSend(async () => ({ data: { id: 'msg_1' }, error: null }));
    await expect(sendMail(mail)).resolves.toBe('msg_1');
  });
});
