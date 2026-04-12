import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../shared/utils/response';
import prisma from '../../config/database';

export default class GovernmentStatsController {

  /**
   * 热力图相关接口统一解析时间范围（北京时间 UTC+8）。
   * 前端 period=today 时必须只查「当天 0 点～23:59:59」；未识别时原先默认 30 天会误把历史打卡算进来。
   */
  private resolveHeatmapPeriodRange(query: Request['query']): { start: Date; end: Date } {
    const period = String(query.period || '30d');
    const sd = query.startDate;
    const ed = query.endDate;
    const startDate = (Array.isArray(sd) ? sd[0] : sd) as string | undefined;
    const endDate = (Array.isArray(ed) ? ed[0] : ed) as string | undefined;

    if (startDate && endDate) {
      return { start: new Date(startDate), end: new Date(endDate) };
    }

    // 北京时间 (UTC+8) 当天的起止
    const nowUtc = Date.now();
    const offsetMs = 8 * 60 * 60 * 1000;
    const getBeijingYMD = (ts: number) => {
      const d = new Date(ts + offsetMs);
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, day: d.getUTCDate() };
    };
    const makeBeijingDay = (y: number, m: number, day: number, h: number, min: number, s: number, ms: number) =>
      new Date(y, m - 1, day, h, min, s, ms);

    const todayBeijing = getBeijingYMD(nowUtc);
    const todayStartBeijing = makeBeijingDay(todayBeijing.y, todayBeijing.m, todayBeijing.day, 0, 0, 0, 0);
    const todayEndBeijing = makeBeijingDay(todayBeijing.y, todayBeijing.m, todayBeijing.day, 23, 59, 59, 999);

    if (period === 'today') {
      return { start: todayStartBeijing, end: todayEndBeijing };
    }

    if (period === '7d' || period === '90d') {
      const days = period === '7d' ? 7 : 90;
      return { start: new Date(nowUtc - days * 86400000), end: new Date(nowUtc) };
    }

