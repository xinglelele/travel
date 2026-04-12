import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../shared/utils/response';
import prisma from '../../config/database';
import MerchantService from './merchant.service';

const service = new MerchantService();

export default class MerchantCommentController {

  // GET /api/merchant/comment/list
  async getList(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const poiId = await service.getMerchantPoiId(merchantId);

      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const { rating, sort = 'createdAt', order = 'desc', page = 1, pageSize = 20 } = req.query;

      const where: any = { poiId, status: 1 };
      if (rating !== undefined && rating !== '') {
        where.rating = Number(rating);
      }

      const [comments, total] = await Promise.all([
        prisma.commentInfo.findMany({
          where,
          include: { user: { select: { nickname: true, avatar: true } } },
          orderBy: { [sort]: order },
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize)
        }),
        prisma.commentInfo.count({ where })
      ]);

      return successResponse(res, {
        list: comments.map(c => ({
          id: c.id,
          userNickname: c.user.nickname || '匿名用户',
          userAvatar: c.user.avatar,
          rating: Number(c.rating),
          content: c.content,
          images: c.images,
          merchantReply: c.merchantReply,
          replyTime: c.replyTime,
          isSeen: true,
          createdAt: c.createdAt
        })),
        pagination: { total, page: Number(page), pageSize: Number(pageSize) }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/merchant/comment/:id/reply
  async reply(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const commentId = Number(req.params.id);
      const { reply } = req.body;

      const poiId = await service.getMerchantPoiId(merchantId);
      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const comment = await prisma.commentInfo.findFirst({ where: { id: commentId, poiId } });
      if (!comment) {
        return errorResponse(res, '评论不存在或不属于本景点', 404);
      }

      await prisma.commentInfo.update({
        where: { id: commentId },
        data: { merchantReply: reply, replyTime: new Date() }
      });

      return successResponse(res, { message: '回复已提交' });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/merchant/comment/:id/reply
  async editReply(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const commentId = Number(req.params.id);
      const { reply } = req.body;

      const poiId = await service.getMerchantPoiId(merchantId);
      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const comment = await prisma.commentInfo.findFirst({ where: { id: commentId, poiId, status: 1 } });
      if (!comment) {
        return errorResponse(res, '评论不存在或已删除', 404);
      }
      if (!comment.merchantReply) {
        return errorResponse(res, '该评论暂无回复，请先回复', 400);
      }

      await prisma.commentInfo.update({
        where: { id: commentId },
        data: { merchantReply: reply, replyTime: new Date() }
      });

      return successResponse(res, { message: '回复已更新' });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/merchant/comment/:id/reply
  async deleteReply(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const commentId = Number(req.params.id);

      const poiId = await service.getMerchantPoiId(merchantId);
      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      await prisma.commentInfo.update({
        where: { id: commentId, poiId },
        data: { merchantReply: null, replyTime: null }
      });

      return successResponse(res, { message: '回复已删除' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/merchant/comment/stats
  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const poiId = await service.getMerchantPoiId(merchantId);

      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const [overall, recent30d, monthCount, lastMonthCount, pendingReply, ratingDist] = await Promise.all([
        prisma.commentInfo.aggregate({
          where: { poiId, status: 1 },
          _avg: { rating: true }, _count: true
        }),
        prisma.commentInfo.aggregate({
          where: { poiId, status: 1, createdAt: { gte: thirtyDaysAgo } },
          _avg: { rating: true }, _count: true
        }),
        prisma.commentInfo.count({ where: { poiId, status: 1, createdAt: { gte: thisMonth } } }),
        prisma.commentInfo.count({ where: { poiId, status: 1, createdAt: { gte: lastMonthStart, lt: thisMonth } } }),
        prisma.commentInfo.count({ where: { poiId, status: 1, merchantReply: null } }),
        prisma.commentInfo.groupBy({
          by: ['rating'],
          where: { poiId, status: 1 },
          _count: true
        })
      ]);

      return successResponse(res, {
        avgRating: overall._avg.rating ? Number(overall._avg.rating.toFixed(1)) : 0,
        totalComments: overall._count,
        avgRating30d: recent30d._avg.rating ? Number(recent30d._avg.rating.toFixed(1)) : 0,
        monthNewComments: monthCount,
        lastMonthComments: lastMonthCount,
        pendingReplyCount: pendingReply,
        ratingDistribution: ratingDist.map(r => ({
          rating: Number(r.rating),
          count: r._count
        }))
      });
    } catch (err) {
      next(err);
    }
  }
}
