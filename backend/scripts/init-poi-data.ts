/**
 * POI 数据初始化脚本
 *
 * 功能：
 *   1. 调用高德地图 API 获取真实 POI 数据
 *   2. 过滤和清洗数据
 *   3. 关联标签并初始化统计信息
 *
 * 使用方法:
 *   npx ts-node scripts/init-poi-data.ts
 *
 * 前置条件:
 *   1. 数据库已创建并迁移 (npx prisma migrate dev)
 *   2. .env 文件已配置 AMAP_KEY
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================
// 高德地图 API 调用
// ============================================

interface AmapConfig {
  key: string
}

interface AmapPhoto {
  url: string
  title?: string
}

interface AmapPoiItem {
  id: string
  name: string
  location: string        // "经度,纬度"
  address: string
  type: string
  typecode: string
  tel?: string
  photos?: string | AmapPhoto[]  // 兼容两种格式：字符串(无extensions) 或 对象数组(有extensions)
}

interface AmapSearchResponse {
  status: string
  info: string
  count: string
  pois: AmapPoiItem[]
  suggestion?: {
    keywords: string[]
    cities: any[]
  }
}

async function amapTextSearch(
  config: AmapConfig,
  keywords: string,
  city: string = '上海',
  page: number = 1,
  pageSize: number = 20
): Promise<AmapPoiItem[]> {
  const params = new URLSearchParams({
    keywords,
    city,
    citylimit: 'true',    // 限制在指定城市
    offset: String(pageSize),
    page: String(page),
    key: config.key,
    extensions: 'all',
  })

  const url = `https://restapi.amap.com/v3/place/text?${params.toString()}`

  try {
    const response = await fetch(url)
    const data = (await response.json()) as AmapSearchResponse

    if (data.status === '1' && data.pois && data.pois.length > 0) {
      return data.pois
    }

    console.warn(`  [AMap] 关键词 "${keywords}" 未找到数据: ${data.info}`)
    return []
  } catch (error) {
    console.error(`  [AMap] API 请求失败:`, error)
    return []
  }
}

async function amapDistrictSearch(
  config: AmapConfig,
  keywords: string,
  district: string,
  city: string = '上海',
  page: number = 1,
  pageSize: number = 20
): Promise<AmapPoiItem[]> {
  // 使用"区域+关键词"组合搜索，提高精确度
  const fullKeywords = `${district} ${keywords}`
  return amapTextSearch(config, fullKeywords, city, page, pageSize)
}

// ============================================
// 数据配置
// ============================================

// 需要搜索的 POI 关键词配置
const POI_SEARCH_CONFIGS = [
  // 热门景点
  { keywords: '外滩', district: '黄浦', type: '风景名胜', typeCode: '110000', tags: ['historical', 'night_view', 'architecture', 'free'] },
  { keywords: '东方明珠', district: '浦东', type: '旅游景点', typeCode: '110000', tags: ['landmark', 'tower', 'view', 'tickets_required'] },
  { keywords: '豫园', district: '黄浦', type: '风景名胜', typeCode: '110000', tags: ['historical', 'garden', 'culture', 'architecture'] },
  { keywords: '上海博物馆', district: '黄浦', type: '博物馆', typeCode: '141200', tags: ['museum', 'art', 'culture', 'historical', 'free'] },
  { keywords: '田子坊', district: '黄浦', type: '特色街区', typeCode: '110000', tags: ['culture', 'art', 'shopping', 'cafe', 'free'] },
  { keywords: '南京路步行街', district: '黄浦', type: '购物场所', typeCode: '060000', tags: ['shopping', 'food', 'landmark', 'free'] },
  { keywords: '城隍庙', district: '黄浦', type: '宗教场所', typeCode: '110000', tags: ['historical', 'culture', 'food', 'architecture'] },
  { keywords: '新天地', district: '黄浦', type: '特色街区', typeCode: '110000', tags: ['nightlife', 'food', 'cafe', 'culture', 'art'] },
  { keywords: '静安寺', district: '静安', type: '宗教场所', typeCode: '110000', tags: ['historical', 'culture', 'architecture'] },
  { keywords: '人民广场', district: '黄浦', type: '风景名胜', typeCode: '110000', tags: ['landmark', 'architecture', 'free'] },
  // 博物馆
  { keywords: '上海科技馆', district: '浦东', type: '博物馆', typeCode: '141200', tags: ['museum', 'science', 'family', 'education'] },
  { keywords: '上海自然博物馆', district: '静安', type: '博物馆', typeCode: '141200', tags: ['museum', 'science', 'family', 'education'] },
  // 公园/休闲
  { keywords: '世纪公园', district: '浦东', type: '公园', typeCode: '140000', tags: ['park', 'nature', 'family', 'free'] },
  { keywords: '豫园商城', district: '黄浦', type: '特色街区', typeCode: '110000', tags: ['shopping', 'food', 'culture', 'architecture'] },
  // 主题乐园
  { keywords: '上海迪士尼', district: '浦东', type: '主题乐园', typeCode: '110000', tags: ['theme_park', 'family', 'entertainment', 'tickets_required'] },
  // 陆家嘴区域
  { keywords: '上海中心大厦', district: '浦东', type: '地标建筑', typeCode: '110000', tags: ['landmark', 'architecture', 'view', 'tickets_required'] },
  { keywords: '金茂大厦', district: '浦东', type: '地标建筑', typeCode: '110000', tags: ['landmark', 'architecture', 'view'] },
  { keywords: '环球金融中心', district: '浦东', type: '地标建筑', typeCode: '110000', tags: ['landmark', 'architecture', 'view', 'tickets_required'] },
  // 其他热门
  { keywords: '世博会博物馆', district: '黄浦', type: '博物馆', typeCode: '141200', tags: ['museum', 'history', 'culture', 'free'] },
  { keywords: '杜莎夫人蜡像馆', district: '黄浦', type: '博物馆', typeCode: '141200', tags: ['museum', 'entertainment', 'tickets_required'] },
]

// 标签映射
const TAG_MAP: Record<string, { tagCode: string; tagName: { zh: string }; category: string }> = {
  'historical':      { tagCode: 'historical',      tagName: { zh: '历史建筑' },   category: 'theme' },
  'night_view':      { tagCode: 'night_view',      tagName: { zh: '夜景' },        category: 'theme' },
  'architecture':    { tagCode: 'architecture',     tagName: { zh: '建筑艺术' },    category: 'theme' },
  'free':            { tagCode: 'free',             tagName: { zh: '免费景点' },    category: 'theme' },
  'landmark':        { tagCode: 'landmark',         tagName: { zh: '地标建筑' },    category: 'theme' },
  'tower':           { tagCode: 'tower',            tagName: { zh: '观光塔' },      category: 'theme' },
  'view':            { tagCode: 'view',             tagName: { zh: '观景胜地' },    category: 'theme' },
  'tickets_required':{ tagCode: 'tickets_required', tagName: { zh: '需购票' },      category: 'theme' },
  'garden':          { tagCode: 'garden',           tagName: { zh: '园林' },         category: 'theme' },
  'culture':         { tagCode: 'culture',          tagName: { zh: '文化体验' },    category: 'theme' },
  'museum':          { tagCode: 'museum',           tagName: { zh: '博物馆' },        category: 'theme' },
  'art':             { tagCode: 'art',              tagName: { zh: '艺术展览' },     category: 'theme' },
  'shopping':        { tagCode: 'shopping',         tagName: { zh: '购物娱乐' },    category: 'theme' },
  'food':            { tagCode: 'food',             tagName: { zh: '美食探店' },    category: 'cuisine' },
  'cafe':            { tagCode: 'cafe',             tagName: { zh: '咖啡文化' },    category: 'cuisine' },
  'nightlife':       { tagCode: 'nightlife',        tagName: { zh: '夜生活' },       category: 'mood' },
  'theme_park':      { tagCode: 'theme_park',       tagName: { zh: '主题乐园' },    category: 'theme' },
  'family':          { tagCode: 'family',           tagName: { zh: '亲子游' },        category: 'intensity' },
  'park':            { tagCode: 'park',             tagName: { zh: '公园绿地' },     category: 'theme' },
  'nature':          { tagCode: 'nature',           tagName: { zh: '自然风光' },     category: 'theme' },
  'science':         { tagCode: 'science',           tagName: { zh: '科技体验' },     category: 'theme' },
  'education':       { tagCode: 'education',        tagName: { zh: '科普教育' },     category: 'theme' },
  'entertainment':   { tagCode: 'entertainment',    tagName: { zh: '娱乐休闲' },     category: 'theme' },
  'history':         { tagCode: 'history',          tagName: { zh: '历史人文' },     category: 'theme' },
}

// ============================================
// 工具函数
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// 从高德类型提取区信息
function extractDistrict(address: string): string {
  const districts = ['黄浦区', '浦东新区', '静安区', '徐汇区', '长宁区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区', '嘉定区', '金山区', '松江区', '青浦区', '奉贤区', '崇明区']
  for (const d of districts) {
    if (address.includes(d)) return d
  }
  return '上海市'
}

// 处理照片URL（高德可能返回 string 或对象数组，统一处理）
function processPhotos(photos: string | AmapPhoto[] | undefined): string[] {
  if (!photos) return []

  // 字符串格式："url1|url2|url3"（无 extensions 参数时）
  if (typeof photos === 'string') {
    return photos.split('|').filter(Boolean).slice(0, 5)
  }

  // 对象数组格式（extensions=all 时）：[{ url: "...", title: "..." }, ...]
  if (Array.isArray(photos)) {
    return photos
      .map(p => p?.url)
      .filter(Boolean)
      .slice(0, 5)
  }

  return []
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log('========================================')
  console.log('开始初始化 POI 数据 (从高德地图获取)...')
  console.log('========================================\n')

  // 读取 AMAP_KEY
  const amapKey = process.env.AMAP_KEY || ''
  if (!amapKey) {
    console.error('❌ 错误: 未配置 AMAP_KEY，请检查 .env 文件')
    process.exit(1)
  }
  const amapConfig: AmapConfig = { key: amapKey }

  let createdTagCount = 0
  let createdPoiCount = 0
  let skipPoiCount = 0
  let amapErrorCount = 0
  const amapResults: AmapPoiItem[] = []

  // ============================================
  // 步骤 1: 创建标签
  // ============================================
  console.log('📌 步骤 1/3: 创建标签...')
  for (const [code, tag] of Object.entries(TAG_MAP)) {
    try {
      await prisma.tagInfo.upsert({
        where: { tagCode: code },
        create: {
          tagCode: tag.tagCode,
          tagName: tag.tagName as any,
          category: tag.category,
          level: 1,
          status: 1
        },
        update: {
          tagName: tag.tagName as any,
          category: tag.category
        }
      })
      createdTagCount++
    } catch (error) {
      console.error(`  ❌ 标签创建失败: ${code}`, error)
    }
  }
  console.log(`  标签创建完成: ${createdTagCount} 个\n`)

  // ============================================
  // 步骤 2: 从高德地图搜索 POI
  // ============================================
  console.log('📌 步骤 2/3: 从高德地图搜索 POI...')

  for (const config of POI_SEARCH_CONFIGS) {
    try {
      // 使用区域+关键词组合搜索
      const pois = await amapDistrictSearch(
        amapConfig,
        config.keywords,
        config.district,
        '上海',
        1,
        5
      )

      if (pois.length > 0) {
        // 取第一个结果
        const poi = pois[0]
        const [lng, lat] = poi.location.split(',').map(Number)
        const district = extractDistrict(poi.address)

        amapResults.push({
          ...poi,
          type: config.type,    // 使用配置的 type 覆盖高德的
          typecode: config.typeCode,
        })

        const name = typeof poi.name === 'string' ? poi.name : poi.name
        console.log(`  ✅ [${config.keywords}] -> ${name} (${district})`)
      } else {
        console.warn(`  ⚠️  [${config.keywords}] 未找到匹配结果`)
        amapErrorCount++
      }

      // API 请求间隔，避免触发限流
      await sleep(300)
    } catch (error) {
      console.error(`  ❌ [${config.keywords}] 搜索失败:`, error)
      amapErrorCount++
    }
  }

  console.log(`\n  高德搜索完成: ${amapResults.length} 个 POI (失败 ${amapErrorCount})\n`)

  if (amapResults.length === 0) {
    console.error('❌ 没有从高德获取到任何 POI 数据，脚本终止')
    process.exit(1)
  }

  // ============================================
  // 步骤 3: 写入数据库
  // ============================================
  console.log('📌 步骤 3/3: 写入数据库...')

  for (const poiData of amapResults) {
    try {
      const poiName = poiData.name
      const [lng, lat] = poiData.location.split(',').map(Number)
      const district = extractDistrict(poiData.address)

      // 检查是否已存在同名 POI
      const existingPoi = await prisma.poiInfo.findFirst({
        where: {
          OR: [
            { poiName: { equals: poiName } as any },
          ]
        }
      })

      if (existingPoi) {
        console.log(`  ⏭️  跳过已存在: ${poiName}`)
        skipPoiCount++
        continue
      }

      // 查找匹配的搜索配置以获取标签
      const searchConfig = POI_SEARCH_CONFIGS.find(c =>
        poiData.name.includes(c.keywords) || c.keywords.includes(poiData.name)
      )
      const tags = searchConfig?.tags || []
      const poiType = searchConfig?.type || poiData.type
      const typeCode = searchConfig?.typeCode || poiData.typecode

      // 生成唯一 UUID
      const poiUuid = `shanghai_${poiName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}_${Date.now()}`

      // 构建描述（高德数据无描述，使用名称+类型+地址生成）
      const description = `${poiName}位于${district}${poiData.address || ''}，是上海市著名的${poiType}。`

      // 构建多语言数据
      const nameJson = { 'zh-CN': poiName, zh: poiName, en: poiName }
      const descJson = {
        'zh-CN': description,
        zh: description,
        en: `${poiName} is a famous ${poiType} in Shanghai, located at ${poiData.address || district}.`
      }
      const addressJson = {
        'zh-CN': poiData.address || district,
        zh: poiData.address || district,
        en: poiData.address || district
      }

      // 创建 POI
      const poi = await prisma.poiInfo.create({
        data: {
          poiUuid,
          poiName: nameJson as any,
          description: descJson as any,
          address: addressJson as any,
          latitude: lat,
          longitude: lng,
          district: district,
          poiType: poiType,
          typeCode: typeCode,
          tel: poiData.tel || null,
          photos: processPhotos(poiData.photos) as any,
          isFree: tags.includes('free') ? 1 : 0,
          needTickets: tags.includes('tickets_required') ? 1 : 0,
          status: 1
        }
      })

      // 创建 POI 与标签的关联
      for (const tagCode of tags) {
        const tag = await prisma.tagInfo.findUnique({ where: { tagCode } })
        if (tag) {
          await prisma.poiTagRel.upsert({
            where: {
              poiId_tagId: { poiId: poi.id, tagId: tag.id }
            },
            create: {
              poiId: poi.id,
              tagId: tag.id,
              weight: 0.8
            },
            update: {}
          })
        }
      }

      // 创建 POI 统计记录
      const baseHeat = 60 + Math.random() * 35  // 60-95
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const existingStats = await prisma.poiStats.findFirst({
        where: { poiId: poi.id, date: today }
      })

      if (existingStats) {
        await prisma.poiStats.update({
          where: { id: existingStats.id },
          data: { heatScore: baseHeat }
        })
      } else {
        await prisma.poiStats.create({
          data: {
            poiId: poi.id,
            date: today,
            heatScore: baseHeat,
            checkCount: 0,
            avgStayTime: 0
          }
        })
      }

      createdPoiCount++
      console.log(`  ✅ 创建 POI: ${poiName} [${district}]`)
    } catch (error) {
      console.error(`  ❌ POI 创建失败: ${poiData.name}`, error)
    }
  }

  // ============================================
  // 统计信息
  // ============================================
  console.log('\n📌 步骤 4/4: 统计信息...')
  const totalPois = await prisma.poiInfo.count({ where: { status: 1 } })
  const totalTags = await prisma.tagInfo.count({ where: { status: 1 } })
  const totalRels = await prisma.poiTagRel.count()
  const totalStats = await prisma.poiStats.count()

  console.log('\n========================================')
  console.log('✅ POI 数据初始化完成!')
  console.log('========================================')
  console.log(`📊 统计数据:`)
  console.log(`   - POI 总数: ${totalPois}`)
  console.log(`   - 标签总数: ${totalTags}`)
  console.log(`   - 关联记录: ${totalRels}`)
  console.log(`   - 统计记录: ${totalStats}`)
  console.log(`   - 本次新增: ${createdPoiCount}`)
  console.log(`   - 跳过(已存在): ${skipPoiCount}`)
  console.log(`   - 高德搜索失败: ${amapErrorCount}`)
  console.log('\n💡 接下来可以运行 embedding 生成脚本:')
  console.log('   npx ts-node scripts/generate-poi-embeddings.ts')
  console.log('========================================\n')
}

// 运行脚本
main()
  .catch((error) => {
    console.error('\n❌ 脚本执行失败:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
