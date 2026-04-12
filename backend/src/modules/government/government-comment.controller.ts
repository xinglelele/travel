import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../shared/utils/response';
import prisma from '../../config/database';

export default class GovernmentCommentController {

  // =============================================
  // 评论审核
  // =============================================

  // GET /api/gov/comment/audit/list
  async getCommentAuditList(req: Request, res: Response, next: NextFunction) {
    try {
      const { auditStatus, rating, keyword, page = 1, pageSize = 20 } = req.query;
      const govUser = (req as any).user;

      // 审核员只能看评论（target_type=comment）
      const where: any = {};
      if (auditStatus !== undefined && auditStatus !== '') {
        where.auditStatus = Number(auditStatus);
      } else {
        where.auditStatus = 1; // 默认待审核
      }
      if (rating !== undefined && rating !== '') {
        where.rating = Number(rating);
      }

      if (keyword !== undefined && keyword !== '') {
        where.content = { contains: keyword as string };
      }

      const [list, total] = await Promise.all([
        prisma.commentInfo.findMany({
          where,
          include: {
            user: { select: { nickname: true, avatar: true } },
            poi: { select: { id: true, poiName: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize)
        }),
        prisma.commentInfo.count({ where })
      ]);

      // 获取被举报数
      const commentIds = list.map(c => c.id);
      const reportCounts = await prisma.reportRecord.groupBy({
        by: ['targetId'],
        where: { targetType: 'comment', targetId: { in: commentIds }, status: 0 },
        _count: true
      });
      const reportMap = new Map(reportCounts.map(r => [r.targetId, r._count]));

      return successResponse(res, {
        list: list.map(c => ({
          id: c.id,
          userNickname: c.user.nickname || '匿名用户',
          userAvatar: c.user.avatar,
          poiId: c.poi.id,
          poiName: (c.poi.poiName as any)?.zh || '未命名',
          rating: Number(c.rating),
          content: c.content,
          images: c.images,
          isReported: c.isReported,
          reportCount: reportMap.get(c.id) || 0,
          auditStatus: c.auditStatus,
          createdAt: c.createdAt
        })),
        pagination: { total, page: Number(page), pageSize: Number(pageSize) }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/comment/:id
  async getCommentDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const commentId = Number(req.params.id);

      const comment = await prisma.commentInfo.findUnique({
        where: { id: commentId },
        include: {
          user: { select: { nickname: true, avatar: true } },
          poi: { select: { id: true, poiName: true, district: { select: { name: true } } } },
          route: { select: { id: true, routeName: true } }
        }
      });

      if (!comment) {
        return errorResponse(res, '评论不存在', 70006);
      }

      // 获取举报详情
      const reports = await prisma.reportRecord.findMany({
        where: { targetType: 'comment', targetId: commentId },
        include: {
          reporter: { select: { nickname: true, avatar: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      return successResponse(res, {
        id: comment.id,
        userNickname: comment.user.nickname || '匿名用户',
        userAvatar: comment.user.avatar,
        poiId: comment.poi.id,
        poiName: (comment.poi.poiName as any)?.zh || '未命名',
        poiDistrict: comment.poi.district?.name,
        routeName: comment.route ? (comment.route.routeName as any)?.zh : null,
        rating: Number(comment.rating),
        content: comment.content,
        images: comment.images,
        isReported: comment.isReported,
        auditStatus: comment.auditStatus,
        createdAt: comment.createdAt,
        reports: reports.map(r => ({
          id: r.id,
          reporterNickname: r.reporter?.nickname || '匿名用户',
          reason: r.reason,
          evidence: r.evidence,
          status: r.status,
          createdAt: r.createdAt
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/gov/comment/:id/audit
  async auditComment(req: Request, res: Response, next: NextFunction) {
    try {
      const commentId = Number(req.params.id);
      const govId = (req as any).user.id;
      const { action, remark } = req.body; // action: approve（放行）| reject（违规）

      const comment = await prisma.commentInfo.findUnique({ where: { id: commentId } });
      if (!comment) {
        return errorResponse(res, '评论不存在', 70006);
      }

      if (action === 'approve') {
        // 放行：审核通过，正常展示
        await prisma.$transaction([
          prisma.commentInfo.update({
            where: { id: commentId },
            data: { auditStatus: 3 }
          }),
          prisma.governmentReview.create({
            data: {
              reviewerId: govId,
              targetType: 'comment',
              targetId: commentId,
              action: 'approve',
              remark
            }
          })
        ]);
        return successResponse(res, { message: '评论已放行' });

      } else if (action === 'reject') {
        // 违规：审核拒绝，隐藏
        await prisma.$transaction([
          prisma.commentInfo.update({
            where: { id: commentId },
            data: { auditStatus: 2 }
          }),
          prisma.governmentReview.create({
            data: {
              reviewerId: govId,
              targetType: 'comment',
              targetId: commentId,
              action: 'reject',
              remark
            }
          })
        ]);
        return successResponse(res, { message: '评论已标记为违规' });
      } else {
        return errorResponse(res, '无效的审核操作', 400);
      }
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/comment/audit/history
  async getCommentAuditHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, pageSize = 20 } = req.query;

      const [reviews, total] = await Promise.all([
        prisma.governmentReview.findMany({
          where: { targetType: 'comment' },
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize)
        }),
        prisma.governmentReview.count({ where: { targetType: 'comment' } })
      ]);

      const commentIds = reviews.map(r => r.targetId);
      const comments = await prisma.commentInfo.findMany({
        where: { id: { in: commentIds } },
        select: { id: true, content: true, rating: true }
      });
      const commentMap = new Map(comments.map(c => [c.id, c.content.slice(0, 50)]));

      const reviewerIds = reviews.map(r => r.reviewerId);
      const reviewers = await prisma.government.findMany({
        where: { id: { in: reviewerIds } },
        select: { id: true, realName: true }
      });
      const reviewerMap = new Map(reviewers.map(r => [r.id, r.realName || '未知']));

      return successResponse(res, {
        list: reviews.map(r => ({
          id: r.id,
          commentId: r.targetId,
          commentPreview: commentMap.get(r.targetId) || '',
          rating: comments.find(c => c.id === r.targetId)?.rating || 0,
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

  // =============================================
  // 举报管理
  // =============================================

  // GET /api/gov/report/list
  async getReportList(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetType, status, page = 1, pageSize = 20 } = req.query;

      const where: any = {};
      if (targetType !== undefined && targetType !== '') where.targetType = targetType;
      if (status !== undefined && status !== '') {
        where.status = Number(status);
      } else {
        where.status = 0; // 默认待处理
      }

      const [list, total] = await Promise.all([
        prisma.reportRecord.findMany({
          where,
          include: {
            reporter: { select: { nickname: true, avatar: true } }
          },
          orderBy: [
            { createdAt: 'desc' }
          ],
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize)
        }),
        prisma.reportRecord.count({ where })
      ]);

      // 获取被举报内容
      const commentIds = list.filter(l => l.targetType === 'comment').map(l => l.targetId);
      const poiIds = list.filter(l => l.targetType === 'poi').map(l => l.targetId);

      const [comments, pois] = await Promise.all([
        commentIds.length > 0
          ? prisma.commentInfo.findMany({
              where: { id: { in: commentIds } },
              select: { id: true, content: true, poiId: true }
            })
          : [],
        poiIds.length > 0
          ? prisma.poiInfo.findMany({
              where: { id: { in: poiIds } },
              select: { id: true, poiName: true }
            })
          : []
      ]);

      const commentMap = new Map(comments.map(c => [c.id, c.content.slice(0, 80)]));
      const poiMap = new Map(pois.map(p => [p.id, (p.poiName as any)?.zh || '未命名']));

      return successResponse(res, {
        list: list.map(r => ({
          id: r.id,
          reporterNickname: r.reporter?.nickname || '匿名用户',
          reporterAvatar: r.reporter?.avatar,
          targetType: r.targetType,
          targetId: r.targetId,
          targetPreview: r.targetType === 'comment'
            ? commentMap.get(r.targetId)
            : poiMap.get(r.targetId),
          reason: r.reason,
          evidence: r.evidence,
          status: r.status,
          createdAt: r.createdAt
        })),
        pagination: { total, page: Number(page), pageSize: Number(pageSize) }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/report/:id
  async getReportDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const reportId = Number(req.params.id);

      const report = await prisma.reportRecord.findUnique({
        where: { id: reportId },
        include: {
          reporter: { select: { nickname: true, avatar: true } }
        }
      });

      if (!report) {
        return errorResponse(res, '举报不存在', 70007);
      }

      // 获取被举报内容详情
      let targetDetail: any = null;
      if (report.targetType === 'comment') {
        const comment = await prisma.commentInfo.findUnique({
          where: { id: report.targetId },
          include: {
            user: { select: { nickname: true } },
            poi: { select: { poiName: true } }
          }
        });
        if (comment) {
          targetDetail = {
            type: 'comment',
            id: comment.id,
            userNickname: comment.user.nickname || '匿名用户',
            poiName: (comment.poi.poiName as any)?.zh,
            rating: Number(comment.rating),
            content: comment.content,
            images: comment.images,
            auditStatus: comment.auditStatus
          };
        }
      } else if (report.targetType === 'poi') {
        const poi = await prisma.poiInfo.findUnique({ where: { id: report.targetId } });
        if (poi) {
          targetDetail = {
            type: 'poi',
            id: poi.id,
            poiName: (poi.poiName as any)?.zh,
            status: poi.status
          };
        }
      }

      return successResponse(res, {
        id: report.id,
        reporterNickname: report.reporter?.nickname || '匿名用户',
        reporterAvatar: report.reporter?.avatar,
        targetType: report.targetType,
        reason: report.reason,
        evidence: report.evidence,
        status: report.status,
        handlerId: report.handlerId,
        handleResult: report.handleResult,
        handleTime: report.handleTime,
        createdAt: report.createdAt,
        targetDetail
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/gov/report/:id/handle
  async handleReport(req: Request, res: Response, next: NextFunction) {
    try {
      const reportId = Number(req.params.id);
      const govId = (req as any).user.id;
      const { action, handleResult } = req.body;
      // action: valid（有效举报）/ invalid（无效举报）
      // 同时可联动操作：delete_comment / warn_user / ban_merchant / none

      const report = await prisma.reportRecord.findUnique({ where: { id: reportId } });
      if (!report) {
        return errorResponse(res, '举报不存在', 70007);
      }

      if (action === 'valid') {
        // 有效举报：处理目标 + 更新举报状态
        if (report.targetType === 'comment') {
          await prisma.commentInfo.update({
            where: { id: report.targetId },
            data: { auditStatus: 2 } // 标记为违规
          });
        }
        // 其他联动操作可在后续扩展
      }
      // action === 'invalid' 时只更新举报状态，不处理目标

      await prisma.reportRecord.update({
        where: { id: reportId },
        data: {
          status: 1,
          handlerId: govId,
          handleResult: handleResult || (action === 'valid' ? '举报有效，已处理' : '举报无效'),
          handleTime: new Date()
        }
      });

      return successResponse(res, { message: '举报已处理' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/report/history
  async getReportHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, pageSize = 20 } = req.query;

      const [list, total] = await Promise.all([
        prisma.reportRecord.findMany({
          where: { status: { not: 0 } },
          include: {
            reporter: { select: { nickname: true } },
            handler: { select: { realName: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize)
        }),
        prisma.reportRecord.count({ where: { status: { not: 0 } } })
      ]);

      return successResponse(res, {
        list: list.map(r => ({
          id: r.id,
          targetType: r.targetType,
          targetId: r.targetId,
          reason: r.reason,
          reporterNickname: r.reporter?.nickname || '匿名用户',
          status: r.status,
          handlerName: r.handler?.realName || '未知',
          handleResult: r.handleResult,
          handleTime: r.handleTime,
          createdAt: r.createdAt
        })),
        pagination: { total, page: Number(page), pageSize: Number(pageSize) }
      });
    } catch (err) {
      next(err);
    }
  }
}
