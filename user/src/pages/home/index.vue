<template>
  <view class="home-page">
    <!-- 冷启动偏好弹窗 -->
    <PreferenceModal :visible="showPrefModal" @close="showPrefModal = false" @done="showPrefModal = false" />

    <!-- 顶部搜索栏 -->
    <view class="search-bar" @tap="goSearch">
      <view class="search-input">
        <AppIcon name="search" :size="44" />
        <text class="search-placeholder">{{ t('home.searchPlaceholder') }}</text>
      </view>
      <view class="msg-btn" @tap.stop="goMessages">
        <AppIcon name="bell" :size="56" />
        <view v-if="unreadCount > 0" class="msg-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</view>
      </view>
    </view>

    <scroll-view scroll-y class="home-scroll" @scrolltolower="loadMore">
      <!-- 轮播图 -->
      <swiper class="banner-swiper" autoplay circular indicator-dots indicator-color="rgba(255,255,255,0.5)" indicator-active-color="#fff">
        <swiper-item v-for="(item, idx) in banners" :key="idx" @tap="onBannerTap(item)">
          <image class="banner-img" :src="item.image" mode="aspectFill" />
          <view class="banner-title">{{ item.title }}</view>
        </swiper-item>
      </swiper>

      <!-- AI入口 -->
      <view class="ai-entry" @tap="goRoutePlan">
        <view class="ai-left">
          <AppIcon name="robot" :size="80" />
          <view>
            <text class="ai-title">{{ t('home.aiEntry') }}</text>
            <text class="ai-desc">{{ t('home.aiDesc') }}</text>
          </view>
        </view>
        <text class="ai-arrow">›</text>
      </view>

      <!-- 附近景点 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">{{ t('home.nearbyTitle') }}</text>
          <text class="section-more" @tap="goMap">{{ t('common.more') }}</text>
        </view>
        <scroll-view scroll-x class="nearby-scroll">
          <view class="nearby-list">
            <view v-for="poi in nearbyList" :key="poi.id" class="nearby-card" @tap="goPoi(poi.id)">
              <image class="nearby-img" :src="poi.images[0]" mode="aspectFill" />
              <view class="nearby-info">
                <text class="nearby-name">{{ poi.name }}</text>
                <text class="nearby-dist">{{ formatDist(poi.distance) }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- 推荐内容 -->
      <view class="section">
        <view class="section-header">
          <text class="section-title">{{ t('home.recommendTitle') }}</text>
        </view>
        <view class="recommend-list">
          <view v-for="item in recommendList" :key="item.id" class="recommend-card" @tap="goPoi(item.id)">
            <image class="rec-img" :src="item.images[0]" mode="aspectFill" />
            <view class="rec-info">
              <text class="rec-name">{{ item.name }}</text>
              <text class="rec-desc">{{ item.description }}</text>
              <view class="rec-meta">
                <view class="rec-rating-row">
                  <AppIcon name="star" :size="32" />
                  <text class="rec-rating">{{ item.rating }}</text>
                </view>
                <text class="rec-dist">{{ formatDist(item.distance) }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view v-if="noMore" class="no-more">{{ t('common.noMore') }}</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePoiStore } from '../../stores/poi'
import { useMessageStore } from '../../stores/message'
import { useUserStore } from '../../stores/user'
import { messageApi } from '../../api/message'
import { poiApi } from '../../api/poi'
import PreferenceModal from '../../components/PreferenceModal.vue'
import AppIcon from '../../components/AppIcon.vue'

const { t } = useI18n()
const poiStore = usePoiStore()
const messageStore = useMessageStore()
const userStore = useUserStore()

const showPrefModal = ref(false)

const banners = ref([
  { image: '/static/logo.png', title: '探索自然之美', link: '' },
  { image: '/static/logo.png', title: '感受历史文化', link: '' }
])
const page = ref(1)
const noMore = ref(false)
const unreadCount = computed(() => messageStore.unreadCount)
const nearbyList = computed(() => poiStore.nearbyList.slice(0, 5))
const recommendList = computed(() => poiStore.recommendList)

function formatDist(dist?: number) {
  if (!dist) return ''
  return dist >= 1000 ? `${(dist / 1000).toFixed(1)}${t('common.km')}` : `${dist}${t('common.m')}`
}

async function loadBackendPois() {
  try {
    const [recommendRes, nearbyRes] = await Promise.all([
      poiApi.recommend({ page: 1, pageSize: 20 }),
      poiApi.nearby({ latitude: 31.2304, longitude: 121.4737, radius: 5000, pageSize: 20 })
    ])
    poiStore.setRecommendList(recommendRes.list)
    poiStore.setNearbyList(nearbyRes.list)
    noMore.value = true
  } catch (e) {
    console.error('[Home] 后端 POI 加载失败:', e)
  }
}

async function loadData() {
  await loadBackendPois()
}

async function loadMore() {
  // 分页加载推荐景点
  if (noMore.value) return
  page.value++
  try {
    const res = await poiApi.recommend({ page: page.value, pageSize: 20 })
    if (res.list.length === 0) {
      noMore.value = true
    } else {
      poiStore.setRecommendList([...poiStore.recommendList, ...res.list])
    }
  } catch {}
}

async function loadMessages() {
  try {
    const res = await messageApi.list({ pageSize: 20 })
    messageStore.setMessages(res.list)
  } catch {}
}

function onBannerTap(item: { link: string }) {
  if (item.link) uni.navigateTo({ url: item.link })
}

function goSearch() { uni.navigateTo({ url: '/pages/search/index' }) }
function goMessages() { uni.navigateTo({ url: '/pages/message/list' }) }
function goRoutePlan() { uni.navigateTo({ url: '/pages/route/plan' }) }
function goMap() { uni.switchTab({ url: '/pages/map/index' }) }
function goPoi(id: string) { uni.navigateTo({ url: `/pages/poi/detail?id=${id}` }) }

onMounted(() => {
  userStore.loadFromStorage()
  loadData()
  loadMessages()
  // 首页加载完成后检查是否需要展示冷启动弹窗
  // 未设置偏好 且 未跳过（或跳过后重新进入也弹）
  if (!userStore.hasSetPreference) {
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/preference/index' })
    }, 600)
  }
})
</script>

