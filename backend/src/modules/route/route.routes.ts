import { Router } from 'express'
import { requiredAuth } from '../../shared/middleware/auth'
import { prisma } from '../../config'
import { successResponse, errorResponse } from '../../shared/utils/response'

const router = Router()

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
      if (typeof r.routeName === 'string') {
        routeName = r.routeName
      } else {
        routeName = r.routeName?.['zh-CN'] || r.routeName?.zh || r.routeName?.en || ''
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
    if (typeof route.routeName === 'string') {
      routeName = route.routeName
    } else {
      routeName = route.routeName?.['zh-CN'] || route.routeName?.zh || route.routeName?.en || ''
    }

    let description = ''
    if (route.description) {
      if (typeof route.description === 'string') {
        description = route.description
      } else {
        description = route.description?.['zh-CN'] || route.description?.zh || ''
      }
    }

    // 解析 POI 列表
    let poiList: any[] = []
    if (route.poiList) {
      try {
        poiList = typeof route.poiList === 'string' ? JSON.parse(route.poiList as string) : route.poiList
      } catch {}
    }

    // 收集 poiId 列表并查询 POI 详情
    const poiIds = poiList.map((p: any) => p.poiId).filter(Boolean)
    const poisMap: Map<number, any> = new Map()
    if (poiIds.length > 0) {
      const pois = await prisma.poiInfo.findMany({
        where: { id: { in: poiIds } }
      })
      pois.forEach(p => {
        let name = typeof p.poiName === 'string' ? p.poiName : (p.poiName?.['zh-CN'] || p.poiName?.zh || '')
        let addr = typeof p.address === 'string' ? p.address : (p.address?.['zh-CN'] || '')
        poisMap.set(p.id, {
          id: p.poiUuid,
          name,
          latitude: Number(p.latitude),
          longitude: Number(p.longitude),
          address: addr
        })
      })
    }

    const enrichedPois = poiList.map((p: any, idx: number) => ({
      ...(poisMap.get(p.poiId) || {}),
      dayNum: p.dayNum || 1,
      sequence: idx
    }))

    successResponse(res, {
      id: route.id,
      name: routeName,
      description,
      days: route.totalDays,
      coverImage: route.coverImage || '',
      tags: route.tags ? (typeof route.tags === 'string' ? JSON.parse(route.tags) : route.tags) : [],
      pois: enrichedPois,
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
    const { name, days, pois, tags, coverImage, description } = req.body

    if (!name) {
      return errorResponse(res, '请输入路线名称', 400)
    }

    // routeName 存为多语言格式
    const routeName: Record<string, string> = { 'zh-CN': name, zh: name, en: name }

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
      name,
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
