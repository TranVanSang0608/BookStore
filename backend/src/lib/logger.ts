import winston from 'winston';
import 'winston-daily-rotate-file'; // side-effect: thêm transport DailyRotateFile vào winston

// Logger dùng chung toàn app: ghi console (màu, dễ đọc khi dev)
// + file logs/app-YYYY-MM-DD.log xoay vòng theo ngày, giữ tối đa 14 ngày.
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.DailyRotateFile({
      dirname: 'logs',
      filename: 'app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});
