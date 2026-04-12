/**
 * POI 数据初始化脚本
 *
 * 功能：
 *   1. 调用高德地图 API 获取真实 POI 数据
 *   2. 过滤和清洗数据
 *   3. 关联标签并初始化统计信息
 *   4. 初始化三级标签体系（POI属性、用户属性、情绪氛围、服务）
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
// 三级标签体系定义
// 支持 POI地点属性、用户属性、情绪氛围、服务 四大分类
// ============================================

interface TagNode {
  tagCode: string
  tagName: string
  level: number
  parentCode?: string
  category: string
}

// 完整的标签层级数据
const TAG_HIERARCHY: TagNode[] = [
  // ========== 一、POI地点属性标签 ==========
  // 1.1 景区/景点
  { tagCode: 'poi_attr', tagName: 'POI地点属性', level: 1, category: 'poi_attr' },
  { tagCode: 'poi_scenic', tagName: '景区/景点', level: 2, parentCode: 'poi_attr', category: 'poi_attr' },
  { tagCode: 'scenic_river_view', tagName: '江景', level: 3, parentCode: 'poi_scenic', category: 'poi_attr' },
  { tagCode: 'scenic_garden', tagName: '园林', level: 3, parentCode: 'poi_scenic', category: 'poi_attr' },
  { tagCode: 'scenic_ancient_town', tagName: '古镇', level: 3, parentCode: 'poi_scenic', category: 'poi_attr' },
  { tagCode: 'scenic_heritage', tagName: '历史遗迹', level: 3, parentCode: 'poi_scenic', category: 'poi_attr' },

  // 1.2 博物馆/文化场馆
  { tagCode: 'poi_museum', tagName: '博物馆/文化场馆', level: 2, parentCode: 'poi_attr', category: 'poi_attr' },
  { tagCode: 'museum_general', tagName: '综合博物馆', level: 3, parentCode: 'poi_museum', category: 'poi_attr' },
  { tagCode: 'museum_professional', tagName: '专业馆', level: 3, parentCode: 'poi_museum', category: 'poi_attr' },
  { tagCode: 'museum_art', tagName: '美术馆', level: 3, parentCode: 'poi_museum', category: 'poi_attr' },
  { tagCode: 'museum_residence', tagName: '历史故居', level: 3, parentCode: 'poi_museum', category: 'poi_attr' },

  // 1.3 酒店/住宿
  { tagCode: 'poi_hotel', tagName: '酒店/住宿', level: 2, parentCode: 'poi_attr', category: 'poi_attr' },
  { tagCode: 'hotel_luxury', tagName: '高端酒店', level: 3, parentCode: 'poi_hotel', category: 'poi_attr' },
  { tagCode: 'hotel_boutique', tagName: '精品民宿', level: 3, parentCode: 'poi_hotel', category: 'poi_attr' },
  { tagCode: 'hotel_economy', tagName: '快捷酒店', level: 3, parentCode: 'poi_hotel', category: 'poi_attr' },
  { tagCode: 'hotel_youth', tagName: '青年旅舍', level: 3, parentCode: 'poi_hotel', category: 'poi_attr' },
  { tagCode: 'hotel_special', tagName: '特色民宿', level: 3, parentCode: 'poi_hotel', category: 'poi_attr' },

  // 1.4 餐饮美食
  { tagCode: 'poi_food', tagName: '餐饮美食', level: 2, parentCode: 'poi_attr', category: 'poi_attr' },
  { tagCode: 'food_local', tagName: '本帮菜', level: 3, parentCode: 'poi_food', category: 'poi_attr' },
  { tagCode: 'food_trending', tagName: '网红餐厅', level: 3, parentCode: 'poi_food', category: 'poi_attr' },
  { tagCode: 'food_cafe_bar', tagName: '咖啡酒馆', level: 3, parentCode: 'poi_food', category: 'poi_attr' },
  { tagCode: 'food_michelin', tagName: '米其林餐厅', level: 3, parentCode: 'poi_food', category: 'poi_attr' },

  // 1.5 交通枢纽
  { tagCode: 'poi_transport', tagName: '交通枢纽', level: 2, parentCode: 'poi_attr', category: 'poi_attr' },
  { tagCode: 'transport_subway', tagName: '地铁站', level: 3, parentCode: 'poi_transport', category: 'poi_attr' },
  { tagCode: 'transport_bus', tagName: '公交站', level: 3, parentCode: 'poi_transport', category: 'poi_attr' },
  { tagCode: 'transport_train', tagName: '火车站', level: 3, parentCode: 'poi_transport', category: 'poi_attr' },
  { tagCode: 'transport_airport', tagName: '机场', level: 3, parentCode: 'poi_transport', category: 'poi_attr' },
  { tagCode: 'transport_ferry', tagName: '轮渡码头', level: 3, parentCode: 'poi_transport', category: 'poi_attr' },

  // 1.6 商��购物
  { tagCode: 'poi_shopping', tagName: '商业购物', level: 2, parentCode: 'poi_attr', category: 'poi_attr' },
  { tagCode: 'shopping_district', tagName: '商圈', level: 3, parentCode: 'poi_shopping', category: 'poi_attr' },
  { tagCode: 'shopping_mall', tagName: '商场', level: 3, parentCode: 'poi_shopping', category: 'poi_attr' },
  { tagCode: 'shopping_market', tagName: '特色市集', level: 3, parentCode: 'poi_shopping', category: 'poi_attr' },
  { tagCode: 'shopping_creative', tagName: '文创商店', level: 3, parentCode: 'poi_shopping', category: 'poi_attr' },

  // 1.7 文艺场所
  { tagCode: 'poi_art_place', tagName: '文艺场所', level: 2, parentCode: 'poi_attr', category: 'poi_attr' },
  { tagCode: 'art_bookstore', tagName: '书店', level: 3, parentCode: 'poi_art_place', category: 'poi_attr' },
  { tagCode: 'art_livehouse', tagName: 'Livehouse', level: 3, parentCode: 'poi_art_place', category: 'poi_attr' },
  { tagCode: 'art_theater', tagName: '剧场', level: 3, parentCode: 'poi_art_place', category: 'poi_attr' },
  { tagCode: 'art_gallery', tagName: '画廊', level: 3, parentCode: 'poi_art_place', category: 'poi_attr' },
  { tagCode: 'art_cinema', tagName: '独立影院', level: 3, parentCode: 'poi_art_place', category: 'poi_attr' },

  // ========== 二、用户属性标签 ==========
  // 2.1 地域来源
  { tagCode: 'user_attr', tagName: '用户属性标签', level: 1, category: 'user_attr' },
  { tagCode: 'user_region', tagName: '地域来源', level: 2, parentCode: 'user_attr', category: 'user_attr' },
  { tagCode: 'region_local', tagName: '本地游客', level: 3, parentCode: 'user_region', category: 'user_attr' },
  { tagCode: 'region_domestic', tagName: '国内游客', level: 3, parentCode: 'user_region', category: 'user_attr' },
  { tagCode: 'region_europe', tagName: '欧美', level: 3, parentCode: 'user_region', category: 'user_attr' },
  { tagCode: 'region_asia_east', tagName: '日韩', level: 3, parentCode: 'user_region', category: 'user_attr' },
  { tagCode: 'region_asia_se', tagName: '东南亚', level: 3, parentCode: 'user_region', category: 'user_attr' },
  { tagCode: 'region_americas', tagName: '美洲/大洋洲', level: 3, parentCode: 'user_region', category: 'user_attr' },
  { tagCode: 'region_russia_mid', tagName: '俄语/中东', level: 3, parentCode: 'user_region', category: 'user_attr' },

  // 2.2 出行类型
  { tagCode: 'user_travel_type', tagName: '出行类型', level: 2, parentCode: 'user_attr', category: 'user_attr' },
  { tagCode: 'travel_family', tagName: '亲子游', level: 3, parentCode: 'user_travel_type', category: 'user_attr' },
  { tagCode: 'travel_couple', tagName: '情侣游', level: 3, parentCode: 'user_travel_type', category: 'user_attr' },
  { tagCode: 'travel_friends', tagName: '朋友结伴', level: 3, parentCode: 'user_travel_type', category: 'user_attr' },
  { tagCode: 'travel_solo', tagName: 'Solo旅行', level: 3, parentCode: 'user_travel_type', category: 'user_attr' },
  { tagCode: 'travel_business', tagName: '商务出行', level: 3, parentCode: 'user_travel_type', category: 'user_attr' },
  { tagCode: 'travel_elder', tagName: '老年游', level: 3, parentCode: 'user_travel_type', category: 'user_attr' },

  // 2.3 兴趣偏好
  { tagCode: 'user_interest', tagName: '兴趣偏好', level: 2, parentCode: 'user_attr', category: 'user_attr' },
  { tagCode: 'interest_history', tagName: '历史文化', level: 3, parentCode: 'user_interest', category: 'user_attr' },
  { tagCode: 'interest_nature', tagName: '自然风景', level: 3, parentCode: 'user_interest', category: 'user_attr' },
  { tagCode: 'interest_food', tagName: '美食探店', level: 3, parentCode: 'user_interest', category: 'user_attr' },
  { tagCode: 'interest_art', tagName: '艺术展览', level: 3, parentCode: 'user_interest', category: 'user_attr' },
  { tagCode: 'interest_trend', tagName: '潮流打卡', level: 3, parentCode: 'user_interest', category: 'user_attr' },
  { tagCode: 'interest_family', tagName: '亲子娱乐', level: 3, parentCode: 'user_interest', category: 'user_attr' },

  // 2.4 消费能力
  { tagCode: 'user_consume', tagName: '消费能力', level: 2, parentCode: 'user_attr', category: 'user_attr' },
  { tagCode: 'consume_economy', tagName: '经济型', level: 3, parentCode: 'user_consume', category: 'user_attr' },
  { tagCode: 'consume_mid', tagName: '中端型', level: 3, parentCode: 'user_consume', category: 'user_attr' },
  { tagCode: 'consume_high', tagName: '高端型', level: 3, parentCode: 'user_consume', category: 'user_attr' },

  // 2.5 出行时长
  { tagCode: 'user_duration', tagName: '出行时长', level: 2, parentCode: 'user_attr', category: 'user_attr' },
  { tagCode: 'duration_one_day', tagName: '1日游', level: 3, parentCode: 'user_duration', category: 'user_attr' },
  { tagCode: 'duration_short', tagName: '2-3日短途', level: 3, parentCode: 'user_duration', category: 'user_attr' },
  { tagCode: 'duration_long', tagName: '4-7日长途', level: 3, parentCode: 'user_duration', category: 'user_attr' },

  // ========== 三、情绪氛围标签 ==========
  // 3.1 氛围基调
  { tagCode: 'mood', tagName: '情绪氛围标签', level: 1, category: 'mood' },
  { tagCode: 'mood_base', tagName: '氛围基调', level: 2, parentCode: 'mood', category: 'mood' },
  { tagCode: 'mood_lively', tagName: '热闹', level: 3, parentCode: 'mood_base', category: 'mood' },
  { tagCode: 'mood_quiet', tagName: '安静', level: 3, parentCode: 'mood_base', category: 'mood' },
  { tagCode: 'mood_artistic', tagName: '文艺', level: 3, parentCode: 'mood_base', category: 'mood' },
  { tagCode: 'mood_vintage', tagName: '复古', level: 3, parentCode: 'mood_base', category: 'mood' },
  { tagCode: 'mood_modern', tagName: '现代', level: 3, parentCode: 'mood_base', category: 'mood' },
  { tagCode: 'mood_folk', tagName: '市井', level: 3, parentCode: 'mood_base', category: 'mood' },

  // 3.2 体验感受
  { tagCode: 'mood_exp', tagName: '体验感受', level: 2, parentCode: 'mood', category: 'mood' },
  { tagCode: 'exp_healing', tagName: '治愈', level: 3, parentCode: 'mood_exp', category: 'mood' },
  { tagCode: 'exp_exciting', tagName: '刺激', level: 3, parentCode: 'mood_exp', category: 'mood' },
  { tagCode: 'exp_solemn', tagName: '庄重', level: 3, parentCode: 'mood_exp', category: 'mood' },
  { tagCode: 'exp_romantic', tagName: '浪漫', level: 3, parentCode: 'mood_exp', category: 'mood' },
  { tagCode: 'exp_niche', tagName: '小众', level: 3, parentCode: 'mood_exp', category: 'mood' },

  // 3.3 适合时段
  { tagCode: 'mood_time', tagName: '适合时段', level: 2, parentCode: 'mood', category: 'mood' },
  { tagCode: 'time_day', tagName: '白天游览', level: 3, parentCode: 'mood_time', category: 'mood' },
  { tagCode: 'time_night', tagName: '夜景绝佳', level: 3, parentCode: 'mood_time', category: 'mood' },
  { tagCode: 'time_night_walk', tagName: '适合夜游', level: 3, parentCode: 'mood_time', category: 'mood' },
  { tagCode: 'time_morning', tagName: '适合早间漫步', level: 3, parentCode: 'mood_time', category: 'mood' },

  // ========== 四、服务标签 ==========
  // 4.1 语言
  { tagCode: 'service', tagName: '服务标签', level: 1, category: 'service' },
  { tagCode: 'service_lang', tagName: '语言', level: 2, parentCode: 'service', category: 'service' },
  { tagCode: 'lang_zh', tagName: '中文', level: 3, parentCode: 'service_lang', category: 'service' },
  { tagCode: 'lang_en', tagName: '英文', level: 3, parentCode: 'service_lang', category: 'service' },
  { tagCode: 'lang_jp', tagName: '日文', level: 3, parentCode: 'service_lang', category: 'service' },
  { tagCode: 'lang_kr', tagName: '韩文', level: 3, parentCode: 'service_lang', category: 'service' },

  // 4.2 票务
  { tagCode: 'service_ticket', tagName: '票务', level: 2, parentCode: 'service', category: 'service' },
  { tagCode: 'ticket_free', tagName: '免费', level: 3, parentCode: 'service_ticket', category: 'service' },
  { tagCode: 'ticket_needed', tagName: '需要买票', level: 3, parentCode: 'service_ticket', category: 'service' },

  // 4.3 预约
  { tagCode: 'service_book', tagName: '预约', level: 2, parentCode: 'service', category: 'service' },
  { tagCode: 'book_needed', tagName: '需要', level: 3, parentCode: 'service_book', category: 'service' },
  { tagCode: 'book_not_needed', tagName: '不需要', level: 3, parentCode: 'service_book', category: 'service' },

  // 4.4 基础需求
  { tagCode: 'service_basic', tagName: '基础需求', level: 2, parentCode: 'service', category: 'service' },
  { tagCode: 'basic_convenient', tagName: '交通便利', level: 3, parentCode: 'service_basic', category: 'service' },
  { tagCode: 'basic_subway', tagName: '靠近地铁', level: 3, parentCode: 'service_basic', category: 'service' },
  { tagCode: 'basic_free_visit', tagName: '免费参观', level: 3, parentCode: 'service_basic', category: 'service' },
  { tagCode: 'basic_parking', tagName: '有停车场', level: 3, parentCode: 'service_basic', category: 'service' },
  { tagCode: 'basic_photo', tagName: '适合拍照', level: 3, parentCode: 'service_basic', category: 'service' },

  // 4.5 特色需求
  { tagCode: 'service_special', tagName: '特色需求', level: 2, parentCode: 'service', category: 'service' },
  { tagCode: 'special_exhibition', tagName: '看展', level: 3, parentCode: 'service_special', category: 'service' },
  { tagCode: 'special_theater', tagName: '看剧', level: 3, parentCode: 'service_special', category: 'service' },
  { tagCode: 'special_live', tagName: '听Live', level: 3, parentCode: 'service_special', category: 'service' },
  { tagCode: 'special_market', tagName: '逛市集', level: 3, parentCode: 'service_special', category: 'service' },
  { tagCode: 'special_local_food', tagName: '吃本帮菜', level: 3, parentCode: 'service_special', category: 'service' },
  { tagCode: 'special_coffee', tagName: '喝咖啡', level: 3, parentCode: 'service_special', category: 'service' },
  { tagCode: 'special_souvenir', tagName: '买伴手礼', level: 3, parentCode: 'service_special', category: 'service' },

  // 4.6 特殊需求
  { tagCode: 'service_special_need', tagName: '特殊需求', level: 2, parentCode: 'service', category: 'service' },
  { tagCode: 'special_kid', tagName: '亲子友好', level: 3, parentCode: 'service_special_need', category: 'service' },
  { tagCode: 'special_pet', tagName: '宠物友好', level: 3, parentCode: 'service_special_need', category: 'service' },
  { tagCode: 'special_accessible', tagName: '无障碍', level: 3, parentCode: 'service_special_need', category: 'service' },
  { tagCode: 'special_night_open', tagName: '夜间开放', level: 3, parentCode: 'service_special_need', category: 'service' },
  { tagCode: 'special_no_book', tagName: '免预约', level: 3, parentCode: 'service_special_need', category: 'service' },

  // 4.7 基础设施
  { tagCode: 'service_infra', tagName: '基础设施', level: 2, parentCode: 'service', category: 'service' },
  { tagCode: 'infra_toilet', tagName: '公共厕所', level: 3, parentCode: 'service_infra', category: 'service' },
  { tagCode: 'infra_charger', tagName: '共享充电宝', level: 3, parentCode: 'service_infra', category: 'service' },
  { tagCode: 'infra_storage', tagName: '寄存柜', level: 3, parentCode: 'service_infra', category: 'service' },
  { tagCode: 'infra_medical', tagName: '医疗点', level: 3, parentCode: 'service_infra', category: 'service' },
]

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

// ============================================
// 三级标签体系初始化
// ============================================

interface TagNode {
  tagCode: string
  tagName: string
  level: number
  parentCode?: string
  category: string
}

/**
 * 初始化三级标签体系
 * 利用 tag_info 表的 level 和 parent_id 字段实现层级结构
 */
