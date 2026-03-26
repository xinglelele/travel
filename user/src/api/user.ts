import { get, post, put } from './request'

/** 登录结果 */
export interface LoginResult {
    token: string
    userId: number
    isAnonymous: boolean
    aiPlanRemaining: number
    isNewUser?: boolean
    needPhoneBind?: boolean
}

/** 微信登录参数 */
export interface WechatLoginParams {
    code: string
}

/** 手机号登录参数 */
export interface PhoneLoginParams {
    phone: string
    password: string
    code?: string
}

/** 发送验证码参数 */
export interface SendCodeParams {
    phone: string
    type: 'bind' | 'login' | 'reset'
}

/** 绑定手机号参数 */
export interface BindPhoneParams {
    phone: string
    code: string
    password?: string
}

/** 关联微信参数 */
export interface BindWechatParams {
    code: string
}

/** 用户信息 */
export interface UserInfo {
    id: number
    tel?: string
    nickname?: string
    avatar?: string
    gender?: number
    locale: string
    registerType: number
    isAnonymous: boolean
    aiPlanRemaining: number
    preference?: UserPreference
    createdAt?: string
}

/** 用户偏好 */
export interface UserPreference {
    fromRegion?: number
    preferenceTags?: {
        intensity?: string[]
        interests?: string[]
        theme?: string[]
        cuisine?: string[]
        mood?: string[]
    }
    hasCompletedOnboarding?: number
}

/** 更新用户信息参数 */
export interface UpdateProfileParams {
    nickname?: string
    avatar?: string
    gender?: number
    locale?: string
}

/** 绑定手机号结果 */
export interface BindPhoneResult {
    token: string
    message: string
    merged: boolean
}

/** AI规划次数结果 */
export interface AiPlanCountResult {
    remaining: number
    isAnonymous: boolean
}

export const userApi = {
    /**
     * 匿名登录（自动创建账号，获取Token）
     * 适用于：冷启动场景，无需任何信息即可体验
     */
    anonymous: (openid?: string) =>
        post<LoginResult>('/api/user/anonymous', openid ? { openid } : {}),

    /**
     * 微信登录
     * @param code 微信授权code
     */
    wechatLogin: (code: string) =>
        post<LoginResult>('/api/user/wechat-login', { code }),

    /**
     * 手机号登录
     * @param phone 手机号
     * @param password 密码
     * @param code 验证码（注册时需要）
     */
    phoneLogin: (phone: string, password: string, code?: string) =>
        post<LoginResult>('/api/user/phone-login', { phone, password, code }),

    /**
     * 发送验证码
     * @param phone 手机号
     * @param type 验证码类型：bind=绑定手机, login=登录注册, reset=重置密码
     */
    sendCode: (phone: string, type: 'bind' | 'login' | 'reset') =>
        post<{ message: string }>('/api/user/send-code', { phone, type }),

    /**
     * 绑定手机号（匿名用户升级为正式用户）
     * @param phone 手机号
     * @param code 验证码
     * @param password 密码（可选）
     */
    bindPhone: (phone: string, code: string, password?: string) =>
        post<BindPhoneResult>('/api/user/bind-phone', { phone, code, password }),

    /**
     * 关联微信（手机用户绑定微信）
     * @param code 微信授权code
     */
    bindWechat: (code: string) =>
        post<{ message: string; merged: boolean }>('/api/user/bind-wechat', { code }),

    /**
     * 获取用户信息（需要登录）
     */
    profile: () =>
        get<UserInfo>('/api/user/profile'),

    /**
     * 更新用户信息（需要登录）
     */
    updateProfile: (params: UpdateProfileParams) =>
        put<UserInfo>('/api/user/profile', params),

    /**
     * 提交偏好设置（匿名/正式用户都可使用）
     */
    preference: (pref: { fromRegion?: number; preferenceTags?: any }) =>
        post<void>('/api/user/preference', pref, true),

    /**
     * 重置密码
     */
    resetPassword: (phone: string, code: string, newPassword: string) =>
        post<{ message: string }>('/api/user/reset-password', { phone, code, newPassword }),

    /**
     * 获取AI规划剩余次数
     */
    getAiPlanCount: () =>
        get<AiPlanCountResult>('/api/user/ai-plan/count')
}
