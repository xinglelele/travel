import { get, post } from './request'

/** POI 收藏项 */
export interface PoiFavoriteItem {
    id: string
    targetType: 'poi'
    poiId: string
    name: string
    category: string
    images: string[]
    latitude: number
    longitude: number
    rating: number
    tags: string[]
    favoritedAt: string
}

/** 用户内容收藏项 */
export interface UserContentFavoriteItem {
    id: string
    targetType: 'userContent'
    contentId: string
    title: string
    cover: string
    summary: string
    category: string
    userNickname?: string
    userAvatar?: string
    poiId?: string
    rating?: number
    favoritedAt: string
}

/** 官方内容收藏项 */
export interface OfficialContentFavoriteItem {
    id: string
    targetType: 'officialContent'
    contentId: string
    title: string
    cover: string
    summary: string
    category: string
    favoritedAt: string
}

export type FavoriteItem = PoiFavoriteItem | UserContentFavoriteItem | OfficialContentFavoriteItem

export interface FavoriteListResponse {
    list: FavoriteItem[]
    total: number
}

export const favoriteApi = {
    /** 获取收藏列表（POI + 用户内容 + 官方内容混合） */
    list: (params?: { page?: number; pageSize?: number }) =>
        get<FavoriteListResponse>('/api/favorite/list', params as Record<string, unknown>),

    /** POI 收藏/取消收藏（切换） */
    togglePoi: (poiId: string) =>
        post<{ favorited: boolean }>('/api/favorite/toggle', { poiId }),

    /** 查询 POI 收藏状态 */
    status: (poiId: string) =>
        get<{ favorited: boolean }>(`/api/favorite/status/${poiId}`),
}
