import { Router } from 'express'
import { requiredAuth } from '../../shared/middleware/auth'
import { prisma } from '../../config'

const router = Router()

// 获取消息列表（必须登录）
router.get('/list', requiredAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20

    const where = { userId }
    const [messages, total, unreadCount] = await Promise.all([
      prisma.messageInfo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.messageInfo.count({ where }),
      prisma.messageInfo.count({ where: { userId, isRead: 0 } })
    ])

    res.json({
      code: 0,
      message: 'success',
      data: {
        list: messages,
        total,
        unread: unreadCount
      }
    })
  } catch (error) {
    next(error)
  }
})

// 标记单条消息已读
router.post('/:id/read', requiredAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const id = req.params.id as string

    await prisma.messageInfo.updateMany({
      where: { id: parseInt(id), userId },
      data: { isRead: 1 }
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

// 全部已读
router.post('/read-all', requiredAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId

    await prisma.messageInfo.updateMany({
      where: { userId, isRead: 0 },
      data: { isRead: 1 }
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
