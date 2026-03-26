/**
* 高德地图 REST API 工具
* 文档：https://lbs.amap.com/api/webservice/guide/api/search
* ⚠️ 需要在高德开放平台申请 Web服务 类型的 Key（与 JS API Key 不同）
*/
import { AMAP_KEY } from './amap-config'
import { amapToDbPoi, cachePoiList } from './poi-cache'

const AMAP_REST_BASE = 'https://restapi.amap.com/v3'

export interface AmapPOI {
    id: string
    name: string
    type: string
    typecode: string
    address: string | string[]
    location: string  // "经度,纬度"
    tel: string | string[]
    rating?: string
    cost?: string
    photos?: Array<{ title: string; url: string }>
    distance?: string
}

export interface AmapPOIResult {
    status: string
    count: string
    pois: AmapPOI[]
}

/** 解析高德 location 字符串为经纬度 */
export function parseLocation(location: string): { latitude: number; longitude: number } {
    const [lng, lat] = location.split(',').map(Number)
    return { latitude: lat, longitude: lng }
}

/** 将高德 POI 转换为项目 POI 格式 */
export function amapPoiToLocal(poi: AmapPOI) {
    const { latitude, longitude } = parseLocation(poi.location)
    const photos = poi.photos && poi.photos.length > 0
        ? poi.photos.map(p => p.url.replace(/^http:\/\//, 'https://'))
        : ['/static/logo.png']
    return {
        id: poi.id,
        name: poi.name,
        category: poi.type,
        description: poi.type,
        images: photos,
        latitude,
        longitude,
        address: Array.isArray(poi.address) ? poi.address.join('') : (poi.address || ''),
        phone: Array.isArray(poi.tel) ? poi.tel[0] : (poi.tel || ''),
        rating: parseFloat(poi.rating || '0') || 0,
        commentCount: 0,
        distance: poi.distance ? parseInt(poi.distance) : undefined,
        tags: [poi.type],
        ticketPrice: poi.cost ? parseFloat(poi.cost) : undefined,
    }
}

/** 周边搜索 */
export function amapAroundSearch(params: {
    location: string
    keywords?: string
    types?: string
    radius?: number
    page?: number
    pageSize?: number
}): Promise<AmapPOIResult> {
    return new Promise((resolve, reject) => {
        uni.request({
            url: `${AMAP_REST_BASE}/place/around`,
            method: 'GET',
            data: {
                key: AMAP_KEY,
                location: params.location,
                keywords: params.keywords || '景点|公园|博物馆|寺庙|古迹',
                types: params.types || '110000|140000|141200|141300',
                radius: params.radius || 5000,
                offset: params.pageSize || 20,
                page: params.page || 1,
                extensions: 'all',
                output: 'json',
            },
            success: (res) => {
                const data = res.data as AmapPOIResult
                if (data.status === '1') {
                    const dbList = data.pois.map(p =>
                        amapToDbPoi(p, p.distance ? parseInt(p.distance) : undefined)
                    )
                    cachePoiList(dbList)
                    resolve(data)
                } else {
                    reject(new Error('高德POI搜索失败'))
                }
            },
            fail: () => reject(new Error('网络请求失败'))
        })
    })
}

// ===== 路径规划 =====

/** 所有支持的出行方式 */
export type TravelMode = 'walking' | 'cycling' | 'driving' | 'transit'

export interface TravelModeConfig {
    mode: TravelMode
    label: string
    icon: string
    apiPath: string
    apiBase?: string  // v4 接口用不同 base（骑行）
}

export const TRAVEL_MODES: TravelModeConfig[] = [
    { mode: 'walking', label: '步行', icon: '🚶', apiPath: '/direction/walking' },
    { mode: 'cycling', label: '骑行', icon: '🚲', apiPath: '/direction/bicycling', apiBase: 'https://restapi.amap.com/v4' },
    { mode: 'driving', label: '驾车', icon: '🚗', apiPath: '/direction/driving' },
    { mode: 'transit', label: '公交', icon: '🚌', apiPath: '/direction/transit/integrated' },
]

export interface RouteStep {
    instruction: string
    distance: number
    duration: number
    polyline: string
}

export interface AmapRouteResult {
    distance: number
    duration: number
    steps: RouteStep[]
    polylinePath: Array<{ latitude: number; longitude: number }>
}

/** transit 换乘方案中的一段 */
export interface TransitSegment {
    type: 'walking' | 'bus' | 'subway'
    lineName: string      // 公交/地铁线路名
    departStop: string    // 上车站
    arriveStop: string    // 下车站
    stopCount: number     // 经过站数
    distance: number      // 米
    duration: number      // 秒
    polyline: string      // 折线
}

/** transit 完整换乘方案 */
export interface TransitPlan {
    index: number
    cost: number          // 费用（元）
    duration: number      // 总时长（秒）
    distance: number      // 总距离（米）
    walkingDistance: number
    segments: TransitSegment[]
    polylinePath: Array<{ latitude: number; longitude: number }>
    summary: string       // 简要描述，如 "地铁2号线 → 步行 → 地铁4号线"
}

/** 解析 polyline 字符串为坐标数组 */
function parsePolyline(polyline: string): Array<{ latitude: number; longitude: number }> {
    if (!polyline) return []
    const pts: Array<{ latitude: number; longitude: number }> = []
    polyline.split(';').forEach(pt => {
        const [lng, lat] = pt.split(',').map(Number)
        if (!isNaN(lat) && !isNaN(lng)) pts.push({ latitude: lat, longitude: lng })
    })
    return pts
}

/** 解析 transit 方案为结构化数据 */
function parseTransitPlan(transit: any, totalDist: number, idx: number): TransitPlan {
    const segments: TransitSegment[] = []
    const allPolyPts: Array<{ latitude: number; longitude: number }> = []

        ; (transit.segments || []).forEach((seg: any) => {
            // 步行段
            if (seg.walking?.steps?.length) {
                const walkPts: Array<{ latitude: number; longitude: number }> = []
                    ; (seg.walking.steps || []).forEach((s: any) => {
                        const pts = parsePolyline(s.polyline || '')
                        walkPts.push(...pts)
                    })
                allPolyPts.push(...walkPts)
                segments.push({
                    type: 'walking',
                    lineName: '步行',
                    departStop: '',
                    arriveStop: '',
                    stopCount: 0,
                    distance: parseInt(seg.walking.distance || '0'),
                    duration: parseInt(seg.walking.duration || '0'),
                    polyline: seg.walking.steps?.map((s: any) => s.polyline).filter(Boolean).join(';') || '',
                })
            }
            // 公交/地铁段
            ; (seg.bus?.buslines || []).slice(0, 1).forEach((bl: any) => {
                const pts = parsePolyline(bl.polyline || '')
                allPolyPts.push(...pts)
                const isSubway = (bl.type || '').includes('地铁') || (bl.name || '').includes('号线')
                segments.push({
                    type: isSubway ? 'subway' : 'bus',
                    lineName: bl.name || '',
                    departStop: bl.departure_stop?.name || '',
                    arriveStop: bl.arrival_stop?.name || '',
                    stopCount: parseInt(bl.via_num || '0'),
                    distance: parseInt(bl.distance || '0'),
                    duration: parseInt(bl.duration || '0'),
                    polyline: bl.polyline || '',
                })
            })
        })

    const summary = segments
        .filter(s => s.type !== 'walking' || segments.length === 1)
        .map(s => s.lineName || '步行')
        .join(' → ')

    return {
        index: idx,
        cost: parseFloat(transit.cost || '0'),
        duration: parseInt(transit.duration || '0'),
        distance: totalDist,
        walkingDistance: parseInt(transit.walking_distance || '0'),
        segments,
        polylinePath: allPolyPts,
        summary: summary || '步行',
    }
}

/** 串行请求队列，避免并发超 QPS */
let _routeQueue: Promise<any> = Promise.resolve()
function enqueueRoute<T>(fn: () => Promise<T>): Promise<T> {
    _routeQueue = _routeQueue.then(() =>
        new Promise<void>(res => setTimeout(res, 300))  // 每次请求间隔 300ms
    ).then(fn)
    return _routeQueue as Promise<T>
}

/**
 * 高德路径规划 - 单段
 */
export function amapRoutePlan(params: {
    origin: string
    destination: string
    mode?: TravelMode
    transitPlanIndex?: number
}): Promise<AmapRouteResult> {
    const mode = params.mode || 'walking'
    const cfg = TRAVEL_MODES.find(m => m.mode === mode)!
    return enqueueRoute(() => _doRoutePlan(params, mode, cfg))
}

function _doRoutePlan(
    params: { origin: string; destination: string; mode?: TravelMode; transitPlanIndex?: number },
    mode: TravelMode,
    cfg: TravelModeConfig
): Promise<AmapRouteResult> {
    const baseUrl = cfg.apiBase || AMAP_REST_BASE
    const extraParams: Record<string, unknown> = mode === 'transit'
        ? { city: '上海', cityd: '上海' }
        : {}

    return new Promise((resolve, reject) => {
        uni.request({
            url: `${baseUrl}${cfg.apiPath}`,
            method: 'GET',
            data: {
                key: AMAP_KEY,
                origin: params.origin,
                destination: params.destination,
                output: 'json',
                ...extraParams,
            },
            success: (res: any) => {
                try {
                    const data = res.data
                    // v4 骑行：errcode=0；v3 其他：status='1'
                    const ok = mode === 'cycling'
                        ? (data.errcode === 0 || data.status === '1')
                        : data.status === '1'
                    console.log(`[Route] ${mode} status=${data.status ?? data.errcode}`, JSON.stringify(data).slice(0, 200))
                    if (!ok) {
                        console.error(`[Route] 失败 info=${data.info || data.errmsg} infocode=${data.infocode || data.errcode}`)
                        reject(new Error(`路径规划失败: ${data.info || data.errmsg}`))
                        return
                    }

                    let polylinePath: Array<{ latitude: number; longitude: number }> = []
                    let totalDist = 0
                    let totalDur = 0

                    if (mode === 'cycling') {
                        // v4 骑行响应：data.data.paths[0]
                        const path = data.data?.paths?.[0]
                        totalDist = parseInt(path?.distance || '0')
                        totalDur = parseInt(path?.duration || '0')
                            ; (path?.steps || []).forEach((s: any) => {
                                const pts = parsePolyline(s.polyline || '')
                                polylinePath.push(...pts)
                            })
                        console.log(`[Route] cycling steps=${path?.steps?.length}, pts=${polylinePath.length}`)
                    } else if (mode === 'transit') {
                        const planIdx = params.transitPlanIndex ?? 0
                        const transit = data.route?.transits?.[planIdx] || data.route?.transits?.[0]
                        totalDist = parseInt(data.route?.distance || '0')
                        const plan = parseTransitPlan(transit, totalDist, planIdx)
                        polylinePath = plan.polylinePath
                        totalDur = plan.duration
                    } else {
                        // walking / driving
                        const path = data.route?.paths?.[0]
                        totalDist = parseInt(path?.distance || '0')
                        totalDur = parseInt(path?.duration || '0')
                            ; (path?.steps || []).forEach((s: any) => {
                                const pts = parsePolyline(s.polyline || s.polyline_unescape || '')
                                polylinePath.push(...pts)
                            })
                        console.log(`[Route] ${mode} steps=${path?.steps?.length}, pts=${polylinePath.length}`)
                    }

                    resolve({ distance: totalDist, duration: totalDur, steps: [], polylinePath })
                } catch (e) {
                    console.error('[Route] 解析异常', e)
                    reject(new Error('路径解析失败'))
                }
            },
            fail: () => reject(new Error('网络请求失败'))
        })
    })
}


/**
 * 获取 transit 所有换乘方案（用于方案选择面板）
 */
export function amapTransitPlans(params: {
    origin: string
    destination: string
}): Promise<TransitPlan[]> {
    return new Promise((resolve, reject) => {
        uni.request({
            url: `${AMAP_REST_BASE}/direction/transit/integrated`,
            method: 'GET',
            data: {
                key: AMAP_KEY,
                origin: params.origin,
                destination: params.destination,
                city: '上海',
                cityd: '上海',
                output: 'json',
            },
            success: (res: any) => {
                try {
                    const data = res.data
                    if (data.status !== '1') { reject(new Error(data.info)); return }
                    const totalDist = parseInt(data.route?.distance || '0')
                    const plans: TransitPlan[] = (data.route?.transits || []).map(
                        (t: any, i: number) => parseTransitPlan(t, totalDist, i)
                    )
                    resolve(plans)
                } catch (e) {
                    reject(new Error('方案解析失败'))
                }
            },
            fail: () => reject(new Error('网络请求失败'))
        })
    })
}

/** 批量规划多段路径 */
export async function planMultiSegmentRoute(
    pois: Array<{ latitude: number; longitude: number }>,
    mode: TravelMode = 'walking',
    transitPlanIndex = 0
): Promise<Array<{ latitude: number; longitude: number }>> {
    if (pois.length < 2) return pois.map(p => ({ latitude: p.latitude, longitude: p.longitude }))
    const allPoints: Array<{ latitude: number; longitude: number }> = []
    for (let i = 0; i < pois.length - 1; i++) {
        const origin = `${pois[i].longitude},${pois[i].latitude}`
        const dest = `${pois[i + 1].longitude},${pois[i + 1].latitude}`
        console.log(`[Route] 段${i + 1} ${origin}→${dest} mode=${mode}`)
        try {
            const result = await amapRoutePlan({ origin, destination: dest, mode, transitPlanIndex })
            console.log(`[Route] 段${i + 1} 成功 pts=${result.polylinePath.length}`)
            allPoints.push(...(i === 0 ? result.polylinePath : result.polylinePath.slice(1)))
        } catch (e) {
            console.error(`[Route] 段${i + 1} 失败，降级直线:`, e)
            if (i === 0) allPoints.push({ latitude: pois[i].latitude, longitude: pois[i].longitude })
            allPoints.push({ latitude: pois[i + 1].latitude, longitude: pois[i + 1].longitude })
        }
    }
    return allPoints
}

/** 关键词搜索 */
export function amapTextSearch(params: {
    keywords: string
    city?: string
    page?: number
    pageSize?: number
}): Promise<AmapPOIResult> {
    return new Promise((resolve, reject) => {
        uni.request({
            url: `${AMAP_REST_BASE}/place/text`,
            method: 'GET',
            data: {
                key: AMAP_KEY,
                keywords: params.keywords,
                city: params.city || '上海',
                citylimit: true,
                offset: params.pageSize || 20,
                page: params.page || 1,
                extensions: 'all',
                output: 'json',
            },
            success: (res) => {
                const data = res.data as AmapPOIResult
                if (data.status === '1') resolve(data)
                else reject(new Error('高德POI搜索失败'))
            },
            fail: () => reject(new Error('网络请求失败'))
        })
    })
}
