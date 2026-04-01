import { Router } from 'express'
import { requiredAuth, verifyToken } from '../../shared/middleware/auth'
import { prisma } from '../../config'
import { successResponse, errorResponse } from '../../shared/utils/response'
import { generateRoute } from '../poi/poi.route.service'
import { userService } from '../user/user.service'

const router = Router()

// AI生成路线（需要登录，消耗AI规划次数）
router.post('/generate', async (req, res, next) => {
  try {
    // 检查登录状态
    const authHeader = req.headers.authorization
    let userId: number | undefined
    if (authHeader) {
      const decoded = verifyToken(authHeader.replace('Bearer ', ''))
      if (decoded) userId = decoded.userId
    }

    if (!userId) {
      return errorResponse(res, '请先登录后再使用AI规划功能', 401)
    }

    const { prompt, days, startLatitude, startLongitude } = req.body
    if (!prompt) {
      return errorResponse(res, '请输入旅行需求', 400)
    }

    // 检查AI规划次数
    const consumeResult = await userService.consumeAiPlan(userId)
    if (!consumeResult.success) {
      const msg = await userService.getAiPlanExhaustedMessage(userId)
      return errorResponse(res, msg, 403)
    }

    // 调用 AI 路线生成服务（Retrieve-then-Generate）
    const route = await generateRoute({
      prompt,
      days: days || 1,
      startLatitude,
      startLongitude,
      userId
    })

    // 转换格式以匹配前端 TravelRoute 类型
    successResponse(res, {
      id: `ai_${Date.now()}`,
      title: route.title,
      description: route.description,
      days: route.days,
      totalPoi: route.totalPoi,
      poiCount: route.poiCount,
      remainingCount: consumeResult.remaining,
      schedule: route.schedule.map(day => ({
        day: day.day,
        description: day.description,
        pois: day.pois.map(p => ({
          id: p.id,
          poiId: p.poiId,
          name: p.name,
          latitude: p.latitude,
          longitude: p.longitude,
          category: p.category,
          tags: p.tags,
          description: '',
          images: ['/static/logo.png'],
          distance: undefined,
          reason: p.reason,
          stayTime: p.stayTime
        }))
      })),
      tags: route.tags,
      createdAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Route Generate] 异常:', error)
    next(error)
  }
})

// 获取我的路线列表
router.get('/my', requiredAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20

    const [routes, total] = await Promise.all([
      prisma.route.findMany({
        where: { userId, status: 1 },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.route.count({ where: { userId, status: 1 } })
    ])

    const list = routes.map(r => {
      let routeName = ''
      const rn = r.routeName as any
      if (typeof rn === 'string') {
        routeName = rn
      } else {
        routeName = rn?.['zh-CN'] || rn?.zh || rn?.en || ''
      }
      let poiList: any[] = []
      if (r.poiList) {
        try {
          poiList = typeof r.poiList === 'string' ? JSON.parse(r.poiList as string) : r.poiList
        } catch {}
      }
      return {
        id: r.id,
        name: routeName,
        days: r.totalDays,
        coverImage: r.coverImage || '',
        tags: r.tags ? (typeof r.tags === 'string' ? JSON.parse(r.tags) : r.tags) : [],
        createdAt: r.createdAt,
        poiCount: Array.isArray(poiList) ? poiList.length : 0
      }
    })

    successResponse(res, { list, total })
  } catch (error) {
    next(error)
  }
})

// 获取路线详情
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    const idNum = parseInt(id)
    if (isNaN(idNum)) {
      return errorResponse(res, '无效的路线ID', 400)
    }

    const route = await prisma.route.findUnique({
      where: { id: idNum }
    })

    if (!route) {
      return errorResponse(res, '路线不存在', 404)
    }

    let routeName = ''
    const rn = route.routeName as any
    if (typeof rn === 'string') {
      routeName = rn
    } else {
      routeName = rn?.['zh-CN'] || rn?.zh || rn?.en || ''
    }

    let description = ''
    if (route.description) {
      const desc = route.description as any
      if (typeof desc === 'string') {
        description = desc
      } else {
        description = desc?.['zh-CN'] || desc?.zh || ''
      }
    }

    // 解析 POI 列表
    let poiList: any[] = []
    if (route.poiList) {
      try {
        poiList = typeof route.poiList === 'string' ? JSON.parse(route.poiList as string) : route.poiList
      } catch {}
    }

    // 收集 poiId 列表并查询 POI 详情（JSON 里 poiId 可能是字符串，与 Map 的 number 键不一致）
    const poiIds = [
      ...new Set(
        poiList
          .map((p: any) => Number(p.poiId))
          .filter((id: number) => !Number.isNaN(id) && id > 0)
      ),
    ]
    const poisMap: Map<number, any> = new Map()
    if (poiIds.length > 0) {
      const pois = await prisma.poiInfo.findMany({
        where: { id: { in: poiIds } }
      })
      pois.forEach(p => {
      const pName = p.poiName as any
      const pAddr = p.address as any
      let name = typeof pName === 'string' ? pName : (pName?.['zh-CN'] || pName?.zh || '')
      let addr = typeof pAddr === 'string' ? pAddr : (pAddr?.['zh-CN'] || '')
      const pTags = p.poiType || ''
      poisMap.set(p.id, {
        id: p.poiUuid,
        poiId: p.id,
        name,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        address: addr,
        category: pTags,
        tags: [pTags],
        stayTime: 2
      })
    })
    }

    // 按 dayNum 分组为 schedule 格式
    const dayMap = new Map<number, any[]>()
    poiList.forEach((p: any, idx: number) => {
      const dayNum = p.dayNum || 1
      const pid = Number(p.poiId)
      const poiInfo = (!Number.isNaN(pid) ? poisMap.get(pid) : undefined) || {}
      if (!dayMap.has(dayNum)) dayMap.set(dayNum, [])
      dayMap.get(dayNum)!.push({
        ...poiInfo,
        dayNum,
        sequence: idx
      })
    })

    const schedule = Array.from(dayMap.keys()).sort((a, b) => a - b).map(dayNum => ({
      day: dayNum,
      description: '',
      pois: dayMap.get(dayNum)!
    }))

    successResponse(res, {
      id: route.id,
      name: routeName,
      title: routeName,
      description,
      days: route.totalDays,
      totalPoi: poiList.length,
      poiCount: poiList.length,
      coverImage: route.coverImage || '',
      tags: route.tags ? (typeof route.tags === 'string' ? JSON.parse(route.tags) : route.tags) : [],
      schedule,
      createdAt: route.createdAt
    })
  } catch (error) {
    next(error)
  }
})

