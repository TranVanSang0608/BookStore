import { Request } from 'express';

// Lấy IP người dùng để gửi sang VNPay (vnp_IpAddr). Sau proxy/load-balancer thì IP thật
// nằm ở header X-Forwarded-For (lấy phần tử đầu — IP client gốc); không thì lấy từ socket.
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? '127.0.0.1';
}
