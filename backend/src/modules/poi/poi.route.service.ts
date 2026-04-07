/**
 * AI 路线生成服务
 * 实现 "Retrieve-then-Generate" 架构：先从数据库召回候选 POI，再让 LLM 从候选中选择编排
 *
 * 防幻觉核心：LLM 只能从提供的候选 POI ID 列表中选择，最终校验每个 poiId 是否真实存在
 */

import { prisma } from '../../config'
import { callQwen } from '../../external/qwen'
import { cosineSimilarity, calculateDistance } from './poi.service'
import { normalizeUrl } from '../../shared/utils/url'

// ============================================
// 常量
// ============================================

/** 候选 POI 数量上限（控制 Prompt 长度） */
const MAX_CANDIDATE_POIS = 50
/** 每个标签最多召回 POI 数量 */
const MAX_POIS_PER_TAG = 15
/** 热门 POI 兜底数量 */
const HOT_POI_FALLBACK = 20
/** 路线总 POI 建议上限（按天均分） */
const MAX_POIS_PER_DAY = 6

// ============================================
// 类型
// ============================================

export interface GenerateRouteParams {
  prompt: string
  days?: number
  startLatitude?: number
  startLongitude?: number
  userId?: number
}

export interface RoutePoi {
  id: string       // poiUuid
  poiId: number    // 数据库主键
  name: string
  latitude: number
  longitude: number
  category: string
  tags: string[]
  reason?: string
  stayTime?: number
  images?: string[]
}

export interface RouteDay {
  day: number
  description?: string
  pois: RoutePoi[]
}

export interface GeneratedRoute {
  id: string
  title: string
  description: string
  days: number
  schedule: RouteDay[]
  tags: string[]
  totalPoi: number
  poiCount: number
  remainingCount: number
}

// ============================================
// 意图解析（LLM 第一步：理解用户需求）
// ============================================

interface ParsedIntent {
  days: number
  intentType: 'explicit' | 'vague'   // 明确意图（有具体地点）vs 模糊意图（只有标签/偏好）
  constraints: {
    tags: string[]          // 结构化标签，如 ["川菜", "博物馆", "历史建筑"]
    explicitPois: string[]  // 用户提到的具体地点名
    mood?: string           // 心情/氛围，如 "休闲", "暴走", "亲子"
    budget?: string         // 预算，如 "穷游", "奢华"
  }
  summary: string            // 意图摘要（用于调试/日志）
}

/**
 * 调用 Qwen 解析用户输入，提取结构化意图
 * Level 1: 正常调用 LLM 解析
 * Level 2/3: 解析失败时降级为关键词匹配
 */
async function parseUserIntent(prompt: string, days?: number): Promise<ParsedIntent> {
  const systemPrompt = `你是一位专业的旅游规划助手。请分析用户的旅行需求，输出 JSON 格式的结构化信息。

分析规则：
1. days：解析用户提到的游玩天数，若未提及则根据游玩范围估算（景点多→3-5天，少→1-2天）
2. intentType：
   - "explicit"：用户提到了具体地点名称（如外滩、豫园、田子坊）
   - "vague"：用户只描述偏好/标签，没有具体地点
3. constraints.tags：提取可映射到 POI 分类的关键词（景点类型、菜系、主题等）
4. constraints.explicitPois：列出用户提到的具体地点名称原文
5. constraints.mood：提取心情/节奏偏好（leisure/explorer/intimate）
6. constraints.budget：提取预算关键词

输出 JSON 示例：
{
  "days": 3,
  "intentType": "vague",
  "constraints": {
    "tags": ["川菜", "博物馆", "历史建筑"],
    "explicitPois": [],
    "mood": "leisure"
  },
  "summary": "3天上海休闲游，想吃川菜，喜欢历史和博物馆"
}`

  try {
    const response = await callQwen([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `用户输入：${prompt}` }
    ])

    // 尝试从回复中提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[RouteGen] LLM 返回非 JSON，降级为关键词解析')
      return fallbackParseIntent(prompt, days)
    }

    const parsed = JSON.parse(jsonMatch[0])
    return {
      days: parsed.days || days || 1,
      intentType: parsed.intentType || 'vague',
      constraints: {
        tags: parsed.constraints?.tags || [],
        explicitPois: parsed.constraints?.explicitPois || [],
        mood: parsed.constraints?.mood,
        budget: parsed.constraints?.budget,
      },
      summary: parsed.summary || prompt
    }
  } catch (error) {
    console.error('[RouteGen] 意图解析失败，降级为关键词解析:', error)
    return fallbackParseIntent(prompt, days)
  }
}

