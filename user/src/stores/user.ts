import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { toHttpsImage } from '../api/request'

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
    needProfileSetup?: boolean
    preference?: UserPreference
    createdAt?: string
}

/** 注册类型枚举 */
export const RegisterType = {
    Anonymous: 0,
    Wechat: 1,
    Phone: 2,
    WechatPhone: 3
} as const

export const useUserStore = defineStore('user', () => {
    const token = ref<string>(uni.getStorageSync('token') || '')
    const userInfo = ref<UserInfo | null>(null)
    const preference = ref<UserPreference | null>(null)
    const hasSetPreference = ref<boolean>(false)
    const locale = ref<string>(uni.getStorageSync('locale') || 'zh-CN')
    const pendingPreference = ref<UserPreference | null>(null)

    /** 是否已登录（包括匿名登录） */
    const isLoggedIn = computed(() => !!token.value)

    /** 是否是匿名用户 */
    const isAnonymous = computed(() => userInfo.value?.isAnonymous ?? true)

    /** 是否是正式用户（微信或手机登录） */
    const isRegistered = computed(() =>
        !!token.value && !isAnonymous.value
    )

    /** 是否需要绑定手机号 */
    const needPhoneBind = computed(() =>
        userInfo.value?.isAnonymous === false && !userInfo.value?.tel
    )

    /** AI规划剩余次数 */
    const aiPlanRemaining = computed(() =>
        userInfo.value?.aiPlanRemaining ?? 0
    )

    function setToken(t: string) {
        token.value = t
        if (t) {
            uni.setStorageSync('token', t)
        } else {
            uni.removeStorageSync('token')
        }
    }

    function setUserInfo(info: UserInfo) {
        userInfo.value = {
            ...info,
            // 统一处理头像 URL，避免微信开发者工具强制升级 localhost 为 HTTPS
            avatar: toHttpsImage(info.avatar || '') || undefined
        }
        if (info.preference) {
            preference.value = info.preference
            hasSetPreference.value = true
        }
    }

    function setPreference(pref: UserPreference) {
        preference.value = pref
        hasSetPreference.value = true
        pendingPreference.value = null
        uni.setStorageSync('preference', JSON.stringify(pref))
    }

    function setPendingPreference(pref: UserPreference) {
        pendingPreference.value = pref
        uni.setStorageSync('pendingPreference', JSON.stringify(pref))
    }

    function setLocale(lang: string) {
        locale.value = lang
        uni.setStorageSync('locale', lang)
    }

    function logout() {
        token.value = ''
        userInfo.value = null
        preference.value = null
        hasSetPreference.value = false
        pendingPreference.value = null
        uni.removeStorageSync('token')
    }

    function loadFromStorage() {
        const savedPref = uni.getStorageSync('preference')
        if (savedPref) {
            try {
                preference.value = JSON.parse(savedPref)
                hasSetPreference.value = true
            } catch {}
        }
        const savedPending = uni.getStorageSync('pendingPreference')
        if (savedPending) {
            try {
                pendingPreference.value = JSON.parse(savedPending)
            } catch {}
        }
    }

    return {
        token,
        userInfo,
        preference,
        hasSetPreference,
        locale,
        pendingPreference,
        isLoggedIn,
        isAnonymous,
        isRegistered,
        needPhoneBind,
        aiPlanRemaining,
        setToken,
        setUserInfo,
        setPreference,
        setPendingPreference,
        setLocale,
        logout,
        loadFromStorage
    }
})
