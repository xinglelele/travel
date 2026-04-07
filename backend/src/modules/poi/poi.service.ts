/**
 * POI 推荐服务
 * 基于文本向量相似度的智能推荐算法
 */

import { prisma } from '../../config'
import { callQwenEmbedding } from '../../external/qwen'
import { normalizeUrl } from '../../shared/utils/url'

// ============================================
// 常量定义
// ============================================

/** 向量维度（通义千问 text-embedding-v3 标准维度） */
const EMBEDDING_DIM = 1024

/** 综合评分权重配置 */
const SCORE_WEIGHTS = {
  vectorSimilarity: 0.4,  // 向量相似度
  heatScore: 0.3,         // 热度分数
  distanceScore: 0.2,     // 距离评分
  tagMatch: 0.1          // 标签匹配
}

/** 用户 embedding 缓存 TTL（毫秒） */
const USER_EMBEDDING_CACHE_TTL = 5 * 60 * 1000  // 5分钟

/** 候选 POI 数量 */
const CANDIDATE_POI_LIMIT = 200

// ============================================
// 类型定义
// ============================================

export interface POIEmbedding {
  poiId: number
  poiUuid: string
  embedding: number[]
  textContent: string
}

export interface ScoredPOI {
  poi: any
  score: number
  vectorSimilarity: number
  tagMatchWeight: number
}

export interface RecommendParams {
  userId?: number
  latitude?: number
  longitude?: number
  page?: number
  pageSize?: number
  useEmbedding?: boolean
}

export interface RecommendResult {
  list: any[]
  total: number
  personalized: boolean
  hasEmbedding: boolean
}

// ============================================
// 工具函数
// ============================================

/**
 * 计算余弦相似度
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    console.warn('[cosineSimilarity] 向量维度不一致')
    return 0
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) return 0
  return dotProduct / (normA * normB)
}

/**
 * 计算两点间距离（米）- Haversine 公式
 */
export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000  // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * 多维度综合评分
 */
export function calculateRecommendScore(params: {
  vectorSimilarity: number  // 0-1
  heatScore: number          // 0-100
  distance?: number           // 米
  tagMatchWeight: number     // 0-1
}): number {
  const vectorScore = params.vectorSimilarity  // 已经是0-1
  const heatScore = params.heatScore / 100     // 归一化到0-1

  // 距离评分：5km内线性衰减
  const maxDistance = 5000
  let distanceScore = 0.5  // 无距离信息时给中等分数
  if (params.distance !== undefined) {
    distanceScore = Math.max(0, 1 - params.distance / maxDistance)
  }

  const totalScore =
    vectorScore * SCORE_WEIGHTS.vectorSimilarity +
    heatScore * SCORE_WEIGHTS.heatScore +
    distanceScore * SCORE_WEIGHTS.distanceScore +
    params.tagMatchWeight * SCORE_WEIGHTS.tagMatch

  return Math.round(totalScore * 100) / 100
}

// ============================================
// POI 推荐服务类
// ============================================

export class POIRecommendService {
  // 用户 embedding 缓存
  private userEmbeddingCache: Map<string, { embedding: number[], expireAt: number }> = new Map()

  /**
   * 获取 POI 推荐列表
   */
  async getRecommend(params: RecommendParams): Promise<RecommendResult> {
    const {
      page = 1,
      pageSize = 20,
      useEmbedding = true
    } = params

    // 1. 获取候选 POI（预筛选）
    const candidatePois = await this.getCandidatePOIs({
      limit: CANDIDATE_POI_LIMIT
    })

    if (candidatePois.length === 0) {
      return { list: [], total: 0, personalized: false, hasEmbedding: false }
    }

    // 2. 获取用户向量（若有）
    let userEmbedding: number[] | null = null
    let userPreferences: string[] = []
    let personalized = false

    if (params.userId) {
      const userVec = await this.getUserEmbedding(params.userId)
      userEmbedding = userVec?.embedding || null

      // 获取用户偏好标签
      const preferences = await this.getUserPreferences(params.userId)
      userPreferences = this.flattenPreferenceTags(preferences)
      personalized = !!userEmbedding || userPreferences.length > 0
    }

    // 3. 计算综合评分
    const scoredPois = await Promise.all(
      candidatePois.map(async (poi) => {
        // 计算向量相似度
        let vectorSimilarity = 0
        let poiEmbedding: number[] | null = null

        if (useEmbedding && userEmbedding) {
          poiEmbedding = await this.getPOIEmbedding(poi.id)
          if (poiEmbedding) {
            vectorSimilarity = cosineSimilarity(userEmbedding, poiEmbedding)
          }
        }

        // 计算标签匹配度
        const tagMatchWeight = this.calculateTagMatch(poi, userPreferences)

        // 计算综合评分
        const score = calculateRecommendScore({
          vectorSimilarity,
          heatScore: poi.latestStats?.heatScore ? Number(poi.latestStats.heatScore) : 0,
          distance: params.latitude && params.longitude
            ? calculateDistance(params.latitude, params.longitude,
                Number(poi.latitude), Number(poi.longitude))
            : undefined,
          tagMatchWeight
        })

        return {
          poi: this.transformPoi(poi),
          score,
          vectorSimilarity,
          tagMatchWeight
        }
      })
    )

    // 4. 按综合评分排序
    scoredPois.sort((a, b) => b.score - a.score)

    // 5. 分页返回
    const total = scoredPois.length
    const list = scoredPois
      .slice((page - 1) * pageSize, page * pageSize)
      .map(p => p.poi)  // 移除内部评分字段

    return {
      list,
      total,
      personalized,
      hasEmbedding: !!userEmbedding
    }
  }

