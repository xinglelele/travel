<template>
  <view class="stats-page">
    <view class="page-header">
      <text class="page-title">{{ t('profile.myStats') }}</text>
    </view>

    <scroll-view scroll-y class="stats-scroll">
      <!-- 数据卡片 -->
      <view class="stats-grid">
        <view class="stat-card">
          <text class="stat-icon">📍</text>
          <text class="stat-num">{{ stats.checkCount }}</text>
          <text class="stat-label">{{ t('stats.checkIns') }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-icon">📅</text>
          <text class="stat-num">{{ stats.checkDays }}</text>
          <text class="stat-label">{{ t('stats.checkDays') }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-icon">🗺️</text>
          <text class="stat-num">{{ stats.routeCount }}</text>
          <text class="stat-label">{{ t('stats.routes') }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-icon">⭐</text>
          <text class="stat-num">{{ stats.commentCount }}</text>
          <text class="stat-label">{{ t('stats.comments') }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-icon">❤️</text>
          <text class="stat-num">{{ stats.favoriteCount }}</text>
          <text class="stat-label">{{ t('stats.favorites') }}</text>
        </view>
        <view class="stat-card">
          <text class="stat-icon">🔥</text>
          <text class="stat-num">{{ stats.activeDays30d }}</text>
          <text class="stat-label">{{ t('stats.activeDays30d') }}</text>
        </view>
      </view>

      <!-- 成就徽章 -->
      <view class="section">
        <text class="section-title">{{ t('stats.achievements') }}</text>
        <view class="badges-grid">
          <view
            v-for="badge in earnedBadges"
            :key="badge.id"
            class="badge-item earned"
          >
            <text class="badge-icon">{{ badge.icon }}</text>
            <text class="badge-name">{{ badge.name }}</text>
          </view>
          <view
            v-for="badge in lockedBadges"
            :key="badge.id"
            class="badge-item locked"
          >
            <text class="badge-icon">🔒</text>
            <text class="badge-name">{{ badge.name }}</text>
          </view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view v-if="loading" class="loading-state">
        <text>{{ t('common.loading') }}</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { userApi } from '../../api/user'
import type { UserStats } from '../../api/user'

const { t } = useI18n()

const loading = ref(false)
const stats = ref<UserStats>({
  checkCount: 0,
  routeCount: 0,
  commentCount: 0,
  favoriteCount: 0,
  checkDays: 0,
  activeDays30d: 0
})

interface Badge {
  id: string
  icon: string
  name: string
  condition: (s: UserStats) => boolean
}

const allBadges: Badge[] = [
  { id: 'first_checkin', icon: '📍', name: '初次打卡', condition: s => s.checkCount >= 1 },
  { id: 'ten_checkins', icon: '🏃', name: '打卡达人', condition: s => s.checkCount >= 10 },
  { id: 'fifty_checkins', icon: '🌟', name: '打卡狂魔', condition: s => s.checkCount >= 50 },
  { id: 'first_route', icon: '🗺️', name: '路线规划师', condition: s => s.routeCount >= 1 },
  { id: 'five_routes', icon: '📍', name: '深度游客', condition: s => s.routeCount >= 5 },
  { id: 'first_comment', icon: '💬', name: '点评新手', condition: s => s.commentCount >= 1 },
  { id: 'ten_comments', icon: '📝', name: '点评达人', condition: s => s.commentCount >= 10 },
  { id: 'first_favorite', icon: '❤️', name: '收藏癖', condition: s => s.favoriteCount >= 1 },
  { id: 'ten_favorites', icon: '💖', name: '收藏家', condition: s => s.favoriteCount >= 10 },
  { id: 'active_week', icon: '🔥', name: '活跃一周', condition: s => s.activeDays30d >= 7 },
  { id: 'active_month', icon: '💪', name: '活跃一月', condition: s => s.activeDays30d >= 30 },
  { id: 'check_ten_days', icon: '🎯', name: '十天打卡', condition: s => s.checkDays >= 10 },
]

const earnedBadges = computed(() =>
  allBadges.filter(b => b.condition(stats.value))
)

const lockedBadges = computed(() =>
  allBadges.filter(b => !b.condition(stats.value))
)

async function loadStats() {
  loading.value = true
  try {
    const res = await userApi.stats()
    stats.value = res
  } catch {
    uni.showToast({ title: t('common.loadFailed'), icon: 'none' })
  } finally {
    loading.value = false
  }
}

onMounted(() => loadStats())
</script>

<style scoped>
.stats-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.page-header {
  padding: 20rpx 32rpx;
  padding-top: calc(20rpx + var(--status-bar-height));
  background: linear-gradient(135deg, #1890FF, #52C41A);
}

.page-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;
}

.stats-scroll {
  flex: 1;
  padding: 24rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.stat-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-icon {
  font-size: 40rpx;
}

.stat-num {
  font-size: 40rpx;
  font-weight: 700;
  color: #1890FF;
}

.stat-label {
  font-size: 22rpx;
  color: #999;
}

.section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 20rpx;
}

.badges-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 16rpx 8rpx;
  border-radius: 12rpx;
}

.badge-item.earned {
  background: #fff7e6;
}

.badge-item.locked {
  background: #f5f5f5;
  opacity: 0.6;
}

.badge-icon {
  font-size: 40rpx;
}

.badge-name {
  font-size: 20rpx;
  color: #666;
  text-align: center;
}

.loading-state {
  text-align: center;
  padding: 48rpx;
  color: #999;
  font-size: 26rpx;
}
</style>
