<template>
  <view class="comment-list">
    <view class="page-header">
      <text class="page-title">{{ t('comment.list') }}</text>
    </view>

    <!-- 评分统计 -->
    <view v-if="stats" class="stats-card">
      <view class="avg-rating">
        <text class="avg-num">{{ stats.avgRating.toFixed(1) }}</text>
        <text class="avg-stars">{{ '⭐'.repeat(Math.round(stats.avgRating)) }}</text>
        <text class="avg-total">{{ stats.total }} {{ t('poi.comments') }}</text>
      </view>
      <view class="rating-bars">
        <view v-for="i in [5,4,3,2,1]" :key="i" class="bar-row">
          <text class="bar-label">{{ i }}星</text>
          <view class="bar-track">
            <view class="bar-fill" :style="{ width: getBarWidth(i) }" />
          </view>
          <text class="bar-count">{{ stats.distribution[i] || 0 }}</text>
        </view>
      </view>
    </view>

    <!-- 排序筛选 -->
    <view class="sort-bar">
      <view class="sort-btn" :class="{ active: sort === 'time' }" @tap="sort = 'time'; reload()">
        {{ t('comment.sortByTime') }}
      </view>
      <view class="sort-btn" :class="{ active: sort === 'rating' }" @tap="sort = 'rating'; reload()">
        {{ t('comment.sortByRating') }}
      </view>
    </view>

    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view v-if="comments.length === 0 && !loading" class="empty-tip">{{ t('comment.noComments') }}</view>

      <view v-for="c in comments" :key="c.id" class="comment-item">
        <image class="c-avatar" :src="c.userAvatar || '/static/logo.png'" mode="aspectFill" />
        <view class="c-body">
          <view class="c-header">
            <text class="c-name">{{ c.userNickname || t('comment.anonymous') }}</text>
            <text class="c-date">{{ c.createdAt.slice(0, 10) }}</text>
          </view>
          <text class="c-stars">{{ '⭐'.repeat(c.rating) }}</text>
          <text class="c-content">{{ c.content }}</text>
          <view v-if="c.images?.length" class="c-images">
            <image v-for="(img, idx) in c.images" :key="idx" class="c-img" :src="img" mode="aspectFill" @tap="previewImage(c.images!, idx)" />
          </view>
          <view class="c-footer">
            <text class="helpful-btn">👍 {{ c.helpfulCount }}</text>
          </view>
        </view>
      </view>

      <view v-if="noMore && comments.length > 0" class="no-more">{{ t('common.noMore') }}</view>
    </scroll-view>

    <!-- 写评论按钮 -->
    <view class="write-btn-area">
      <button class="write-btn" @tap="goCreate">{{ t('poi.addComment') }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onLoad } from '@dcloudio/uni-app'
import { commentApi } from '../../api/comment'
import type { Comment, CommentStats } from '../../api/comment'

const { t } = useI18n()
const comments = ref<Comment[]>([])
const stats = ref<CommentStats | null>(null)
const sort = ref<'time' | 'rating'>('time')
const page = ref(1)
const noMore = ref(false)
const loading = ref(false)
const poiId = ref('')

onLoad((options) => {
  poiId.value = options?.poiId || ''
  loadData(true)
})

function getBarWidth(star: number) {
  if (!stats.value || !stats.value.total) return '0%'
  const count = stats.value.distribution[star] || 0
  return `${(count / stats.value.total * 100).toFixed(0)}%`
}

async function loadData(reset = false) {
  if (loading.value) return
  loading.value = true
  try {
    const res = await commentApi.list({ poiId: poiId.value, sort: sort.value, page: page.value, pageSize: 15 })
    if (reset) {
      comments.value = res.list
      stats.value = res.stats
    } else {
      comments.value.push(...res.list)
    }
    if (res.list.length < 15) noMore.value = true
  } catch {} finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  noMore.value = false
  loadData(true)
}

function loadMore() {
  if (noMore.value) return
  page.value++
  loadData()
}

function previewImage(imgs: string[], idx: number) {
  uni.previewImage({ urls: imgs, current: imgs[idx] })
}

function goCreate() { uni.navigateTo({ url: `/pages/comment/create?poiId=${poiId.value}` }) }
</script>

<style scoped>
.comment-list {
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

.stats-card {
  background: #fff;
  margin: 16rpx 24rpx;
  border-radius: 16rpx;
  padding: 28rpx;
  display: flex;
  gap: 32rpx;
}

.avg-rating {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 120rpx;
}

.avg-num {
  font-size: 64rpx;
  font-weight: 700;
  color: #fa8c16;
}

.avg-stars { font-size: 24rpx; }

.avg-total {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

.rating-bars { flex: 1; }

.bar-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.bar-label {
  font-size: 22rpx;
  color: #999;
  width: 48rpx;
}

.bar-track {
  flex: 1;
  height: 12rpx;
  background: #f0f0f0;
  border-radius: 6rpx;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: #faad14;
  border-radius: 6rpx;
  transition: width 0.3s;
}

.bar-count {
  font-size: 22rpx;
  color: #999;
  width: 40rpx;
  text-align: right;
}

.sort-bar {
  display: flex;
  background: #fff;
  padding: 0 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.sort-btn {
  padding: 20rpx 24rpx;
  font-size: 26rpx;
  color: #666;
  border-bottom: 4rpx solid transparent;
}

.sort-btn.active {
  color: #1890FF;
  border-bottom-color: #1890FF;
  font-weight: 500;
}

.list-scroll { flex: 1; padding: 16rpx 24rpx; }

.comment-item {
  display: flex;
  gap: 16rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}

.c-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.c-body { flex: 1; }

.c-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.c-name {
  font-size: 26rpx;
  font-weight: 500;
  color: #333;
}

.c-date {
  font-size: 22rpx;
  color: #ccc;
}

.c-stars {
  display: block;
  font-size: 24rpx;
  margin-bottom: 8rpx;
}

.c-content {
  display: block;
  font-size: 26rpx;
  color: #555;
  line-height: 1.6;
}

.c-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 12rpx;
}

.c-img {
  width: 140rpx;
  height: 140rpx;
  border-radius: 8rpx;
}

.c-footer {
  margin-top: 12rpx;
}

.helpful-btn {
  font-size: 24rpx;
  color: #999;
}

.empty-tip, .no-more {
  text-align: center;
  padding: 60rpx;
  font-size: 26rpx;
  color: #ccc;
}

.write-btn-area {
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
}

.write-btn {
  width: 100%;
  height: 80rpx;
  line-height: 80rpx;
  background: #1890FF;
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
  border: none;
}
</style>
