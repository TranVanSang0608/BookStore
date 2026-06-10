import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';

// Middleware chạy Zod schema trên req.body trước khi vào controller.
// Cách dùng: router.post('/register', validate(registerSchema), controller.register)
export function validate(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }
    // Thay body bằng dữ liệu đã qua Zod parse (đúng kiểu, loại bỏ field thừa)
    req.body = result.data;
    next();
  };
}
