import { get, post } from './request'

export interface Content {
    id: string
    type?: 'official' | 'user'  // 内容来源
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
    // 用户内容特有字段
    userNickname?: string
    userAvatar?: string
    poiId?: string
    rating?: number
    // 当前用户状态
    liked?: boolean
    favorited?: boolean
}

export const contentApi = {
    /** 获取推荐内容列表 */
    recommend: (params?: { category?: string; page?: number; pageSize?: number }) =>
        get<{ list: Content[]; total: number }>('/api/content/recommend', params as Record<string, unknown>),

    /** 获取内容详情 */
    detail: (id: string) => {
        const sid = String(id || '').trim()
        if (!sid) {
            return Promise.reject(new Error('缺少内容 id'))
        }
        return get<Content>(`/api/content/${encodeURIComponent(sid)}`)
    },

    /** 记录浏览 */
    view: (id: string) => {
        const sid = String(id || '').trim()
        if (!sid) return Promise.resolve()
        return post<void>(`/api/content/${encodeURIComponent(sid)}/view`)
    },

    /** 点赞/取消点赞（切换） */
    like: (id: string) => {
        const sid = String(id || '').trim()
        if (!sid) return Promise.reject(new Error('缺少内容 id'))
        return post<{ liked: boolean }>(`/api/content/${encodeURIComponent(sid)}/like`)
    },

    /** 收藏/取消收藏（切换） */
    favorite: (id: string) => {
        const sid = String(id || '').trim()
        if (!sid) return Promise.reject(new Error('缺少内容 id'))
        return post<{ favorited: boolean }>(`/api/content/${encodeURIComponent(sid)}/favorite`)
    },
}
