/**
 * POI 前端缓存层
 *
 * 职责：
 * 1. 将高德 AmapPOI 转换为数据库 poi_info 格式（DbPoi）
 * 2. 缓存到内存 + uni.storage，模拟数据库查询
 * 3. mock 请求层优先从此缓存查询，后端接好后直接删除此文件即可
 */

import type { AmapPOI } from './amap-api'

/** 对应数据库 poi_info 表结构 */
export interface DbPoi {
    id: string           // 前端用 poi_uuid 作为 id
    poi_uuid: string     // 高德 POI id
    poi_type: string     // 高德原始分类字符串
    type_code: string    // 高德分类编码
    poi_name: { zh: string; en: string }
    description: { zh: string; en: string }
    longitude: number
    latitude: number
    address: { zh: string; en: string }
    tel: string
    photos: Array<{ title: { zh: string; en: string }; url: string }>
    district: string
    is_free: 0 | 1
    need_tickets: 0 | 1
    official_url: string
    need_book: 0 | 1
    status: 0 | 1
    // 扩展字段（前端展示用，数据库里在 poi_stats 表）
    rating: number
    comment_count: number
    distance?: number
}

/** 内存缓存：poi_uuid -> DbPoi */
const cache = new Map<string, DbPoi>()

/** 高德 AmapPOI → DbPoi */
export function amapToDbPoi(amap: AmapPOI, distance?: number): DbPoi {
    const [lngStr, latStr] = (amap.location || '0,0').split(',')
    const photos = (amap.photos || []).map(p => ({
        title: { zh: p.title || '', en: p.title || '' },
        url: p.url.replace(/^http:\/\//, 'https://')
    }))

    const tel = Array.isArray(amap.tel) ? amap.tel[0] || '' : (amap.tel || '')
    const address = Array.isArray(amap.address) ? amap.address.join('') : (amap.address || '')
    const typeCode = amap.typecode || ''

    return {
        id: amap.id,
        poi_uuid: amap.id,
        poi_type: amap.type || '',
        type_code: typeCode,
        poi_name: { zh: amap.name, en: amap.name },
        description: { zh: amap.type || '', en: amap.type || '' },
        longitude: parseFloat(lngStr),
        latitude: parseFloat(latStr),
        address: { zh: address, en: address },
        tel,
        photos,
        district: '',
        is_free: 0,
        need_tickets: 0,
        official_url: '',
        need_book: 0,
        status: 1,
        rating: parseFloat(amap.rating || '0') || 0,
        comment_count: 0,
        distance,
    }
}

/** DbPoi → 前端 POI 格式（stores/poi.ts 里的 POI 接口） */
export function dbPoiToLocal(db: DbPoi) {
    const locale = (uni.getStorageSync('locale') as string) || 'zh-CN'
    const lang = locale === 'zh-CN' ? 'zh' : 'en'
    return {
        id: db.poi_uuid,
        name: db.poi_name[lang] || db.poi_name.zh,
        category: db.poi_type,
        description: db.description[lang] || db.description.zh,
        images: db.photos.length > 0
            ? db.photos.map(p => p.url)
            : ['/static/logo.png'],
        latitude: db.latitude,
        longitude: db.longitude,
        address: db.address[lang] || db.address.zh,
        phone: db.tel,
        rating: db.rating,
        commentCount: db.comment_count,
        distance: db.distance,
        tags: [db.poi_type],
        ticketPrice: db.is_free ? 0 : undefined,
        openTime: undefined as string | undefined,
    }
}

/** 批量写入缓存（地图页搜索到附近 POI 后调用） */
export function cachePoiList(list: DbPoi[]) {
    list.forEach(p => cache.set(p.poi_uuid, p))
    console.log(`[PoiCache] 已缓存 ${cache.size} 条 POI`)
}

/** 按 id 查询（模拟 SELECT * FROM poi_info WHERE poi_uuid = ? ） */
export function getCachedPoi(id: string): DbPoi | undefined {
    return cache.get(id)
}

/** 获取全部缓存（模拟 nearby 查询） */
export function getAllCached(): DbPoi[] {
    return Array.from(cache.values())
}

/** 清空缓存 */
export function clearCache() {
    cache.clear()
}
