import { get, post } from './request'
import type { Message } from '../stores/message'

export const messageApi = {
    /** 获取消息列表 */
    list: (params?: { page?: number; pageSize?: number }) =>
        get<{ list: Message[]; total: number; unread: number }>('/api/message/list', params as Record<string, unknown>),

    /** 标记消息已读 */
    read: (id: string) =>
        post<void>(`/api/message/${id}/read`),

    /** 全部已读 */
    readAll: () =>
        post<void>('/api/message/read-all')
}
