import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import prisma from '../config/database';

export class MerchantAuth {
  required() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ code: 401, message: '未登录或 Token 已过期', data: null });
      }

      const token = authHeader.slice(7);
      try {
        const decoded = jwt.verify(token, env.jwt.secret) as any;
        if (decoded.type !== 'merchant') {
          return res.status(401).json({ code: 401, message: '无权限访问', data: null });
        }

        const merchant = await prisma.merchant.findUnique({
          where: { id: decoded.id }
        });

        if (!merchant) {
          return res.status(401).json({ code: 60001, message: '商户账号不存在', data: null });
        }

        if (merchant.status !== 1) {
          return res.status(403).json({ code: 60004, message: '商户未通过审核', data: null });
        }

        (req as any).user = decoded;
        next();
      } catch (err) {
        if ((err as any).name === 'TokenExpiredError') {
          return res.status(401).json({ code: 401, message: 'Token 已过期，请重新登录', data: null });
        }
        return res.status(401).json({ code: 401, message: 'Token 无效', data: null });
      }
    };
  }
}