  /**
   * 获取用户 embedding
   */
  async getUserEmbedding(userId: number): Promise<{ embedding: number[] } | null> {
    // 检查缓存
    const cacheKey = `user:${userId}`
    const cached = this.userEmbeddingCache.get(cacheKey)
    if (cached && cached.expireAt > Date.now()) {
      console.log(`[POI Recommend] 使用缓存的用户 embedding: userId=${userId}`)
      return { embedding: cached.embedding }
    }

    // 获取用户偏好
    const preferences = await this.getUserPreferences(userId)
    if (!preferences) return null

    // 构建用户偏好文本
    const userText = this.buildUserPreferenceText(preferences)
    if (!userText) return null

    // 生成 embedding
    try {
      const embedding = await callQwenEmbedding(userText)
      console.log(`[POI Recommend] 生成用户 embedding 成功: userId=${userId}`)

      // 更新缓存
      this.userEmbeddingCache.set(cacheKey, {
        embedding,
        expireAt: Date.now() + USER_EMBEDDING_CACHE_TTL
      })

      return { embedding }
    } catch (error) {
      console.error(`[POI Recommend] 生成用户 embedding 失败: userId=${userId}`, error)
      return null
    }
  }

  /**
   * 获取用户偏好
   */
  private async getUserPreferences(userId: number): Promise<any | null> {
    try {
      const pref = await prisma.userPreference.findUnique({
        where: { userId }
      })
      return pref
    } catch (error) {
      console.error('[POI Recommend] 获取用户偏好失败:', error)
      return null
    }
  }

  /**
   * 扁平化偏好标签
   */
  private flattenPreferenceTags(preferences: any | null): string[] {
    if (!preferences?.preferenceTags) return []

    const tags = preferences.preferenceTags
    const result: string[] = []

    if (Array.isArray(tags.intensity)) result.push(...tags.intensity)
    if (Array.isArray(tags.interests)) result.push(...tags.interests)
    if (Array.isArray(tags.theme)) result.push(...tags.theme)
    if (Array.isArray(tags.cuisine)) result.push(...tags.cuisine)
    if (Array.isArray(tags.mood)) result.push(...tags.mood)

    return [...new Set(result)]  // 去重
  }

  /**
   * 构建用户偏好文本
   */
  private buildUserPreferenceText(preferences: any): string {
    const parts: string[] = []

    if (preferences?.preferenceTags) {
      const tags = preferences.preferenceTags

      // 活动强度描述
      if (tags.intensity && Array.isArray(tags.intensity)) {
        const intensityMap: Record<string, string> = {
          'leisure': '喜欢休闲轻松的旅行方式',
          'explorer': '喜欢探索冒险、暴走特种兵',
          'intimate': '喜欢深度体验、慢旅行'
        }
        tags.intensity.forEach((code: string) => {
          if (intensityMap[code]) parts.push(intensityMap[code])
        })
      }

      // 兴趣偏好描述
      if (tags.interests && Array.isArray(tags.interests)) {
        const interestMap: Record<string, string> = {
          'historical': '对历史建筑感兴趣',
          'nature': '喜欢自然风光',
          'art': '喜欢艺术展览',
          'food': '喜欢美食',
          'coffee': '喜欢咖啡文化',
          'museum': '喜欢参观博物馆',
          'culture': '对文化遗产感兴趣'
        }
        tags.interests.forEach((code: string) => {
          if (interestMap[code]) parts.push(interestMap[code])
        })
      }

      // 主题标签
      if (tags.theme && Array.isArray(tags.theme)) {
        const themeMap: Record<string, string> = {
          'family': '亲子游',
          'couple': '情侣游',
          'shopping': '购物娱乐',
          'nightlife': '夜生活'
        }
        tags.theme.forEach((code: string) => {
          if (themeMap[code]) parts.push(themeMap[code])
        })
      }

      // 菜系偏好
      if (tags.cuisine && Array.isArray(tags.cuisine)) {
        const cuisineMap: Record<string, string> = {
          'local_food': '喜欢当地美食',
          'cafe': '喜欢咖啡文化'
        }
        tags.cuisine.forEach((code: string) => {
          if (cuisineMap[code]) parts.push(cuisineMap[code])
        })
      }

      // 旅行心情
      if (tags.mood && Array.isArray(tags.mood)) {
        const moodMap: Record<string, string> = {
          'relaxed': '希望放松休闲',
          'adventure': '追求冒险刺激'
        }
        tags.mood.forEach((code: string) => {
          if (moodMap[code]) parts.push(moodMap[code])
        })
      }
    }

    // 国籍（影响推荐风格）
    const regionMap: Record<number, string> = {
      0: '日韩游客',
      1: '国内游客',
      2: '欧美游客',
      3: '本地居民'
    }
    if (preferences.fromRegion !== undefined && regionMap[preferences.fromRegion]) {
      parts.push(regionMap[preferences.fromRegion])
    }

    const result = parts.join('。')
    console.log(`[POI Recommend] 用户偏好文本: "${result}"`)
    return result
  }

