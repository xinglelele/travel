<template>
  <view class="my-routes">
    <view class="page-header">
      <text class="page-title">{{ t('route.myRoutes') }}</text>
    </view>

    <!-- 未登录提示 -->
    <view v-if="!isLoggedIn" class="login-tip">
      <text class="login-tip-icon">🔒</text>
      <text class="login-tip-text">登录后可查看和管理您的路线</text>
      <button class="login-tip-btn" @tap="goLogin">立即登录</button>
    </view>

    <template v-else>
    <view class="search-bar">
      <view class="search-input">
        <text class="search-icon">🔍</text>
        <input v-model="keyword" :placeholder="t('common.search')" @input="onSearch" />
      </view>
    </view>

    <scroll-view scroll-y class="routes-scroll" @scrolltolower="loadMore">
      <view v-if="filteredRoutes.length === 0" class="empty-state">
        <text class="empty-icon">🗺️</text>
        <text class="empty-text">{{ t('route.noRoutes') }}</text>
        <button class="plan-btn" @tap="goPlan">{{ t('route.generateBtn') }}</button>
      </view>

      <view
        v-for="route in filteredRoutes"
        :key="route.id"
        class="route-card"
        @tap="goDetail(route.id)"
        @longpress="onLongPress(route.id)"
      >
        <image class="route-cover" :src="route.coverImage || '/static/logo.png'" mode="aspectFill" />
        <view class="route-info">
          <text class="route-title">{{ route.title }}</text>
          <view class="route-meta">
            <text class="meta-item">📅 {{ route.days }}{{ t('route.days') }}</text>
            <text class="meta-item">📍 {{ route.totalPoi }}{{ t('map.poiCount') }}</text>
          </view>
          <view class="route-tags">
            <text v-for="tag in route.tags?.slice(0, 3)" :key="tag" class="route-tag">{{ tag }}</text>
          </view>
          <text class="route-date">{{ formatDate(route.createdAt) }}</text>
        </view>
      </view>

      <view v-if="noMore && filteredRoutes.length > 0" class="no-more">{{ t('common.noMore') }}</view>
    </scroll-view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouteStore } from '../../stores/route'
import { useUserStore } from '../../stores/user'
import { routeApi } from '../../api/route'

const { t } = useI18n()
const routeStore = useRouteStore()
const userStore = useUserStore()

const keyword = ref('')
const page = ref(1)
const noMore = ref(false)
const isLoggedIn = computed(() => userStore.isLoggedIn)

const filteredRoutes = computed(() => {
  if (!keyword.value) return routeStore.myRoutes
  return routeStore.myRoutes.filter(r => r.title.includes(keyword.value))
})

function onSearch() {
  // 本地过滤，无需请求
}

function formatDate(dateStr: string) {
  return dateStr ? dateStr.slice(0, 10) : ''
}

async function loadData() {
  try {
    const res = await routeApi.my({ page: page.value, pageSize: 20 })
    routeStore.setMyRoutes(res.list)
    if (res.list.length < 20) noMore.value = true
  } catch {}
}

async function loadMore() {
  if (noMore.value) return
  page.value++
  try {
    const res = await routeApi.my({ page: page.value, pageSize: 20 })
    routeStore.setMyRoutes([...routeStore.myRoutes, ...res.list])
    if (res.list.length < 20) noMore.value = true
  } catch {}
}

function onLongPress(id: string) {
  uni.showActionSheet({
    itemList: [t('common.delete')],
    success: async (res) => {
      if (res.tapIndex === 0) {
        uni.showModal({
          content: t('route.deleteConfirm'),
          success: async (modal) => {
            if (modal.confirm) {
              try {
                await routeApi.delete(id)
                routeStore.removeRoute(id)
              } catch {}
            }
          }
        })
      }
    }
  })
}

function goDetail(id: string) { uni.navigateTo({ url: `/pages/route/detail?id=${id}` }) }
function goPlan() { uni.navigateTo({ url: '/pages/route/plan' }) }
function goLogin() { uni.navigateTo({ url: '/pages/login/index' }) }

onMounted(() => {
  if (isLoggedIn.value) {
    loadData()
  }
})
</script>

<style scoped>
.my-routes {
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

.search-bar {
  padding: 16rpx 24rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

/* 未登录提示样式 */
.login-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 48rpx;
  gap: 24rpx;
}

.login-tip-icon { font-size: 80rpx; }

.login-tip-text {
  font-size: 28rpx;
  color: #999;
  text-align: center;
}

.login-tip-btn {
  background: linear-gradient(135deg, #1890FF, #52C41A);
  color: #fff;
  border-radius: 44rpx;
  padding: 0 48rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  border: none;
}

.search-input {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #f5f7fa;
  border-radius: 40rpx;
  padding: 14rpx 24rpx;
}

.search-icon { font-size: 28rpx; }

.routes-scroll { flex: 1; padding: 16rpx 24rpx; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
  gap: 24rpx;
}

.empty-icon { font-size: 80rpx; }

.empty-text {
  font-size: 28rpx;
  color: #999;
}

.plan-btn {
  background: #1890FF;
  color: #fff;
  border-radius: 44rpx;
  padding: 0 48rpx;
  height: 80rpx;
  line-height: 80rpx;
  font-size: 28rpx;
  border: none;
}

.route-card {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}

.route-cover {
  width: 200rpx;
  height: 180rpx;
  flex-shrink: 0;
}

.route-info {
  flex: 1;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.route-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.route-meta {
  display: flex;
  gap: 16rpx;
  margin-top: 8rpx;
}

.meta-item {
  font-size: 24rpx;
  color: #666;
}

.route-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 8rpx;
}

.route-tag {
  padding: 4rpx 16rpx;
  background: #e6f4ff;
  color: #1890FF;
  border-radius: 40rpx;
  font-size: 20rpx;
}

.route-date {
  font-size: 22rpx;
  color: #ccc;
  margin-top: 8rpx;
}

.no-more {
  text-align: center;
  padding: 32rpx;
  font-size: 26rpx;
  color: #ccc;
}
</style>
