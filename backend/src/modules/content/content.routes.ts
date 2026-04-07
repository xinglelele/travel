import { Router } from 'express'
import { prisma } from '../../config'
import { normalizeUrl } from '../../shared/utils/url'
import { optionalAuth } from '../../shared/middleware/auth'

const router = Router()

// 内容数据结构转换（官方内容）
function transformOfficialContent(content: any) {
  let title = ''
  if (content.title) {
    if (typeof content.title === 'string') {
      title = content.title
    } else {
      title = content.title?.zh || content.title?.['zh-CN'] || ''
    }
  }

  let summary = ''
  if (content.summary) {
    if (typeof content.summary === 'string') {
      summary = content.summary
    } else {
      summary = content.summary?.zh || content.summary?.['zh-CN'] || ''
    }
  }

  let contentBody = ''
  if (content.content) {
    if (typeof content.content === 'string') {
      contentBody = content.content
    } else {
      contentBody = content.content?.zh || content.content?.['zh-CN'] || ''
    }
  }

  return {
    id: content.id.toString(),
    type: 'official',
    title: title,
    cover: normalizeUrl(content.coverImage) || '/static/logo.png',
    summary: summary,
    body: contentBody,
    category: content.category || '资讯',
    tags: content.tags || [],
    viewCount: content.viewCount || 0,
    likeCount: content.likeCount || 0,
    relatedPoiIds: content.relatedPoiIds || [],
    videoUrl: content.videoUrl || undefined,
    createdAt: content.publishedAt?.toISOString() || content.createdAt.toISOString()
  }
}

// 内容数据结构转换（用户评论生成的内容）
function transformUserContent(content: any) {
  const poiName = typeof content.poiName === 'string'
    ? content.poiName
    : (content.poiName as any)?.zh || (content.poiName as any)?.['zh-CN'] || ''

  let images: string[] = []
  if (content.images) {
    try {
      images = typeof content.images === 'string'
        ? JSON.parse(content.images)
        : content.images
    } catch {}
  }

  // 规范化所有图片 URL（相对路径补全域名，全路径按环境切换协议）
  const normalizedImages = images.map(img => normalizeUrl(img))

  const tags: string[] = []
  if (content.tags) {
    try {
      const parsed = typeof content.tags === 'string'
        ? JSON.parse(content.tags)
        : content.tags
      if (Array.isArray(parsed)) tags.push(...parsed)
    } catch {}
  }

  return {
    id: `uc_${content.id}`,
    type: 'user',
    title: poiName,
    // 优先展示用户评论上传图，其次景点封面
    cover: normalizedImages[0] || normalizeUrl(content.poiCoverImage || '') || '/static/logo.png',
    summary: content.content || '',
    body: content.content || '',
    category: content.category || '',
    tags,
    userNickname: content.user?.nickname || '匿名用户',
    userAvatar: normalizeUrl(content.user?.avatar || '/static/default-avatar.png'),
    poiId: content.poi?.poiUuid || '',
    rating: Number(content.rating) || 0,
    viewCount: content.viewCount || 0,
    likeCount: content.likeCount || 0,
    createdAt: content.createdAt?.toISOString() || new Date().toISOString()
  }
}

// 获取推荐内容列表（官方内容 + 用户评论内容混合）
router.get('/recommend', async (req, res, next) => {
  try {
    const category = req.query.category as string
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10

    // 查询官方内容
    const officialWhere: any = { status: 1 }
    if (category && category !== 'all' && category !== 'undefined') {
      officialWhere.category = category
    }

    const [officialContents, userContents, officialTotal] = await Promise.all([
      prisma.officialContent.findMany({
        where: officialWhere,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.userContent.findMany({
        where: category && category !== 'all' && category !== 'undefined'
          ? { category, status: 1 }
          : { status: 1 },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { nickname: true, avatar: true } },
          poi: { select: { poiUuid: true } }
        }
      }),
      prisma.officialContent.count({ where: officialWhere })
    ])

    const userTotal = await prisma.userContent.count({
      where: category && category !== 'all' && category !== 'undefined'
        ? { category, status: 1 }
        : { status: 1 }
    })

    // 混合官方内容和用户内容，按时间倒序
    const officialList = officialContents.map(transformOfficialContent)
    const userList = userContents.map(transformUserContent)
    const mergedList = [...officialList, ...userList]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, pageSize)

    res.json({
      code: 0,
      message: 'success',
      data: {
        list: mergedList,
        total: officialTotal + userTotal
      }
    })
  } catch (error) {
    next(error)
  }
})