<style scoped>
.home-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 32rpx;
  background: #fff;
  padding-top: calc(20rpx + var(--status-bar-height));
}

.search-input {
  flex: 1;
  display: flex;
  align-items: center;
  background: #f5f7fa;
  border-radius: 40rpx;
  padding: 12rpx 24rpx;
  gap: 12rpx;
}

.search-placeholder { font-size: 28rpx; color: #bbb; }

.msg-btn {
  position: relative;
  margin-left: 24rpx;
  padding: 8rpx;
}

.msg-icon { font-size: 44rpx; }

.msg-badge {
  position: absolute;
  top: 0; right: 0;
  background: #ff4d4f;
  color: #fff;
  font-size: 18rpx;
  min-width: 32rpx;
  height: 32rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6rpx;
}

.ai-icon { display: none; }

.home-scroll { flex: 1; }

.banner-swiper {
  height: 360rpx;
  position: relative;
}

.banner-img {
  width: 100%;
  height: 360rpx;
}

.banner-title {
  position: absolute;
  bottom: 24rpx;
  left: 32rpx;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  text-shadow: 0 2rpx 8rpx rgba(0,0,0,0.4);
}

.ai-entry {
  margin: 24rpx 32rpx;
  background: linear-gradient(135deg, #1890FF, #52C41A);
  border-radius: 20rpx;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ai-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.ai-icon { font-size: 56rpx; }

.ai-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
}

.ai-desc {
  display: block;
  font-size: 24rpx;
  color: rgba(255,255,255,0.85);
  margin-top: 4rpx;
}

.ai-arrow {
  font-size: 48rpx;
  color: rgba(255,255,255,0.8);
}

.section {
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx 16rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.section-more {
  font-size: 26rpx;
  color: #1890FF;
}

.nearby-scroll { padding: 0 32rpx; }

.nearby-list {
  display: flex;
  gap: 20rpx;
  padding-bottom: 8rpx;
}

.nearby-card {
  flex-shrink: 0;
  width: 200rpx;
  border-radius: 16rpx;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}

.nearby-img {
  width: 200rpx;
  height: 160rpx;
}

.nearby-info { padding: 12rpx; }

.nearby-name {
  display: block;
  font-size: 24rpx;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nearby-dist {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

.recommend-list {
  padding: 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.recommend-card {
  display: flex;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0,0,0,0.06);
}

.rec-img {
  width: 200rpx;
  height: 160rpx;
  flex-shrink: 0;
}

.rec-info {
  flex: 1;
  padding: 20rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.rec-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.rec-desc {
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.rec-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
}

.rec-rating-row {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.rec-rating, .rec-dist {
  font-size: 24rpx;
  color: #999;
}

.no-more {
  text-align: center;
  padding: 32rpx;
  font-size: 26rpx;
  color: #ccc;
}
</style>
