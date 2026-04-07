import { get, post, del, put } from './request'
import type { TravelRoute } from '../stores/route'

export interface GenerateRouteParams {
    prompt: string
    days?: number
    tags?: string[]
    startLatitude?: number
    startLongitude?: number
}

export interface UpdateRouteParams {
    id: string
    name?: string
    title?: string
    days?: number
    description?: string
    pois?: Array<{
        poiId: string | number
        dayNum?: number
        day?: number
        stayTime?: number
    }>
    coverImage?: string
    tags?: string[]
}

export const routeApi = {
    /** AI生成路线 */
    generate: (params: GenerateRouteParams) =>
        post<TravelRoute>('/api/route/generate', params as Record<string, unknown>),

    /** 获取路线详情 */
    detail: (id: string) => {
        const sid = String(id || '').trim()
        if (!sid) {
            return Promise.reject(new Error('缺少路线 id'))
        }
        return get<TravelRoute>(`/api/route/${encodeURIComponent(sid)}`)
    },

    /** 获取我的路线列表 */
    my: (params?: { page?: number; pageSize?: number }) =>
        get<{ list: TravelRoute[]; total: number }>('/api/route/my', params as Record<string, unknown>, false),

    /** 删除路线 */
    delete: (id: string) =>
        del<void>(`/api/route/${id}`),

    /** 保存路线 */
    save: (route: TravelRoute) =>
        post<{ id: number; name: string; days: number }>('/api/route/save', route as unknown as Record<string, unknown>),

    /** 更新路线（支持编辑POI列表和顺序） */
    update: (params: UpdateRouteParams) =>
        put<{
            id: number
            name: string
            days: number
            poiCount: number
            coverImage: string
            tags: string[]
            updatedAt: string
        }>(`/api/route/${params.id}`, params as Record<string, unknown>)
}
