import { prisma } from '../../config'
import { checkService } from '../check/check.service'
import { normalizeUrl } from '../../shared/utils/url'

export interface CreateCommentParams {
  userId: number
  poiId: string
  rating: number
  content: string
  images?: string[]
  routeId?: number
}

export interface GetCommentListParams {
  poiId: string
  sort: 'time' | 'rating'
  page: number
  pageSize: number
}

export class CommentService {
  /**
   * 发表评论
   * @param params 评论参数
   * @returns 创建结果
   */
  async createComment(params: CreateCommentParams): Promise<{
    success: boolean
    message: string
    data?: any
  }> {
    const { userId, poiId, rating, content, images, routeId } = params

    // 1. 查询 POI 信息（含标签，用于发现页分类）
    const poi = await prisma.poiInfo.findUnique({
      where: { poiUuid: poiId },
      include: {
        poiTags: { include: { tag: true } }
      }
    })

    if (!poi) {
      return { success: false, message: '景点不存在' }
    }

    // 2. 打卡前置校验：用户必须先在该景点打卡才能评论
    const checkVerifyResult = await checkService.verifyUserCheckedIn(userId, poi.id)

    if (!checkVerifyResult.verified) {
      return {
        success: false,
        message: checkVerifyResult.message + '，请先到景点打卡后再发表评论',
      }
    }

    // 3. 限制：同一用户对同一 POI 只能评论一次
    const existingComment = await prisma.commentInfo.findFirst({
      where: {
        userId,
        poiId: poi.id,
        status: 1,
      },
    })

    if (existingComment) {
      return {
        success: false,
        message: '您已对此景点发表过评论，请勿重复提交',
      }
    }

    // 4. 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nickname: true,
        avatar: true,
      },
    })

    // 5. 创建评论记录
    const comment = await prisma.commentInfo.create({
      data: {
        userId,
        poiId: poi.id,
        routeId: routeId || null,
        rating: rating,
        content: content,
        images: images ? JSON.stringify(images) : null,
        status: 1,
        auditStatus: 0,
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
    })

    // 同步创建发现页内容（用户生成内容）
    const poiName = typeof poi.poiName === 'string'
      ? poi.poiName
      : (poi.poiName as any)?.zh || (poi.poiName as any)?.['zh-CN'] || ''

    const poiTags = poi.poiTags
      .map(rel => {
        const name = typeof rel.tag?.tagName === 'string'
          ? rel.tag.tagName
          : (rel.tag?.tagName as any)?.zh || ''
        return name
      })
      .filter(Boolean) as string[]

    let poiCoverImage: string | null = null
    if (poi.photos) {
      try {
        const photos = typeof poi.photos === 'string' ? JSON.parse(poi.photos) : poi.photos
        poiCoverImage = Array.isArray(photos) && photos.length > 0 ? normalizeUrl(photos[0]) : null
      } catch {}
    }

    await prisma.userContent.create({
      data: {
        userId,
        poiId: poi.id,
        commentId: comment.id,
        rating: comment.rating,
        content: comment.content,
        images: comment.images,
        category: poi.poiType || null,
        tags: JSON.stringify(poiTags),
        poiName: { 'zh-CN': poiName, zh: poiName, en: poiName } as any,
        poiCoverImage,
        status: 1,
      },
    })

    // 6. 格式化返回数据
    let parsedImages: string[] = []
    if (comment.images) {
      try {
        parsedImages = typeof comment.images === 'string'
          ? JSON.parse(comment.images)
          : comment.images
      } catch {
        parsedImages = []
      }
    }

    return {
      success: true,
      message: '评论发布成功',
      data: {
        id: `${comment.id}`,
        userId: `${comment.userId}`,
        userNickname: comment.user?.nickname || '匿名用户',
        userAvatar: normalizeUrl(comment.user?.avatar || '/static/default-avatar.png'),
        poiId: poiId,
        rating: Number(comment.rating),
        content: comment.content,
        images: parsedImages?.map((img: string) => normalizeUrl(img)),
        createdAt: comment.createdAt.toISOString(),
        helpfulCount: comment.helpfulCount,
      },
    }
  }

  /**
   * 获取评论列表
   */
  async getCommentList(params: GetCommentListParams): Promise<{
    list: any[]
    total: number
    stats: {
      avgRating: number
      total: number
      distribution: Record<string, number>
    }
  }> {
    const { poiId, sort, page, pageSize } = params

    // 1. 查询 POI 数据库 ID
    const poi = await prisma.poiInfo.findUnique({
      where: { poiUuid: poiId },
    })

    if (!poi) {
      return {
        list: [],
        total: 0,
        stats: { avgRating: 0, total: 0, distribution: {} },
      }
    }

    // 2. 查询评论总数和评分统计
    const [totalResult, ratingStats] = await Promise.all([
      prisma.commentInfo.count({
        where: {
          poiId: poi.id,
          status: 1,
        },
      }),
      prisma.commentInfo.groupBy({
        by: ['rating'],
        where: {
          poiId: poi.id,
          status: 1,
        },
        _count: { rating: true },
      }),
    ])

    // 3. 计算评分统计
    const distribution: Record<string, number> = {
      '5': 0,
      '4': 0,
      '3': 0,
      '2': 0,
      '1': 0,
    }
    let totalRating = 0

    ratingStats.forEach((stat) => {
      const ratingKey = String(Number(stat.rating))
      distribution[ratingKey] = stat._count.rating
      totalRating += Number(stat.rating) * stat._count.rating
    })

    const avgRating = totalResult > 0 ? (totalRating / totalResult).toFixed(1) : '0'

    // 4. 查询评论列表
    const orderBy = sort === 'rating'
      ? { rating: 'desc' as const }
      : { createdAt: 'desc' as const }

    const comments = await prisma.commentInfo.findMany({
      where: {
        poiId: poi.id,
        status: 1,
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatar: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    })

    // 5. 格式化返回
    const list = comments.map((comment) => {
      let parsedImages: string[] = []
      if (comment.images) {
        try {
          parsedImages = typeof comment.images === 'string'
            ? JSON.parse(comment.images)
            : comment.images
        } catch {
          parsedImages = []
        }
      }

      return {
        id: `${comment.id}`,
        userId: `${comment.userId}`,
        userNickname: comment.user?.nickname || '匿名用户',
        userAvatar: normalizeUrl(comment.user?.avatar || '/static/default-avatar.png'),
        poiId: poiId,
        rating: Number(comment.rating),
        content: comment.content,
        images: parsedImages.map((img: string) => normalizeUrl(img)),
        createdAt: comment.createdAt.toISOString(),
        helpfulCount: comment.helpfulCount,
        merchantReply: comment.merchantReply,
        replyTime: comment.replyTime?.toISOString(),
      }
    })

    return {
      list,
      total: totalResult,
      stats: {
        avgRating: parseFloat(avgRating),
        total: totalResult,
        distribution,
      },
    }
  }
  /**
   * 检查用户是否有权评论（点击"评论"按钮时调用）
   * @param userId 用户ID
   * @param poiId 景点 UUID
   * @returns 是否有权评论及原因
   */
  async canComment(userId: number, poiId: string): Promise<{
    allowed: boolean
    message: string
  }> {
    // 1. 查询 POI 信息
    const poi = await prisma.poiInfo.findUnique({
      where: { poiUuid: poiId },
    })

    if (!poi) {
      return { allowed: false, message: '景点不存在' }
    }

    // 2. 检查是否已打过卡
    const checkVerify = await checkService.verifyUserCheckedIn(userId, poi.id)
    if (!checkVerify.verified) {
      return { allowed: false, message: checkVerify.message }
    }

    // 3. 检查是否已评论过
    const existingComment = await prisma.commentInfo.findFirst({
      where: { userId, poiId: poi.id, status: 1 },
    })

    if (existingComment) {
      return { allowed: false, message: '您已对此景点发表过评论' }
    }

    return { allowed: true, message: '可以评论' }
  }
}

export const commentService = new CommentService()
