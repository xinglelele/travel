<template>
  <view class="search-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">🔍</text>
        <input
          class="search-input"
          v-model="keyword"
          :placeholder="t('search.placeholder')"
          focus
          @input="onInput"
          @confirm="onSearch"
        />
        <text v-if="keyword" class="clear-btn" @tap="clearKeyword">✕</text>
      </view>
      <text class="cancel-btn" @tap="uni.navigateBack()">{{ t('common.cancel') }}</text>
    </view>

    <!-- 联想词 -->
    <view v-if="suggests.length > 0 && keyword" class="suggest-list">
      <view v-for="s in suggests" :key="s.keyword" class="suggest-item" @tap="useKeyword(s.keyword)">
        <text class="suggest-icon">🔍</text>
        <text class="suggest-text">{{ s.keyword }}</text>
      </view>
    </view>

    <!-- 历史记录 & 热门搜索（无关键词时显示） -->
    <view v-if="!keyword" class="discovery-area">
      <view v-if="searchHistory.length > 0" class="history-section">
        <view class="section-header">
          <text class="section-title">{{ t('search.history') }}</text>
          <text class="clear-history" @tap="clearHistory">{{ t('search.clearHistory') }}</text>
        </view>
        <view class="tag-wrap">
          <view v-for="h in searchHistory" :key="h" class="history-tag" @tap="useKeyword(h)">{{ h }}</view>
        </view>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-if="keyword && searched" class="result-area">
      <!-- Tab切换 -->
      <scroll-view scroll-x class="tab-scroll">
        <view class="tab-list">
          <view
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-item"
            :class="{ active: activeTab === tab.key }"
            @tap="activeTab = tab.key"
          >
            {{ t(`search.tabs.${tab.key}`) }}
          </view>
        </view>
      </scroll-view>

      <scroll-view scroll-y class="result-scroll" @scrolltolower="loadMore">
        <!-- POI结果 -->
        <view v-if="activeTab === 'all' || activeTab === 'poi'">
          <view v-for="poi in result.pois" :key="poi.id" class="result-item" @tap="goPoi(poi.id)">
            <image class="result-img" :src="poi.images[0]" mode="aspectFill" />
            <view class="result-info">
              <text class="result-name">{{ poi.name }}</text>
              <text class="result-sub">{{ poi.address }}</text>
              <text class="result-rating">⭐ {{ poi.rating }}</text>
            </view>
          </view>
        </view>

        <!-- 路线结果 -->
        <view v-if="activeTab === 'all' || activeTab === 'route'">
          <view v-for="route in result.routes" :key="route.id" class="result-item" @tap="goRoute(route.id)">
            <image class="result-img" :src="route.coverImage || '/static/logo.png'" mode="aspectFill" />
            <view class="result-info">
              <text class="result-name">{{ route.title }}</text>
              <text class="result-sub">{{ route.days }}天 · {{ route.totalPoi }}个景点</text>
            </view>
          </view>
        </view>

        <!-- 内容结果 -->
        <view v-if="activeTab === 'all' || activeTab === 'content'">
          <view v-for="c in result.contents" :key="c.id" class="result-item" @tap="goContent(c.id)">
            <image class="result-img" :src="c.cover" mode="aspectFill" />
            <view class="result-info">
              <text class="result-name">{{ c.title }}</text>
              <text class="result-sub">{{ c.summary }}</text>
            </view>
          </view>
        </view>

        <view v-if="noResult" class="no-result">{{ t('search.noResult') }}</view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { searchApi } from '../../api/search'
import type { SearchResult, SearchSuggest } from '../../api/search'

const { t } = useI18n()
const keyword = ref('')
const searched = ref(false)
const activeTab = ref('all')
const suggests = ref<SearchSuggest[]>([])
const result = ref<SearchResult>({ pois: [], routes: [], contents: [], total: 0 })
const searchHistory = ref<string[]>(JSON.parse(uni.getStorageSync('searchHistory') || '[]'))

