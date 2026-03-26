import { get, post, put } from './request'
import type { UserInfo, UserPreference } from '../stores/user'

export interface LoginParams {
    code: string // 微信登录code
}

export interface LoginResult {
    token: string
    userInfo: UserInfo
    hasPreference: boolean
}

export interface UpdateProfileParams {
    nickname?: string
    avatar?: string
    phone?: string
    gender?: number
}

export const userApi = {
    /** 微信登录 */
    login: (params: LoginParams) =>
        post<LoginResult>('/api/user/login', params as Record<string, unknown>),

    /** 提交偏好设置 */
    preference: (pref: UserPreference) =>
        post<void>('/api/user/preference', pref as unknown as Record<string, unknown>),

    /** 获取用户信息 */
    profile: () =>
        get<UserInfo>('/api/user/profile'),

    /** 更新用户信息 */
    updateProfile: (params: UpdateProfileParams) =>
        put<UserInfo>('/api/user/profile', params as Record<string, unknown>)
}