/**
 * 降级意图解析：基于关键词规则提取
 */
function fallbackParseIntent(prompt: string, days?: number): ParsedIntent {
  const text = prompt.toLowerCase()
  let parsedDays = days || 1

  // 关键词匹配天数
  if (text.includes('三天') || text.includes('3天') || text.includes('三日')) parsedDays = 3
  else if (text.includes('两天') || text.includes('2天') || text.includes('两日')) parsedDays = 2
  else if (text.includes('四天') || text.includes('4天')) parsedDays = 4
  else if (text.includes('五天') || text.includes('5天')) parsedDays = 5

  // 标签关键词
  const tagKeywords: Record<string, string[]> = {
    '川菜': ['川菜', '四川菜'],
    '博物馆': ['博物馆', '展览', '馆'],
    '公园': ['公园', '园林', '绿化'],
    '历史建筑': ['历史', '建筑', '老建筑', '古迹'],
    '美食': ['美食', '小吃', '餐厅', '餐饮'],
    '购物': ['购物', '商场', '逛街'],
    '夜景': ['夜景', '夜游'],
    '亲子': ['亲子', '小孩', '儿童'],
    '咖啡': ['咖啡', 'cafe'],
    '文艺': ['文艺', '文创', '艺术'],
  }

  const matchedTags: string[] = []
  for (const [tag, keywords] of Object.entries(tagKeywords)) {
    if (keywords.some(kw => text.includes(kw))) matchedTags.push(tag)
  }

  // 心情识别
  let mood: string | undefined
  if (text.includes('暴走') || text.includes('特种兵') || text.includes('多玩')) mood = 'explorer'
  else if (text.includes('休闲') || text.includes('慢') || text.includes('放松')) mood = 'leisure'
  else if (text.includes('深度') || text.includes('体验')) mood = 'intimate'

  return {
    days: parsedDays,
    intentType: matchedTags.length > 0 ? 'vague' : 'vague',
    constraints: { tags: matchedTags, explicitPois: [], mood },
    summary: prompt
  }
}

// ============================================
// 候选 POI 召回（Retrieve 阶段）
// ============================================

interface CandidatePoi {
  id: number
  poiUuid: string
  poiName: string
  latitude: number
  longitude: number
  category: string
  tags: string[]
  tagCodes: string[]
  heatScore: number
  description: string
  images: string[]
}

/**
 * 从数据库召回候选 POI
 * - 优先按标签匹配（explicit intent）
 * - 补充热门 POI（vague intent / 候选不足时）
 * - 按地理位置过滤（startLocation 附近优先）
 * - 截断到 MAX_CANDIDATE_POIS
 */
