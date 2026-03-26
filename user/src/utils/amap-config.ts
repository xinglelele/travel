// 高德地图配置
// ⚠️ 生产环境请使用环境变量管理 Key
export const AMAP_KEY = '310b44907f5cd3d2aac0137f865c7505'
export const AMAP_SDK_VERSION = '1.2.0'

// 上海市中心坐标（默认中心点）
export const DEFAULT_CENTER = {
    longitude: 121.473701,
    latitude: 31.230416
}

// 默认地图缩放级别
export const DEFAULT_SCALE = 13

// 打卡距离阈值（米）
export const CHECK_IN_DISTANCE = 200

// POI 加载半径（米）
export const POI_LOAD_RADIUS = 5000

// 上海市地理边界（GCJ02坐标系，含郊区）
export const SHANGHAI_BOUNDS = {
    minLat: 30.67,
    maxLat: 31.88,
    minLng: 120.85,
    maxLng: 122.20
}

// 判断坐标是否在上海范围内
export function isInShanghai(lat: number, lng: number): boolean {
    return lat >= SHANGHAI_BOUNDS.minLat && lat <= SHANGHAI_BOUNDS.maxLat
        && lng >= SHANGHAI_BOUNDS.minLng && lng <= SHANGHAI_BOUNDS.maxLng
}

// ⚠️ 开发模式 mock 定位（上线前改为 null 恢复真实GPS）
export const DEV_MOCK_LOCATION: { latitude: number; longitude: number } | null = null

// 上海热门景点推荐（超出范围时展示）
export const SHANGHAI_RECOMMENDED_POIS = [
    { id: 'sh_001', name: '外滩', address: '中山东一路，黄浦区', latitude: 31.2397, longitude: 121.4906, rating: 4.8, category: '历史人文', images: ['/static/logo.png'], description: '上海标志性历史建筑群，夜景绝美', commentCount: 0 },
    { id: 'sh_002', name: '东方明珠', address: '世纪大道1号，浦东新区', latitude: 31.2397, longitude: 121.4997, rating: 4.7, category: '地标建筑', images: ['/static/logo.png'], description: '上海最具代表性的电视塔', commentCount: 0 },
    { id: 'sh_003', name: '豫园', address: '安仁街218号，黄浦区', latitude: 31.2274, longitude: 121.4927, rating: 4.6, category: '古典园林', images: ['/static/logo.png'], description: '明代古典园林，上海老城厢文化中心', commentCount: 0 },
    { id: 'sh_004', name: '上海迪士尼乐园', address: '申迪西路310号，浦东新区', latitude: 31.1440, longitude: 121.6570, rating: 4.9, category: '主题乐园', images: ['/static/logo.png'], description: '中国大陆首座迪士尼主题乐园', commentCount: 0 },
    { id: 'sh_005', name: '田子坊', address: '泰康路210弄，黄浦区', latitude: 31.2108, longitude: 121.4726, rating: 4.5, category: '文创街区', images: ['/static/logo.png'], description: '上海最具艺术气息的创意园区', commentCount: 0 },
]
