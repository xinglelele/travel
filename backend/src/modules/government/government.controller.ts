import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../shared/utils/response';
import { GovernmentAuth } from './government-auth';
import bcrypt from 'bcryptjs';
import prisma from '../../config/database';

const auth = new GovernmentAuth();

export default class GovernmentController {

  // POST /api/gov/login
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, password } = req.body;

      const government = await prisma.government.findUnique({ where: { username } });
      if (!government) {
        return errorResponse(res, '用户名不存在', 70001);
      }

      if (government.status === 0) {
        return errorResponse(res, '账号已被禁用，请联系管理员', 70003);
      }

      const valid = await bcrypt.compare(password, government.password);
      if (!valid) {
        return errorResponse(res, '密码错误', 70002);
      }

      const token = await GovernmentAuth.generateToken({
        id: government.id,
        username: government.username,
        role: government.role
      });

      await prisma.government.update({
        where: { id: government.id },
        data: { lastLoginAt: new Date() }
      });

      return successResponse(res, {
        token,
        government: {
          id: government.id,
          username: government.username,
          realName: government.realName,
          tel: government.tel,
          department: government.department,
          role: government.role,
          status: government.status
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/profile
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const gov = (req as any).user;

      const government = await prisma.government.findUnique({ where: { id: gov.id } });
      if (!government) {
        return errorResponse(res, '政府账号不存在', 70011);
      }

      return successResponse(res, {
        id: government.id,
        username: government.username,
        realName: government.realName,
        tel: government.tel,
        department: government.department,
        role: government.role,
        status: government.status,
        lastLoginAt: government.lastLoginAt
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/gov/profile
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const gov = (req as any).user;
      const { realName, department } = req.body;

      await prisma.government.update({
        where: { id: gov.id },
        data: { realName, department }
      });

      return successResponse(res, { message: '账号信息已更新' });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/gov/password
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const gov = (req as any).user;
      const { oldPassword, newPassword } = req.body;

      const government = await prisma.government.findUnique({ where: { id: gov.id } });
      if (!government) {
        return errorResponse(res, '政府账号不存在', 70011);
      }

      const valid = await bcrypt.compare(oldPassword, government.password);
      if (!valid) {
        return errorResponse(res, '旧密码错误', 70002);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.government.update({
        where: { id: gov.id },
        data: { password: hashedPassword }
      });

      return successResponse(res, { message: '密码修改成功' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/gov/logout
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      return successResponse(res, { message: '已退出登录' });
    } catch (err) {
      next(err);
    }
  }

  // =============================================
  // 管理员账号管理（仅超管）
  // =============================================

  // GET /api/gov/admin/list
  async getAdminList(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, status } = req.query;

      const where: any = {};
      if (role !== undefined && role !== '') where.role = Number(role);
      if (status !== undefined && status !== '') where.status = Number(status);

      const page = Number(req.query.page) || 1;
      const pageSize = Number(req.query.pageSize) || 20;

      const [list, total] = await Promise.all([
        prisma.government.findMany({
          where,
          select: {
            id: true,
            username: true,
            tel: true,
            realName: true,
            department: true,
            role: true,
            status: true,
            lastLoginAt: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.government.count({ where })
      ]);

      return successResponse(res, { list, pagination: { total, page, pageSize } });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/admin/:id
  async getAdminById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      const government = await prisma.government.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          tel: true,
          realName: true,
          department: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true
        }
      });

      if (!government) {
        return errorResponse(res, '管理员账号不存在', 70011);
      }

      return successResponse(res, government);
    } catch (err) {
      next(err);
    }
  }

  // POST /api/gov/admin
  async createAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const { username, tel, realName, department, role, password } = req.body;

      const existingUsername = await prisma.government.findUnique({ where: { username } });
      if (existingUsername) {
        return errorResponse(res, '用户名已被注册', 70013);
      }

      const existingTel = await prisma.government.findUnique({ where: { tel } });
      if (existingTel) {
        return errorResponse(res, '手机号已被注册', 70012);
      }

      const hashedPassword = await bcrypt.hash(password || '123456', 10);

      const government = await prisma.government.create({
        data: {
          username,
          tel,
          realName,
          department,
          role: Number(role),
          password: hashedPassword,
          status: 1
        }
      });

      return successResponse(res, {
        id: government.id,
        username: government.username,
        message: '管理员账号创建成功'
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/gov/admin/:id
  async updateAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const gov = (req as any).user;
      const { realName, department, role, status } = req.body;

      const target = await prisma.government.findUnique({ where: { id } });
      if (!target) {
        return errorResponse(res, '管理员账号不存在', 70011);
      }

      // 不能修改自己的角色或禁用自己
      if (id === gov.id) {
        if (status !== undefined && status !== target.status) {
          return errorResponse(res, '不能禁用或启用自己的账号', 70014);
        }
        if (role !== undefined && role !== target.role) {
          return errorResponse(res, '不能修改自己的角色', 70014);
        }
      }

      // 禁止将超管的角色改为非超管（除非自己）
      if (target.role === 0 && role !== undefined && Number(role) !== 0 && id !== gov.id) {
        const superAdminCount = await prisma.government.count({ where: { role: 0, status: 1 } });
        if (superAdminCount <= 1) {
          return errorResponse(res, '至少需要保留一个超级管理员', 70004);
        }
      }

      await prisma.government.update({
        where: { id },
        data: {
          realName,
          department,
          role: role !== undefined ? Number(role) : undefined,
          status: status !== undefined ? Number(status) : undefined
        }
      });

      return successResponse(res, { message: '管理员账号已更新' });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/gov/admin/:id
  async deleteAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const gov = (req as any).user;

      if (id === gov.id) {
        return errorResponse(res, '不能删除自己的账号', 70014);
      }

      const target = await prisma.government.findUnique({ where: { id } });
      if (!target) {
        return errorResponse(res, '管理员账号不存在', 70011);
      }

      if (target.role === 0) {
        const superAdminCount = await prisma.government.count({ where: { role: 0, status: 1 } });
        if (superAdminCount <= 1) {
          return errorResponse(res, '至少需要保留一个超级管理员', 70004);
        }
      }

      await prisma.government.delete({ where: { id } });

      return successResponse(res, { message: '管理员账号已删除' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/gov/admin/:id/reset-password
  async resetAdminPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      const target = await prisma.government.findUnique({ where: { id } });
      if (!target) {
        return errorResponse(res, '管理员账号不存在', 70011);
      }

      // 生成 8 位随机密码
      const newPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.government.update({
        where: { id },
        data: { password: hashedPassword }
      });

      // TODO: 调用短信服务发送密码到 target.tel
      console.log(`[GovAdmin] 管理员 ${target.username} 密码已重置为: ${newPassword}`);

      return successResponse(res, {
        message: '密码已重置并发送至管理员手机',
        tempPassword: newPassword // 开发环境返回，生产环境应隐藏
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /gov/districts - 获取所有行政区列表（公共接口）
  async getDistricts(req: Request, res: Response, next: NextFunction) {
    try {
      const districts = await prisma.district.findMany({
        orderBy: { sortOrder: 'asc' }
      });
      return successResponse(res, districts.map(d => ({
        id: d.id,
        code: d.code,
        name: d.name,
        shortName: d.shortName
      })));
    } catch (err) {
      next(err);
    }
  }
}