// 获取内容详情（官方内容）
router.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = (req as any).userId as number | null

    // 检查是否为用户内容
    if (id.startsWith('uc_')) {
      const ucId = parseInt(id.replace('uc_', ''))
      if (!isNaN(ucId)) {
        const content = await prisma.userContent.findUnique({
          where: { id: ucId },
          include: {
            user: { select: { nickname: true, avatar: true } },
            poi: { select: { poiUuid: true, poiName: true, photos: true, address: true } },
            likes: userId ? { where: { userId }, select: { id: true } } : false,
            favorites: userId ? { where: { userId }, select: { id: true } } : false,
          }
        })
        if (!content) {
          return res.status(404).json({ code: 404, message: '内容不存在', data: null })
        }
        await prisma.userContent.update({
          where: { id: ucId },
          data: { viewCount: { increment: 1 } }
        })
        const result = transformUserContent(content)
        result.liked = !!(content as any).likes?.length
        result.favorited = !!(content as any).favorites?.length
        return res.json({
          code: 0,
          message: 'success',
          data: result
        })
      }
    }

    const content = await prisma.officialContent.findUnique({
      where: { id: parseInt(id) },
      include: {
        likes: userId ? { where: { userId }, select: { id: true } } : false,
        favorites: userId ? { where: { userId }, select: { id: true } } : false,
      }
    })

    if (!content) {
      return res.status(404).json({ code: 404, message: '内容不存在', data: null })
    }

    await prisma.officialContent.update({
      where: { id: parseInt(id) },
      data: { viewCount: { increment: 1 } }
    })

    const result = transformOfficialContent(content)
    result.liked = !!(content as any).likes?.length
    result.favorited = !!(content as any).favorites?.length
    res.json({
      code: 0,
      message: 'success',
      data: result
    })
  } catch (error) {
    next(error)
  }
})

// 记录浏览
router.post('/:id/view', async (req, res, next) => {
  try {
    const { id } = req.params

    if (id.startsWith('uc_')) {
      const ucId = parseInt(id.replace('uc_', ''))
      if (!isNaN(ucId)) {
        await prisma.userContent.update({
          where: { id: ucId },
          data: { viewCount: { increment: 1 } }
        }).catch(() => {})
      }
    } else {
      const contentId = parseInt(id.replace('official_', ''))
      if (!isNaN(contentId)) {
        await prisma.officialContent.update({
          where: { id: contentId },
          data: { viewCount: { increment: 1 } }
        }).catch(() => {})
      }
    }

    res.json({
      code: 0,
      message: 'success',
      data: null
    })
  } catch (error) {
    next(error)
  }
})

