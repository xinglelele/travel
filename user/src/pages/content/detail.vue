<template>
  <view class="content-detail">
    <!-- 顶部导航 -->
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-left">
        <view class="nav-btn" @tap="goBack">
          <text class="nav-arrow">‹</text>
        </view>
      </view>
      <text class="nav-title">{{ contentDetail?.type === 'user' ? '用户评论' : '官方资讯' }}</text>
      <view class="nav-right" />
    </view>

    <scroll-view scroll-y class="detail-scroll" refresher-enabled>
      <!-- 多图轮播 -->
      <swiper v-if="images.length > 0" class="cover-swiper" :indicator-dots="images.length > 1" indicator-color="rgba(255,255,255,0.5)" indicator-active-color="#fff" :autoplay="images.length > 1" :interval="3000" circular>
        <swiper-item v-for="(img, idx) in images" :key="idx">
          <image class="swiper-img" :src="img" mode="aspectFill" @tap="previewImage(idx)" />
        </swiper-item>
      </swiper>
      <image v-else class="cover-img" :src="contentDetail?.cover || '/static/logo.png'" mode="aspectFill" />

      <!-- 视频 -->
      <video v-if="contentDetail?.videoUrl" class="content-video" :src="contentDetail.videoUrl" controls show-fullscreen-btn />

      <!-- 用户内容：用户信息 + 评分 -->
      <view v-if="contentDetail?.type === 'user'" class="user-section">
        <image class="user-avatar" :src="contentDetail.userAvatar || '/static/logo.png'" mode="aspectFill" />
        <view class="user-meta">
          <text class="user-name">{{ contentDetail.userNickname }}</text>
          <text class="user-date">{{ formatDate(contentDetail?.createdAt) }}</text>
        </view>
        <view class="user-rating">
          <text class="rating-label">评分</text>
          <text class="rating-stars">{{ '⭐'.repeat(contentDetail.rating || 0) }}</text>
        </view>
      </view>

      <!-- 标签 -->
      <view v-if="contentDetail?.tags?.length" class="tags-row">
        <text v-for="tag in contentDetail.tags" :key="tag" class="tag-badge"># {{ tag }}</text>
      </view>

      <!-- 标题与正文 -->
      <view class="article-section">
        <text class="article-title">{{ contentDetail?.title }}</text>
        <view class="article-stats">
          <text class="stat-item">👁 {{ contentDetail?.viewCount || 0 }}</text>
          <text class="stat-item" @tap="onLike">
            <text :class="contentDetail?.liked ? 'liked' : ''">❤️ {{ contentDetail?.likeCount || 0 }}</text>
          </text>
        </view>
        <view class="article-body">
          <rich-text :nodes="contentDetail?.body || ''" />
        </view>
      </view>

      <!-- 用户内容特有：跳转景点按钮 -->
      <view v-if="contentDetail?.type === 'user' && contentDetail?.poiId" class="poi-action">
        <view class="poi-card" @tap="goPoiFromContent">
          <image class="poi-thumb" :src="contentDetail.cover || '/static/logo.png'" mode="aspectFill" />
          <view class="poi-info">
            <text class="poi-name">{{ contentDetail.title }}</text>
            <text class="poi-hint">点击前往打卡</text>
          </view>
          <text class="poi-arrow">›</text>
        </view>
      </view>

      <!-- 相关景点 -->
      <view v-if="relatedPois.length > 0" class="related-section">
        <text class="section-title">相关景点</text>
        <view v-for="poi in relatedPois" :key="poi.id" class="related-poi" @tap="goPoi(poi.id)">
          <image class="poi-img" :src="poi.images[0] || '/static/logo.png'" mode="aspectFill" />
          <view class="poi-info">
            <text class="poi-name">{{ poi.name }}</text>
            <text class="poi-rating">⭐ {{ poi.rating }}</text>
          </view>
          <text class="poi-arrow">›</text>
        </view>
      </view>

      <!-- 底部占位 -->
      <view class="bottom-space" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="action-bar" :style="{ paddingBottom: `${safeAreaBottom}px` }">
      <view class="action-item" @tap="onLike">
        <text class="action-icon">{{ contentDetail?.liked ? '❤️' : '🤍' }}</text>
        <text class="action-count">{{ contentDetail?.likeCount || 0 }}</text>
      </view>
      <view class="action-divider" />
      <view class="action-item" @tap="onFavorite">
        <text class="action-icon">{{ contentDetail?.favorited ? '⭐' : '☆' }}</text>
        <text class="action-count">{{ contentDetail?.favorited ? '已收藏' : '收藏' }}</text>
      </view>
      <view class="action-divider" />
      <view v-if="contentDetail?.type === 'user' && contentDetail?.poiId" class="action-item" @tap="onShare">
        <text class="action-icon">↗</text>
        <text class="action-count">分享</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { contentApi } from '../../api/content'
import { poiApi } from '../../api/poi'
import type { Content } from '../../api/content'
import type { POI } from '../../stores/poi'

const statusBarHeight = ref(20)
const safeAreaBottom = ref(0)
const contentDetail = ref<Content | null>(null)
const relatedPois = ref<POI[]>([])

let loadedFromOnLoad = false
let contentId = ''

// 多图轮播：优先用户上传图片
const images = computed<string[]>(() => {
  if (!contentDetail.value) return []
  if (contentDetail.value.type === 'user') {
    // 用户内容：从 summary/body 里尝试提取图片，或直接使用 cover
    // cover 已经是最优的第一张图
    return contentDetail.value.cover ? [contentDetail.value.cover] : []
  }
  return contentDetail.value.cover ? [contentDetail.value.cover] : []
})

