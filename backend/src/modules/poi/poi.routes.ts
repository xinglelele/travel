import { Router } from 'express'
import { requiredAuth, optionalAuth } from '../../shared/middleware/auth'
import { prisma } from '../../config'
import { userService } from '../user/user.service'
import { poiRecommendService } from './poi.service'
import { generateRoute } from './poi.route.service'
import { normalizeUrl } from '../../shared/utils/url'

const router = Router()

// POI 数据结构转换
function transformPoi(poi: any) {
  let images = ['/static/logo.png']
  if (poi.photos) {
    try {
      const photos = typeof poi.photos === 'string' ? JSON.parse(poi.photos) : poi.photos
      images = Array.isArray(photos) && photos.length > 0
        ? photos.map((p: string) => normalizeUrl(p))
        : ['/static/logo.png']
    } catch {
      images = ['/static/logo.png']
    }
  }

  let poiName = ''
  if (poi.poiName) {
    if (typeof poi.poiName === 'string') {
      poiName = poi.poiName
    } else {
      poiName = poi.poiName?.zh || poi.poiName?.['zh-CN'] || poi.poiName?.en || ''
    }
  }

  let description = ''
  if (poi.description) {
    if (typeof poi.description === 'string') {
      description = poi.description
    } else {
      description = poi.description?.zh || poi.description?.['zh-CN'] || ''
    }
  }

  let address = ''
  if (poi.address) {
    if (typeof poi.address === 'string') {
      address = poi.address
    } else {
      address = poi.address?.zh || poi.address?.['zh-CN'] || ''
    }
  }

  return {
    id: poi.poiUuid,
    name: poiName,
    category: poi.poiType || poi.typeCode || '',
    description: description,
    images: images,
    latitude: Number(poi.latitude),
    longitude: Number(poi.longitude),
    address: address,
    phone: poi.tel || '',
    rating: poi.stats?.heatScore ? Number(poi.stats.heatScore) / 2 : 4.5,
    commentCount: 0,
    distance: undefined,
    tags: poi.poiTags?.map((t: any) => {
      if (!t.tag) return ''
      if (typeof t.tag.tagName === 'string') return t.tag.tagName
      return t.tag.tagName?.zh || t.tag.tagName?.['zh-CN'] || ''
    }).filter(Boolean) || [],
    ticketPrice: poi.tickets?.[0] ? Number(poi.tickets[0].price) : undefined,
  }
}

// =============================================
// 公共接口（无需认证）
// =============================================

// 获取附近景点（基于坐标 + 分类过滤）- 公共接口
router.get('/nearby', async (req, res, next) => {
  try {
    const latitude = parseFloat(req.query.latitude as string)
    const longitude = parseFloat(req.query.longitude as string)
    const radius = parseFloat(req.query.radius as string) || 5000 // 默认5km
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 50
    const category = req.query.category as string

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ code: 400, message: '无效的经纬度', data: null })
    }

    // 矩形范围过滤
    const latDelta = radius / 111000 // 1度约111km
    const lngDelta = radius / (111000 * Math.cos(latitude * Math.PI / 180))

    // 构建查询条件
    const where: any = {
      status: 1,
      latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
      longitude: { gte: longitude - lngDelta, lte: longitude + lngDelta }
    }

    // 分类过滤（同时支持 poiType 中文名 和 typeCode 高德类型码过滤，OR 逻辑）
    // 数据库实际存储类型：风景名胜、博物馆、公园、特色街区、购物场所、宗教场所、地标建筑、旅游景点、主题乐园
    // 高德 typeCode 参考：110000=风景名胜、141200=博物馆、140000=公园、060000=购物场所、050000=餐饮服务
    const categoryConditions: any[] = []
    if (category && category !== 'all') {
      const categoryMap: Record<string, { poiTypes?: string[]; typeCodes?: string[] }> = {
        scenic: { poiTypes: ['风景名胜', '地标建筑', '旅游景点'], typeCodes: ['110000'] },
        museum: { poiTypes: ['博物馆'], typeCodes: ['141200', '141300'] },
        park: { poiTypes: ['公园'], typeCodes: ['140000'] },
        food: { poiTypes: ['特色街区', '宗教场所'], typeCodes: ['050000'] },
        shopping: { poiTypes: ['购物场所'], typeCodes: ['060000'] },
        landmark: { poiTypes: ['地标建筑'], typeCodes: ['110000'] },
        entertainment: { poiTypes: ['主题乐园'], typeCodes: ['110000'] },
      }
      const cfg = categoryMap[category]
      if (cfg) {
        if (cfg.poiTypes) {
          categoryConditions.push({ poiType: { in: cfg.poiTypes } })
        }
        if (cfg.typeCodes) {
          categoryConditions.push({ typeCode: { in: cfg.typeCodes } })
        }
      }
    }

    const pois = await prisma.poiInfo.findMany({
      where: {
        ...where,
        ...(categoryConditions.length > 0 ? { OR: categoryConditions } : {})
      },
      include: {
        poiTags: { include: { tag: true } },
        stats: true,
        tickets: { where: { status: 1 }, take: 1 }
      },
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    // 计算距离并排序
    const poisWithDistance = pois.map(poi => {
      const distance = calculateDistance(
        latitude, longitude,
        Number(poi.latitude), Number(poi.longitude)
      )
      return { ...transformPoi(poi), distance: Math.round(distance) }
    }).sort((a, b) => (a.distance || 0) - (b.distance || 0))

    res.json({
      code: 0,
      message: 'success',
      data: {
        list: poisWithDistance,
        total: poisWithDistance.length
      }
    })
  } catch (error) {
    next(error)
  }
})

