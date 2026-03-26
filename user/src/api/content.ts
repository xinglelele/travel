import { get, post } from './request'

export interface Content {
    id: string
    title: string
    cover: string
    summary: string
    body: string
    category: string
    tags?: string[]
    viewCount: number
    likeCount: number
    relatedPoiIds?: string[]
    videoUrl?: string
    createdAt: string
}

export const contentApi = {
    /** 获取推荐内容列表 */
    recommend: (params?: { category?: string; page?: number; pageSize?: number }) =>
        get<{ list: Content[]; total: number }>('/api/content/recommend', params as Record<string, unknown>),

    /** 获取内容详情 */
    detail: (id: string) =>
        get<Content>(`/api/content/${id}`),

    /** 记录浏览 */
    view: (id: string) =>
        post<void>(`/api/content/${id}/view`)
}
