import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../../config/database';
import { errorResponse } from '../../shared/utils/response';
import { env } from '../../config/env';

export class GovernmentAuth {

  /**
   * 通用认证中间件
   * 验证 JWT Token 并附加用户信息到 req.user
   */
  private async authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        errorResponse(res, '未提供认证凭证', 401);
        return;
      }

      const token = authHeader.substring(7);
      let decoded: any;

      try {
        decoded = jwt.verify(token, env.jwt.secret);
      } catch {
        errorResponse(res, 'Token 无效或已过期', 401);
        return;
      }

      if (decoded.type !== 'government') {
        errorResponse(res, '无权限访问政府端', 403);
        return;
      }

      const government = await prisma.government.findUnique({
        where: { id: decoded.id }
      });

      if (!government) {
        errorResponse(res, '政府账号不存在', 70001);
        return;
      }

      if (government.status === 0) {
        errorResponse(res, '账号已被禁用，请联系管理员', 70003);
        return;
      }

      (req as any).user = {
        id: government.id,
        username: government.username,
        role: government.role,
        department: government.department,
        realName: government.realName
      };

      next();
    } catch (err) {
      next(err);
    }
  }

  /**
   * 必须登录（任何角色）
   */
  required() {
    return (req: Request, res: Response, next: NextFunction) =>
      this.authenticate(req, res, next);
  }

  /**
   * 超级管理员（role=0）
   */
  superAdmin() {
    return async (req: Request, res: Response, next: NextFunction) => {
      await this.authenticate(req, res, async (authErr?: any) => {
        if (authErr) { next(authErr); return; }
        const gov = (req as any).user;
        if (gov.role !== 0) {
          errorResponse(res, '权限不足，需要超级管理员权限', 70004);
          return;
        }
        next();
      });
    };
  }

  /**
   * 普通管理员或超级管理员（role=0 或 role=1）
   */
  admin() {
    return async (req: Request, res: Response, next: NextFunction) => {
      await this.authenticate(req, res, async (authErr?: any) => {
        if (authErr) { next(authErr); return; }
        const gov = (req as any).user;
        if (gov.role !== 0 && gov.role !== 1) {
          errorResponse(res, '权限不足，需要管理员权限', 70004);
          return;
        }
        next();
      });
    };
  }

  /**
   * 审核员（role=2）或更高权限
   * 审核员只能操作评论相关接口
   */
  auditor() {
    return async (req: Request, res: Response, next: NextFunction) => {
      await this.authenticate(req, res, async (authErr?: any) => {
        if (authErr) { next(authErr); return; }
        const gov = (req as any).user;
        if (gov.role !== 0 && gov.role !== 1 && gov.role !== 2) {
          errorResponse(res, '权限不足', 70004);
          return;
        }
        next();
      });
    };
  }

  /**
   * 生成 Government JWT Token
   */
  static async generateToken(gov: { id: number; username: string; role: number }): Promise<string> {
    const { env: envConfig } = await import('../../config/env');
    return jwt.sign(
      { id: gov.id, username: gov.username, type: 'government', role: gov.role },
      envConfig.jwt.secret,
      { expiresIn: '7d' }
    );
  }
}
