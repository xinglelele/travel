<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useUserStore } from './stores/user'
import { userApi } from './api/user'

onLaunch(async () => {
  const userStore = useUserStore()
  userStore.loadFromStorage()

  // 尝试重试待提交的偏好设置
  if (userStore.pendingPreference && userStore.isLoggedIn) {
    try {
      await userApi.preference(userStore.pendingPreference)
      userStore.setPreference(userStore.pendingPreference)
    } catch {
      // 网络仍不可用，保留pending，下次启动再试
    }
  }

  // 已登录时刷新用户信息；正式用户未完善资料则进入资料页
  if (userStore.isLoggedIn) {
    try {
      const info = await userApi.profile()
      userStore.setUserInfo(info)
      if (info.needProfileSetup) {
        setTimeout(() => {
          const pages = getCurrentPages()
          const route = pages[pages.length - 1]?.route
          if (route !== 'pages/onboarding/setup') {
            uni.redirectTo({ url: '/pages/onboarding/setup' })
          }
        }, 0)
      }
    } catch {}
  }
})

onShow(() => {
  // 每次前台显示时检查是否需要展示偏好弹窗
  // 由首页组件监听 hasSetPreference 状态来决定是否弹出
})
</script>

<style>
/* 全局样式重置 */
page {
  background-color: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;
}

/* 安全区域适配 */
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