async function retrieveCandidates(
  intent: ParsedIntent,
  startLat?: number,
  startLng?: number
): Promise<CandidatePoi[]> {
  // 1. 获取所有启用状态的 POI（带标签和统计）
  const allPois = await prisma.poiInfo.findMany({
    where: { status: 1 },
    include: {
      poiTags: { include: { tag: true } },
      stats: true
    }
  })

  // 2. 标签归一化映射（数据库 tagCode → 标准标签名）
  const tagCodeToLabel: Record<string, string> = {}
  for (const poi of allPois) {
    for (const rel of poi.poiTags) {
      if (rel.tag?.tagCode) {
        tagCodeToLabel[rel.tag.tagCode] = rel.tag.tagName as any ||
          (typeof rel.tag.tagName === 'object' ? (rel.tag.tagName as any)?.zh || (rel.tag.tagName as any)?.['zh-CN'] || '' : '')
      }
    }
  }

  // 3. 转换为统一格式
  const candidates: CandidatePoi[] = allPois.map(poi => {
    const tagNames = poi.poiTags
      .map(rel => {
        const name = typeof rel.tag?.tagName === 'string'
          ? rel.tag.tagName
          : (rel.tag?.tagName as any)?.zh || (rel.tag?.tagName as any)?.['zh-CN'] || ''
        return name
      })
      .filter(Boolean)

    const tagCodes = poi.poiTags.map(rel => rel.tag?.tagCode).filter(Boolean) as string[]

    const pName = typeof poi.poiName === 'string'
      ? poi.poiName
      : (poi.poiName as any)?.zh || (poi.poiName as any)?.['zh-CN'] || ''

    const pDesc = typeof poi.description === 'string'
      ? poi.description
      : (poi.description as any)?.zh || ''

    return {
      id: poi.id,
      poiUuid: poi.poiUuid,
      poiName: pName,
      latitude: Number(poi.latitude),
      longitude: Number(poi.longitude),
      category: poi.poiType || '',
      tags: tagNames,
      tagCodes,
      heatScore: poi.stats?.heatScore || 0,
      description: pDesc,
      images: (() => {
        if (!poi.photos) return ['/static/logo.png']
        try {
          const parsed = typeof poi.photos === 'string' ? JSON.parse(poi.photos) : poi.photos
          const valid = Array.isArray(parsed) ? parsed.filter((p: string) => p && p.trim()) : []
          return valid.length > 0
            ? valid.map((p: string) => normalizeUrl(p.trim()))
            : ['/static/logo.png']
        } catch {
          return ['/static/logo.png']
        }
      })()
    }
  })

  // 4. explicit intent：按地点名精确匹配
  if (intent.intentType === 'explicit' && intent.constraints.explicitPois.length > 0) {
    const explicitMatched = candidates.filter(p =>
      intent.constraints.explicitPois.some(name =>
        p.poiName.includes(name) || name.includes(p.poiName) ||
        p.description.includes(name)
      )
    )
    if (explicitMatched.length > 0) {
      // 保留精确匹配，并按标签补充同类型
      const matchedIds = new Set(explicitMatched.map(p => p.id))
      const tagExpanded = candidates
        .filter(p => !matchedIds.has(p.id))
        .filter(p => intent.constraints.tags.some(tag =>
          p.tags.some(t => t.includes(tag) || tag.includes(t)) ||
          p.tagCodes.some(tc => tc.toLowerCase().includes(tag.toLowerCase()))
        ))
        .sort((a, b) => b.heatScore - a.heatScore)
        .slice(0, MAX_CANDIDATE_POIS - explicitMatched.length)

      return [...explicitMatched, ...tagExpanded].slice(0, MAX_CANDIDATE_POIS)
    }
  }

  // 5. vague intent / 标签匹配
  if (intent.constraints.tags.length > 0) {
    const scored = candidates
      .map(p => {
        let matchScore = 0
        for (const tag of intent.constraints.tags) {
          const tagLower = tag.toLowerCase()
          // 标签名匹配
          if (p.tags.some(t => t.includes(tag) || tag.includes(t))) matchScore += 2
          // tagCode 匹配
          if (p.tagCodes.some(tc => tc.toLowerCase().includes(tagLower))) matchScore += 1.5
          // 描述/类目匹配
          if (p.description.includes(tag) || p.category.includes(tag)) matchScore += 0.5
        }
        // 心情偏好加权
        if (intent.constraints.mood === 'explorer' && p.tags.some(t => t.includes('暴走') || t.includes('户外'))) matchScore += 1
        if (intent.constraints.mood === 'leisure' && p.tags.some(t => t.includes('休闲') || t.includes('咖啡'))) matchScore += 1

        return { p, score: matchScore }
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)

    const tagMatched = scored.slice(0, MAX_CANDIDATE_POIS).map(x => x.p)

    // 附近加权：起始点附近 +0.5
    if (startLat !== undefined && startLng !== undefined) {
      tagMatched.sort((a, b) => {
        const distA = calculateDistance(startLat, startLng, a.latitude, a.longitude)
        const distB = calculateDistance(startLat, startLng, b.latitude, b.longitude)
        return distA - distB
      })
    }

    if (tagMatched.length >= 5) return tagMatched
  }

  // 6. 兜底：返回热门 POI（降级 Level 4/5）
  return candidates
    .sort((a, b) => b.heatScore - a.heatScore)
    .slice(0, HOT_POI_FALLBACK)
}

// ============================================
// 路线生成（Generate 阶段）
// ============================================

/**
 * 调用 Qwen 基于候选 POI 生成路线
 * 强制要求 LLM 只从候选 POI 中选择，且输出 poiUuid
 */
async function generateRouteWithLLM(
  intent: ParsedIntent,
  candidates: CandidatePoi[],
  days: number
): Promise<GeneratedRoute> {
  // 构建候选 POI 列表文本（用于 Prompt）
  const candidateList = candidates.map((p, i) =>
    `[${i}] ID=${p.poiUuid} | ID2=${p.id} | 名称=${p.poiName} | 类型=${p.category} | 标签=${p.tags.join('、')} | 热度=${p.heatScore}`
  ).join('\n')

  const systemPrompt = `你是一位专业的上海旅游规划师，擅长根据用户需求从候选景点列表中选择最适合的景点，合理安排每天的行程。

## 严格规则
1. **只选择候选列表中的景点**（用 ID=poiUuid 引用），不要凭空添加任何不在列表中的地点
2. **每天景点数量建议 3-6 个**，避免过密或过疏
3. **路线要有逻辑**：同一区域/主题的景点安排在同一天
4. **返回严格 JSON 格式**，不要有额外解释文字

## 返回格式
{
  "title": "路线名称",
  "description": "路线特色描述（1-2句）",
  "days": 数字,
  "tags": ["标签1", "标签2"],
  "schedule": [
    {
      "day": 1,
      "description": "当天主题描述",
      "pois": [
        {
          "poiUuid": "poiUuid字符串",
          "poiId": 数字,
          "name": "景点名称",
          "latitude": 数字,
          "longitude": 数字,
          "category": "类型",
          "tags": ["标签"],
          "reason": "推荐理由（1句话）",
          "stayTime": 建议停留时长（小时，数字）
        }
      ]
    }
  ]
}`

  const userPrompt = `## 用户需求
${intent.summary}
需求天数：${days}天
心情偏好：${intent.constraints.mood || '不限'}

## 候选景点列表（共${candidates.length}个）
${candidateList}

请从以上候选景点中选择合适的景点，为用户规划 ${days} 天的旅行路线。只使用列表中的景点（用 poiUuid 引用），每天安排 3-6 个景点，相同区域/类型的景点安排在同一天。`

  try {
    const response = await callQwen([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ])

    // 提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[RouteGen] LLM 返回非 JSON，降级为规则生成')
      return fallbackGenerateRoute(intent, candidates, days)
    }

    const parsed = JSON.parse(jsonMatch[0])
    return validateAndFixRoute(parsed, candidates, days)
  } catch (error) {
    console.error('[RouteGen] 路线生成失败，降级为规则生成:', error)
    return fallbackGenerateRoute(intent, candidates, days)
  }
}

