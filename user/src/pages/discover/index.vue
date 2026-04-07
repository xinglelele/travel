<template>
  <view class="discover-page">
    <!-- 顶部标题 -->
    <view class="page-header">
      <text class="page-title">{{ t('discover.title') }}</text>
    </view>

    <!-- 分类筛选 -->
    <scroll-view scroll-x class="category-scroll">
      <view class="category-list">
        <view
          v-for="cat in categories"
          :key="cat.key"
          class="category-item"
          :class="{ active: activeCategory === cat.key }"
          @tap="selectCategory(cat.key)"
        >
          <AppIcon :name="cat.icon as any" :size="28" />
          <text class="cat-text">{{ t(`discover.${cat.key}`) }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 瀑布流内容 -->
    <scroll-view scroll-y class="content-scroll" @scrolltolower="loadMore">
      <view class="waterfall">
        <!-- 左列 -->
        <view class="waterfall-col">
          <view
            v-for="item in leftCol"
            :key="item.id"
            class="content-card"
            @tap="goDetail(item.id)"
          >
            <image class="card-img" :src="item.cover || '/static/logo.png'" mode="aspectFill" />
            <view class="card-body">
              <text class="card-title">{{ item.title }}</text>
              <text class="card-summary">{{ item.summary }}</text>
              <!-- 用户内容显示评分 -->
              <view v-if="item.type === 'user'" class="card-rating">
                <text class="card-stars">{{ '⭐'.repeat(item.rating || 0) }}</text>
              </view>
              <view class="card-meta">
                <text v-if="item.type === 'user'" class="card-user">{{ item.userNickname }}</text>
                <text class="card-views">👁 {{ item.viewCount }}</text>
                <text class="card-likes">❤️ {{ item.likeCount }}</text>
              </view>
            </view>
          </view>
        </view>
        <!-- 右列 -->
        <view class="waterfall-col">
          <view
            v-for="item in rightCol"
            :key="item.id"
            class="content-card"
            @tap="goDetail(item.id)"
          >
            <image class="card-img" :src="item.cover || '/static/logo.png'" mode="aspectFill" />
            <view class="card-body">
              <text class="card-title">{{ item.title }}</text>
              <text class="card-summary">{{ item.summary }}</text>
              <!-- 用户内容显示评分 -->
              <view v-if="item.type === 'user'" class="card-rating">
                <text class="card-stars">{{ '⭐'.repeat(item.rating || 0) }}</text>
              </view>
              <view class="card-meta">
                <text v-if="item.type === 'user'" class="card-user">{{ item.userNickname }}</text>
                <text class="card-views">👁 {{ item.viewCount }}</text>
                <text class="card-likes">❤️ {{ item.likeCount }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-if="noMore" class="no-more">{{ t('common.noMore') }}</view>
      <view v-if="contentList.length === 0 && !loading" class="empty-tip">{{ t('discover.noContent') }}</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { contentApi } from '../../api/content'
import type { Content } from '../../api/content'
import AppIcon from '../../components/AppIcon.vue'

const { t } = useI18n()

const categories = [
  { key: 'all', icon: 'cat-all' },
  { key: 'scenic', icon: 'cat-scenic' },
  { key: 'museum', icon: 'cat-museum' },
  { key: 'park', icon: 'cat-park' },
  { key: 'food', icon: 'cat-food' },
  { key: 'shopping', icon: 'cat-shopping' },
]

const activeCategory = ref('all')
const contentList = ref<Content[]>([])
const page = ref(1)
const noMore = ref(false)
const loading = ref(false)

// 瀑布流分列
const leftCol = computed(() => contentList.value.filter((_, i) => i % 2 === 0))
const rightCol = computed(() => contentList.value.filter((_, i) => i % 2 === 1))

async function loadData(reset = false) {
  if (loading.value) return
  loading.value = true
  try {
    const res = await contentApi.recommend({
      category: activeCategory.value === 'all' ? undefined : activeCategory.value,
      page: page.value,
      pageSize: 10
    })
    if (reset) {
      contentList.value = res.list
    } else {
      contentList.value.push(...res.list)
    }
    if (res.list.length < 10) noMore.value = true
  } catch (e: any) {
    uni.showToast({ title: e?.message || '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function selectCategory(key: string) {
  if (activeCategory.value === key) return
  activeCategory.value = key
  page.value = 1
  noMore.value = false
  loadData(true)
}

function loadMore() {
  if (noMore.value) return
  page.value++
  loadData()
}

function goDetail(id: string) {
  if (!id) return
  uni.navigateTo({ url: `/pages/content/detail?id=${encodeURIComponent(id)}` })
}

onMounted(() => loadData(true))
</script>

<style scoped>
.discover-page {
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
  font-size: 40rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.category-scroll {
  background: #fff;
  padding-bottom: 16rpx;
}

.category-list {
  display: flex;
  padding: 0 24rpx;
  gap: 8rpx;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  border-radius: 40rpx;
  background: #f5f7fa;
  white-space: nowrap;
  transition: all 0.2s;
}

.category-item.active {
  background: #1890FF;
}


.cat-text {
  font-size: 26rpx;
  color: #666;
}

.category-item.active .cat-text {
  color: #fff;
  font-weight: 500;
}

.content-scroll {
  flex: 1;
  padding: 16rpx;
}

.waterfall {
  display: flex;
  gap: 16rpx;
}

.waterfall-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.content-card {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}

.card-img {
  width: 100%;
  min-height: 200rpx;
}

.card-body {
  padding: 16rpx;
}

.card-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.4;
}

.card-summary {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-meta {
  display: flex;
  gap: 16rpx;
  margin-top: 12rpx;
  align-items: center;
}

.card-rating { margin-top: 8rpx; }
.card-stars { font-size: 22rpx; }
.card-user { font-size: 22rpx; color: #1890FF; }

.card-views, .card-likes {
  font-size: 22rpx;
  color: #999;
}

.no-more, .empty-tip {
  text-align: center;
  padding: 32rpx;
  font-size: 26rpx;
  color: #ccc;
}
</style>