// 保存路线
router.post('/save', requiredAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    // 前端 savePayload 用 title 字段，后端也兼容 title（优先 name）
    const rawName = req.body.name || req.body.title
    const { days, pois, tags, coverImage, description } = req.body

    if (!rawName || !String(rawName).trim()) {
      return errorResponse(res, '请输入路线名称', 400)
    }

    // routeName 存为多语言格式
    const routeName: Record<string, string> = { 'zh-CN': rawName, zh: rawName, en: rawName }

    const route = await prisma.route.create({
      data: {
        userId,
        routeName: routeName as any,
        totalDays: days || 1,
        description: description ? { 'zh-CN': description } : undefined,
        poiList: JSON.stringify(pois || []),
        coverImage: coverImage || '',
        tags: JSON.stringify(tags || []),
        status: 1
      }
    })

    successResponse(res, {
      id: route.id,
      name: rawName,
      days: route.totalDays
    })
  } catch (error) {
    next(error)
  }
})

// 删除路线
router.delete('/:id', requiredAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const { id } = req.params
    const idNum = parseInt(id as string)

    if (isNaN(idNum)) {
      return errorResponse(res, '无效的路线ID', 400)
    }

    const route = await prisma.route.findUnique({
      where: { id: idNum }
    })

    if (!route) {
      return errorResponse(res, '路线不存在', 404)
    }

    if (route.userId !== userId) {
      return errorResponse(res, '无权删除', 403)
    }

    await prisma.route.delete({ where: { id: idNum } })

    successResponse(res, null)
  } catch (error) {
    next(error)
  }
})

export default router
