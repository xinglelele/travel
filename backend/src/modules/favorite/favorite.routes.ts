import { Router } from 'express'
import { requiredAuth } from '../../shared/middleware/auth'
import { prisma } from '../../config'
import { successResponse, errorResponse } from '../../shared/utils/response'
import { normalizeUrl } from '../../shared/utils/url'

const router = Router()

// =============================================
// 必须登录接口（需要认证）
// =============================================

// 获取用户收藏列表（含 POI 和内容）
router.get('/list', requiredAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20

    const [poiFavorites, userContentFavorites, officialContentFavorites, poiTotal, userContentTotal, officialContentTotal] = await Promise.all([
      prisma.userFavorite.findMany({
        where: { userId },
        include: {
          poi: {
            include: {
              poiTags: { include: { tag: true } },
              stats: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: Math.ceil(pageSize / 2),
      }),
      prisma.userContentFavorite.findMany({
        where: { userId },
        include: {
          userContent: {
            include: {
              user: { select: { nickname: true, avatar: true } },
              poi: { select: { poiUuid: true, poiName: true, photos: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: Math.ceil(pageSize / 2),
      }),
      prisma.officialContentFavorite.findMany({
        where: { userId },
        include: {
          officialContent: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: Math.ceil(pageSize / 2),
      }),
      prisma.userFavorite.count({ where: { userId } }),
      prisma.userContentFavorite.count({ where: { userId } }),
      prisma.officialContentFavorite.count({ where: { userId } }),
    ])

    const poiItems = poiFavorites.map((fav) => {
      const poi = fav.poi
      let poiName = ''
      if (poi.poiName) {
        if (typeof poi.poiName === 'string') {
          poiName = poi.poiName
        } else {
          poiName = poi.poiName?.zh || poi.poiName?.['zh-CN'] || poi.poiName?.en || ''
        }
      }
      let images = ['/static/logo.png']
      if (poi.photos) {
        try {
          const photos = typeof poi.photos === 'string' ? JSON.parse(poi.photos) : poi.photos
          images = Array.isArray(photos) && photos.length > 0 ? photos.map(p => normalizeUrl(p)) : ['/static/logo.png']
        } catch {
          images = ['/static/logo.png']
        }
      }
      let tags: string[] = []
      if (poi.poiTags && Array.isArray(poi.poiTags)) {
        tags = poi.poiTags.map((t: any) => {
          if (!t.tag) return ''
          if (typeof t.tag.tagName === 'string') return t.tag.tagName
          return t.tag.tagName?.zh || t.tag.tagName?.['zh-CN'] || ''
        }).filter(Boolean)
      }
      return {
        id: `poi_${fav.id}`,
        targetType: 'poi' as const,
        poiId: poi.poiUuid,
        name: poiName,
        category: poi.poiType || poi.typeCode || '',
        images,
        latitude: Number(poi.latitude),
        longitude: Number(poi.longitude),
        rating: poi.stats?.heatScore ? Number(poi.stats.heatScore) / 2 : 4.5,
        tags,
        favoritedAt: fav.createdAt.toISOString(),
      }
    })

    const userContentItems = userContentFavorites.map((fav) => {
      const uc = fav.userContent
      let images: string[] = []
      if (uc.images) {
        try { images = typeof uc.images === 'string' ? JSON.parse(uc.images) : uc.images } catch {}
      }
      let poiImages: string[] = []
      if (uc.poi?.photos) {
        try { poiImages = typeof uc.poi.photos === 'string' ? JSON.parse(uc.poi.photos) : uc.poi.photos } catch {}
      }
      return {
        id: `uc_${uc.id}`,
        targetType: 'userContent' as const,
        contentId: `uc_${uc.id}`,
        title: typeof uc.poiName === 'string' ? uc.poiName : (uc.poiName as any)?.zh || (uc.poiName as any)?.['zh-CN'] || '',
        cover: images[0] || normalizeUrl(uc.poiCoverImage || '') || normalizeUrl(poiImages[0] || '') || '/static/logo.png',
        summary: uc.content,
        category: uc.category || '',
        userNickname: uc.user?.nickname || '匿名用户',
        userAvatar: normalizeUrl(uc.user?.avatar || '/static/default-avatar.png'),
        poiId: uc.poi?.poiUuid || '',
        rating: Number(uc.rating) || 0,
        favoritedAt: fav.createdAt.toISOString(),
      }
    })

    const officialContentItems = officialContentFavorites.map((fav) => {
      const oc = fav.officialContent
      let title = ''
      if (oc.title) title = typeof oc.title === 'string' ? oc.title : (oc.title as any)?.zh || (oc.title as any)?.['zh-CN'] || ''
      let summary = ''
      if (oc.summary) summary = typeof oc.summary === 'string' ? oc.summary : (oc.summary as any)?.zh || (oc.summary as any)?.['zh-CN'] || ''
      return {
        id: `official_${oc.id}`,
        targetType: 'officialContent' as const,
        contentId: oc.id.toString(),
        title,
        cover: normalizeUrl(oc.coverImage || '') || '/static/logo.png',
        summary,
        category: oc.category || '资讯',
        favoritedAt: fav.createdAt.toISOString(),
      }
    })

    const merged = [...poiItems, ...userContentItems, ...officialContentItems]
      .sort((a, b) => new Date(b.favoritedAt).getTime() - new Date(a.favoritedAt).getTime())
      .slice(0, pageSize)

    successResponse(res, {
      list: merged,
      total: poiTotal + userContentTotal + officialContentTotal
    })
  } catch (error) {
    next(error)
  }
})

// =============================================
// 必须登录接口（需要认证）
// =============================================

// 获取用户 POI 收藏列表（旧接口，保持兼容）
router.get('/poi-list', requiredAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20

    const [favorites, total] = await Promise.all([
      prisma.userFavorite.findMany({
        where: { userId },
        include: {
          poi: {
            include: {
              poiTags: { include: { tag: true } },
              stats: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.userFavorite.count({ where: { userId } }),
    ])

    const list = favorites.map((fav) => {
      const poi = fav.poi
      let poiName = ''
      if (poi.poiName) {
        if (typeof poi.poiName === 'string') {
          poiName = poi.poiName
        } else {
          poiName = poi.poiName?.zh || poi.poiName?.['zh-CN'] || poi.poiName?.en || ''
        }
      }

      let images = ['/static/logo.png']
      if (poi.photos) {
        try {
          const photos = typeof poi.photos === 'string' ? JSON.parse(poi.photos) : poi.photos
          images = Array.isArray(photos) && photos.length > 0 ? photos : ['/static/logo.png']
        } catch {
          images = ['/static/logo.png']
        }
      }

      let tags: string[] = []
      if (poi.poiTags && Array.isArray(poi.poiTags)) {
        tags = poi.poiTags.map((t: any) => {
          if (!t.tag) return ''
          if (typeof t.tag.tagName === 'string') return t.tag.tagName
          return t.tag.tagName?.zh || t.tag.tagName?.['zh-CN'] || ''
        }).filter(Boolean)
      }

      return {
        id: fav.id,
        poiId: poi.poiUuid,
        name: poiName,
        category: poi.poiType || poi.typeCode || '',
        images,
        latitude: Number(poi.latitude),
        longitude: Number(poi.longitude),
        rating: poi.stats?.heatScore ? Number(poi.stats.heatScore) / 2 : 4.5,
        tags,
        favoritedAt: fav.createdAt.toISOString(),
      }
    })

    successResponse(res, { list, total })
  } catch (error) {
    next(error)
  }
})

// 添加收藏 / 取消收藏（切换）
router.post('/toggle', requiredAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const { poiId } = req.body

    if (!poiId) {
      return errorResponse(res, '请指定景点ID', 400)
    }

    // 查询 POI 数据库 ID
    const poi = await prisma.poiInfo.findUnique({
      where: { poiUuid: poiId },
    })

    if (!poi) {
      return errorResponse(res, '景点不存在', 404)
    }

    // 查询是否已收藏
    const existing = await prisma.userFavorite.findUnique({
      where: {
        userId_poiId: {
          userId,
          poiId: poi.id,
        },
      },
    })

    if (existing) {
      // 取消收藏
      await prisma.userFavorite.delete({
        where: { id: existing.id },
      })
      successResponse(res, { favorited: false }, '已取消收藏')
    } else {
      // 添加收藏
      await prisma.userFavorite.create({
        data: {
          userId,
          poiId: poi.id,
        },
      })
      successResponse(res, { favorited: true }, '收藏成功')
    }
  } catch (error) {
    next(error)
  }
})

// 查询是否已收藏
router.get('/status/:poiId', requiredAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const { poiId } = req.params

    const poi = await prisma.poiInfo.findUnique({
      where: { poiUuid: poiId },
    })

    if (!poi) {
      return successResponse(res, { favorited: false })
    }

    const existing = await prisma.userFavorite.findUnique({
      where: {
        userId_poiId: {
          userId,
          poiId: poi.id,
        },
      },
    })

    successResponse(res, { favorited: !!existing })
  } catch (error) {
    next(error)
  }
})

export default router
