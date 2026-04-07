<template>
  <view class="favorite-list">
    <view class="page-header">
      <text class="page-title">{{ t('poi.myFavorites') }}</text>
      <view class="tab-bar">
        <view
          v-for="tab in tabs"
          :key="tab.key"
          class="tab-item"
          :class="{ active: activeTab === tab.key }"
          @tap="switchTab(tab.key)"
        >
          <text class="tab-text">{{ tab.label }}</text>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="list-scroll" @scrolltolower="loadMore">
      <!-- POI 列表 -->
      <view v-if="activeTab === 'poi'">
        <view v-if="poiList.length > 0" class="poi-list">
          <view
            v-for="item in poiList"
            :key="item.id"
            class="poi-card"
            @tap="goPoi(item.poiId)"
          >
            <image class="poi-img" :src="item.images[0] || '/static/logo.png'" mode="aspectFill" />
            <view class="poi-info">
              <text class="poi-name">{{ item.name }}</text>
              <text class="poi-category">{{ item.category }}</text>
              <view class="poi-tags">
                <text v-for="tag in item.tags.slice(0, 2)" :key="tag" class="poi-tag">{{ tag }}</text>
              </view>
              <text class="poi-rating">⭐ {{ item.rating }}</text>
            </view>
            <view class="poi-actions">
              <text class="remove-btn" @tap.stop="onRemove(item.poiId)">✕</text>
            </view>
          </view>
        </view>
        <view v-if="poiList.length === 0 && !loading" class="empty-state">
          <text class="empty-icon">🤍</text>
          <text class="empty-text">还没有收藏任何景点</text>
          <button class="empty-btn" @tap="goExplore">去探索</button>
        </view>
      </view>

      <!-- 内容列表 -->
      <view v-if="activeTab === 'content'">
        <view v-if="contentList.length > 0" class="content-list">
          <view
            v-for="item in contentList"
            :key="item.id"
            class="content-card"
            @tap="goContent(item.id)"
          >
            <image class="content-img" :src="item.cover || '/static/logo.png'" mode="aspectFill" />
            <view class="content-info">
              <text class="content-title">{{ item.title }}</text>
              <text class="content-summary">{{ item.summary }}</text>
              <view class="content-meta">
                <text v-if="'userNickname' in item" class="content-user">{{ item.userNickname }}</text>
                <text class="content-rating" v-if="'rating' in item && item.rating">⭐ {{ item.rating }}</text>
                <text class="content-category">{{ item.category }}</text>
              </view>
            </view>
            <view class="content-actions">
              <text class="remove-btn" @tap.stop="onRemoveContent(item.id)">✕</text>
            </view>
          </view>
        </view>
        <view v-if="contentList.length === 0 && !loading" class="empty-state">
          <text class="empty-icon">📖</text>
          <text class="empty-text">还没有收藏任何内容</text>
          <button class="empty-btn" @tap="goDiscover">去发现</button>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="loading" class="loading-row">
        <text class="loading-text">{{ t('common.loading') }}</text>
      </view>

      <!-- 到底提示 -->
      <view v-if="noMore" class="no-more">
        <text>{{ t('common.noMore') }}</text>
      </view>

      <view class="bottom-space" />
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { favoriteApi } from '../../api/favorite'
import { contentApi } from '../../api/content'
import type {
  PoiFavoriteItem,
  FavoriteItem,
  OfficialContentFavoriteItem,
} from '../../api/favorite'
import type { Content } from '../../api/content'

const { t } = useI18n()

const tabs = [
  { key: 'poi', label: '景点' },
  { key: 'content', label: '内容' },
]

const activeTab = ref('poi')

// POI 收藏
const poiList = ref<PoiFavoriteItem[]>([])
const poiPage = ref(1)
const poiNoMore = ref(false)

// 内容收藏
const contentList = ref<Content[]>([])
const contentPage = ref(1)
const contentNoMore = ref(false)

const loading = ref(false)
const pageSize = 20

