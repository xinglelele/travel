import { get } from './request'
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

export const poiApi = {
    /** 获取推荐景点列表 */
    recommend: (params?: RecommendParams) =>
        get<{ list: POI[]; total: number }>('/api/poi/recommend', params as Record<string, unknown>),

    /** 获取附近景点 */
    nearby: (params: NearbyParams) =>
        get<{ list: POI[]; total: number }>('/api/poi/nearby', params as Record<string, unknown>),

    /** 获取热力图数据 */
    heatmap: (params: { latitude: number; longitude: number; radius?: number }) =>
        get<HeatmapPoint[]>('/api/poi/heatmap', params as Record<string, unknown>),

    /** 获取景点详情 */
    detail: (id: string) =>
        get<POI>(`/api/poi/${id}`)
}
