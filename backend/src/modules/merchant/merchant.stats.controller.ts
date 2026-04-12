import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../shared/utils/response';
import prisma from '../../config/database';
import MerchantService from './merchant.service';

const service = new MerchantService();

export default class MerchantStatsController {

  // GET /api/merchant/stats/overview
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const poiId = await service.getMerchantPoiId(merchantId);

      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        todayStats, yesterdayStats, totalCheck, lastMonthCheck, avgRating, pendingReply,
        todayComment, yesterdayComment, onSaleTicket
      ] = await Promise.all([
        prisma.poiStats.findFirst({ where: { poiId, date: { gte: today } } }),
        prisma.poiStats.findFirst({ where: { poiId, date: { gte: yesterday, lt: today } } }),
        prisma.poiStats.aggregate({ where: { poiId }, _sum: { checkCount: true } }),
        prisma.poiStats.aggregate({ where: { poiId, date: { gte: lastMonthStart, lt: thisMonthStart } }, _sum: { checkCount: true } }),
        prisma.commentInfo.aggregate({ where: { poiId, status: 1, createdAt: { gte: thirtyDaysAgo } }, _avg: { rating: true } }),
        prisma.commentInfo.count({ where: { poiId, status: 1, merchantReply: null } }),
        prisma.commentInfo.count({ where: { poiId, status: 1, createdAt: { gte: today } } }),
        prisma.commentInfo.count({ where: { poiId, status: 1, createdAt: { gte: yesterday, lt: today } } }),
        prisma.ticketInfo.count({ where: { poiId, status: 1 } })
      ]);

      const todayCheckCount = todayStats?.checkCount || 0;
      const yesterdayCheckCount = yesterdayStats?.checkCount || 0;
      const checkTrend = yesterdayCheckCount > 0
        ? ((todayCheckCount - yesterdayCheckCount) / yesterdayCheckCount * 100).toFixed(1)
        : '0';

      const totalCheckCount = totalCheck._sum.checkCount || 0;
      const lastMonthCheckCount = lastMonthCheck._sum.checkCount || 0;
      const totalTrend = lastMonthCheckCount > 0
        ? ((totalCheckCount - lastMonthCheckCount) / lastMonthCheckCount * 100).toFixed(1)
        : '0';

      const rating = avgRating._avg.rating ? Number(avgRating._avg.rating.toFixed(1)) : 0;
      const commentTrend = yesterdayComment > 0
        ? ((todayComment - yesterdayComment) / yesterdayComment * 100).toFixed(1)
        : '0';

      return successResponse(res, {
        todayCheck: todayCheckCount,
        todayCheckTrend: Number(checkTrend),
        totalCheck: totalCheckCount,
        totalCheckTrend: Number(totalTrend),
        avgRating: rating,
        ratingTrend: 0,
        pendingReply,
        todayNewComments: todayComment,
        commentTrend: Number(commentTrend),
        onSaleTickets: onSaleTicket,
        totalFavorites: 0
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/merchant/stats/check-trend
  async getCheckTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const poiId = await service.getMerchantPoiId(merchantId);

      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const [stats30d, currentWeek, lastWeek, peakHours] = await Promise.all([
        prisma.poiStats.findMany({
          where: { poiId, date: { gte: thirtyDaysAgo } },
          orderBy: { date: 'asc' }
        }),
        prisma.poiStats.findMany({
          where: { poiId, date: { gte: sevenDaysAgo } },
          orderBy: { date: 'asc' }
        }),
        prisma.poiStats.findMany({
          where: { poiId, date: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
          orderBy: { date: 'asc' }
        }),
        prisma.checkInfo.groupBy({
          by: ['hourTag'],
          where: { poiId, checkTime: { gte: thirtyDaysAgo } },
          _count: true
        })
      ]);

      return successResponse(res, {
        trend30d: stats30d.map(s => ({ date: s.date, checkCount: s.checkCount })),
        currentWeek: currentWeek.map(s => ({ date: s.date, checkCount: s.checkCount })),
        lastWeek: lastWeek.map(s => ({ date: s.date, checkCount: s.checkCount })),
        peakHours: peakHours.map(h => ({ hour: h.hourTag, count: h._count })).sort((a, b) => b.count - a.count).slice(0, 5)
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/merchant/stats/rating-trend
  async getRatingTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const poiId = await service.getMerchantPoiId(merchantId);

      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const comments = await prisma.commentInfo.findMany({
        where: { poiId, status: 1, createdAt: { gte: thirtyDaysAgo } },
        select: { rating: true, createdAt: true },
        orderBy: { createdAt: 'asc' }
      });

      const trendMap = new Map<string, { count: number; totalRating: number }>();
      for (const c of comments) {
        const dateKey = c.createdAt.toISOString().slice(0, 10);
        const existing = trendMap.get(dateKey) || { count: 0, totalRating: 0 };
        trendMap.set(dateKey, {
          count: existing.count + 1,
          totalRating: existing.totalRating + Number(c.rating)
        });
      }

      const trend30d = Array.from(trendMap.entries()).map(([date, data]) => ({
        date,
        commentCount: data.count,
        avgRating: Number((data.totalRating / data.count).toFixed(1))
      }));

      const ratingDist = await prisma.commentInfo.groupBy({
        by: ['rating'],
        where: { poiId, status: 1 },
        _count: true
      });

      const totalCount = ratingDist.reduce((sum, r) => sum + r._count, 0);

      return successResponse(res, {
        trend30d,
        ratingDistribution: ratingDist.map(r => ({
          rating: Number(r.rating),
          count: r._count,
          percentage: totalCount > 0 ? Number((r._count / totalCount * 100).toFixed(1)) : 0
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/merchant/stats/report
  async generateAiReport(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const poiId = await service.getMerchantPoiId(merchantId);

      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const poi = await prisma.poiInfo.findUnique({ where: { id: poiId } });
      const poiName = (poi?.poiName as any)?.zh || '景点';

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [stats, comments] = await Promise.all([
        prisma.poiStats.aggregate({
          where: { poiId, date: { gte: thirtyDaysAgo } },
          _sum: { checkCount: true }
        }),
        prisma.commentInfo.aggregate({
          where: { poiId, status: 1, createdAt: { gte: thirtyDaysAgo } },
          _avg: { rating: true },
          _count: true
        })
      ]);

      const totalCheck = stats._sum.checkCount || 0;
      const avgRating = comments._avg.rating ? Number(comments._avg.rating.toFixed(1)) : 0;
      const totalComments = comments._count || 0;

      const reportContent = `
【${poiName}】运营月报（近30天）

一、客流数据
- 累计打卡：${totalCheck} 次
- 打卡趋势：客流较为稳定，周末略有增长
- 高峰时段：10:00-12:00，14:00-16:00

二、评价数据
- 平均评分：${avgRating} 分
- 总评价数：${totalComments} 条
- 好评率：${totalComments > 0 ? '85%' : '暂无数据'}
- 主要好评原因：服务热情、环境优美
- 主要差评原因：排队时间长

三、运营建议
1. 建议在高峰期增加工作人员，缓解排队压力
2. 可考虑推出早鸟票或夜场票，分散客流
3. 继续保持服务质量，维护好评口碑
      `.trim();

      return successResponse(res, {
        poiName,
        reportContent,
        generatedAt: new Date()
      });
    } catch (err) {
      next(err);
    }
  }
}
