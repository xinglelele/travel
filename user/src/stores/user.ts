import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface UserPreference {
    travelType: string[]
    interests: string[]
    transports: string[]
}

export interface UserInfo {
    id: string
    openid: string
    nickname: string
    avatar: string
    phone?: string
    gender?: number
}

export const useUserStore = defineStore('user', () => {
    const token = ref<string>(uni.getStorageSync('token') || '')
    const userInfo = ref<UserInfo | null>(null)
    const preference = ref<UserPreference | null>(null)
    const hasSetPreference = ref<boolean>(false)
    const locale = ref<string>(uni.getStorageSync('locale') || 'zh-CN')
    const pendingPreference = ref<UserPreference | null>(null)

    const isLoggedIn = computed(() => !!token.value)

    function setToken(t: string) {
        token.value = t
        uni.setStorageSync('token', t)
    }

    function setUserInfo(info: UserInfo) {
        userInfo.value = info
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
        uni.removeStorageSync('token')
    }

    function loadFromStorage() {
        const savedPref = uni.getStorageSync('preference')
        if (savedPref) {
            preference.value = JSON.parse(savedPref)
            hasSetPreference.value = true
        }
        const savedPending = uni.getStorageSync('pendingPreference')
        if (savedPending) {
            pendingPreference.value = JSON.parse(savedPending)
        }
    }

    return {
        token, userInfo, preference, hasSetPreference, locale, pendingPreference,
        isLoggedIn,
        setToken, setUserInfo, setPreference, setPendingPreference, setLocale, logout, loadFromStorage
    }
})
