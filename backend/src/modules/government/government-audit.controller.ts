import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../shared/utils/response';
import prisma from '../../config/database';

export default class GovernmentAuditController {

  // =============================================
  // POI 审核
  // =============================================

  // GET /api/gov/poi/audit/list
  async getPoiAuditList(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, submitterType, assignee, page = 1, pageSize = 20 } = req.query;

      const where: any = {};
      if (status !== undefined && status !== '') {
        where.status = Number(status);
      } else {
        where.status = 0; // 默认查待审核
      }
      if (submitterType !== undefined && submitterType !== '') {
        where.submitterType = submitterType;
      }
      if (assignee !== undefined && assignee !== '') {
        where.assignedTo = Number(assignee);
      }

      const [list, total] = await Promise.all([
        prisma.poiAuditQueue.findMany({
          where,
          include: {
            poi: {
              select: {
                id: true,
                poiName: true,
                district: { select: { name: true } },
                status: true,
                createdAt: true
              }
            }
          },
          orderBy: [
            { priority: 'desc' },
            { createdAt: 'asc' }
          ],
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize)
        }),
        prisma.poiAuditQueue.count({ where })
      ]);

      // 获取提交方名称
      const merchantIds = list
        .filter(l => l.submitterType === 'merchant')
        .map(l => l.submitterId);
      const govIds = list
        .filter(l => l.submitterType === 'government')
        .map(l => l.submitterId);

      const [merchants, govAdmins] = await Promise.all([
        merchantIds.length > 0
          ? prisma.merchant.findMany({
              where: { id: { in: merchantIds } },
              select: { id: true, merchantName: true }
            })
          : [],
        govIds.length > 0
          ? prisma.government.findMany({
              where: { id: { in: govIds } },
              select: { id: true, realName: true }
            })
          : []
      ]);

      const merchantMap = new Map(merchants.map(m => [m.id, m.merchantName]));
      const govMap = new Map(govAdmins.map(g => [g.id, g.realName || g.username]));

      const result = list.map(item => ({
        queueId: item.id,
        poiId: item.poiId,
        poiName: (item.poi.poiName as any)?.zh || '未命名',
        poiDistrict: item.poi.district?.name,
        poiStatus: item.poi.status,
        submitterType: item.submitterType,
        submitterName: item.submitterType === 'merchant'
          ? merchantMap.get(item.submitterId)
          : govMap.get(item.submitterId) || '系统',
        submitRemark: item.submitRemark,
        priority: item.priority,
        status: item.status,
        assignedTo: item.assignedTo,
        createdAt: item.createdAt
      }));

      return successResponse(res, {
        list: result,
        pagination: { total, page: Number(page), pageSize: Number(pageSize) }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/poi/:id/audit
  async getPoiAuditDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const poiId = Number(req.params.id);

      const poi = await prisma.poiInfo.findUnique({
        where: { id: poiId },
        include: {
          district: true,
          poiTags: { include: { tag: true } },
          openingTimes: { orderBy: { priority: 'desc' } },
          merchantRels: {
            where: { isPrimary: 1 },
            include: { merchant: { select: { id: true, merchantName: true, tel: true, contactPerson: true } } }
          }
        }
      });

      if (!poi) {
        return errorResponse(res, 'POI 不存在', 70005);
      }

      const reviews = await prisma.merchantPoiReview.findMany({
        where: { poiId },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      const queue = await prisma.poiAuditQueue.findUnique({ where: { poiId } });

      return successResponse(res, {
        id: poi.id,
        poiUuid: poi.poiUuid,
        poiName: poi.poiName,
        description: poi.description,
        address: poi.address,
        tel: poi.tel,
        email: poi.email,
        photos: poi.photos,
        longitude: Number(poi.longitude),
        latitude: Number(poi.latitude),
        district: poi.district?.name,
        isFree: poi.isFree,
        needTickets: poi.needTickets,
        needBook: poi.needBook,
        officialUrl: poi.officialUrl,
        status: poi.status,
        auditStatus: poi.auditStatus,
        auditRemark: poi.auditRemark,
        createdAt: poi.createdAt,
        tags: poi.poiTags.map(pt => ({
          id: pt.tag.id,
          tagCode: pt.tag.tagCode,
          tagName: pt.tag.tagName
        })),
        openingTimes: poi.openingTimes.map(ot => ({
          id: ot.id,
          type: ot.type,
          value: ot.value,
          time: ot.time
        })),
        merchant: poi.merchantRels[0]?.merchant || null,
        auditQueue: queue ? {
          id: queue.id,
          submitterType: queue.submitterType,
          submitRemark: queue.submitRemark,
          status: queue.status,
          createdAt: queue.createdAt
        } : null,
        reviewHistory: reviews.map(r => ({
          id: r.id,
          action: r.action,
          content: r.content,
          statusBefore: r.statusBefore,
          statusAfter: r.statusAfter,
          remark: r.remark,
          reviewerId: r.reviewerId,
          createdAt: r.createdAt
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/gov/poi/:id/audit
  async auditPoi(req: Request, res: Response, next: NextFunction) {
    try {
      const poiId = Number(req.params.id);
      const govId = (req as any).user.id;
      const { action, remark } = req.body; // action: approve | reject

      const poi = await prisma.poiInfo.findUnique({ where: { id: poiId } });
      if (!poi) {
        return errorResponse(res, 'POI 不存在', 70005);
      }

      if (action === 'approve') {
        await prisma.$transaction([
          prisma.poiInfo.update({
            where: { id: poiId },
            data: { auditStatus: 1, status: 1, auditedBy: govId, auditedAt: new Date(), auditRemark: remark || null }
          }),
          prisma.poiAuditQueue.update({
            where: { poiId },
            data: { status: 1 }
          }),
          prisma.governmentReview.create({
            data: {
              reviewerId: govId,
              targetType: 'poi',
              targetId: poiId,
              action: 'approve',
              remark
            }
          })
        ]);

        // 通知商户
        const rel = await prisma.merchantPoiRel.findFirst({ where: { poiId, isPrimary: 1 } });
        if (rel) {
          await prisma.messageInfo.create({
            data: {
              userId: -rel.merchantId, // 临时用负数标记为商户消息，后续优化
              type: 'gov',
              title: 'POI 审核通过',
              content: `您的景点「${(poi.poiName as any)?.zh}」已通过审核，正式上线！`,
              relatedId: poiId
            }
          }).catch(() => { }); // 忽略错误
        }

        return successResponse(res, { message: 'POI 审核已通过' });

      } else if (action === 'reject') {
        if (!remark) {
          return errorResponse(res, '拒绝时必须填写备注', 400);
        }

        await prisma.$transaction([
          prisma.poiInfo.update({
            where: { id: poiId },
            data: { auditStatus: 2, auditRemark: remark, auditedBy: govId, auditedAt: new Date() }
          }),
          prisma.poiAuditQueue.update({
            where: { poiId },
            data: { status: 1 }
          }),
          prisma.governmentReview.create({
            data: {
              reviewerId: govId,
              targetType: 'poi',
              targetId: poiId,
              action: 'reject',
              remark
            }
          })
        ]);

        return successResponse(res, { message: 'POI 审核已拒绝' });
      } else {
        return errorResponse(res, '无效的审核操作', 400);
      }
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/poi/audit/history
  async getPoiAuditHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, pageSize = 20 } = req.query;

      const [reviews, total] = await Promise.all([
        prisma.governmentReview.findMany({
          where: { targetType: 'poi' },
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize)
        }),
        prisma.governmentReview.count({ where: { targetType: 'poi' } })
      ]);

      const poiIds = reviews.map(r => r.targetId);
      const pois = await prisma.poiInfo.findMany({
        where: { id: { in: poiIds } },
        select: { id: true, poiName: true }
      });
      const poiMap = new Map(pois.map(p => [p.id, (p.poiName as any)?.zh || '未命名']));

      const reviewerIds = reviews.map(r => r.reviewerId);
      const reviewers = await prisma.government.findMany({
        where: { id: { in: reviewerIds } },
        select: { id: true, realName: true }
      });
      const reviewerMap = new Map(reviewers.map(r => [r.id, r.realName || '未知']));

      return successResponse(res, {
        list: reviews.map(r => ({
          id: r.id,
          poiId: r.targetId,
          poiName: poiMap.get(r.targetId),
          action: r.action,
          remark: r.remark,
          reviewerName: reviewerMap.get(r.reviewerId),
          createdAt: r.createdAt
        })),
        pagination: { total, page: Number(page), pageSize: Number(pageSize) }
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/gov/poi/:id/assign
  async assignPoiAudit(req: Request, res: Response, next: NextFunction) {
    try {
      const poiId = Number(req.params.id);
      const { assignedTo } = req.body;

      await prisma.poiAuditQueue.update({
        where: { poiId },
        data: { assignedTo: assignedTo || null, assignedAt: assignedTo ? new Date() : null }
      });

      return successResponse(res, { message: '分配成功' });
    } catch (err) {
      next(err);
    }
  }

  // =============================================
  // POI 管理
  // =============================================

  // GET /api/gov/poi/list
  async getPoiList(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, districtId, keyword, page = 1, pageSize = 20 } = req.query;

      const where: any = {};
      if (status !== undefined && status !== '') where.status = Number(status);
      if (districtId !== undefined && districtId !== '') where.districtId = Number(districtId);
      if (keyword !== undefined && keyword !== '') {
        where.poiName = { contains: keyword as string };
      }

      const [list, total] = await Promise.all([
        prisma.poiInfo.findMany({
          where,
          select: {
            id: true,
            poiName: true,
            district: { select: { id: true, name: true } },
            tel: true,
            status: true,
            auditStatus: true,
            createdAt: true,
            updatedAt: true,
            merchantRels: {
              where: { isPrimary: 1 },
              include: { merchant: { select: { merchantName: true } } }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize)
        }),
        prisma.poiInfo.count({ where })
      ]);

      return successResponse(res, {
        list: list.map(poi => ({
          id: poi.id,
          poiName: (poi.poiName as any)?.zh || '未命名',
          districtId: poi.district?.id,
          district: poi.district?.name,
          tel: poi.tel,
          status: poi.status,
          auditStatus: poi.auditStatus,
          merchantName: poi.merchantRels[0]?.merchant.merchantName || null,
          createdAt: poi.createdAt,
          updatedAt: poi.updatedAt
        })),
        pagination: { total, page: Number(page), pageSize: Number(pageSize) }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/poi/:id
  async getPoiDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const poiId = Number(req.params.id);

      const poi = await prisma.poiInfo.findUnique({
        where: { id: poiId },
        include: {
          district: true,
          poiTags: { include: { tag: true } },
          openingTimes: { orderBy: { priority: 'desc' } },
          merchantRels: {
            include: { merchant: { select: { id: true, merchantName: true, tel: true } } }
          }
        }
      });

      if (!poi) {
        return errorResponse(res, 'POI 不存在', 70005);
      }

      return successResponse(res, {
        id: poi.id,
        poiUuid: poi.poiUuid,
        poiName: poi.poiName,
        description: poi.description,
        address: poi.address,
        tel: poi.tel,
        email: poi.email,
        photos: poi.photos,
        longitude: Number(poi.longitude),
        latitude: Number(poi.latitude),
        districtId: poi.districtId,
        district: poi.district?.name,
        isFree: poi.isFree,
        needTickets: poi.needTickets,
        needBook: poi.needBook,
        officialUrl: poi.officialUrl,
        status: poi.status,
        auditStatus: poi.auditStatus,
        tags: poi.poiTags.map(pt => ({ id: pt.tag.id, tagCode: pt.tag.tagCode, tagName: pt.tag.tagName })),
        openingTimes: poi.openingTimes,
        merchants: poi.merchantRels.map(r => ({
          merchantId: r.merchant.id,
          merchantName: r.merchant.merchantName,
          tel: r.merchant.tel,
          isPrimary: r.isPrimary
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/gov/poi
  async createPoi(req: Request, res: Response, next: NextFunction) {
    try {
      const govId = (req as any).user.id;
      const {
        poiName, description, address, tel, email, photos,
        longitude, latitude, districtId, isFree, needTickets, needBook,
        officialUrl, openingTimes, tagIds
      } = req.body;

      const poi = await prisma.poiInfo.create({
        data: {
          poiUuid: `GOV_${Date.now()}`,
          poiName,
          description,
          address,
          tel,
          email,
          photos,
          longitude: Number(longitude),
          latitude: Number(latitude),
          districtId: districtId ? Number(districtId) : null,
          isFree: Number(isFree || 0),
          needTickets: Number(needTickets || 0),
          needBook: Number(needBook || 0),
          officialUrl,
          status: 1,
          auditStatus: 1,
          auditedBy: govId,
          auditedAt: new Date(),
          createdBy: govId
        }
      });

      if (tagIds && tagIds.length > 0) {
        await prisma.poiTagRel.createMany({
          data: tagIds.map((tagId: number) => ({
            poiId: poi.id,
            tagId,
            weight: 0.5
          }))
        });
      }

      if (openingTimes && openingTimes.length > 0) {
        await prisma.openingTime.createMany({
          data: openingTimes.map((ot: any) => ({
            poiId: poi.id,
            type: ot.type,
            value: ot.value,
            time: ot.time,
            priority: ot.priority || 0
          }))
        });
      }

      return successResponse(res, { id: poi.id, message: 'POI 创建成功' });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/gov/poi/:id
  async updatePoi(req: Request, res: Response, next: NextFunction) {
    try {
      const poiId = Number(req.params.id);
      const govId = (req as any).user.id;
      const {
        poiName, description, address, tel, email, photos,
        longitude, latitude, districtId, isFree, needTickets, needBook,
        officialUrl, openingTimes, tagIds
      } = req.body;

      const poi = await prisma.poiInfo.findUnique({ where: { id: poiId } });
      if (!poi) {
        return errorResponse(res, 'POI 不存在', 70005);
      }

      await prisma.poiInfo.update({
        where: { id: poiId },
        data: {
          poiName, description, address, tel, email, photos,
          longitude: Number(longitude),
          latitude: Number(latitude),
          districtId: districtId ? Number(districtId) : null,
          isFree: Number(isFree || 0),
          needTickets: Number(needTickets || 0),
          needBook: Number(needBook || 0),
          officialUrl
        }
      });

      if (tagIds !== undefined) {
        await prisma.poiTagRel.deleteMany({ where: { poiId } });
        if (tagIds.length > 0) {
          await prisma.poiTagRel.createMany({
            data: tagIds.map((tagId: number) => ({
              poiId, tagId, weight: 0.5
            }))
          });
        }
      }

      if (openingTimes !== undefined) {
        await prisma.openingTime.deleteMany({ where: { poiId } });
        if (openingTimes.length > 0) {
          await prisma.openingTime.createMany({
            data: openingTimes.map((ot: any) => ({
              poiId,
              type: ot.type,
              value: ot.value,
              time: ot.time,
              priority: ot.priority || 0
            }))
          });
        }
      }

      await prisma.governmentReview.create({
        data: {
          reviewerId: govId,
          targetType: 'poi',
          targetId: poiId,
          action: 'update',
          remark: '政府端修改'
        }
      });

      return successResponse(res, { message: 'POI 已更新' });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/gov/poi/:id/offline
  async offlinePoi(req: Request, res: Response, next: NextFunction) {
    try {
      const poiId = Number(req.params.id);
      const govId = (req as any).user.id;
      const { reason } = req.body;

      await prisma.$transaction([
        prisma.poiInfo.update({
          where: { id: poiId },
          data: { status: 2 }
        }),
        prisma.governmentReview.create({
          data: {
            reviewerId: govId,
            targetType: 'poi',
            targetId: poiId,
            action: 'offline',
            remark: reason || '政府强制下架'
          }
        })
      ]);

      // 通知关联商户
      const rel = await prisma.merchantPoiRel.findFirst({ where: { poiId, isPrimary: 1 } });
      if (rel) {
        console.log(`[Gov] POI ${poiId} 已被强制下架，原因：${reason}`);
      }

      return successResponse(res, { message: 'POI 已强制下架' });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/gov/poi/:id
  async deletePoi(req: Request, res: Response, next: NextFunction) {
    try {
      const poiId = Number(req.params.id);

      const poi = await prisma.poiInfo.findUnique({ where: { id: poiId } });
      if (!poi) {
        return errorResponse(res, 'POI 不存在', 70005);
      }

      // 级联删除由 Prisma 约束处理
      await prisma.poiInfo.delete({ where: { id: poiId } });

      return successResponse(res, { message: 'POI 已删除' });
    } catch (err) {
      next(err);
    }
  }
}