// =============================================
// 点赞（toggle）
// =============================================
router.post('/:id/like', optionalAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录', data: null })
    }
    const { id } = req.params

    if (id.startsWith('uc_')) {
      const ucId = parseInt(id.replace('uc_', ''))
      if (isNaN(ucId)) return res.status(400).json({ code: 400, message: '无效ID', data: null })
      const existing = await prisma.userContentLike.findUnique({
        where: { userId_userContentId: { userId, userContentId: ucId } }
      })
      if (existing) {
        await prisma.userContentLike.delete({ where: { id: existing.id } })
        await prisma.userContent.update({ where: { id: ucId }, data: { likeCount: { decrement: 1 } } })
        return res.json({ code: 0, message: '已取消点赞', data: { liked: false } })
      } else {
        await prisma.userContentLike.create({ data: { userId, userContentId: ucId } })
        await prisma.userContent.update({ where: { id: ucId }, data: { likeCount: { increment: 1 } } })
        return res.json({ code: 0, message: '点赞成功', data: { liked: true } })
      }
    } else if (id.startsWith('official_')) {
      const contentId = parseInt(id.replace('official_', ''))
      if (isNaN(contentId)) return res.status(400).json({ code: 400, message: '无效ID', data: null })
      const existing = await prisma.officialContentLike.findUnique({
        where: { userId_officialContentId: { userId, officialContentId: contentId } }
      })
      if (existing) {
        await prisma.officialContentLike.delete({ where: { id: existing.id } })
        await prisma.officialContent.update({ where: { id: contentId }, data: { likeCount: { decrement: 1 } } })
        return res.json({ code: 0, message: '已取消点赞', data: { liked: false } })
      } else {
        await prisma.officialContentLike.create({ data: { userId, officialContentId: contentId } })
        await prisma.officialContent.update({ where: { id: contentId }, data: { likeCount: { increment: 1 } } })
        return res.json({ code: 0, message: '点赞成功', data: { liked: true } })
      }
    } else {
      const contentId = parseInt(id)
      if (isNaN(contentId)) return res.status(400).json({ code: 400, message: '无效ID', data: null })
      const existing = await prisma.officialContentLike.findUnique({
        where: { userId_officialContentId: { userId, officialContentId: contentId } }
      })
      if (existing) {
        await prisma.officialContentLike.delete({ where: { id: existing.id } })
        await prisma.officialContent.update({ where: { id: contentId }, data: { likeCount: { decrement: 1 } } })
        return res.json({ code: 0, message: '已取消点赞', data: { liked: false } })
      } else {
        await prisma.officialContentLike.create({ data: { userId, officialContentId: contentId } })
        await prisma.officialContent.update({ where: { id: contentId }, data: { likeCount: { increment: 1 } } })
        return res.json({ code: 0, message: '点赞成功', data: { liked: true } })
      }
    }
  } catch (error) {
    next(error)
  }
})

// =============================================
// 收藏列表（用户收藏的所有内容）
// =============================================
router.get('/favorites', async (req, res, next) => {
  try {
    const userId = (req as any).userId
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录', data: null })
    }
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20

    const [userFavorites, officialFavorites, userTotal, officialTotal] = await Promise.all([
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
      prisma.userContentFavorite.count({ where: { userId } }),
      prisma.officialContentFavorite.count({ where: { userId } }),
    ])

    const userItems = userFavorites.map(fav => {
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
        type: 'user' as const,
        title: typeof uc.poiName === 'string' ? uc.poiName : (uc.poiName as any)?.zh || (uc.poiName as any)?.['zh-CN'] || '',
        cover: images[0] || normalizeUrl(uc.poiCoverImage || '') || normalizeUrl(poiImages[0] || '') || '/static/logo.png',
        summary: uc.content,
        body: uc.content,
        category: uc.category || '',
        tags: [],
        userNickname: uc.user?.nickname || '匿名用户',
        userAvatar: normalizeUrl(uc.user?.avatar || '/static/default-avatar.png'),
        poiId: uc.poi?.poiUuid || '',
        rating: Number(uc.rating) || 0,
        viewCount: uc.viewCount,
        likeCount: uc.likeCount,
        createdAt: uc.createdAt.toISOString(),
        liked: false,
        favorited: true,
        favoritedAt: fav.createdAt.toISOString(),
      }
    })

    const officialItems = officialFavorites.map(fav => {
      const oc = fav.officialContent
      let title = ''
      if (oc.title) title = typeof oc.title === 'string' ? oc.title : (oc.title as any)?.zh || (oc.title as any)?.['zh-CN'] || ''
      let summary = ''
      if (oc.summary) summary = typeof oc.summary === 'string' ? oc.summary : (oc.summary as any)?.zh || (oc.summary as any)?.['zh-CN'] || ''
      return {
        id: oc.id.toString(),
        type: 'official' as const,
        title,
        cover: normalizeUrl(oc.coverImage || '') || '/static/logo.png',
        summary,
        body: typeof oc.content === 'string' ? oc.content : (oc.content as any)?.zh || (oc.content as any)?.['zh-CN'] || '',
        category: oc.category || '资讯',
        tags: oc.tags || [],
        viewCount: oc.viewCount,
        likeCount: oc.likeCount,
        relatedPoiIds: oc.relatedPoiIds || [],
        videoUrl: oc.videoUrl || undefined,
        createdAt: oc.publishedAt?.toISOString() || oc.createdAt.toISOString(),
        liked: false,
        favorited: true,
        favoritedAt: fav.createdAt.toISOString(),
      }
    })

    const merged = [...userItems, ...officialItems]
      .sort((a, b) => new Date(b.favoritedAt).getTime() - new Date(a.favoritedAt).getTime())
      .slice(0, pageSize)

    res.json({
      code: 0,
      message: 'success',
      data: { list: merged, total: userTotal + officialTotal }
    })
  } catch (error) {
    next(error)
  }
})

