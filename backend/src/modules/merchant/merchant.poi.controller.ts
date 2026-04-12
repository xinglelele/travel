import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../shared/utils/response';
import prisma from '../../config/database';
import MerchantService from './merchant.service';

const service = new MerchantService();

export default class MerchantPoiController {

  // GET /api/merchant/poi
  async getMerchantPoi(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;

      const poiId = await service.getMerchantPoiId(merchantId);
      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const rel = await prisma.merchantPoiRel.findFirst({
        where: { merchantId, isPrimary: 1 },
        include: {
          poi: {
            include: {
              district: true,
              poiTags: { include: { tag: true } },
              openingTimes: { orderBy: { priority: 'desc' } },
              tickets: { where: { status: 1 } }
            }
          }
        }
      });

      if (!rel || !rel.poi) {
        return errorResponse(res, 'POI 不属于本商户', 60014);
      }

      const poi = rel.poi;

      const stats = await prisma.poiStats.findMany({
        where: { poiId: poi.id },
        orderBy: { date: 'desc' },
        take: 30
      });

      const totalCheck = stats.reduce((sum, s) => sum + s.checkCount, 0);

      const ratingResult = await prisma.commentInfo.aggregate({
        where: { poiId: poi.id, status: 1 },
        _avg: { rating: true },
        _count: true
      });

      const auditQueue = await prisma.poiAuditQueue.findUnique({
        where: { poiId: poi.id }
      });

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
        district: poi.district ? { id: poi.district.id, name: poi.district.name } : null,
        isFree: poi.isFree,
        needTickets: poi.needTickets,
        needBook: poi.needBook,
        officialUrl: poi.officialUrl,
        status: poi.status,
        auditStatus: poi.auditStatus,
        auditRemark: poi.auditRemark,
        updatedAt: poi.updatedAt,
        checkCount: totalCheck,
        avgRating: ratingResult._avg.rating ? Number(ratingResult._avg.rating.toFixed(1)) : 0,
        commentCount: ratingResult._count,
        openingTimes: poi.openingTimes.map(ot => ({
          id: ot.id,
          type: ot.type,
          value: ot.value,
          time: ot.time
        })),
        tags: poi.poiTags.map(pt => ({
          id: pt.tag.id,
          tagCode: pt.tag.tagCode,
          tagName: pt.tag.tagName,
          weight: Number(pt.weight)
        })),
        auditQueue: auditQueue ? {
          status: auditQueue.status,
          createdAt: auditQueue.createdAt
        } : null
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/merchant/poi
  async updatePoi(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const poiId = await service.getMerchantPoiId(merchantId);

      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const valid = await service.validatePoiOwnership(merchantId, poiId);
      if (!valid) {
        return errorResponse(res, '操作权限不足', 60007);
      }

      const {
        poiName, description, address, tel, email, photos,
        longitude, latitude, districtId, isFree, needTickets, needBook,
        officialUrl, openingTimes, tagIds
      } = req.body;

      const poi = await prisma.poiInfo.findUnique({ where: { id: poiId } });
      const statusBefore = poi!.status;

      await prisma.poiInfo.update({
        where: { id: poiId },
        data: {
          poiName,
          description,
          address,
          tel,
          email,
          photos,
          longitude: Number(longitude),
          latitude: Number(latitude),
          districtId: districtId ? Number(districtId) : null,
          isFree: Number(isFree),
          needTickets: Number(needTickets),
          needBook: Number(needBook),
          officialUrl,
          status: 0,
          auditStatus: 0
        }
      });

      if (openingTimes) {
        await prisma.openingTime.deleteMany({ where: { poiId } });
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

      if (tagIds) {
        await prisma.poiTagRel.deleteMany({ where: { poiId } });
        await prisma.poiTagRel.createMany({
          data: tagIds.map((tagId: number) => ({
            poiId,
            tagId,
            weight: 0.5
          }))
        });
      }

      await prisma.poiAuditQueue.upsert({
        where: { poiId },
        create: {
          poiId,
          submitterType: 'merchant',
          submitterId: merchantId,
          status: 0
        },
        update: {
          status: 0,
          submitterType: 'merchant',
          submitterId: merchantId,
          createdAt: new Date()
        }
      });

      await prisma.merchantPoiReview.create({
        data: {
          poiId,
          merchantId,
          action: 'update',
          statusBefore,
          statusAfter: 0
        }
      });

      return successResponse(res, { message: '景点信息已提交，等待政府端审核' });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/merchant/poi/offline
  async offlinePoi(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const poiId = await service.getMerchantPoiId(merchantId);

      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const valid = await service.validatePoiOwnership(merchantId, poiId);
      if (!valid) {
        return errorResponse(res, '操作权限不足', 60007);
      }

      await prisma.poiInfo.update({
        where: { id: poiId },
        data: { status: 2 }
      });

      return successResponse(res, { message: '景点已下架' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/merchant/poi/stats
  async getPoiStats(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const poiId = await service.getMerchantPoiId(merchantId);

      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const stats = await prisma.poiStats.findMany({
        where: { poiId },
        orderBy: { date: 'asc' },
        take: 30
      });

      const ratingResult = await prisma.commentInfo.aggregate({
        where: { poiId, status: 1 },
        _avg: { rating: true }
      });

      const ratingDist = await prisma.commentInfo.groupBy({
        by: ['rating'],
        where: { poiId, status: 1 },
        _count: true
      });

      return successResponse(res, {
        checkTrend: stats.map(s => ({
          date: s.date,
          checkCount: s.checkCount
        })),
        avgRating: ratingResult._avg.rating ? Number(ratingResult._avg.rating.toFixed(1)) : 0,
        ratingDistribution: ratingDist.map(r => ({
          rating: Number(r.rating),
          count: r._count
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/merchant/poi/review-history
  async getPoiReviewHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const poiId = await service.getMerchantPoiId(merchantId);

      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const reviews = await prisma.merchantPoiReview.findMany({
        where: { poiId, merchantId },
        orderBy: { createdAt: 'desc' }
      });

      return successResponse(res, reviews.map(r => ({
        id: r.id,
        action: r.action,
        content: r.content,
        statusBefore: r.statusBefore,
        statusAfter: r.statusAfter,
        remark: r.remark,
        reviewerId: r.reviewerId,
        createdAt: r.createdAt
      })));
    } catch (err) {
      next(err);
    }
  }
}
