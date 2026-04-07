import { prisma } from '../../config'

/**
 * GPS 打卡距离校验配置
 */
const CHECK_IN_CONFIG = {
  /** 打卡有效距离（米） */
  MAX_DISTANCE: 200,
  /** GPS 误差容错（米），考虑设备定位误差 */
  TOLERANCE: 40,
  /** 最终有效距离 = MAX_DISTANCE + TOLERANCE = 240m */
  get effectiveDistance() {
    return this.MAX_DISTANCE + this.TOLERANCE
  },
}

export interface CreateCheckParams {
  userId: number
  poiId: string
  latitude: number
  longitude: number
  routeId?: number
  note?: string
}

export interface GetMyChecksParams {
  userId: number
  page: number
  pageSize: number
  startDate?: string
  endDate?: string
}

export class CheckService {
  /**
   * Haversine 公式计算两点间距离
   */
  private calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * 创建打卡记录
   * @param params 打卡参数
   * @returns 创建结果
   */
  async createCheck(params: CreateCheckParams): Promise<{
    success: boolean
    message: string
    data?: any
    distance?: number
  }> {
    const { userId, poiId, latitude, longitude, routeId, note } = params

    // 1. 查询 POI 信息
    const poi = await prisma.poiInfo.findUnique({
      where: { poiUuid: poiId },
    })

    if (!poi) {
      return { success: false, message: '景点不存在' }
    }

    // 2. 计算用户与 POI 的距离
    const distance = this.calcDistance(
      latitude,
      longitude,
      Number(poi.latitude),
      Number(poi.longitude)
    )

    // 3. 距离校验（含容错）
    if (distance > CHECK_IN_CONFIG.effectiveDistance) {
      const formattedDistance = distance < 1000
        ? `${Math.round(distance)}米`
        : `${(distance / 1000).toFixed(1)}公里`

      return {
        success: false,
        message: `您距离景点还有${formattedDistance}，请靠近后再打卡`,
        distance: Math.round(distance),
      }
    }

    // 4. 限制：同一用户同一 POI 每天只能打卡一次
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now)
    todayEnd.setHours(23, 59, 59, 999)

