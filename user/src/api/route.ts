import { get, post, del } from './request'
import type { TravelRoute } from '../stores/route'

export interface GenerateRouteParams {
    prompt: string
    days?: number
    tags?: string[]
    startLatitude?: number
    startLongitude?: number
}

export const routeApi = {
    /** AI生成路线 */
    generate: (params: GenerateRouteParams) =>
        post<TravelRoute>('/api/route/generate', params as Record<string, unknown>),

    /** 获取路线详情 */
    detail: (id: string) =>
        get<TravelRoute>(`/api/route/${id}`),

    /** 获取我的路线列表 */
    my: (params?: { page?: number; pageSize?: number }) =>
        get<{ list: TravelRoute[]; total: number }>('/api/route/my', params as Record<string, unknown>),

    /** 删除路线 */
    delete: (id: string) =>
        del<void>(`/api/route/${id}`),

    /** 保存路线 */
    save: (route: TravelRoute) =>
        post<TravelRoute>('/api/route/save', route as unknown as Record<string, unknown>)
}
