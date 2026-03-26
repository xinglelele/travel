import { Router } from 'express'
import { prisma } from '../../config'

const router = Router()

// 内容数据结构转换
function transformContent(content: any) {
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
    title: title,
    cover: content.coverImage || '/static/logo.png',
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

// 获取推荐内容列表
router.get('/recommend', async (req, res, next) => {
  try {
    const category = req.query.category as string
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 10

    const where: any = { status: 1 }
    if (category && category !== 'undefined') {
      where.category = category
    }

    const contents = await prisma.officialContent.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize
    })

    const total = await prisma.officialContent.count({ where })

    res.json({
      code: 0,
      message: 'success',
      data: {
        list: contents.map(transformContent),
        total
      }
    })
  } catch (error) {
    next(error)
  }
})

// 获取内容详情
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params

    const content = await prisma.officialContent.findUnique({
      where: { id: parseInt(id) }
    })

    if (!content) {
      return res.status(404).json({ code: 404, message: '内容不存在', data: null })
    }

    // 增加浏览量
    await prisma.officialContent.update({
      where: { id: parseInt(id) },
      data: { viewCount: { increment: 1 } }
    })

    res.json({
      code: 0,
      message: 'success',
      data: transformContent(content)
    })
  } catch (error) {
    next(error)
  }
})

// 记录浏览
router.post('/:id/view', async (req, res, next) => {
  try {
    const { id } = req.params

    await prisma.officialContent.update({
      where: { id: parseInt(id) },
      data: { viewCount: { increment: 1 } }
    })

    res.json({
      code: 0,
      message: 'success',
      data: null
    })
  } catch (error) {
    next(error)
  }
})

export default router
