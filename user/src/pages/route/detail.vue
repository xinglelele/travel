<template>
  <view class="route-detail">
    <view class="page-header">
      <text class="page-title">{{ route?.title || t('route.detail') }}</text>
    </view>

    <scroll-view scroll-y class="detail-scroll">
      <!-- 概览卡片 -->
      <view class="overview-card">
        <view class="overview-stats">
          <view class="stat">
            <text class="stat-val">{{ route?.days }}</text>
            <text class="stat-label">{{ t('route.days') }}</text>
          </view>
          <view class="stat-divider" />
          <view class="stat">
            <text class="stat-val">{{ route?.totalPoi }}</text>
            <text class="stat-label">{{ t('poi.detail') }}</text>
          </view>
        </view>
        <view v-if="route?.tags?.length" class="tag-row">
          <text v-for="tag in route.tags" :key="tag" class="tag-badge">{{ tag }}</text>
        </view>
      </view>

      <!-- 地图预览 -->
      <view class="map-card">
        <text class="card-title">{{ t('route.mapPreview') }}</text>
        <map
          v-if="mapMarkers.length > 0"
          class="route-map"
          :latitude="mapMarkers[0].latitude"
          :longitude="mapMarkers[0].longitude"
          :markers="mapMarkers"
          :scale="12"
        />
      </view>

      <!-- 按天分组 -->
      <view v-for="day in route?.schedule" :key="day.day" class="day-section">
        <view class="day-header">
          <text class="day-title">{{ t('route.day', { n: day.day }) }}</text>
          <text class="day-count">{{ day.pois.length }} {{ t('map.poiCount') }}</text>
        </view>
        <view v-for="(poi, idx) in day.pois" :key="poi.id" class="poi-item" @tap="goPoi(poi.id)">
          <view class="poi-index">{{ idx + 1 }}</view>
          <image class="poi-img" :src="poi.images[0]" mode="aspectFill" />
          <view class="poi-info">
            <text class="poi-name">{{ poi.name }}</text>
            <text class="poi-addr">{{ poi.address }}</text>
            <text class="poi-rating">⭐ {{ poi.rating }}</text>
          </view>
          <text class="poi-arrow">›</text>
        </view>
      </view>

      <view class="bottom-space" />
    </scroll-view>

    <!-- 底部操作栏 -->
    <view class="action-bar">
      <button class="action-btn secondary" @tap="onShare">{{ t('common.share') }}</button>
      <button class="action-btn primary" @tap="onStartNavigation">{{ t('route.startNavigation') }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouteStore } from '../../stores/route'
import { routeApi } from '../../api/route'
import type { TravelRoute } from '../../stores/route'

const { t } = useI18n()
const routeStore = useRouteStore()
const route = ref<TravelRoute | null>(null)

const pages = getCurrentPages()
const currentPage = pages[pages.length - 1] as { options?: { id?: string } }
const routeId = currentPage.options?.id || ''

const mapMarkers = computed(() => {
  const markers: Array<{ id: number; latitude: number; longitude: number; title: string }> = []
  route.value?.schedule.forEach(day => {
    day.pois.forEach((poi, idx) => {
      markers.push({ id: markers.length, latitude: poi.latitude, longitude: poi.longitude, title: `${idx + 1}. ${poi.name}` })
    })
  })
  return markers
})

async function loadData() {
  // 优先用store中的currentRoute
  if (routeStore.currentRoute?.id === routeId) {
    route.value = routeStore.currentRoute
    return
  }
  try {
    route.value = await routeApi.detail(routeId)
    routeStore.setCurrentRoute(route.value)
  } catch {}
}

function goPoi(id: string) { uni.navigateTo({ url: `/pages/poi/detail?id=${id}` }) }

function onStartNavigation() {
  const firstPoi = route.value?.schedule[0]?.pois[0]
  if (firstPoi) {
    uni.openLocation({
      latitude: firstPoi.latitude,
      longitude: firstPoi.longitude,
      name: firstPoi.name,
      address: firstPoi.address || ''
    })
  }
}

function onShare() {
  uni.showShareMenu({ withShareTicket: true })
}

onMounted(() => loadData())
</script>

<style scoped>
.route-detail {
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

.detail-scroll { flex: 1; }

.overview-card, .map-card {
  background: #fff;
  margin: 16rpx 24rpx;
  border-radius: 16rpx;
  padding: 28rpx;
}

.overview-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 60rpx;
  margin-bottom: 20rpx;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-val {
  font-size: 48rpx;
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

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  justify-content: center;
}

.tag-badge {
  padding: 6rpx 20rpx;
  background: #e6f4ff;
  color: #1890FF;
  border-radius: 40rpx;
  font-size: 22rpx;
}

.card-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16rpx;
}

.route-map {
  width: 100%;
  height: 300rpx;
  border-radius: 12rpx;
}

.day-section {
  background: #fff;
  margin: 16rpx 24rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 28rpx;
  background: linear-gradient(135deg, #1890FF, #52C41A);
}

.day-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}

.day-count {
  font-size: 24rpx;
  color: rgba(255,255,255,0.8);
}

.poi-item {
  display: flex;
  align-items: center;
  padding: 20rpx 28rpx;
  gap: 16rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.poi-item:last-child { border-bottom: none; }

.poi-index {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #1890FF;
  color: #fff;
  font-size: 24rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.poi-img {
  width: 100rpx;
  height: 80rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.poi-info { flex: 1; }

.poi-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
}

.poi-addr {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

.poi-rating {
  display: block;
  font-size: 22rpx;
  color: #fa8c16;
  margin-top: 4rpx;
}

.poi-arrow {
  font-size: 36rpx;
  color: #ccc;
}

.bottom-space { height: 160rpx; }

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  display: flex;
  gap: 24rpx;
  padding: 20rpx 32rpx;
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #f0f0f0;
}

.action-btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 500;
  border: none;
}

.action-btn.secondary {
  background: #f5f7fa;
  color: #333;
}

.action-btn.primary {
  background: linear-gradient(135deg, #1890FF, #52C41A);
  color: #fff;
}
</style>
