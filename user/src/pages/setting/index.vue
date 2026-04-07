<template>
  <view class="setting-page">
    <view class="page-header">
      <text class="page-title">{{ t('setting.title') }}</text>
    </view>

    <scroll-view scroll-y class="setting-scroll">
      <!-- 语言设置 -->
      <view class="setting-group">
        <view class="setting-item" @tap="showLanguagePicker = true">
          <text class="item-label">{{ t('setting.language') }}</text>
          <view class="item-right">
            <text class="item-value">{{ currentLocaleName }}</text>
            <text class="item-arrow">›</text>
          </view>
        </view>
      </view>

      <!-- 通知设置 -->
      <view class="setting-group">
        <view class="setting-item">
          <text class="item-label">{{ t('setting.notification') }}</text>
          <switch :checked="notificationOn" @change="onNotificationChange" color="#1890FF" />
        </view>
      </view>

      <!-- 其他 -->
      <view class="setting-group">
        <view class="setting-item" @tap="clearCache">
          <text class="item-label">{{ t('setting.clearCache') }}</text>
          <view class="item-right">
            <text class="item-value">{{ cacheSize }}</text>
            <text class="item-arrow">›</text>
          </view>
        </view>
        <view class="setting-item" @tap="goAbout">
          <text class="item-label">{{ t('setting.about') }}</text>
          <view class="item-right">
            <text class="item-value">v1.0.0</text>
            <text class="item-arrow">›</text>
          </view>
        </view>
        <view class="setting-item" @tap="goFeedback">
          <text class="item-label">{{ t('setting.feedback') }}</text>
          <text class="item-arrow">›</text>
        </view>
      </view>

      <!-- 退出登录 -->
      <view v-if="isLoggedIn" class="logout-btn" @tap="onLogout">
        {{ t('setting.logout') }}
      </view>
    </scroll-view>

    <!-- 语言选择器 -->
    <view v-if="showLanguagePicker" class="picker-mask" @tap="showLanguagePicker = false">
      <view class="picker-panel" @tap.stop>
        <text class="picker-title">{{ t('setting.language') }}</text>
        <view
          v-for="lang in languages"
          :key="lang.key"
          class="lang-item"
          :class="{ active: currentLocale === lang.key }"
          @tap="selectLanguage(lang.key)"
        >
          <text class="lang-name">{{ lang.name }}</text>
          <text v-if="currentLocale === lang.key" class="lang-check">✓</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../../stores/user'
import { switchLanguage, SUPPORTED_LANGUAGES } from '../../utils/locale'
import { requestAllNotifications } from '../../utils/notification'

const { t, locale } = useI18n()
const userStore = useUserStore()

const isLoggedIn = computed(() => userStore.isLoggedIn)
const currentLocale = computed(() => userStore.locale)
const showLanguagePicker = ref(false)
const notificationOn = ref(true)
const cacheSize = ref('计算中...')

const languages = SUPPORTED_LANGUAGES

const currentLocaleName = computed(() => {
  return languages.find(l => l.key === currentLocale.value)?.name || '简体中文'
})

function selectLanguage(key: string) {
  showLanguagePicker.value = false
  if (key === currentLocale.value) return
  switchLanguage(key)
}

async function onNotificationChange(e: { detail: { value: boolean } }) {
  notificationOn.value = e.detail.value
  if (notificationOn.value) {
    // 用户开启通知，请求订阅权限
    const granted = await requestAllNotifications()
    if (!granted) {
      uni.showToast({
        title: '请在设置中开启通知权限',
        icon: 'none'
      })
      notificationOn.value = false
    }
  }
}

function clearCache() {
  uni.showModal({
    content: t('setting.clearCache') + '?',
    success: (res) => {
      if (res.confirm) {
        uni.clearStorageSync()
        uni.showToast({ title: t('setting.cacheCleared'), icon: 'success' })
        cacheSize.value = '0KB'
      }
    }
  })
}

function onLogout() {
  uni.showModal({
    content: t('setting.logoutConfirm'),
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.switchTab({ url: '/pages/home/index' })
      }
    }
  })
}

function goAbout() {
  uni.showModal({ title: '文旅智慧导览', content: 'Version 1.0.0\n© 2024 Tourism Guide', showCancel: false })
}

function goFeedback() {
  uni.navigateTo({ url: '/pages/setting/feedback' })
}
</script>

<style scoped>
.setting-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.page-header {
  padding: 20rpx 32rpx;
  padding-top: calc(20rpx + var(--status-bar-height));
  background: #fff;
}

.page-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.setting-scroll { flex: 1; padding: 24rpx; }

.setting-group {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.setting-item:last-child { border-bottom: none; }

.item-label {
  font-size: 28rpx;
  color: #333;
}

.item-right {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.item-value {
  font-size: 26rpx;
  color: #999;
}

.item-arrow {
  font-size: 36rpx;
  color: #ccc;
}

.logout-btn {
  background: #fff;
  border-radius: 16rpx;
  text-align: center;
  padding: 32rpx;
  font-size: 30rpx;
  color: #ff4d4f;
  margin-top: 20rpx;
}

.picker-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}

.picker-panel {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
}

.picker-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  text-align: center;
  margin-bottom: 24rpx;
}

.lang-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.lang-item:last-child { border-bottom: none; }

.lang-name {
  font-size: 30rpx;
  color: #333;
}

.lang-check {
  font-size: 32rpx;
  color: #1890FF;
  font-weight: 600;
}
</style>
