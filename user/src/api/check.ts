import { get, post } from './request'

export interface CheckRecord {
    id: string
    poiId: string
    poiName: string
    poiImage: string
    latitude: number
    longitude: number
    checkedAt: string
    note?: string
}

export interface CreateCheckParams {
    poiId: string
    latitude: number
    longitude: number
    note?: string
}

export const checkApi = {
    /** 创建打卡记录 */
    create: (params: CreateCheckParams) =>
        post<CheckRecord>('/api/check/create', params as Record<string, unknown>),

    /** 获取我的打卡记录 */
    my: (params?: { page?: number; pageSize?: number; startDate?: string; endDate?: string }) =>
        get<{ list: CheckRecord[]; total: number }>('/api/check/my', params as Record<string, unknown>)
}
