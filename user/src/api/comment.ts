import { get, post } from './request'

export interface Comment {
    id: string
    userId: string
    userNickname: string
    userAvatar: string
    poiId: string
    rating: number
    content: string
    images?: string[]
    createdAt: string
    helpfulCount: number
}

export interface CreateCommentParams {
    poiId: string
    rating: number
    content: string
    images?: string[]
}

export interface CommentListParams {
    poiId: string
    sort?: 'time' | 'rating'
    page?: number
    pageSize?: number
}

export interface CommentStats {
    avgRating: number
    total: number
    distribution: Record<string, number>
}

export const commentApi = {
    /** 检查是否有权评论（点击评论按钮时调用） */
    can: (poiId: string) =>
        get<{ allowed: boolean }>('/api/comment/can', { poiId }),

    /** 发表评论 */
    create: (params: CreateCommentParams) =>
        post<Comment>('/api/comment/create', params as Record<string, unknown>),

    /** 获取评论列表 */
    list: (params: CommentListParams) =>
        get<{ list: Comment[]; total: number; stats: CommentStats }>('/api/comment/list', params as Record<string, unknown>)
}