    const existingTodayCheck = await prisma.checkInfo.findFirst({
      where: {
        userId,
        poiId: poi.id,
        checkTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    })

    if (existingTodayCheck) {
      return {
        success: false,
        message: '今日已在此景点打卡，请明日再来',
      }
    }

    const hourTag = now.getHours()
    const weekTag = now.getDay()
    const monthTag = now.getMonth() + 1
    const yearTag = now.getFullYear()

    // 6. 创建打卡记录
    const check = await prisma.checkInfo.create({
      data: {
        userId,
        poiId: poi.id,
        routeId: routeId || null,
        checkTime: now,
        longitude: latitude.toString(), // 存储用户打卡位置
        latitude: longitude.toString(),
        distance: distance,
        stayMins: null,
        hourTag,
        weekTag,
        monthTag,
        yearTag,
        dayTag: now,
        note: note || null,
      },
      include: {
        poi: {
          select: {
            poiUuid: true,
            poiName: true,
            photos: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    })

    // 7. 更新 POI 统计数据
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 关键：转换成纯日期字符串（只保留 YYYY-MM-DD）
    const dateOnly = today.toISOString().split('T')[0]

    // 使用 $executeRaw 绕过 Prisma upsert 的 Date 处理问题
    await prisma.$executeRaw`
      INSERT INTO poi_stats (poi_id, date, check_count, heat_score, avg_stay_time, created_at, updated_at)
      VALUES (${poi.id}, ${dateOnly}, 1, 50, 0, NOW(), NOW())
      ON DUPLICATE KEY UPDATE check_count = check_count + 1, updated_at = NOW()
    `

    // 8. 格式化返回数据
    let poiName = ''
    if (check.poi.poiName) {
      if (typeof check.poi.poiName === 'string') {
        poiName = check.poi.poiName
      } else {
        poiName = check.poi.poiName?.zh || check.poi.poiName?.['zh-CN'] || ''
      }
    }

    let images = ['/static/logo.png']
    if (check.poi.photos) {
      try {
        const photos = typeof check.poi.photos === 'string'
          ? JSON.parse(check.poi.photos)
          : check.poi.photos
        images = Array.isArray(photos) && photos.length > 0 ? photos : ['/static/logo.png']
      } catch {
        images = ['/static/logo.png']
      }
    }

    return {
      success: true,
      message: '打卡成功',
      data: {
        id: `${check.id}`,
        poiId: check.poi.poiUuid,
        poiName,
        poiImage: images[0],
        latitude: Number(check.latitude),
        longitude: Number(check.longitude),
        checkedAt: check.checkTime.toISOString(),
        distance: Math.round(distance),
        note: check.note,
      },
      distance,
    }
  }

  /**
   * 获取我的打卡记录
   */
  async getMyChecks(params: GetMyChecksParams): Promise<{
    list: any[]
    total: number
  }> {
    const { userId, page, pageSize, startDate, endDate } = params

    // 构建查询条件
    const where: any = { userId }

    if (startDate || endDate) {
      where.dayTag = {}
      if (startDate) {
        const d = new Date(startDate)
        if (!isNaN(d.getTime())) where.dayTag.gte = d
      }
      if (endDate) {
        const end = new Date(endDate)
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999)
          where.dayTag.lte = end
        }
      }
    }

    // 查询总数
    const total = await prisma.checkInfo.count({ where })

    // 查询列表
    const checks = await prisma.checkInfo.findMany({
      where,
      include: {
        poi: {
          select: {
            poiUuid: true,
            poiName: true,
            photos: true,
            latitude: true,
            longitude: true,
            address: true,
          },
        },
        route: {
          select: {
            id: true,
            routeName: true,
          },
        },
      },
      orderBy: { checkTime: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // 格式化返回
    const list = checks.map((check) => {
      let poiName = ''
      if (check.poi.poiName) {
        if (typeof check.poi.poiName === 'string') {
          poiName = check.poi.poiName
        } else {
          poiName = check.poi.poiName?.zh || check.poi.poiName?.['zh-CN'] || ''
        }
      }

      let address = ''
      if (check.poi.address) {
        if (typeof check.poi.address === 'string') {
          address = check.poi.address
        } else {
          address = check.poi.address?.zh || check.poi.address?.['zh-CN'] || ''
        }
      }

      let images = ['/static/logo.png']
      if (check.poi.photos) {
        try {
          const photos = typeof check.poi.photos === 'string'
            ? JSON.parse(check.poi.photos)
            : check.poi.photos
          images = Array.isArray(photos) && photos.length > 0 ? photos : ['/static/logo.png']
        } catch {
          images = ['/static/logo.png']
        }
      }

      return {
        id: `${check.id}`,
        poiId: check.poi.poiUuid,
        poiName,
        poiImage: images[0],
        address,
        latitude: Number(check.latitude),
        longitude: Number(check.longitude),
        checkedAt: check.checkTime.toISOString(),
        note: check.note,
        routeId: check.routeId,
        routeName: check.route?.routeName,
        distance: check.distance ? Number(check.distance) : null,
      }
    })

    return { list, total }
  }

  /**
   * 校验用户是否已打卡某景点
   * @param userId 用户ID
   * @param poiId POI 数据库ID
   * @param maxDistance 最大允许距离（米）
   */
  async verifyUserCheckedIn(
    userId: number,
    poiId: number,
    maxDistance: number = CHECK_IN_CONFIG.effectiveDistance
  ): Promise<{
    verified: boolean
    message: string
    lastCheck?: {
      checkedAt: string
      distance: number
    }
  }> {
    // 查询用户对该 POI 的最近打卡记录
    const lastCheck = await prisma.checkInfo.findFirst({
      where: {
        userId,
        poiId,
      },
      orderBy: { checkTime: 'desc' },
    })

    if (!lastCheck) {
      return {
        verified: false,
        message: '您还未在此景点打卡，请先到景点附近打卡',
      }
    }

    // 检查打卡距离是否在有效范围内
    const distance = lastCheck.distance ? Number(lastCheck.distance) : 0
    if (distance > maxDistance) {
      return {
        verified: false,
        message: '您的打卡位置距离景点过远，无法发表评论',
        lastCheck: {
          checkedAt: lastCheck.checkTime.toISOString(),
          distance,
        },
      }
    }

    return {
      verified: true,
      message: '已确认您在景点打卡',
      lastCheck: {
        checkedAt: lastCheck.checkTime.toISOString(),
        distance,
      },
    }
  }
}

export const checkService = new CheckService()