  /**
   * 计算标签匹配度
   */
  private calculateTagMatch(poi: any, userPreferences: string[]): number {
    if (!userPreferences.length || !poi.poiTags?.length) return 0

    const poiTags = poi.poiTags
      .map((rel: any) => rel.tag?.tagCode)
      .filter(Boolean)

    const matchedCount = userPreferences.filter(pref =>
      poiTags.some((poiTag: string) =>
        poiTag.includes(pref) || pref.includes(poiTag)
      )
    ).length

    return matchedCount / Math.max(userPreferences.length, 1)
  }

  /**
   * 获取候选 POI
   */
  private async getCandidatePOIs(params: { limit: number }): Promise<any[]> {
    const pois = await prisma.poiInfo.findMany({
      where: { status: 1 },
      include: {
        poiTags: { include: { tag: true } },
        stats: true,
        tickets: { where: { status: 1 }, take: 1 }
      },
      take: params.limit * 2  // 多取一些，排序后再截取
    })

    // 按热度排序（一对多关系，需要在代码中排序）
    return pois
      .map(poi => ({
        ...poi,
        // 取最新的统计数据
        latestStats: poi.stats.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0] || null
      }))
      .sort((a, b) => {
        const scoreA = a.latestStats?.heatScore || 0
        const scoreB = b.latestStats?.heatScore || 0
        return Number(scoreB) - Number(scoreA)
      })
      .slice(0, params.limit)
  }

  /**
   * 获取 POI embedding
   */
  async getPOIEmbedding(poiId: number): Promise<number[] | null> {
    // 从数据库获取缓存的 embedding
    const poi = await prisma.poiInfo.findUnique({
      where: { id: poiId }
    })

    if (!poi?.embedding) {
      return null
    }

    // embedding 存储为 JSON，需要解析
    try {
      if (typeof poi.embedding === 'string') {
        return JSON.parse(poi.embedding)
      }
      return poi.embedding as number[]
    } catch (error) {
      console.error(`[POI Recommend] 解析 POI embedding 失败: poiId=${poiId}`, error)
      return null
    }
  }

  /**
   * 为 POI 生成文本并获取 embedding
   */
  async generatePOIEmbedding(poi: any): Promise<{ embedding: number[], textContent: string } | null> {
    try {
      const textContent = this.buildPOIText(poi)
      const embedding = await callQwenEmbedding(textContent)
      return { embedding, textContent }
    } catch (error) {
      console.error(`[POI Recommend] 生成 POI embedding 失败: poiId=${poi.id}`, error)
      return null
    }
  }

  /**
   * 构建 POI 文本内容
   */
  private buildPOIText(poi: any): string {
    const parts: string[] = []

    // 1. POI 名称
    const name = typeof poi.poiName === 'string'
      ? poi.poiName
      : poi.poiName?.zh || poi.poiName?.['zh-CN'] || poi.poiName?.en || ''
    if (name) parts.push(`景点名称：${name}`)

    // 2. POI 描述
    const desc = typeof poi.description === 'string'
      ? poi.description
      : poi.description?.zh || poi.description?.['zh-CN'] || ''
    if (desc) parts.push(`景点描述：${desc}`)

    // 3. 标签名称
    if (poi.poiTags && poi.poiTags.length > 0) {
      const tagNames = poi.poiTags
        .map((rel: any) => {
          const tag = rel.tag
          if (!tag) return ''
          if (typeof tag.tagName === 'string') return tag.tagName
          return tag.tagName?.zh || tag.tagName?.['zh-CN'] || ''
        })
        .filter(Boolean)
      if (tagNames.length > 0) {
        parts.push(`景点标签：${tagNames.join('、')}`)
      }
    }

    // 4. 类型分类
    if (poi.poiType) parts.push(`景点类型：${poi.poiType}`)

    // 5. 地区
    if (poi.district) parts.push(`所在地区：${poi.district}`)

    return parts.join('\n')
  }

  /**
   * POI 数据结构转换（与 routes.ts 保持一致）
   */
  private transformPoi(poi: any): any {
    let images = ['/static/logo.png']
    if (poi.photos) {
      try {
        const photos = typeof poi.photos === 'string' ? JSON.parse(poi.photos) : poi.photos
        images = Array.isArray(photos) && photos.length > 0
          ? photos.map((p: string) => normalizeUrl(p))
          : ['/static/logo.png']
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
      rating: poi.latestStats?.heatScore ? Number(poi.latestStats.heatScore) / 2 : 4.5,
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
}

// 导出单例
export const poiRecommendService = new POIRecommendService()
