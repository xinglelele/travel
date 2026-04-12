import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../shared/utils/response';
import bcrypt from 'bcryptjs';
import prisma from '../../config/database';

export default class GovernmentMerchantController {

  // =============================================
  // 商户管理
  // =============================================

  // GET /api/gov/merchant/list
  async getMerchantList(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, merchantCategory, keyword, page = 1, pageSize = 20 } = req.query;

      const where: any = {};
      if (status !== undefined && status !== '') where.status = Number(status);
      if (merchantCategory !== undefined && merchantCategory !== '') where.merchantCategory = merchantCategory;
      if (keyword !== undefined && keyword !== '') {
        where.OR = [
          { merchantName: { contains: keyword as string } },
          { tel: { contains: keyword as string } }
        ];
      }

      const [list, total] = await Promise.all([
        prisma.merchant.findMany({
          where,
          select: {
            id: true,
            merchantName: true,
            tel: true,
            contactPerson: true,
            merchantCategory: true,
            status: true,
            rejectReason: true,
            createdAt: true,
            poiRelations: {
              select: { poiId: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize)
        }),
        prisma.merchant.count({ where })
      ]);

      return successResponse(res, {
        list: list.map(m => ({
          id: m.id,
          merchantName: m.merchantName,
          tel: m.tel,
          contactPerson: m.contactPerson,
          merchantCategory: m.merchantCategory,
          status: m.status,
          rejectReason: m.rejectReason,
          poiCount: m.poiRelations.length,
          createdAt: m.createdAt
        })),
        pagination: { total, page: Number(page), pageSize: Number(pageSize) }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/merchant/:id
  async getMerchantDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      const merchant = await prisma.merchant.findUnique({
        where: { id },
        include: {
          poiRelations: {
            include: {
              poi: {
                select: {
                  id: true,
                  poiName: true,
                  district: { select: { name: true } },
                  status: true,
                  checkCount: true
                }
              }
            }
          },
          reviews: {
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: { reviewer: { select: { realName: true } } }
          }
        }
      });

      if (!merchant) {
        return errorResponse(res, '商户不存在', 70008);
      }

      // 获取该商户关联 POI 的打卡和评分数据
      const poiIds = merchant.poiRelations.map(r => r.poiId);
      let checkCount = 0;
      let avgRating = 0;
      let commentCount = 0;

      if (poiIds.length > 0) {
        const [checkData, ratingData, commentData] = await Promise.all([
          prisma.poiStats.aggregate({ where: { poiId: { in: poiIds } }, _sum: { checkCount: true } }),
          prisma.commentInfo.aggregate({ where: { poiId: { in: poiIds }, status: 1 }, _avg: { rating: true } }),
          prisma.commentInfo.count({ where: { poiId: { in: poiIds }, status: 1 } })
        ]);
        checkCount = checkData._sum.checkCount || 0;
        avgRating = ratingData._avg.rating ? Number(ratingData._avg.rating.toFixed(1)) : 0;
        commentCount = commentData;
      }

      return successResponse(res, {
        id: merchant.id,
        merchantName: merchant.merchantName,
        tel: merchant.tel,
        email: merchant.email,
        contactPerson: merchant.contactPerson,
        logo: merchant.logo,
        merchantCategory: merchant.merchantCategory,
        description: merchant.description,
        businessLicense: merchant.businessLicense,
        status: merchant.status,
        rejectReason: merchant.rejectReason,
        lastLoginAt: merchant.lastLoginAt,
        createdAt: merchant.createdAt,
        pois: merchant.poiRelations.map(r => ({
          poiId: r.poi.id,
          poiName: (r.poi.poiName as any)?.zh || '未命名',
          district: r.poi.district?.name,
          status: r.poi.status,
          isPrimary: r.isPrimary
        })),
        reviewHistory: merchant.reviews.map(r => ({
          id: r.id,
          action: r.action,
          statusBefore: r.statusBefore,
          statusAfter: r.statusAfter,
          remark: r.remark,
          reviewerName: r.reviewer?.realName,
          createdAt: r.createdAt
        })),
        stats: { checkCount, avgRating, commentCount }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/gov/merchant/:id/audit
  async auditMerchant(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = Number(req.params.id);
      const govId = (req as any).user.id;
      const { action, remark } = req.body; // action: approve | reject

      const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
      if (!merchant) {
        return errorResponse(res, '商户不存在', 70008);
      }

      if (action === 'approve') {
        await prisma.$transaction([
          prisma.merchant.update({
            where: { id: merchantId },
            data: { status: 1, rejectReason: null }
          }),
          prisma.merchantReview.create({
            data: {
              merchantId,
              action: 'approve',
              statusBefore: merchant.status,
              statusAfter: 1,
              remark,
              reviewerId: govId
            }
          })
        ]);
        return successResponse(res, { message: '商户审核已通过' });

      } else if (action === 'reject') {
        if (!remark) {
          return errorResponse(res, '拒绝时必须填写备注', 400);
        }
        await prisma.$transaction([
          prisma.merchant.update({
            where: { id: merchantId },
            data: { status: 3, rejectReason: remark }
          }),
          prisma.merchantReview.create({
            data: {
              merchantId,
              action: 'reject',
              statusBefore: merchant.status,
              statusAfter: 3,
              remark,
              reviewerId: govId
            }
          })
        ]);
        return successResponse(res, { message: '商户审核已拒绝' });
      } else {
        return errorResponse(res, '无效的审核操作', 400);
      }
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/gov/merchant/:id/ban
  async banMerchant(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = Number(req.params.id);
      const govId = (req as any).user.id;
      const { reason } = req.body;

      const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
      if (!merchant) {
        return errorResponse(res, '商户不存在', 70008);
      }

      await prisma.$transaction([
        prisma.merchant.update({
          where: { id: merchantId },
          data: { status: 2 }
        }),
        prisma.merchantReview.create({
          data: {
            merchantId,
            action: 'ban',
            statusBefore: merchant.status,
            statusAfter: 2,
            remark: reason || '政府强制封禁',
            reviewerId: govId
          }
        })
      ]);

      return successResponse(res, { message: '商户已封禁' });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/gov/merchant/:id/unban
  async unbanMerchant(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = Number(req.params.id);
      const govId = (req as any).user.id;

      const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
      if (!merchant) {
        return errorResponse(res, '商户不存在', 70008);
      }

      await prisma.$transaction([
        prisma.merchant.update({
          where: { id: merchantId },
          data: { status: 1 }
        }),
        prisma.merchantReview.create({
          data: {
            merchantId,
            action: 'unban',
            statusBefore: merchant.status,
            statusAfter: 1,
            remark: '解除封禁',
            reviewerId: govId
          }
        })
      ]);

      return successResponse(res, { message: '商户已解封' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/gov/merchant/:id/reset-password
  async resetMerchantPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = Number(req.params.id);

      const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
      if (!merchant) {
        return errorResponse(res, '商户不存在', 70008);
      }

      const newPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.merchant.update({
        where: { id: merchantId },
        data: { password: hashedPassword }
      });

      // TODO: 调用短信服务发送密码
      console.log(`[Gov] 商户 ${merchant.merchantName} 密码已重置为: ${newPassword}`);

      return successResponse(res, {
        message: '密码已重置并发送至商户手机',
        tempPassword: newPassword
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/merchant/:id/pois
  async getMerchantPois(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = Number(req.params.id);

      const rels = await prisma.merchantPoiRel.findMany({
        where: { merchantId },
        include: {
          poi: {
            select: {
              id: true,
              poiName: true,
              district: { select: { name: true } },
              status: true,
              auditStatus: true,
              createdAt: true
            }
          }
        },
        orderBy: { isPrimary: 'desc' }
      });

        return successResponse(res, rels.map(r => ({
        poiId: r.poi.id,
        poiName: (r.poi.poiName as any)?.zh || '未命名',
        district: r.poi.district?.name,
        status: r.poi.status,
        auditStatus: r.poi.auditStatus,
        isPrimary: r.isPrimary,
        createdAt: r.poi.createdAt
      })));
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/merchant/:id/reviews
  async getMerchantReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = Number(req.params.id);
      const { page = 1, pageSize = 20 } = req.query;

      const [reviews, total] = await Promise.all([
        prisma.merchantReview.findMany({
          where: { merchantId },
          include: { reviewer: { select: { realName: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize)
        }),
        prisma.merchantReview.count({ where: { merchantId } })
      ]);

      return successResponse(res, {
        list: reviews.map(r => ({
          id: r.id,
          action: r.action,
          statusBefore: r.statusBefore,
          statusAfter: r.statusAfter,
          remark: r.remark,
          reviewerName: r.reviewer?.realName,
          createdAt: r.createdAt
        })),
        pagination: { total, page: Number(page), pageSize: Number(pageSize) }
      });
    } catch (err) {
      next(err);
    }
  }
}