async function loadData(type: 'poi' | 'content', reset = false) {
  if (loading.value) return
  loading.value = true
  try {
    if (type === 'poi') {
      const page = reset ? 1 : poiPage.value
      const res = await favoriteApi.list({ page, pageSize })
      const poiItems = res.list.filter((item): item is PoiFavoriteItem => item.targetType === 'poi')
      if (reset) poiList.value = poiItems
      else poiList.value.push(...poiItems)
      poiNoMore.value = res.list.length < pageSize
    } else {
      const page = reset ? 1 : contentPage.value
      const res = await favoriteApi.list({ page, pageSize })
      const contentItems = res.list
        .filter(item => item.targetType !== 'poi')
        .map(item => {
          const base = {
            id: 'contentId' in item ? item.contentId : item.id,
            type: item.targetType === 'officialContent' ? 'official' : 'user',
            title: item.title,
            cover: item.cover,
            summary: 'summary' in item ? item.summary : '',
            body: 'summary' in item ? item.summary : '',
            category: item.category,
            tags: [],
            viewCount: 0,
            likeCount: 0,
            createdAt: item.favoritedAt,
            userNickname: 'userNickname' in item ? item.userNickname : undefined,
            userAvatar: 'userAvatar' in item ? item.userAvatar : undefined,
            poiId: 'poiId' in item ? item.poiId : undefined,
            rating: 'rating' in item ? item.rating : undefined,
            favorited: true,
          } as Content
          return base
        })
      if (reset) contentList.value = contentItems
      else contentList.value.push(...contentItems)
      contentNoMore.value = contentItems.length < pageSize
    }
  } catch {
    uni.showToast({ title: t('common.loadFailed'), icon: 'none' })
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (activeTab.value === 'poi' && !poiNoMore.value) {
    poiPage.value++
    loadData('poi')
  } else if (activeTab.value === 'content' && !contentNoMore.value) {
    contentPage.value++
    loadData('content')
  }
}

function switchTab(key: string) {
  if (activeTab.value === key) return
  activeTab.value = key
  if (key === 'poi' && poiList.value.length === 0) loadData('poi', true)
  else if (key === 'content' && contentList.value.length === 0) loadData('content', true)
}

async function onRemove(poiId: string) {
  uni.showModal({
    title: t('common.confirm'),
    content: '确定取消收藏该景点？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await favoriteApi.togglePoi(poiId)
          poiList.value = poiList.value.filter(item => item.poiId !== poiId)
          uni.showToast({ title: '已取消', icon: 'success' })
        } catch (error: any) {
          uni.showToast({ title: error.message || t('common.failed'), icon: 'none' })
        }
      }
    }
  })
}

async function onRemoveContent(id: string) {
  uni.showModal({
    title: t('common.confirm'),
    content: '确定取消收藏该内容？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await contentApi.favorite(id)
          contentList.value = contentList.value.filter(item => item.id !== id)
          uni.showToast({ title: '已取消', icon: 'success' })
        } catch (error: any) {
          uni.showToast({ title: error.message || t('common.failed'), icon: 'none' })
        }
      }
    }
  })
}

function goPoi(poiId: string) {
  uni.navigateTo({ url: `/pages/poi/detail?id=${poiId}` })
}

function goContent(contentId: string) {
  uni.navigateTo({ url: `/pages/content/detail?id=${encodeURIComponent(contentId)}` })
}

function goExplore() { uni.switchTab({ url: '/pages/map/index' }) }
function goDiscover() { uni.switchTab({ url: '/pages/discover/index' }) }

onMounted(() => loadData('poi', true))
</script>

<style scoped>
.favorite-list {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.page-header {
  padding: 20rpx 32rpx ;
  background: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.page-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 30rpx;
}

.tab-bar {
  padding-top: 20rpx;
  display: flex;
  gap: 32rpx;
  padding-bottom: 4rpx;
}

.tab-item {
  padding-bottom: 8rpx;
  border-bottom: 4rpx solid transparent;
}

.tab-item.active {
  border-bottom-color: #1890FF;
}

.tab-text {
  font-size: 28rpx;
  color: #999;
  font-weight: 500;
}

.tab-item.active .tab-text {
  color: #1890FF;
}

.list-scroll {
  flex: 1;
  padding-top: 36rpx;
  box-sizing: border-box;
}

/* POI 列表 */
.poi-list,
.content-list {
  padding: 0 24rpx 16rpx;
}

.poi-card,
.content-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
}

.poi-img {
  width: 160rpx;
  height: 120rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}

.content-img {
  width: 200rpx;
  height: 150rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
}

.poi-info,
.content-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.poi-name,
.content-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.poi-category,
.content-category {
  font-size: 22rpx;
  color: #999;
}

.poi-tags {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}

.poi-tag {
  padding: 4rpx 12rpx;
  background: #e6f4ff;
  color: #1890FF;
  border-radius: 20rpx;
  font-size: 20rpx;
}

.poi-rating,
.content-rating {
  font-size: 22rpx;
  color: #fa8c16;
}

.content-summary {
  font-size: 22rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.content-meta {
  display: flex;
  gap: 12rpx;
  align-items: center;
}

.content-user {
  font-size: 22rpx;
  color: #1890FF;
}

.poi-actions,
.content-actions {
  flex-shrink: 0;
  padding: 8rpx;
}

.remove-btn {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #f5f5f5;
  color: #999;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 0;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 32rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 32rpx;
}

.empty-btn {
  padding: 16rpx 48rpx;
  background: linear-gradient(135deg, #1890FF, #52C41A);
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
  border: none;
}

/* 加载更多 */
.loading-row {
  text-align: center;
  padding: 32rpx;
}

.loading-text {
  font-size: 24rpx;
  color: #999;
}

.no-more {
  text-align: center;
  padding: 32rpx;
  font-size: 24rpx;
  color: #ccc;
}

.bottom-space {
  height: 32rpx;
}
</style>