async function initTagHierarchy(): Promise<void> {
  console.log('📌 初始化三级标签体系...')

  // 构建 parentCode -> tagId 的映射
  const codeToIdMap = new Map<string, number>()

  // 先初始化所有标签（建立映射）
  for (const tag of TAG_HIERARCHY) {
    // 检查是否已存在
    const existing = await prisma.tagInfo.findUnique({
      where: { tagCode: tag.tagCode }
    })

    if (existing) {
      // 更新现有标签
      await prisma.tagInfo.update({
        where: { tagCode: tag.tagCode },
        data: {
          tagName: { zh: tag.tagName } as any,
          category: tag.category,
          level: tag.level,
          status: 1
        }
      })
      codeToIdMap.set(tag.tagCode, existing.id)
    } else {
      // 创建新标签
      const created = await prisma.tagInfo.create({
        data: {
          tagCode: tag.tagCode,
          tagName: { zh: tag.tagName } as any,
          category: tag.category,
          level: tag.level,
          parentId: null, // 先设为 null，后续再更新
          status: 1
        }
      })
      codeToIdMap.set(tag.tagCode, created.id)
    }
  }

  // 更新 parent_id（建立父子关系）
  for (const tag of TAG_HIERARCHY) {
    if (tag.parentCode) {
      const parentId = codeToIdMap.get(tag.parentCode)
      if (parentId) {
        await prisma.tagInfo.update({
          where: { tagCode: tag.tagCode },
          data: { parentId }
        })
      }
    }
  }

  console.log(`  ✅ 三级标签体系初始化完成: ${TAG_HIERARCHY.length} 个标签`)
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
  // 步骤 1: 创建标签（原有二级标签 + 新增三级标签体系）
  // ============================================
  console.log('📌 步骤 1/4: 创建标签...')

  // 1.1 原有二级标签（保持兼容）
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
  console.log(`  原有标签创建完成: ${createdTagCount} 个`)

  // 1.2 新增三级标签体系（POI地点属性、用户属性、情绪氛围、服务）
  await initTagHierarchy()

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
  console.log('📌 步骤 3/4: 写入数据库...')

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

      // 关联行政区（district 表需已存在；否则 districtId 为空，政府端列表「区域」列为空）
      const short = district.replace(/区|市$/, '')
      let districtRow = await prisma.district.findFirst({ where: { name: district } })
      if (!districtRow && short && short !== district) {
        districtRow = await prisma.district.findFirst({ where: { shortName: short } })
      }

      // 创建 POI：脚本是政府侧预置数据，视同已审核通过（否则列表会一直显示「待审」）
      const poi = await prisma.poiInfo.create({
        data: {
          poiUuid,
          poiName: nameJson as any,
          description: descJson as any,
          address: addressJson as any,
          latitude: lat,
          longitude: lng,
          districtId: districtRow?.id ?? null,
          poiType: poiType,
          typeCode: typeCode,
          tel: poiData.tel || null,
          photos: processPhotos(poiData.photos) as any,
          isFree: tags.includes('free') ? 1 : 0,
          needTickets: tags.includes('tickets_required') ? 1 : 0,
          status: 1,
          auditStatus: 1,
          auditedAt: new Date()
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
          where: {
            poiId_date: { poiId: poi.id, date: today }
          },
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

  // 分别统计原有标签和三级标签体系
  const originalTags = await prisma.tagInfo.count({
    where: {
      status: 1,
      level: 1,
      parentId: null,
      tagCode: { in: Object.keys(TAG_MAP) }
    }
  })
  const hierarchyTags = await prisma.tagInfo.count({
    where: {
      status: 1,
      level: { in: [1, 2, 3] },
      parentId: { not: null }
    }
  })
  const totalTags = await prisma.tagInfo.count({ where: { status: 1 } })

  const totalRels = await prisma.poiTagRel.count()
  const totalStats = await prisma.poiStats.count()

  console.log('\n========================================')
  console.log('✅ POI 数据初始化完成!')
  console.log('========================================')
  console.log(`📊 统计数据:`)
  console.log(`   - POI 总数: ${totalPois}`)
  console.log(`   - 标签总数: ${totalTags}`)
  console.log(`     └─ 原有标签: ${originalTags} 个`)
  console.log(`     └─ 三级标签体系: ${hierarchyTags} 个`)
  console.log(`   - 关联记录: ${totalRels}`)
  console.log(`   - 统计记录: ${totalStats}`)
  console.log(`   - 本次新增: ${createdPoiCount}`)
  console.log(`   - 跳过(已存在): ${skipPoiCount}`)
  console.log(`   - 高德搜索失败: ${amapErrorCount}`)
  console.log('\n📋 三级标签体系分类:')
  console.log('   1. POI地点属性 (poi_attr): 景区、博物馆、酒店、餐饮、交通、购物、文艺')
  console.log('   2. 用户属性标签 (user_attr): 地域、出行类型、兴趣、消费、出行时长')
  console.log('   3. 情绪氛围标签 (mood): 氛围基调、体验感受、适合时段')
  console.log('   4. 服务标签 (service): 语言、票务、预约、基础需求、特色需求、特殊需求、基础设施')
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