const tabs = [
  { key: 'all' }, { key: 'poi' }, { key: 'route' }, { key: 'content' }
]

const noResult = computed(() => {
  const r = result.value
  return searched.value && r.pois.length === 0 && r.routes.length === 0 && r.contents.length === 0
})

let suggestTimer: ReturnType<typeof setTimeout>

function onInput() {
  clearTimeout(suggestTimer)
  if (!keyword.value) { suggests.value = []; return }
  suggestTimer = setTimeout(async () => {
    try {
      suggests.value = await searchApi.suggest(keyword.value)
    } catch {}
  }, 300)
}

async function onSearch() {
  if (!keyword.value.trim()) return
  addHistory(keyword.value)
  searched.value = true
  try {
    result.value = await searchApi.search({ keyword: keyword.value })
    suggests.value = []
  } catch {}
}

function useKeyword(kw: string) {
  keyword.value = kw
  onSearch()
}

function clearKeyword() {
  keyword.value = ''
  searched.value = false
  suggests.value = []
}

function addHistory(kw: string) {
  if (!searchHistory.value.includes(kw)) {
    searchHistory.value.unshift(kw)
    if (searchHistory.value.length > 10) searchHistory.value.pop()
    uni.setStorageSync('searchHistory', JSON.stringify(searchHistory.value))
  }
}

function clearHistory() {
  searchHistory.value = []
  uni.removeStorageSync('searchHistory')
}

function loadMore() {}

function goPoi(id: string) { uni.navigateTo({ url: `/pages/poi/detail?id=${id}` }) }
function goRoute(id: string) { uni.navigateTo({ url: `/pages/route/detail?id=${id}` }) }
function goContent(id: string) { uni.navigateTo({ url: `/pages/content/detail?id=${id}` }) }
</script>

<style scoped>
.search-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 24rpx;
  padding-top: calc(16rpx + var(--status-bar-height));
  background: #fff;
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: #f5f7fa;
  border-radius: 40rpx;
  padding: 14rpx 24rpx;
}

.search-icon { font-size: 28rpx; }

.search-input {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.clear-btn {
  font-size: 28rpx;
  color: #ccc;
  padding: 4rpx;
}

.cancel-btn {
  font-size: 28rpx;
  color: #1890FF;
  white-space: nowrap;
}

.suggest-list {
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
}

.suggest-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.suggest-icon { font-size: 24rpx; color: #ccc; }
.suggest-text { font-size: 28rpx; color: #333; }

.discovery-area { padding: 24rpx; }

.history-section { background: #fff; border-radius: 16rpx; padding: 24rpx; }

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.clear-history {
  font-size: 24rpx;
  color: #999;
}

.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.history-tag {
  padding: 10rpx 24rpx;
  background: #f5f7fa;
  border-radius: 40rpx;
  font-size: 26rpx;
  color: #555;
}

.result-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tab-scroll { background: #fff; }

.tab-list {
  display: flex;
  padding: 0 16rpx;
}

.tab-item {
  padding: 20rpx 24rpx;
  font-size: 26rpx;
  color: #666;
  border-bottom: 4rpx solid transparent;
  white-space: nowrap;
}

.tab-item.active {
  color: #1890FF;
  border-bottom-color: #1890FF;
  font-weight: 500;
}

.result-scroll { flex: 1; padding: 16rpx 24rpx; }

.result-item {
  display: flex;
  gap: 16rpx;
  background: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
  padding: 16rpx;
}

.result-img {
  width: 120rpx;
  height: 100rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.result-info { flex: 1; }

.result-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.result-sub {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
}

.result-rating {
  display: block;
  font-size: 22rpx;
  color: #fa8c16;
  margin-top: 6rpx;
}

.no-result {
  text-align: center;
  padding: 80rpx;
  font-size: 28rpx;
  color: #ccc;
}
</style>
