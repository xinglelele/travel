/**
 * 统一语言切换工具
 * 直接操作 i18n 全局实例，避免在 setup 外调用 useI18n() 报错
 */
import { i18n } from '../main'
import { useUserStore } from '../stores/user'

export const SUPPORTED_LANGUAGES = [
    { key: 'zh-CN', name: '简体中文', nativeName: '简体中文' },
    { key: 'en', name: 'English', nativeName: 'English' },
]

export function switchLanguage(langKey: string) {
    const userStore = useUserStore()

    userStore.setLocale(langKey)
        // 直接修改全局 i18n 实例的 locale
        ; (i18n.global.locale as any).value = langKey
    uni.setStorageSync('locale', langKey)

    const toastTitle: Record<string, string> = {
        'zh-CN': '语言已切换',
        'en': 'Language Changed',
    }

    uni.showModal({
        title: toastTitle[langKey] || '语言已切换',
        content: '重新进入首页后完全生效',
        showCancel: false,
        confirmText: '好的',
        success: () => {
            uni.reLaunch({ url: '/pages/home/index' })
        }
    })
}