/**
 * 验证并修正 LLM 输出的路线
 * - 确保 poiUuid 在候选中存在
 * - 缺失字段从候选 POI 补全
 * - 超出候选范围的 poiUuid 替换为相近 POI
 */
function validateAndFixRoute(
  parsed: any,
  candidates: CandidatePoi[],
  days: number
): GeneratedRoute {
  const candidateMap = new Map<string, CandidatePoi>()
  const candidateId2Map = new Map<number, CandidatePoi>()
  for (const c of candidates) {
    candidateMap.set(c.poiUuid, c)
    candidateId2Map.set(c.id, c)
  }

  const validPois: RoutePoi[] = []
  const validDays: RouteDay[] = []

  for (let d = 1; d <= days; d++) {
    const dayData = parsed.schedule?.find((s: any) => s.day === d) || { day: d, pois: [], description: '' }
    const dayPois: RoutePoi[] = []

    for (const poi of (dayData.pois || [])) {
      let matched: CandidatePoi | undefined = undefined

      // 优先用 poiUuid 匹配
      if (poi.poiUuid && candidateMap.has(poi.poiUuid)) {
        matched = candidateMap.get(poi.poiUuid)!
      }
      // 其次用 poiId 匹配
      else if (poi.poiId && candidateId2Map.has(Number(poi.poiId))) {
        matched = candidateId2Map.get(Number(poi.poiId))!
      }

      // 如果 LLM 乱造地点，用热门兜底
      if (!matched) {
        const fallback = candidates.find(c =>
          c.poiName.includes(poi.name || '') ||
          (poi.name || '').includes(c.poiName)
        )
        if (fallback) matched = fallback
      }

      if (matched) {
        dayPois.push({
          id: matched.poiUuid,
          poiId: matched.id,
          name: matched.poiName,
          latitude: matched.latitude,
          longitude: matched.longitude,
          category: matched.category,
          tags: matched.tags,
          reason: poi.reason || '',
          stayTime: poi.stayTime || 2,
          images: matched.images
        })
      }
    }

    // 防止某天无 POI（兜底随机选一个热门）
    if (dayPois.length === 0 && candidates.length > 0) {
      const fallback = candidates[Math.floor(Math.random() * candidates.length)]
      dayPois.push({
        id: fallback.poiUuid,
        poiId: fallback.id,
        name: fallback.poiName,
        latitude: fallback.latitude,
        longitude: fallback.longitude,
        category: fallback.category,
        tags: fallback.tags,
        reason: '推荐热门景点',
        stayTime: 2,
        images: fallback.images
      })
    }

    validDays.push({
      day: d,
      description: dayData.description || '',
      pois: dayPois
    })
  }

  const allPois = validDays.flatMap(d => d.pois)
  return {
    id: `ai_${Date.now()}`,
    title: parsed.title || 'AI 智能路线',
    description: parsed.description || `${days}天精彩上海之旅`,
    days,
    tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    schedule: validDays,
    totalPoi: allPois.length,
    poiCount: allPois.length,
    remainingCount: 0
  }
}

