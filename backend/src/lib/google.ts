import { OAuth2Client } from 'google-auth-library';

// Singleton client xác minh ID token của Google (giống lib/prisma, lib/cloudinary —
// 1 instance dùng chung cả app). KHÔNG dùng Passport/redirect flow: FE lấy ID token
// bằng Google Identity Services rồi gửi lên, backend chỉ việc verify (D60).

let client: OAuth2Client | null = null;

function getClient(): OAuth2Client {
  if (!client) client = new OAuth2Client();
  return client;
}

// Thông tin lấy ra từ token sau khi đã xác minh chữ ký Google
export interface GoogleProfile {
  email: string;
  name: string;
  email_verified: boolean;
  sub: string; // id duy nhất của tài khoản Google
}

// Verify ID token: google-auth-library tự tải public key của Google, kiểm tra
// chữ ký + hạn dùng + audience (token phải được phát cho ĐÚNG client id của ta).
// Token giả/hết hạn/sai audience → ném lỗi (caller bắt và trả 401).
export async function verifyGoogleIdToken(credential: string): Promise<GoogleProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Thiếu GOOGLE_CLIENT_ID trong .env');

  const ticket = await getClient().verifyIdToken({ idToken: credential, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.email) throw new Error('Token Google không chứa email');

  return {
    email: payload.email,
    name: payload.name ?? payload.email, // hiếm khi thiếu name → fallback dùng email
    email_verified: payload.email_verified ?? false,
    sub: payload.sub,
  };
}