// 获取热力图数据 - 公共接口
router.get('/heatmap', async (req, res, next) => {
  try {
    const latitude = parseFloat(req.query.latitude as string)
    const longitude = parseFloat(req.query.longitude as string)
    const radius = parseFloat(req.query.radius as string) || 5000

    // 获取热门POI的统计数据作为热力值
    const stats = await prisma.poiStats.findMany({
      where: {
        poi: {
          status: 1,
          latitude: { gte: latitude - 0.05, lte: latitude + 0.05 },
          longitude: { gte: longitude - 0.05, lte: longitude + 0.05 }
        }
      },
      include: { poi: true },
      orderBy: { heatScore: 'desc' },
      take: 100
    })

    const heatmapData = stats.map(s => ({
      latitude: Number(s.poi.latitude),
      longitude: Number(s.poi.longitude),
      weight: Number(s.heatScore) / 100
    }))

    res.json({
      code: 0,
      message: 'success',
      data: heatmapData
    })
  } catch (error) {
    next(error)
  }
})

// 获取推荐景点列表（基于向量相似度的智能推荐）
router.get('/recommend', optionalAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const latitude = req.query.latitude ? parseFloat(req.query.latitude as string) : undefined
    const longitude = req.query.longitude ? parseFloat(req.query.longitude as string) : undefined
    const userId = (req as any).userId

    // 使用新的向量推荐服务
    const result = await poiRecommendService.getRecommend({
      userId,
      latitude,
      longitude,
      page,
      pageSize,
      useEmbedding: true
    })

    res.json({
      code: 0,
      message: 'success',
      data: {
        list: result.list,
        total: result.total,
        personalized: result.personalized
      }
    })
  } catch (error) {
    console.error('[POI Recommend] 推荐接口异常:', error)
    next(error)
  }
})

// 获取景点详情 - 公共接口
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const poi = await prisma.poiInfo.findUnique({
      where: { poiUuid: id },
      include: {
        poiTags: { include: { tag: true } },
        stats: true,
        tickets: { where: { status: 1 } },
        openingTimes: true
      }
    })

    if (!poi) {
      return res.status(404).json({ code: 404, message: '景点不存在', data: null })
    }

    res.json({
      code: 0,
      message: 'success',
      data: transformPoi(poi)
    })
  } catch (error) {
    next(error)
  }
})

// =============================================
// 可选认证接口（登录可选，不影响匿名访问）
// =============================================

// =============================================
// 可选认证接口（登录可选，不影响匿名访问）
// =============================================

// AI路线规划（可选认证，匿名用户限制次数）
router.post('/ai-plan', optionalAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const { prompt, days, startLatitude, startLongitude } = req.body

    if (!prompt) {
      return res.status(400).json({ code: 400, message: '请输入旅行需求', data: null })
    }

    // 检查AI规划次数
    if (!userId) {
      return res.status(401).json({
        code: 401,
        message: '请先登录后再使用AI规划功能',
        data: null
      })
    }

    const consumeResult = await userService.consumeAiPlan(userId)
    if (!consumeResult.success) {
      const message = await userService.getAiPlanExhaustedMessage(userId)
      return res.status(403).json({
        code: 403,
        message,
        data: null
      })
    }

    // 调用 AI 路线生成服务（Retrieve-then-Generate）
    const route = await generateRoute({
      prompt,
      days: days || 1,
      startLatitude,
      startLongitude,
      userId
    })

    // 附加剩余次数
    route.remainingCount = consumeResult.remaining

    res.json({
      code: 0,
      message: 'success',
      data: route
    })
  } catch (error) {
    console.error('[AI Plan] 路线生成异常:', error)
    next(error)
  }
})

// =============================================
// 必须登录接口（需要认证）
// =============================================

// 获取用户收藏列表（重定向到 favorite 模块）
// 注意：旧版 /api/poi/my/favorites 已废弃，请使用 /api/favorite/list

// Haversine公式计算距离（米）
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export default router
