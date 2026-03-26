import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import App from './App.vue'
import zhCN from './locales/zh-CN.json'
import en from './locales/en.json'

// 导出 i18n 实例，供 setup 外部使用（如 locale.ts）
export const i18n = createI18n({
  legacy: false,
  locale: (uni.getStorageSync('locale') as string) || 'zh-CN',
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    en
  }
})

export function createApp() {
  const app = createSSRApp(App)

  const pinia = createPinia()
  app.use(pinia)
  app.use(i18n)

  return { app }
}