onLoad((options) => {
  const id = (options?.id as string) || ''
  contentId = id
  loadedFromOnLoad = true
  if (id) {
    loadData(id)
  } else {
    uni.showToast({ title: '缺少内容参数', icon: 'none' })
  }
})

onMounted(() => {
  // 微信获取状态栏高度
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 20
  safeAreaBottom.value = sysInfo.safeAreaInsets?.bottom || 0

  if (!loadedFromOnLoad) {
    const pages = getCurrentPages()
    const page = pages[pages.length - 1] as any
    const id = page?.$page?.options?.id || page?.options?.id || ''
    contentId = id
    if (id) loadData(id)
  }
})

async function loadData(id: string) {
  if (!id?.trim()) return
  try {
    contentDetail.value = await contentApi.detail(id)
    contentApi.view(id)
    if (contentDetail.value?.relatedPoiIds?.length) {
      const poiPromises = contentDetail.value.relatedPoiIds.map(poiId => poiApi.detail(poiId))
      relatedPois.value = await Promise.all(poiPromises)
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 10).replace(/-/g, '.')
}

function goBack() {
  uni.navigateBack()
}

function previewImage(index: number) {
  if (!images.value.length) return
  uni.previewImage({ urls: images.value, current: index })
}

function goPoi(id: string) { uni.navigateTo({ url: `/pages/poi/detail?id=${id}` }) }
function goPoiFromContent() {
  if (contentDetail.value?.poiId) goPoi(contentDetail.value.poiId)
}

async function onLike() {
  if (!contentId) return
  if (!uni.getStorageSync('token')) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.navigateTo({ url: '/pages/login/index' })
    return
  }
  try {
    const res = await contentApi.like(contentId)
    // 更新本地状态
    if (contentDetail.value) {
      contentDetail.value.liked = res.liked
      contentDetail.value.likeCount = (contentDetail.value.likeCount || 0) + (res.liked ? 1 : -1)
    }
    uni.showToast({ title: res.liked ? '点赞成功' : '已取消点赞', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  }
}

async function onFavorite() {
  if (!contentId) return
  if (!uni.getStorageSync('token')) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.navigateTo({ url: '/pages/login/index' })
    return
  }
  try {
    const res = await contentApi.favorite(contentId)
    if (contentDetail.value) {
      contentDetail.value.favorited = res.favorited
    }
    uni.showToast({ title: res.favorited ? '收藏成功' : '已取消收藏', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || '操作失败', icon: 'none' })
  }
}

function onShare() {
  if (!contentDetail.value) return
  uni.showShareMenu({ withShareTicket: true })
}
</script>

<style scoped>
.content-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

/* 顶部导航 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16rpx 16rpx;
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.nav-left, .nav-right { width: 80rpx; }

.nav-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 50%;
}

.nav-arrow {
  font-size: 40rpx;
  color: #333;
  font-weight: 300;
  line-height: 1;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  flex: 1;
  text-align: center;
}

/* 轮播 */
.cover-swiper {
  width: 100%;
  height: 480rpx;
}

.swiper-img {
  width: 100%;
  height: 100%;
}

.cover-img {
  width: 100%;
  height: 480rpx;
}

.content-video {
  width: 100%;
  height: 400rpx;
}

/* 用户信息 */
.user-section {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 32rpx;
  background: #fff;
  border-bottom: 1rpx solid #f5f5f5;
}

.user-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.user-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.user-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.user-date {
  font-size: 22rpx;
  color: #999;
}

.user-rating {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
}

.rating-label {
  font-size: 20rpx;
  color: #999;
}

.rating-stars {
  font-size: 24rpx;
}

/* 标签 */
.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  padding: 16rpx 32rpx;
  background: #fff;
}

.tag-badge {
  font-size: 22rpx;
  color: #1890FF;
  background: #e6f4ff;
  padding: 6rpx 20rpx;
  border-radius: 40rpx;
}

/* 正文 */
.article-section {
  padding: 24rpx 32rpx;
  background: #fff;
  margin-top: 16rpx;
}

.article-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.4;
  margin-bottom: 16rpx;
}

.article-stats {
  display: flex;
  gap: 24rpx;
  margin-bottom: 24rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.stat-item {
  font-size: 24rpx;
  color: #999;
}

.stat-item .liked {
  color: #ff4757;
}

.article-body {
  font-size: 28rpx;
  color: #333;
  line-height: 1.9;
}

/* 景点卡片 */
.poi-action {
  padding: 0 32rpx;
  margin-top: 16rpx;
}

.poi-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
}

.poi-thumb {
  width: 100rpx;
  height: 80rpx;
  border-radius: 10rpx;
  flex-shrink: 0;
}

.poi-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.poi-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.poi-hint {
  font-size: 22rpx;
  color: #1890FF;
}

.poi-arrow {
  font-size: 40rpx;
  color: #ccc;
}

/* 相关景点 */
.related-section {
  padding: 24rpx 32rpx;
  margin-top: 16rpx;
  background: #fff;
}

.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16rpx;
}

.related-poi {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.related-poi:last-child { border-bottom: none; }

.poi-img {
  width: 100rpx;
  height: 80rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.poi-info { flex: 1; }

.poi-rating {
  display: block;
  font-size: 22rpx;
  color: #fa8c16;
  margin-top: 4rpx;
}

.bottom-space { height: 120rpx; }

/* 底部操作栏 */
.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
  padding: 16rpx 0;
  padding-top: 20rpx;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.action-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.action-icon {
  font-size: 44rpx;
  line-height: 1;
}

.action-count {
  font-size: 22rpx;
  color: #666;
}

.action-divider {
  width: 1rpx;
  height: 40rpx;
  background: #eee;
}
</style>
