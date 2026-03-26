import { Request, Response, NextFunction } from 'express'

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error('Error:', err)

  res.status(500).json({
    code: -1,
    message: err.message || '服务器内部错误',
    data: null,
  })
}
