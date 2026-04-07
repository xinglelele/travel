/**
 * 前端全局环境配置
 *
 * 使用说明：
 *   - DEV_MOCK_LOCATION：开发时设为具体坐标模拟定位，上线前改为 null 恢复真实 GPS
 *   - API_BASE_URL：后端接口地址，开发/生产环境分离
 *   - 其他业务常量均可在此统一管理
 */

// ===================== 位置 & 地图 =====================

/** 开发模式 mock 定位坐标（设为 null 则使用真实 GPS，上线前务必改为 null） */
export const DEV_MOCK_LOCATION: { latitude: number; longitude: number } | null = {
    latitude:31.2350210,   // 东方明珠
    longitude: 121.4626720
}

/** 打卡有效距离（米），超过此距离打卡会被拒绝 */
export const CHECK_IN_DISTANCE = 200

/** GPS 误差容错（米） */
export const GPS_TOLERANCE = 40

/** 前端判断可打卡的阈值 = 有效距离 + 容错（与后端一致） */
export const CHECK_IN_EFFECTIVE = CHECK_IN_DISTANCE + GPS_TOLERANCE

// ===================== API =====================

/** 后端 API 根地址（生产环境请替换为真实域名） */
export const API_BASE_URL = 'http://localhost:3000'

// ===================== 其他 =====================