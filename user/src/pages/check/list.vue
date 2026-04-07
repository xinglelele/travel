<template>
  <view class="check-list">
    <view class="page-header">
      <text class="page-title">{{ t('check.title') }}</text>
      <view class="header-right">
        <text class="total-count">{{ t('check.total', { n: total }) }}</text>
        <text v-if="checks.length > 0" class="poster-btn" @tap="onGeneratePoster">{{ t('check.generatePoster') }}</text>
      </view>
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

      <view v-for="check in checks" :key="check.id" class="check-item" @tap="goPoi(check.poiId)">
        <image class="check-img" :src="check.poiImage || '/static/logo.png'" mode="aspectFill" />
        <view class="check-info">
          <text class="check-name">{{ check.poiName }}</text>
          <text class="check-time">📅 {{ formatDate(check.checkedAt) }}</text>
          <text v-if="check.note" class="check-note">{{ check.note }}</text>
        </view>
        <text class="check-badge">✅</text>
      </view>

      <view v-if="noMore && checks.length > 0" class="no-more">{{ t('common.noMore') }}</view>
      <view class="bottom-space" />
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

    <!-- 海报预览弹窗 -->
    <view v-if="showPoster" class="poster-overlay" @tap="showPoster = false">
      <view class="poster-preview" @tap.stop>
        <image class="poster-img" :src="posterImage" mode="aspectFit" />
        <view class="poster-actions">
          <button class="poster-action-btn" @tap="onSavePoster">{{ t('check.saveToAlbum') }}</button>
          <button class="poster-action-btn primary" @tap="onSharePoster">{{ t('common.share') }}</button>
        </view>
      </view>
    </view>

    <!-- 隐藏的 Canvas 用于绘制海报 -->
    <PosterCanvas ref="posterRef" :data="posterData" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { checkApi } from '../../api/check'
import { showShareMenu } from '../../utils/share'
import { exportPoster, saveToAlbum } from '../../components/PosterCanvas.vue'
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
const showPoster = ref(false)
const posterImage = ref('')
const posterRef = ref()
const posterData = ref({
  title: '我的打卡记录',
  records: [] as any[],
  totalDays: 0,
  totalPois: 0
})

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

function goPoi(poiId: string) {
  uni.navigateTo({ url: `/pages/poi/detail?id=${poiId}` })
}

async function onGeneratePoster() {
  if (checks.value.length === 0) {
    uni.showToast({ title: t('check.noChecksToGenerate'), icon: 'none' })
    return
  }

  uni.showLoading({ title: t('check.generating') })

  // 计算天数
  const dates = checks.value.map(c => c.checkedAt.split('T')[0])
  const uniqueDates = new Set(dates)

  posterData.value = {
    title: '我的打卡记录',
    records: checks.value.map(c => ({
      ...c,
      poiName: c.poiName,
      checkedAt: c.checkedAt
    })),
    totalDays: uniqueDates.size,
    totalPois: checks.value.length
  }

  try {
    // 等待 canvas 渲染完成
    await new Promise(resolve => setTimeout(resolve, 500))
    const imagePath = await exportPoster()
    posterImage.value = imagePath
    showPoster.value = true
    uni.hideLoading()
  } catch (error) {
    uni.hideLoading()
    console.error('[Poster] 生成失败:', error)
    uni.showToast({ title: t('common.failed'), icon: 'none' })
  }
}

async function onSavePoster() {
  try {
    uni.showLoading({ title: t('check.saving') })
    await saveToAlbum(posterImage.value)
    uni.hideLoading()
    uni.showToast({ title: t('check.saveSuccess'), icon: 'success' })
    showPoster.value = false
  } catch (error) {
    uni.hideLoading()
    uni.showToast({ title: t('common.failed'), icon: 'none' })
  }
}

function onSharePoster() {
  showShareMenu({
    title: '我的打卡记录',
    routeId: 'check',
    days: posterData.value.totalDays || 1,
    poiCount: posterData.value.totalPois || 0,
  })
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

.header-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
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

.poster-btn {
  padding: 8rpx 20rpx;
  background: linear-gradient(135deg, #1890FF, #52C41A);
  color: #fff;
  border-radius: 30rpx;
  font-size: 22rpx;
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

.bottom-space { height: 100rpx; }

.no-more {
  text-align: center;
  padding: 32rpx;
  font-size: 26rpx;
  color: #ccc;
}

/* ========== 海报预览 ========== */

.poster-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.poster-preview {
  width: 600rpx;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.poster-img {
  width: 100%;
  max-height: 800rpx;
}

.poster-actions {
  display: flex;
  gap: 24rpx;
  padding: 24rpx;
}

.poster-action-btn {
  flex: 1;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  border: 2rpx solid #1890FF;
  background: #fff;
  color: #1890FF;
}

.poster-action-btn.primary {
  background: linear-gradient(135deg, #1890FF, #52C41A);
  color: #fff;
  border: none;
}
</style>