// =============================================
// 收藏（toggle）
// =============================================
router.post('/:id/favorite', optionalAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    if (!userId) {
      return res.status(401).json({ code: 401, message: '请先登录', data: null })
    }
    const { id } = req.params

    if (id.startsWith('uc_')) {
      const ucId = parseInt(id.replace('uc_', ''))
      if (isNaN(ucId)) return res.status(400).json({ code: 400, message: '无效ID', data: null })
      const existing = await prisma.userContentFavorite.findUnique({
        where: { userId_userContentId: { userId, userContentId: ucId } }
      })
      if (existing) {
        await prisma.userContentFavorite.delete({ where: { id: existing.id } })
        return res.json({ code: 0, message: '已取消收藏', data: { favorited: false } })
      } else {
        await prisma.userContentFavorite.create({ data: { userId, userContentId: ucId } })
        return res.json({ code: 0, message: '收藏成功', data: { favorited: true } })
      }
    } else if (id.startsWith('official_')) {
      const contentId = parseInt(id.replace('official_', ''))
      if (isNaN(contentId)) return res.status(400).json({ code: 400, message: '无效ID', data: null })
      const existing = await prisma.officialContentFavorite.findUnique({
        where: { userId_officialContentId: { userId, officialContentId: contentId } }
      })
      if (existing) {
        await prisma.officialContentFavorite.delete({ where: { id: existing.id } })
        return res.json({ code: 0, message: '已取消收藏', data: { favorited: false } })
      } else {
        await prisma.officialContentFavorite.create({ data: { userId, officialContentId: contentId } })
        return res.json({ code: 0, message: '收藏成功', data: { favorited: true } })
      }
    } else {
      const contentId = parseInt(id)
      if (isNaN(contentId)) return res.status(400).json({ code: 400, message: '无效ID', data: null })
      const existing = await prisma.officialContentFavorite.findUnique({
        where: { userId_officialContentId: { userId, officialContentId: contentId } }
      })
      if (existing) {
        await prisma.officialContentFavorite.delete({ where: { id: existing.id } })
        return res.json({ code: 0, message: '已取消收藏', data: { favorited: false } })
      } else {
        await prisma.officialContentFavorite.create({ data: { userId, officialContentId: contentId } })
        return res.json({ code: 0, message: '收藏成功', data: { favorited: true } })
      }
    }
  } catch (error) {
    next(error)
  }
})

export default router
