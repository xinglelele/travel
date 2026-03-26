<template>
  <view class="check-list">
    <view class="page-header">
      <text class="page-title">{{ t('check.title') }}</text>
      <text class="total-count">{{ t('check.total', { n: total }) }}</text>
    </view>

    <!-- 视图切换 -->
    <view class="view-toggle">
      <view class="toggle-btn" :class="{ active: viewMode === 'list' }" @tap="viewMode = 'list'">
        <text>📋 {{ t('check.listView') }}</text>
      </view>
      <view class="toggle-btn" :class="{ active: viewMode === 'map' }" @tap="viewMode = 'map'">
        <text>🗺️ {{ t('check.mapView') }}</text>
      </view>
    </view>

    <!-- 时间筛选 -->
    <view class="filter-bar">
      <view
        v-for="f in filters"
        :key="f.key"
        class="filter-item"
        :class="{ active: activeFilter === f.key }"
        @tap="selectFilter(f.key)"
      >
        {{ f.label }}
      </view>
    </view>

    <!-- 列表视图 -->
    <scroll-view v-if="viewMode === 'list'" scroll-y class="list-scroll" @scrolltolower="loadMore">
      <view v-if="checks.length === 0 && !loading" class="empty-state">
        <text class="empty-icon">📍</text>
        <text class="empty-text">{{ t('check.noChecks') }}</text>
      </view>

      <view v-for="check in checks" :key="check.id" class="check-item">
        <image class="check-img" :src="check.poiImage" mode="aspectFill" />
        <view class="check-info">
          <text class="check-name">{{ check.poiName }}</text>
          <text class="check-time">📅 {{ formatDate(check.checkedAt) }}</text>
          <text v-if="check.note" class="check-note">{{ check.note }}</text>
        </view>
        <text class="check-badge">✅</text>
      </view>

      <view v-if="noMore && checks.length > 0" class="no-more">{{ t('common.noMore') }}</view>
    </scroll-view>

    <!-- 地图视图 -->
    <view v-if="viewMode === 'map'" class="map-view">
      <map
        class="check-map"
        :latitude="mapCenter.latitude"
        :longitude="mapCenter.longitude"
        :markers="mapMarkers"
        :scale="12"
        show-location
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { checkApi } from '../../api/check'
import type { CheckRecord } from '../../api/check'

const { t } = useI18n()
const viewMode = ref<'list' | 'map'>('list')
const checks = ref<CheckRecord[]>([])
const total = ref(0)
const page = ref(1)
const noMore = ref(false)
const loading = ref(false)
const activeFilter = ref('all')
const mapCenter = ref({ latitude: 30.5728, longitude: 104.0668 })

const filters = [
  { key: 'all', label: '全部' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'year', label: '今年' }
]

const mapMarkers = computed(() => checks.value.map((c, idx) => ({
  id: idx,
  latitude: c.latitude,
  longitude: c.longitude,
  title: c.poiName,
  iconPath: '/static/logo.png',
  width: 36,
  height: 36
})))

function formatDate(dateStr: string) {
  return dateStr ? dateStr.slice(0, 16).replace('T', ' ') : ''
}

function getDateRange(filter: string) {
  const now = new Date()
  const end = now.toISOString().slice(0, 10)
  let start = ''
  if (filter === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    start = d.toISOString().slice(0, 10)
  } else if (filter === 'month') {
    start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  } else if (filter === 'year') {
    start = `${now.getFullYear()}-01-01`
  }
  return { startDate: start || undefined, endDate: end }
}

async function loadData(reset = false) {
  if (loading.value) return
  loading.value = true
  try {
    const dateRange = getDateRange(activeFilter.value)
    const res = await checkApi.my({ page: page.value, pageSize: 20, ...dateRange })
    if (reset) {
      checks.value = res.list
      total.value = res.total
    } else {
      checks.value.push(...res.list)
    }
    if (res.list.length < 20) noMore.value = true
    // 更新地图中心
    if (checks.value.length > 0) {
      mapCenter.value = { latitude: checks.value[0].latitude, longitude: checks.value[0].longitude }
    }
  } catch {} finally {
    loading.value = false
  }
}

function selectFilter(key: string) {
  activeFilter.value = key
  page.value = 1
  noMore.value = false
  loadData(true)
}

function loadMore() {
  if (noMore.value) return
  page.value++
  loadData()
}

onMounted(() => loadData(true))
</script>

<style scoped>
.check-list {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx;
  padding-top: calc(20rpx + var(--status-bar-height));
  background: #fff;
}

.page-title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.total-count {
  font-size: 24rpx;
  color: #999;
}

.view-toggle {
  display: flex;
  background: #fff;
  padding: 0 24rpx 16rpx;
  gap: 16rpx;
}

.toggle-btn {
  flex: 1;
  text-align: center;
  padding: 16rpx;
  border-radius: 12rpx;
  background: #f5f7fa;
  font-size: 26rpx;
  color: #666;
}

.toggle-btn.active {
  background: #e6f4ff;
  color: #1890FF;
  font-weight: 500;
}

.filter-bar {
  display: flex;
  background: #fff;
  padding: 0 24rpx 16rpx;
  gap: 12rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.filter-item {
  padding: 10rpx 24rpx;
  border-radius: 40rpx;
  background: #f5f7fa;
  font-size: 24rpx;
  color: #666;
}

.filter-item.active {
  background: #1890FF;
  color: #fff;
}

.list-scroll { flex: 1; padding: 16rpx 24rpx; }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
  gap: 24rpx;
}

.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 28rpx; color: #999; }

.check-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
}

.check-img {
  width: 160rpx;
  height: 130rpx;
  flex-shrink: 0;
}

.check-info {
  flex: 1;
  padding: 16rpx 0;
}

.check-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.check-time {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}

.check-note {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-top: 6rpx;
}

.check-badge {
  font-size: 40rpx;
  padding-right: 20rpx;
}

.map-view { flex: 1; }

.check-map {
  width: 100%;
  height: 100%;
}

.no-more {
  text-align: center;
  padding: 32rpx;
  font-size: 26rpx;
  color: #ccc;
}
</style>
