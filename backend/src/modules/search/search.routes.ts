import { Router } from 'express'
import { optionalAuth } from '../../shared/middleware/auth'
import { prisma } from '../../config'

const router = Router()

// POI 数据结构转换（与 poi.routes.ts 保持一致）
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

// Haversine 距离计算（米）
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

// 通用 POI 列表查询（带分类过滤、距离排序）
async function queryPois(params: {
  latitude?: number
  longitude?: number
  radius?: number
  category?: string
  keyword?: string
  page?: number
  pageSize?: number
}) {
  const { latitude, longitude, radius = 5000, category, keyword, page = 1, pageSize = 20 } = params

  const latDelta = radius / 111000
  const lngDelta = radius / (111000 * Math.cos((latitude || 31.2304) * Math.PI / 180))

  const where: any = { status: 1 }

  if (latitude && longitude) {
    where.latitude = { gte: latitude - latDelta, lte: latitude + latDelta }
    where.longitude = { gte: longitude - lngDelta, lte: longitude + lngDelta }
  }

  if (category && category !== 'all') {
    where.poiType = category
  }

  const pois = await prisma.poiInfo.findMany({
    where,
    include: {
      poiTags: { include: { tag: true } },
      stats: true,
      tickets: { where: { status: 1 }, take: 1 }
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    orderBy: { id: 'asc' }
  })

  let result = pois.map(poi => transformPoi(poi))

  if (keyword) {
    const kw = keyword.toLowerCase()
    result = result.filter(p =>
      p.name.toLowerCase().includes(kw) ||
      (p.description || '').toLowerCase().includes(kw) ||
      (p.category || '').toLowerCase().includes(kw) ||
      p.tags.some((t: string) => t.toLowerCase().includes(kw))
    )
  }

  if (latitude !== undefined && longitude !== undefined) {
    result = result.map(p => {
      const dist = Math.round(calculateDistance(latitude, longitude, p.latitude, p.longitude))
      return { ...p, distance: dist }
    }).sort((a, b) => (a.distance || 0) - (b.distance || 0))
  }

  return result
}

// 搜索（公共接口）
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { keyword, type = 'all', page = 1, pageSize = 20, category } = req.query
    const pageNum = parseInt(page as string) || 1
    const pageSizeNum = parseInt(pageSize as string) || 20

    let pois: any[] = []
    let routes: any[] = []
    let contents: any[] = []

    if (type === 'all' || type === 'poi') {
      pois = await queryPois({
        keyword: keyword as string,
        page: pageNum,
        pageSize: pageSizeNum,
        category: category as string
      })
    }

    if (type === 'all' || type === 'route') {
      const routeWhere: any = { status: 1 }
      if (keyword) {
        routeWhere.OR = [
          { routeName: { contains: keyword as string } },
          { description: { contains: keyword as string } }
        ]
      }
      const routeList = await prisma.route.findMany({
        where: routeWhere,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum
      })
      routes = routeList.map(r => {
        let routeName = ''
        const rn = r.routeName as any
        if (typeof rn === 'string') routeName = rn
        else routeName = rn?.['zh-CN'] || rn?.zh || rn?.en || ''
        return {
          id: r.id,
          title: routeName,
          days: r.totalDays,
          coverImage: r.coverImage || '',
          tags: r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags) : [],
          totalPoi: 0,
          createdAt: r.createdAt
        }
      })
    }

    if (type === 'all' || type === 'content') {
      const contentWhere: any = { status: 1 }
      if (keyword) {
        contentWhere.OR = [
          { title: { contains: keyword as string } },
          { summary: { contains: keyword as string } }
        ]
      }
      const contentList = await prisma.officialContent.findMany({
        where: contentWhere,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum
      })
      contents = contentList.map(c => ({
        id: c.contentUuid,
        title: typeof c.title === 'string' ? c.title : (c.title as any)?.zh || '',
        summary: typeof c.summary === 'string' ? c.summary : (c.summary as any)?.zh || '',
        cover: c.coverImage || '/static/logo.png',
        viewCount: c.viewCount || 0,
        likeCount: 0
      }))
    }

    res.json({
      code: 0,
      message: 'success',
      data: { pois, routes, contents, total: pois.length + routes.length + contents.length }
    })
  } catch (error) {
    next(error)
  }
})

// 搜索联想词（基于数据库 POI 名称）
router.get('/suggest', optionalAuth, async (req, res, next) => {
  try {
    const { keyword } = req.query
    if (!keyword || (keyword as string).length < 1) {
      return res.json({ code: 0, message: 'success', data: [] })
    }

    const kw = keyword as string
    const pois = await prisma.poiInfo.findMany({
      where: {
        status: 1,
        OR: [
          { poiName: { contains: kw } },
          { poiName: { contains: kw.toLowerCase() } }
        ]
      },
      take: 5,
      orderBy: { id: 'desc' }
    })

    const suggests = pois.map(p => {
      const name = typeof p.poiName === 'string' ? p.poiName : (p.poiName as any)?.zh || ''
      return { keyword: name, type: 'poi' as const }
    })

    res.json({ code: 0, message: 'success', data: suggests })
  } catch (error) {
    next(error)
  }
})

export default router