    // 默认 30d
    return {
      start: new Date(nowUtc - 30 * 86400000),
      end: new Date(nowUtc)
    };
  }

  // GET /api/gov/stats/overview
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);

      const [
        totalPoi, activePoi, todayPoiAudit,
        totalMerchant, activeMerchant,
        totalUser, newUserMonth, newUserLastMonth,
        todayCheck, yesterdayCheck,
        totalCheck, lastYearCheck,
        totalComment, monthComment, lastMonthComment,
        pendingAudit, avgRating,
        todayCheckCount, todayComment, todayNewMerchant
      ] = await Promise.all([
        prisma.poiInfo.count(),
        prisma.poiInfo.count({ where: { status: 1 } }),
        prisma.poiAuditQueue.count({ where: { status: 0 } }),
        prisma.merchant.count(),
        prisma.merchant.count({ where: { status: 1 } }),
        prisma.user.count(),
        prisma.user.count({ where: { createdAt: { gte: thisMonthStart } } }),
        prisma.user.count({ where: { createdAt: { gte: lastMonthStart, lt: thisMonthStart } } }),
        prisma.poiStats.aggregate({ where: { date: today }, _sum: { checkCount: true } }),
        prisma.poiStats.aggregate({ where: { date: { gte: yesterday, lt: today } }, _sum: { checkCount: true } }),
        prisma.poiStats.aggregate({ _sum: { checkCount: true } }),
        prisma.poiStats.aggregate({ where: { date: { gte: lastYearStart } }, _sum: { checkCount: true } }),
        prisma.commentInfo.count({ where: { status: { in: [1, 3] } } }),
        prisma.commentInfo.count({ where: { status: { in: [1, 3] }, createdAt: { gte: thisMonthStart } } }),
        prisma.commentInfo.count({ where: { status: { in: [1, 3] }, createdAt: { gte: lastMonthStart, lt: thisMonthStart } } }),
        prisma.poiAuditQueue.count({ where: { status: 0 } }),
        prisma.commentInfo.aggregate({ where: { status: { in: [1, 3] } }, _avg: { rating: true } }),
        prisma.checkInfo.count({ where: { checkTime: { gte: today } } }),
        prisma.commentInfo.count({ where: { createdAt: { gte: today }, status: 1 } }),
        prisma.merchant.count({ where: { createdAt: { gte: today } } })
      ]);

      const todayCheckNum = todayCheck._sum.checkCount || 0;
      const yesterdayCheckNum = yesterdayCheck._sum.checkCount || 0;
      const checkTrend = yesterdayCheckNum > 0
        ? Number(((todayCheckNum - yesterdayCheckNum) / yesterdayCheckNum * 100).toFixed(1))
        : 0;

      const newUserTrend = lastMonthComment > 0
        ? Number(((newUserMonth - newUserLastMonth) / newUserLastMonth * 100).toFixed(1))
        : 0;

      return successResponse(res, {
        poi: { total: totalPoi, active: activePoi, todayAudit: todayPoiAudit },
        merchant: { total: totalMerchant, active: activeMerchant },
        user: { total: totalUser, newThisMonth: newUserMonth, newTrend: newUserTrend },
        check: { today: todayCheckNum, total: totalCheck._sum.checkCount || 0, checkTrend },
        comment: { total: totalComment, monthNew: monthComment, pendingAudit, avgRating: avgRating._avg.rating ? Number(avgRating._avg.rating.toFixed(1)) : 0 },
        todayHighlight: { newCheck: todayCheckCount, newComment: todayComment, newMerchant: todayNewMerchant }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/stats/check-trend
  async getCheckTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const { period = '30d' } = req.query;
      let days = 30;
      if (period === '7d') days = 7;
      else if (period === '90d') days = 90;

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await prisma.poiStats.findMany({
        where: { date: { gte: startDate } },
        orderBy: { date: 'asc' }
      });

      const dateMap = new Map<string, number>();
      for (const s of stats) {
        const dateKey = s.date.toISOString().slice(0, 10);
        dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + s.checkCount);
      }

      const trend = Array.from(dateMap.entries()).map(([date, count]) => ({ date, checkCount: count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const peakHours = await prisma.checkInfo.groupBy({
        by: ['hourTag'],
        where: { checkTime: { gte: startDate } },
        _count: true,
        orderBy: { _count: { hourTag: 'desc' } },
        take: 5
      });

      return successResponse(res, {
        trend,
        period,
        peakHours: peakHours.map(h => ({ hour: h.hourTag, count: h._count }))
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/stats/rating-distribution
  async getRatingDistribution(req: Request, res: Response, next: NextFunction) {
    try {
      const [overall, last30d] = await Promise.all([
        prisma.commentInfo.groupBy({ by: ['rating'], where: { status: { in: [1, 3] } }, _count: true }),
        prisma.commentInfo.groupBy({
          by: ['rating'],
          where: { status: { in: [1, 3] }, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
          _count: true
        })
      ]);

      const totalOverall = overall.reduce((sum, r) => sum + r._count, 0);
      const totalLast30d = last30d.reduce((sum, r) => sum + r._count, 0);

      return successResponse(res, {
        overall: overall.map(r => ({ rating: Number(r.rating), count: r._count, percentage: totalOverall > 0 ? Number((r._count / totalOverall * 100).toFixed(1)) : 0 })),
        last30d: last30d.map(r => ({ rating: Number(r.rating), count: r._count, percentage: totalLast30d > 0 ? Number((r._count / totalLast30d * 100).toFixed(1)) : 0 }))
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/stats/poi-ranking
  async getPoiRanking(req: Request, res: Response, next: NextFunction) {
    try {
      const { type = 'check', period = '30d', limit = 10 } = req.query;
      let days = 30;
      if (period === '7d') days = 7;
      else if (period === '90d') days = 90;

      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await prisma.poiStats.findMany({
        where: { date: { gte: startDate } },
        include: { poi: { select: { id: true, poiName: true, district: { select: { name: true } }, status: true } } }
      });

      const poiAgg = new Map<number, { poiId: number; poiName: string; district: string; checkCount: number; ratingSum: number; ratingCount: number }>();
      for (const s of stats) {
        const p = s.poi;
        const name = (p.poiName as any)?.zh || '未命名';
        if (!poiAgg.has(s.poiId)) {
          poiAgg.set(s.poiId, { poiId: s.poiId, poiName: name, district: p.district?.name || '', checkCount: 0, ratingSum: 0, ratingCount: 0 });
        }
        poiAgg.get(s.poiId)!.checkCount += s.checkCount;
      }

      const poiIds = Array.from(poiAgg.keys());
      const ratings = await prisma.commentInfo.groupBy({
        by: ['poiId'],
        where: { poiId: { in: poiIds }, status: { in: [1, 3] }, createdAt: { gte: startDate } },
        _avg: { rating: true }
      });
      for (const r of ratings) {
        if (poiAgg.has(r.poiId)) {
          poiAgg.get(r.poiId)!.ratingSum += r._avg.rating ? Number(r._avg.rating) * 1 : 0;
          poiAgg.get(r.poiId)!.ratingCount += 1;
        }
      }

      const ranking = Array.from(poiAgg.values()).map(p => ({
        poiId: p.poiId,
        poiName: p.poiName,
        district: p.district,
        checkCount: p.checkCount,
        avgRating: p.ratingCount > 0 ? Number((p.ratingSum / p.ratingCount).toFixed(1)) : 0
      }));

      if (type === 'check') ranking.sort((a, b) => b.checkCount - a.checkCount);
      else ranking.sort((a, b) => b.avgRating - a.avgRating);

      return successResponse(res, { ranking: ranking.slice(0, Number(limit)), type, period });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/stats/daily-stats
  async getDailyStats(req: Request, res: Response, next: NextFunction) {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats = await prisma.analyticsDaily.findMany({
        where: { date: { gte: startDate } },
        orderBy: { date: 'asc' }
      });

      return successResponse(res, {
        dailyStats: stats.map(s => ({
          date: s.date,
          newUser: s.newUser,
          newCheck: s.newCheck,
          newComment: s.newComment,
          avgRating: s.avgRating ? Number(s.avgRating.toFixed(1)) : 0
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/stats/check-heatmap
  async getCheckHeatmap(req: Request, res: Response, next: NextFunction) {
    try {
      const { period = '30d', dimension = 'all', dimensionValue } = req.query;
      const { start, end } = this.resolveHeatmapPeriodRange(req.query);

      let stats: { poiId: number; _count: number }[] = [];

      // day 维度需要原生 SQL 提取 DAY()
      if (dimension === 'day' && dimensionValue !== undefined) {
        const dayNum = Number(dimensionValue);
        const rawStats = await prisma.$queryRaw<{ poi_id: number; check_count: BigInt }[]>`
          SELECT poi_id, COUNT(*) as check_count
          FROM check_info
          WHERE check_time >= ${start} AND check_time <= ${end}
            AND DAY(day_tag) = ${dayNum}
          GROUP BY poi_id
        `;
        stats = rawStats.map(r => ({ poiId: r.poi_id, _count: Number(r.check_count) }));
      } else {
        const where: any = { checkTime: { gte: start, lte: end } };
        if (dimension === 'hour' && dimensionValue !== undefined) where.hourTag = Number(dimensionValue);
        else if (dimension === 'week' && dimensionValue !== undefined) where.weekTag = Number(dimensionValue);
        else if (dimension === 'month' && dimensionValue !== undefined) where.monthTag = Number(dimensionValue);
        else if (dimension === 'year' && dimensionValue !== undefined) where.yearTag = Number(dimensionValue);

        const grouped = await prisma.checkInfo.groupBy({ by: ['poiId'], where, _count: true });
        stats = grouped.map(g => ({ poiId: g.poiId, _count: g._count }));
      }

      const poiIds = stats.map(s => s.poiId);
      if (poiIds.length === 0) {
        return successResponse(res, {
          dimension: dimension as string,
          dimensionValue: dimensionValue as string || null,
          dimensionLabel: this.getDimensionLabel(dimension as string, dimensionValue as string),
          period: period as string,
          list: [], total: 0, maxCount: 0
        });
      }

      // 限制最多200个POI
      const limitedStats = stats.sort((a, b) => b._count - a._count).slice(0, 200);
      const limitedPoiIds = limitedStats.map(s => s.poiId);

      const pois = await prisma.poiInfo.findMany({
        where: { id: { in: limitedPoiIds }, status: 1 },
        select: { id: true, poiName: true, longitude: true, latitude: true, district: { select: { name: true } } }
      });
      const poiMap = new Map(pois.map(p => [p.id, p]));

      const ratings = await prisma.commentInfo.groupBy({
        by: ['poiId'],
        where: { poiId: { in: limitedPoiIds }, status: { in: [1, 3] } },
        _avg: { rating: true }
      });
      const ratingMap = new Map(ratings.map(r => [r.poiId, r._avg.rating || 0]));

      const list = limitedStats.map(s => {
        const poi = poiMap.get(s.poiId);
        if (!poi) return null;
        return {
          poiId: s.poiId,
          poiName: (poi.poiName as any)?.zh || '未命名',
          lng: Number(poi.longitude),
          lat: Number(poi.latitude),
          checkCount: s._count,
          rating: ratingMap.get(s.poiId) ? Number(ratingMap.get(s.poiId)!.toFixed(1)) : 0,
          district: poi.district?.name || ''
        };
      }).filter(Boolean);

      const maxCount = list.length > 0 ? Math.max(...list.map(l => (l as any).checkCount)) : 0;

      return successResponse(res, {
        dimension: dimension as string,
        dimensionValue: dimensionValue as string || null,
        dimensionLabel: this.getDimensionLabel(dimension as string, dimensionValue as string),
        period: period as string,
        list, total: list.length, maxCount
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/stats/check-heatmap/dimensions
  async getCheckHeatmapDimensions(req: Request, res: Response, next: NextFunction) {
    try {
      const { period = '30d', dimension = 'week' } = req.query;
      const { start, end } = this.resolveHeatmapPeriodRange(req.query);

      let groupByField: 'hourTag' | 'weekTag' | 'monthTag' | 'yearTag' | 'dayTag' = 'weekTag';
      if (dimension === 'hour') groupByField = 'hourTag';
      else if (dimension === 'month') groupByField = 'monthTag';
      else if (dimension === 'year') groupByField = 'yearTag';
      else if (dimension === 'day') groupByField = 'dayTag';

      const stats = await prisma.checkInfo.groupBy({
        by: [groupByField],
        where: { checkTime: { gte: start, lte: end } },
        _count: true
      });

      const labels: Record<string, Record<number, string>> = {
        week: { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日' },
        hour: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i, `${i}点`])),
        month: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, `${i + 1}月`])),
      };

      const distribution = stats.map(s => ({
        value: (s as any)[groupByField],
        label: labels[dimension as string]?.[(s as any)[groupByField]] || String((s as any)[groupByField]),
        count: s._count
      })).sort((a, b) => {
        if (['day', 'month', 'hour'].includes(dimension as string)) return a.value - b.value;
        return a.value - b.value;
      });

      return successResponse(res, { dimension, distribution });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/stats/check-heatmap/district
  async getCheckHeatmapDistrict(req: Request, res: Response, next: NextFunction) {
    try {
      const { period = '30d', dimension, dimensionValue } = req.query;
      const { start, end } = this.resolveHeatmapPeriodRange(req.query);

      const whereCondition: any = { checkTime: { gte: start, lte: end } };
      if (dimension === 'hour' && dimensionValue !== undefined) whereCondition.hourTag = Number(dimensionValue);
      else if (dimension === 'week' && dimensionValue !== undefined) whereCondition.weekTag = Number(dimensionValue);
      else if (dimension === 'month' && dimensionValue !== undefined) whereCondition.monthTag = Number(dimensionValue);
      else if (dimension === 'year' && dimensionValue !== undefined) whereCondition.yearTag = Number(dimensionValue);

      const stats = await prisma.checkInfo.groupBy({ by: ['poiId'], where: whereCondition, _count: true });
      const poiIds = stats.map(s => s.poiId);

      const pois = await prisma.poiInfo.findMany({
        where: { id: { in: poiIds }, status: 1 },
        select: { id: true, district: { select: { id: true, name: true } } }
      });

      const districtMap = new Map<string, { districtId: number; districtName: string; count: number; poiIds: number[] }>();
      for (const s of stats) {
        const poi = pois.find(p => p.id === s.poiId);
        if (!poi || !poi.district) continue;
        if (!districtMap.has(poi.district.name)) {
          districtMap.set(poi.district.name, { districtId: poi.district.id, districtName: poi.district.name, count: 0, poiIds: [] });
        }
        districtMap.get(poi.district.name)!.count += s._count;
        districtMap.get(poi.district.name)!.poiIds.push(s.poiId);
      }

      const total = Array.from(districtMap.values())
        .map(d => ({ districtId: d.districtId, districtName: d.districtName, count: d.count, poiCount: d.poiIds.length }))
        .sort((a, b) => b.count - a.count);

      const maxCount = total.length > 0 ? total[0].count : 0;
      const overallCount = total.reduce((sum, d) => sum + d.count, 0);

      return successResponse(res, {
        dimension, dimensionValue, period, total, overallCount, maxCount,
        breakdown: total.map(d => ({ ...d, percentage: overallCount > 0 ? Number((d.count / overallCount * 100).toFixed(1)) : 0 }))
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/stats/check-heatmap/compare
  async getCheckHeatmapCompare(req: Request, res: Response, next: NextFunction) {
    try {
      const { dimension = 'week', valueA, valueB, period = '30d' } = req.query;
      const { start: rangeStart, end: rangeEnd } = this.resolveHeatmapPeriodRange(req.query);

      const fetchData = async (dimValue: string) => {
        const whereCondition: any = {
          checkTime: {
            gte: rangeStart,
            lte: rangeEnd
          }
        };

        if (dimension === 'hour') whereCondition.hourTag = Number(dimValue);
        else if (dimension === 'week') whereCondition.weekTag = Number(dimValue);
        else if (dimension === 'month') whereCondition.monthTag = Number(dimValue);
        else if (dimension === 'year') whereCondition.yearTag = Number(dimValue);
        else if (dimension === 'day') {
          const dayNum = Number(dimValue);
          const rawStats = await prisma.$queryRaw<{ poi_id: number; check_count: BigInt }[]>`
            SELECT poi_id, COUNT(*) as check_count FROM check_info
            WHERE check_time >= ${whereCondition.checkTime.gte} AND check_time <= ${whereCondition.checkTime.lte}
              AND DAY(day_tag) = ${dayNum} GROUP BY poi_id
          `;
          return rawStats.map(r => ({ poiId: r.poi_id, checkCount: Number(r.check_count) }));
        }

        const stats = await prisma.checkInfo.groupBy({ by: ['poiId'], where: whereCondition, _count: true });
        return stats.map(s => ({ poiId: s.poiId, checkCount: s._count }));
      };

      const [dataA, dataB] = await Promise.all([fetchData(valueA as string), fetchData(valueB as string)]);

      const poiIds = new Set([...dataA.map(d => d.poiId), ...dataB.map(d => d.poiId)]);
      const pois = await prisma.poiInfo.findMany({
        where: { id: { in: Array.from(poiIds) }, status: 1 },
        select: { id: true, poiName: true, longitude: true, latitude: true, district: { select: { id: true, name: true } } }
      });
      const poiMap = new Map(pois.map(p => [p.id, p]));

      const poiResultMap = new Map<number, any>();
      for (const d of dataA) {
        const poi = poiMap.get(d.poiId);
        if (!poi) continue;
        poiResultMap.set(d.poiId, {
          poiId: d.poiId, poiName: (poi.poiName as any)?.zh || '未命名',
          lng: Number(poi.longitude), lat: Number(poi.latitude),
          district: poi.district?.name || '未知',
          countA: d.checkCount, countB: 0, diff: d.checkCount, changeRate: 0
        });
      }
      for (const d of dataB) {
        if (poiResultMap.has(d.poiId)) {
          const existing = poiResultMap.get(d.poiId)!;
          const diff = d.checkCount - existing.countA;
          existing.countB = d.checkCount;
          existing.diff = diff;
          existing.changeRate = existing.countA > 0 ? Number((diff / existing.countA * 100).toFixed(1)) : 0;
        } else {
          const poi = poiMap.get(d.poiId);
          if (!poi) continue;
          poiResultMap.set(d.poiId, {
            poiId: d.poiId, poiName: (poi.poiName as any)?.zh || '未命名',
            lng: Number(poi.longitude), lat: Number(poi.latitude),
            district: poi.district?.name || '未知',
            countA: 0, countB: d.checkCount, diff: d.checkCount, changeRate: 0
          });
        }
      }

      return successResponse(res, {
        dimension, valueA, valueB,
        valueALabel: this.getDimensionLabel(dimension as string, valueA as string),
        valueBLabel: this.getDimensionLabel(dimension as string, valueB as string),
        period,
        list: Array.from(poiResultMap.values()).sort((a, b) => b.diff - a.diff)
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/stats/export
  async exportStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      if (type === 'poi') {
        const pois = await prisma.poiInfo.findMany({
          where: { createdAt: { gte: start, lte: end } },
          include: { poiTags: { include: { tag: true } } }
        });
        return successResponse(res, {
          filename: `poi-export-${Date.now()}.csv`,
          data: pois.map(p => ({ name: (p.poiName as any)?.zh, district: p.district?.name, status: p.status, createdAt: p.createdAt }))
        });
      } else if (type === 'merchant') {
        const merchants = await prisma.merchant.findMany({ where: { createdAt: { gte: start, lte: end } } });
        return successResponse(res, {
          filename: `merchant-export-${Date.now()}.csv`,
          data: merchants.map(m => ({ name: m.merchantName, category: m.merchantCategory, status: m.status, createdAt: m.createdAt }))
        });
      }
      return errorResponse(res, '不支持的导出类型', 400);
    } catch (err) {
      next(err);
    }
  }

  // 辅助方法：获取维度标签
  private getDimensionLabel(dimension: string, value?: string | null): string {
    if (!value) return '不限';
    const v = Number(value);
    const labels: Record<string, Record<number, string>> = {
      hour: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i, `${i}时`])),
      week: { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日' },
      month: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, `${i + 1}月`])),
    };
    if (dimension === 'year') return `${v}年`;
    if (dimension === 'day') return `每月${v}日`;
    return labels[dimension]?.[v] || String(value);
  }
}
