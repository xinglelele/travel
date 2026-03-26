import { get } from './request'
import type { POI } from '../stores/poi'
import type { TravelRoute } from '../stores/route'
import type { Content } from './content'

export interface SearchParams {
    keyword: string
    type?: 'all' | 'poi' | 'route' | 'content'
    page?: number
    pageSize?: number
}

export interface SearchResult {
    pois: POI[]
    routes: TravelRoute[]
    contents: Content[]
    total: number
}

export interface SearchSuggest {
    keyword: string
    type: 'poi' | 'route' | 'content'
}

export const searchApi = {
    /** 搜索 */
    search: (params: SearchParams) =>
        get<SearchResult>('/api/search', params as Record<string, unknown>),

    /** 搜索联想词 */
    suggest: (keyword: string) =>
        get<SearchSuggest[]>('/api/search/suggest', { keyword })
}
