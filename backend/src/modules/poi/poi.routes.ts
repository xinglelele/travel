import { Router } from 'express'
import { requiredAuth, optionalAuth } from '../../shared/middleware/auth'
import { prisma } from '../../config'
import { userService } from '../user/user.service'

const router = Router()

// POI 数据结构转换
function transformPoi(poi: any) {
  let images = ['/static/logo.png']
  if (poi.photos) {
    try {
      const photos = typeof poi.photos === 'string' ? JSON.parse(poi.photos) : poi.photos
      images = Array.isArray(photos) && photos.length > 0 ? photos : ['/static/logo.png']
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

// 获取附近景点（基于坐标）- 公共接口
router.get('/nearby', async (req, res, next) => {
  try {
    const latitude = parseFloat(req.query.latitude as string)
    const longitude = parseFloat(req.query.longitude as string)
    const radius = parseFloat(req.query.radius as string) || 5000 // 默认5km
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ code: 400, message: '无效的经纬度', data: null })
    }

    // 简单矩形范围过滤（实际生产可用空间查询）
    const latDelta = radius / 111000 // 1度约111km
    const lngDelta = radius / (111000 * Math.cos(latitude * Math.PI / 180))

    const pois = await prisma.poiInfo.findMany({
      where: {
        status: 1,
        latitude: { gte: latitude - latDelta, lte: latitude + latDelta },
        longitude: { gte: longitude - lngDelta, lte: longitude + lngDelta }
      },
      include: {
        poiTags: { include: { tag: true } },
        stats: true,
        tickets: { where: { status: 1 }, take: 1 }
      },
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

// 获取推荐景点列表（可选认证，登录时返回个性化推荐）
router.get('/recommend', optionalAuth, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const userId = (req as any).userId

    // 如果用户已登录，获取用户偏好
    let preferenceTags: string[] = []
    if (userId) {
      const profile = await userService.getProfile(userId)
      if (profile?.preference?.preferenceTags) {
        const tags = profile.preference.preferenceTags
        preferenceTags = [...(tags.intensity || []), ...(tags.interests || []), ...(tags.theme || []), ...(tags.cuisine || []), ...(tags.mood || [])]
      }
    }

    // 构建查询条件
    const where: any = { status: 1 }

    // 如果有偏好标签，优先查询匹配的POI
    if (preferenceTags.length > 0) {
      where.poiTags = {
        some: {
          tag: { tagCode: { in: preferenceTags } },
          weight: { gte: 0.3 }
        }
      }
    }

    const pois = await prisma.poiInfo.findMany({
      where,
      include: {
        poiTags: { include: { tag: true } },
        stats: true,
        tickets: { where: { status: 1 }, take: 1 }
      },
      orderBy: preferenceTags.length > 0
        ? [{ stats: { heatScore: 'desc' } }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    const total = await prisma.poiInfo.count({ where })

    res.json({
      code: 0,
      message: 'success',
      data: {
        list: pois.map(transformPoi),
        total,
        personalized: !!userId && preferenceTags.length > 0
      }
    })
  } catch (error) {
    next(error)
  }
})

// AI路线规划（可选认证，匿名用户限制次数）
router.post('/ai-plan', optionalAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const { prompt, days } = req.body

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
      return res.status(403).json({
        code: 403,
        message: 'AI规划次数已用完，请绑定手机号升级账号获取更多次数',
        data: null
      })
    }

    // TODO: 调用AI服务生成路线
    // 模拟返回
    const mockRoute = {
      id: `ai_${Date.now()}`,
      name: `AI推荐路线 - ${days || 1}日游`,
      days: days || 1,
      pois: [],
      remainingCount: consumeResult.remaining
    }

    res.json({
      code: 0,
      message: 'success',
      data: mockRoute
    })
  } catch (error) {
    next(error)
  }
})

// =============================================
// 必须登录接口（需要认证）
// =============================================

// 获取用户收藏/历史等（示例）
router.get('/my/favorites', requiredAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20

    // TODO: 实现收藏功能
    res.json({
      code: 0,
      message: 'success',
      data: {
        list: [],
        total: 0
      }
    })
  } catch (error) {
    next(error)
  }
})

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
