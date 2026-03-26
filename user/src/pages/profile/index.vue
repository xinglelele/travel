<template>
  <view class="profile-page">
    <!-- 用户信息头部 -->
    <view class="profile-header">
      <view v-if="isLoggedIn" class="user-info" @tap="goEdit">
        <image class="avatar" :src="userInfo?.avatar || '/static/logo.png'" mode="aspectFill" />
        <view class="user-detail">
          <text class="nickname">{{ userInfo?.nickname || 'User' }}</text>
          <text class="edit-hint">{{ t('profile.editProfile') }} ›</text>
        </view>
      </view>
      <view v-else class="login-entry" @tap="doLogin">
        <image class="avatar" src="/static/logo.png" mode="aspectFill" />
        <view class="user-detail">
          <text class="nickname">{{ t('profile.login') }}</text>
          <text class="edit-hint">{{ t('profile.loginDesc') }}</text>
        </view>
      </view>
    </view>

    <!-- 数据统计 -->
    <view class="stats-bar">
      <view class="stat-item" @tap="goMyRoutes">
        <text class="stat-num">{{ routeCount }}</text>
        <text class="stat-label">{{ t('profile.myRoutes') }}</text>
      </view>
      <view class="stat-divider" />
      <view class="stat-item" @tap="goChecks">
        <text class="stat-num">{{ checkCount }}</text>
        <text class="stat-label">{{ t('profile.myChecks') }}</text>
      </view>
      <view class="stat-divider" />
      <view class="stat-item">
        <text class="stat-num">0</text>
        <text class="stat-label">{{ t('profile.myCollects') }}</text>
      </view>
    </view>

    <!-- 菜单列表 -->
    <view class="menu-list">
      <view class="menu-item" @tap="goMyRoutes">
        <AppIcon name="route" :size="56" />
        <text class="menu-text">{{ t('profile.myRoutes') }}</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goChecks">
        <AppIcon name="checkin" :size="56" />
        <text class="menu-text">{{ t('profile.myChecks') }}</text>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goMessages">
        <AppIcon name="bell" :size="56" />
        <text class="menu-text">{{ t('profile.messages') }}</text>
        <view v-if="unreadCount > 0" class="menu-badge">{{ unreadCount }}</view>
        <text class="menu-arrow">›</text>
      </view>
      <view class="menu-item" @tap="goSettings">
        <AppIcon name="settings" :size="56" />
        <text class="menu-text">{{ t('profile.settings') }}</text>
        <text class="menu-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUserStore } from '../../stores/user'
import { useRouteStore } from '../../stores/route'
import { useMessageStore } from '../../stores/message'
import { userApi } from '../../api/user'
import { routeApi } from '../../api/route'
import AppIcon from '../../components/AppIcon.vue'

const { t } = useI18n()
const userStore = useUserStore()
const routeStore = useRouteStore()
const messageStore = useMessageStore()

const isLoggedIn = computed(() => userStore.isLoggedIn)
const userInfo = computed(() => userStore.userInfo)
const unreadCount = computed(() => messageStore.unreadCount)
const routeCount = computed(() => routeStore.myRoutes.length)
const checkCount = ref(0)

import { ref } from 'vue'

async function doLogin() {
  uni.login({
    provider: 'weixin',
    success: async (res) => {
      try {
        const result = await userApi.login({ code: res.code })
        userStore.setToken(result.token)
        userStore.setUserInfo(result.userInfo)
      } catch {}
    }
  })
}

async function loadData() {
  if (!isLoggedIn.value) return
  try {
    const routes = await routeApi.my({ pageSize: 100 })
    routeStore.setMyRoutes(routes.list)
  } catch {}
}

function goEdit() { uni.navigateTo({ url: '/pages/profile/edit' }) }
function goMyRoutes() { uni.navigateTo({ url: '/pages/route/my' }) }
function goChecks() { uni.navigateTo({ url: '/pages/check/list' }) }
function goMessages() { uni.navigateTo({ url: '/pages/message/list' }) }
function goSettings() { uni.navigateTo({ url: '/pages/setting/index' }) }

onMounted(() => loadData())
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.profile-header {
  background: linear-gradient(135deg, #1890FF, #52C41A);
  padding: 60rpx 32rpx 40rpx;
  padding-top: calc(60rpx + var(--status-bar-height));
}

.user-info, .login-entry {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 4rpx solid rgba(255,255,255,0.6);
}

.nickname {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #fff;
}

.edit-hint {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,0.8);
  margin-top: 6rpx;
}

.stats-bar {
  background: #fff;
  display: flex;
  align-items: center;
  padding: 32rpx 0;
  margin-bottom: 20rpx;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #1890FF;
}

.stat-label {
  font-size: 24rpx;
  color: #999;
}

.stat-divider {
  width: 2rpx;
  height: 60rpx;
  background: #f0f0f0;
}

.menu-list {
  background: #fff;
  border-radius: 16rpx;
  margin: 0 24rpx;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;
  gap: 20rpx;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-text {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}

.menu-badge {
  background: #ff4d4f;
  color: #fff;
  font-size: 20rpx;
  min-width: 36rpx;
  height: 36rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8rpx;
}

.menu-arrow {
  font-size: 36rpx;
  color: #ccc;
}
</style>