/**
 * 降级路线生成（规则化生成，不依赖 LLM）
 * 当 LLM 不可用时，使用热度+标签+距离综合打分生成路线
 */
function fallbackGenerateRoute(
  intent: ParsedIntent,
  candidates: CandidatePoi[],
  days: number
): GeneratedRoute {
  if (candidates.length === 0) {
    return {
      id: `ai_${Date.now()}`,
      title: 'AI 智能路线',
      description: '暂无符合条件的景点，请尝试其他关键词',
      days,
      tags: intent.constraints.tags,
      schedule: Array.from({ length: days }, (_, i) => ({ day: i + 1, pois: [], description: '' })),
      totalPoi: 0,
      poiCount: 0,
      remainingCount: 0
    }
  }

  // 热度+标签综合打分
  const scored = candidates.map(p => {
    let score = p.heatScore
    for (const tag of intent.constraints.tags) {
      if (p.tags.some(t => t.includes(tag)) || p.tagCodes.some(tc => tc.includes(tag))) {
        score += 50
      }
    }
    return { p, score }
  }).sort((a, b) => b.score - a.score)

  // 均匀分配到每天
  const poisPerDay = Math.ceil(scored.length / days)
  const daysData: RouteDay[] = []

  for (let d = 0; d < days; d++) {
    const dayPois = scored.slice(d * poisPerDay, (d + 1) * poisPerDay).map(({ p }) => ({
      id: p.poiUuid,
      poiId: p.id,
      name: p.poiName,
      latitude: p.latitude,
      longitude: p.longitude,
      category: p.category,
      tags: p.tags,
      reason: p.tags[0] || '热门推荐',
      stayTime: 2,
      images: p.images
    }))
    daysData.push({
      day: d + 1,
      description: intent.constraints.tags[d % intent.constraints.tags.length] + '之旅',
      pois: dayPois
    })
  }

  const allPois = daysData.flatMap(d => d.pois)
  return {
    id: `ai_${Date.now()}`,
    title: intent.constraints.tags.length > 0
      ? `${intent.constraints.tags[0]} ${days}日游`
      : `上海 ${days} 日精彩之旅`,
    description: `根据您的需求智能规划的 ${days} 天路线`,
    days,
    tags: intent.constraints.tags,
    schedule: daysData,
    totalPoi: allPois.length,
    poiCount: allPois.length,
    remainingCount: 0
  }
}

// ============================================
// 主入口：生成路线
// ============================================

/**
 * 生成 AI 旅行路线
 * 完整流程：意图解析 → 候选召回 → LLM 生成 → 结果校验
 */
export async function generateRoute(params: GenerateRouteParams): Promise<GeneratedRoute> {
  console.log('[RouteGen] 开始生成路线:', params)

  // Step 1: 解析用户意图
  const intent = await parseUserIntent(params.prompt, params.days)
  console.log('[RouteGen] 解析意图:', JSON.stringify(intent))

  // Step 2: 从数据库召回候选 POI
  const candidates = await retrieveCandidates(intent, params.startLatitude, params.startLongitude)
  console.log(`[RouteGen] 召回候选 POI: ${candidates.length} 个`)

  if (candidates.length === 0) {
    console.warn('[RouteGen] 无候选 POI，降级为热门兜底')
    return fallbackGenerateRoute(intent, [], intent.days)
  }

  // Step 3: LLM 生成路线
  const route = await generateRouteWithLLM(intent, candidates, intent.days)

  console.log(`[RouteGen] 路线生成完成: ${route.title}, 共 ${route.totalPoi} 个 POI, ${route.days} 天`)
  return route
}
