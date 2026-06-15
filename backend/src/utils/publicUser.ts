// Các field của User được phép trả về cho FE — KHÔNG BAO GIỜ có password_hash.
// Dùng chung cho mọi module (auth, user, ...) để không có 2 bản copy lệch nhau.
export const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  email_verified: true, // Phase 6: FE hiện banner nhắc xác thực nếu false
  created_at: true,
} as const;
