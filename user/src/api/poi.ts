import { get, post } from './request'
import type { POI } from '../stores/poi'

export interface HeatmapPoint {
    latitude: number
    longitude: number
    weight: number
}

export interface NearbyParams {
    latitude: number
    longitude: number
    radius?: number
    category?: string
    page?: number
    pageSize?: number
}

export interface RecommendParams {
    page?: number
    pageSize?: number
}

/** AI路线规划参数 */
export interface AiPlanParams {
    prompt: string
    days?: number
}

/** AI路线规划结果 */
export interface AiPlanResult {
    id: string
    name: string
    days: number
    pois: any[]
    remainingCount: number
}

export const poiApi = {
    /** 获取推荐景点列表（可选认证，登录时返回个性化推荐） */
    recommend: (params?: RecommendParams) =>
        get<{ list: POI[]; total: number; personalized?: boolean }>('/api/poi/recommend', params as Record<string, unknown>, true),

    /** 获取附近景点 */
    nearby: (params: NearbyParams) =>
        get<{ list: POI[]; total: number }>('/api/poi/nearby', params as Record<string, unknown>, true),

    /** 获取热力图数据 */
    heatmap: (params: { latitude: number; longitude: number; radius?: number }) =>
        get<HeatmapPoint[]>('/api/poi/heatmap', params as Record<string, unknown>, true),

    /** 获取景点详情 */
    detail: (id: string) =>
        get<POI>(`/api/poi/${id}`, undefined, true),

    /** AI路线规划（可选认证，匿名用户限制次数） */
    aiPlan: (params: AiPlanParams) =>
        post<AiPlanResult>('/api/poi/ai-plan', params, true)
}
