<template>
  <view class="navigate-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <text class="back-icon" @tap="goBack">‹</text>
      <text class="nav-title">{{ t('route.navigating') }}</text>
      <text class="route-progress">{{ currentPoiIndex + 1 }}/{{ totalPois }}</text>
    </view>

    <!-- 地图 -->
    <map
      id="nav-map"
      class="nav-map"
      :latitude="mapCenter.latitude"
      :longitude="mapCenter.longitude"
      :markers="markers"
      :polyline="polyline"
      :scale="15"
      show-location
    />

    <!-- 到达提示横幅 -->
    <view v-if="arrivePromptVisible" class="arrive-banner" @tap="onCheckIn">
      <text class="arrive-icon">🎉</text>
      <text class="arrive-text">{{ t('route.arrivePrompt') }}</text>
      <text class="arrive-arrow">›</text>
    </view>

    <!-- 底部面板 -->
    <view class="bottom-panel" :class="{ arrived: canCheckIn }">
      <!-- 当前景点 -->
      <view class="poi-header">
        <view class="poi-num-badge">第 {{ currentPoiIndex + 1 }} 站</view>
        <view class="poi-name-row">
          <text class="poi-name">{{ currentPoi.name || '' }}</text>
          <view v-if="checkedInPois.has(currentPoi.id)" class="checked-badge">
            <text class="checked-icon">✓</text>
            <text class="checked-text">{{ t('route.checkedIn') }}</text>
          </view>
        </view>
        <text class="poi-address">{{ currentPoi.address || '' }}</text>
      </view>

      <!-- 距离信息 -->
      <view class="distance-row">
        <view class="distance-block">
          <text class="distance-val" :class="{ near: canCheckIn }">{{ distanceText }}</text>
          <text class="distance-label">{{ t('route.distance') }}</text>
        </view>
        <view class="distance-divider" />
        <view class="distance-block">
          <text class="distance-val">{{ currentDayLabel }}</text>
          <text class="distance-label">{{ t('route.dayLabel') }}</text>
        </view>
        <view class="distance-divider" />
        <view class="distance-block">
          <text class="distance-val">{{ remainingPois }}</text>
          <text class="distance-label">{{ t('route.remaining') }}</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-btns">
        <!-- 已打卡 -->
        <button v-if="checkedInPois.has(currentPoi.id)" class="btn-review" @tap="onWriteReview">
          {{ t('route.writeReview') }}
        </button>
        <!-- 可打卡 -->
        <button v-else-if="canCheckIn" class="btn-checkin pulsing" @tap="onCheckIn">
          {{ t('route.checkInNow') }}
        </button>
        <!-- 未到达：打开系统地图 -->
        <button v-else class="btn-navigate" @tap="openSystemNav">
          {{ t('route.openMap') }}
        </button>

        <!-- 下一站（仅打完卡后显示） -->
        <button v-if="checkedInPois.has(currentPoi.id) && hasNextPoi" class="btn-next" @tap="goNextPoi">
          {{ t('route.nextPoi') }} ›
        </button>
      </view>

      <!-- 全部完成 -->
      <view v-if="allDone" class="all-done-tip">
        <text class="done-icon">🏆</text>
        <text class="done-text">{{ t('route.allDone') }}</text>
      </view>
    </view>

    <!-- 打卡成功弹窗 -->
    <view v-if="checkInSuccessVisible" class="modal-overlay" @tap.self="checkInSuccessVisible = false">
      <view class="success-modal">
        <text class="success-icon">✅</text>
        <text class="success-title">{{ t('route.checkInSuccess') }}</text>
        <text class="success-sub">{{ currentPoi.name }}</text>
        <view class="success-dist">
          <text class="dist-label">{{ t('route.checkInDist') }}</text>
          <text class="dist-val">{{ lastCheckDistance }}m</text>
        </view>
        <button class="btn-review-modal" @tap="onWriteReview">{{ t('route.writeReview') }}</button>
        <text class="btn-skip" @tap="skipReview">{{ t('common.skip') }}</text>
      </view>
    </view>

    <!-- 评论抽屉 -->
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouteStore } from '../../stores/route'
import { routeApi } from '../../api/route'
import { checkApi } from '../../api/check'
import type { POI } from '../../stores/poi'
import { CHECK_IN_EFFECTIVE, DEV_MOCK_LOCATION } from '../../config/env'

const { t } = useI18n()
const routeStore = useRouteStore()

const DEFAULT_MAP = { latitude: 31.2304, longitude: 121.4737 }

function parseCoord(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).trim())
  if (!Number.isFinite(n)) return null
  return n
}

// 状态
const route = ref<any>(null)
const currentDayIndex = ref(0)
const currentPoiIndex = ref(0)
const checkedInPois = ref(new Set<string>())
const checkInSuccessVisible = ref(false)
const lastCheckDistance = ref(0)
const arrivePromptVisible = ref(false)
const statusBarHeight = ref(20)
const userLocation = ref({ ...DEFAULT_MAP })
let locationChangeHandler: ((res: UniApp.OnLocationChangeSuccess) => void) | null = null

// 计算属性
const allDays = computed(() => route.value?.schedule || [])
const currentDay = computed(() => allDays.value[currentDayIndex.value])
const pois = computed(() => currentDay.value?.pois || [])

const currentPoi = computed<POI>(() => {
  const p = pois.value[currentPoiIndex.value]
  if (!p) return {} as POI
  const lat = parseCoord(p.latitude)
  const lng = parseCoord(p.longitude)
  return {
    id: p.id || p.poiId || '',
    poiId: p.poiId || p.id || '',
    name: p.name || '',
    latitude: lat ?? DEFAULT_MAP.latitude,
    longitude: lng ?? DEFAULT_MAP.longitude,
    address: p.address || '',
    images: p.images || ['/static/logo.png'],
    rating: p.rating || 4.5,
    category: p.category || '',
    tags: p.tags || []
  }
})

/** 当前景点是否有真实坐标（非默认值） */
const currentPoiCoordsValid = computed(() => {
  const p = pois.value[currentPoiIndex.value]
  if (!p) return false
  const lat = parseCoord(p.latitude)
  const lng = parseCoord(p.longitude)
  return lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
})

const mapCenter = computed(() => {
  const u = userLocation.value
  if (Number.isFinite(u.latitude) && Number.isFinite(u.longitude)) {
    return { latitude: u.latitude, longitude: u.longitude }
  }
  if (currentPoiCoordsValid.value) {
    return {
      latitude: currentPoi.value.latitude,
      longitude: currentPoi.value.longitude
    }
  }
  return DEFAULT_MAP
})

const totalPois = computed(() =>
  allDays.value.reduce((acc: number, d: any) => acc + (d.pois?.length || 0), 0)
)

const remainingPois = computed(() =>
  allDays.value.reduce((acc: number, d: any, di: number) => {
    if (di < currentDayIndex.value) return acc
    if (di === currentDayIndex.value) return acc + (d.pois?.length || 0) - currentPoiIndex.value - 1
    return acc + (d.pois?.length || 0)
  }, 0)
)

const hasNextPoi = computed(() => {
  if (currentPoiIndex.value < pois.value.length - 1) return true
  return currentDayIndex.value < allDays.value.length - 1
})

const allDone = computed(() => checkedInPois.value.size >= totalPois.value && totalPois.value > 0)

const currentDayLabel = computed(() => {
  const day = allDays.value[currentDayIndex.value]
  if (!day) return ''
  const n = day.day ?? currentDayIndex.value + 1
  return t('route.dayN', { n })
})

// Haversine 距离
function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const distanceToCurrent = computed(() => {
  if (!currentPoiCoordsValid.value) return Number.POSITIVE_INFINITY
  return calcDistance(
    userLocation.value.latitude,
    userLocation.value.longitude,
    currentPoi.value.latitude,
    currentPoi.value.longitude
  )
})

const canCheckIn = computed(
  () =>
    currentPoiCoordsValid.value &&
    distanceToCurrent.value <= CHECK_IN_EFFECTIVE &&
    totalPois.value > 0
)

const distanceText = computed(() => {
  const d = distanceToCurrent.value
  if (!currentPoiCoordsValid.value || !Number.isFinite(d)) return '—'
  if (d < 1000) return `${Math.round(d)}m`
  return `${(d / 1000).toFixed(1)}km`
})

// 地图 markers（不传 iconPath，使用微信默认图标，避免 /static 下无文件导致 500）
const markers = computed(() => {
  const list: UniApp.MapMarker[] = []
  const u = userLocation.value
  if (Number.isFinite(u.latitude) && Number.isFinite(u.longitude)) {
    list.push({
      id: 0,
      latitude: u.latitude,
      longitude: u.longitude,
      width: 28,
      height: 28,
      anchor: { x: 0.5, y: 0.5 }
    })
  }
  if (currentPoiCoordsValid.value) {
    list.push({
      id: 1,
      latitude: currentPoi.value.latitude,
      longitude: currentPoi.value.longitude,
      width: 36,
      height: 36,
      anchor: { x: 0.5, y: 1 },
      callout: {
        content: currentPoi.value.name || '',
        color: '#333',
        fontSize: 12,
        borderRadius: 6,
        padding: 6,
        display: 'ALWAYS',
        bgColor: '#fff'
      }
    })
  }
  return list
})

const polyline = computed(() => {
  const remaining = pois.value.slice(currentPoiIndex.value)
  if (remaining.length < 2) return []
  const points = remaining
    .map((p: POI) => {
      const lat = parseCoord(p.latitude)
      const lng = parseCoord(p.longitude)
      if (lat == null || lng == null) return null
      return { latitude: lat, longitude: lng }
    })
    .filter((pt): pt is { latitude: number; longitude: number } => pt != null)
  if (points.length < 2) return []
  return [{ points, color: '#1890FF', width: 4, dottedLine: true }]
})

// 打卡
async function onCheckIn() {
  if (!currentPoiCoordsValid.value) {
    uni.showToast({ title: t('route.poiNoCoords'), icon: 'none' })
    return
  }
  if (!currentPoi.value.id) return
  if (checkedInPois.value.has(currentPoi.value.id)) {
    uni.showToast({ title: t('route.alreadyCheckedIn'), icon: 'none' })
    return
  }
  uni.showLoading({ title: t('route.checking') })
  try {
    const poiId = currentPoi.value.id || currentPoi.value.poiId || ''
    const result = await checkApi.create({
      poiId,
      latitude: userLocation.value.latitude,
      longitude: userLocation.value.longitude
    })
    lastCheckDistance.value = result.distance || Math.round(distanceToCurrent.value)
    checkedInPois.value = new Set([...checkedInPois.value, currentPoi.value.id])
    checkInSuccessVisible.value = true
    arrivePromptVisible.value = false
  } catch (err: any) {
    uni.showToast({ title: err.message || t('route.checkFailed'), icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

function skipReview() { checkInSuccessVisible.value = false }

function onWriteReview() {
  checkInSuccessVisible.value = false
  const poiId = currentPoi.value.id || currentPoi.value.poiId || ''
  uni.navigateTo({ url: `/pages/comment/create?poiId=${poiId}` })
}

function onCommentSuccess() {
  uni.showToast({ title: t('route.reviewSuccess'), icon: 'success' })
}

// 下一站
function goNextPoi() {
  if (currentPoiIndex.value < pois.value.length - 1) {
    currentPoiIndex.value++
  } else if (currentDayIndex.value < allDays.value.length - 1) {
    currentDayIndex.value++
    currentPoiIndex.value = 0
  }
}

// 系统地图导航
function openSystemNav() {
  if (!currentPoiCoordsValid.value) {
    uni.showToast({ title: t('route.poiNoCoords'), icon: 'none' })
    return
  }
  uni.openLocation({
    latitude: currentPoi.value.latitude,
    longitude: currentPoi.value.longitude,
    name: currentPoi.value.name,
    address: currentPoi.value.address || ''
  })
}

function goBack() { uni.navigateBack() }

// 加载路线
async function loadRoute(routeId: string, isTmp = false) {
  try {
    if (isTmp) {
      route.value = routeStore.currentRoute
    } else if (routeId.startsWith('ai_')) {
      route.value = routeStore.currentRoute
    } else if (routeStore.currentRoute?.id == routeId) {
      route.value = routeStore.currentRoute
    } else {
      route.value = await routeApi.detail(routeId)
      routeStore.setCurrentRoute(route.value)
    }
  } catch {
    uni.showToast({ title: t('route.loadFailed'), icon: 'none' })
  }
}

// 加载已打卡记录
async function loadCheckedIn() {
  try {
    const { list } = await checkApi.my({ pageSize: 100 })
    checkedInPois.value = new Set(list.map((r: any) => r.poiId))
  } catch { /* ignore */ }
}

// 生命周期
onMounted(async () => {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as any
  const { id, tmp } = page.options || {}
  statusBarHeight.value = (uni.getSystemInfoSync() as any).statusBarHeight || 20

  if (!id) {
    uni.showToast({ title: '路线不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }

  await loadRoute(id, tmp === '1')
  await loadCheckedIn()

  // 开发模式下使用 DEV_MOCK_LOCATION 模拟定位
  if (DEV_MOCK_LOCATION) {
    userLocation.value = { latitude: DEV_MOCK_LOCATION.latitude, longitude: DEV_MOCK_LOCATION.longitude }
    if (canCheckIn.value && !checkedInPois.value.has(currentPoi.value.id)) {
      arrivePromptVisible.value = true
      setTimeout(() => { arrivePromptVisible.value = false }, 5000)
    }
  } else {
    startLocation()
  }
})

onUnmounted(() => { stopLocation() })

function applyLocation(res: { latitude: number; longitude: number }) {
  const lat = Number(res.latitude)
  const lng = Number(res.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  userLocation.value = { latitude: lat, longitude: lng }
  if (canCheckIn.value && !checkedInPois.value.has(currentPoi.value.id)) {
    arrivePromptVisible.value = true
    setTimeout(() => { arrivePromptVisible.value = false }, 5000)
  }
}

/** 持续定位失败时，用单次定位兜底 */
function fallbackGetLocation() {
  uni.getLocation({
    type: 'gcj02',
    success: (res) => applyLocation(res),
    fail: () => {
      uni.showToast({ title: t('route.locationDenied'), icon: 'none', duration: 2500 })
    }
  })
}

function startLocation() {
  locationChangeHandler = (res) => {
    applyLocation(res)
  }
  uni.onLocationChange(locationChangeHandler)
  uni.startLocationUpdate({
    type: 'gcj02',
    success: () => {
      fallbackGetLocation()
    },
    fail: () => {
      uni.showToast({ title: t('route.continuousLocationDenied'), icon: 'none', duration: 2500 })
      fallbackGetLocation()
    }
  })
}

function stopLocation() {
  if (locationChangeHandler) {
    try {
      uni.offLocationChange(locationChangeHandler)
    } catch { /* 部分端未实现 */ }
    locationChangeHandler = null
  }
  try {
    uni.stopLocationUpdate()
  } catch { /* ignore */ }
}
</script>

<style scoped>
.navigate-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  position: relative;
}

.nav-bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  padding: 0 24rpx 16rpx;
  background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%);
}

.back-icon {
  font-size: 52rpx;
  color: #fff;
  font-weight: 300;
  line-height: 1;
  margin-right: 16rpx;
}

.nav-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 600;
  color: #fff;
}

.route-progress {
  font-size: 26rpx;
  color: rgba(255,255,255,0.85);
  background: rgba(0,0,0,0.3);
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
}

.nav-map { width: 100%; flex: 1; }

/* 到达横幅 */
.arrive-banner {
  position: absolute;
  top: 120rpx;
  left: 50%;
  transform: translateX(-50%);
  background: #fff;
  border-radius: 48rpx;
  padding: 20rpx 36rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  box-shadow: 0 4rpx 24rpx rgba(24,144,255,0.25);
  z-index: 99;
  animation: slideDown 0.4s ease;
  white-space: nowrap;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateX(-50%) translateY(-30rpx); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.arrive-icon { font-size: 36rpx; }
.arrive-text { font-size: 28rpx; color: #1890FF; font-weight: 600; }
.arrive-arrow { font-size: 36rpx; color: #1890FF; }

/* 底部面板 */
.bottom-panel {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx 36rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 24rpx rgba(0,0,0,0.1);
  transition: background 0.3s;
}

.bottom-panel.arrived {
  background: linear-gradient(135deg, #e6f7ff, #f0fff4);
}

.poi-header { margin-bottom: 24rpx; }

.poi-num-badge {
  display: inline-block;
  background: #1890FF;
  color: #fff;
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  margin-bottom: 12rpx;
}

.poi-name-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.poi-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
  flex: 1;
}

.poi-address {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
  display: block;
}

.checked-badge {
  display: flex;
  align-items: center;
  gap: 6rpx;
  background: #52c41a;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
}

.checked-icon { font-size: 22rpx; color: #fff; }
.checked-text { font-size: 22rpx; color: #fff; font-weight: 500; }

/* 距离行 */
.distance-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: #f5f7fa;
  border-radius: 16rpx;
  padding: 24rpx 0;
  margin-bottom: 24rpx;
}

.distance-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  flex: 1;
}

.distance-val {
  font-size: 36rpx;
  font-weight: 700;
  color: #333;
  transition: color 0.3s;
}

.distance-val.near { color: #52c41a; font-size: 40rpx; }
.distance-label { font-size: 22rpx; color: #999; }
.distance-divider { width: 1rpx; height: 50rpx; background: #e8e8e8; }

/* 按钮 */
.action-btns { display: flex; gap: 20rpx; }

.btn-navigate {
  flex: 1; height: 88rpx;
  background: #1890FF; color: #fff;
  border-radius: 44rpx; font-size: 30rpx; font-weight: 600;
  border: none; line-height: 88rpx;
}

.btn-checkin {
  flex: 1; height: 88rpx;
  background: linear-gradient(135deg, #52c41a, #1890FF); color: #fff;
  border-radius: 44rpx; font-size: 30rpx; font-weight: 700;
  border: none; line-height: 88rpx;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(82,196,26,0.4); }
  50%       { box-shadow: 0 0 0 16rpx rgba(82,196,26,0); }
}

.btn-checkin.pulsing { animation: pulse 1.5s infinite; }

.btn-review {
  flex: 1; height: 88rpx;
  background: #fff; color: #1890FF;
  border-radius: 44rpx; font-size: 30rpx; font-weight: 600;
  border: 2rpx solid #1890FF; line-height: 84rpx;
}

.btn-next {
  width: 200rpx; height: 88rpx;
  background: #f5f7fa; color: #333;
  border-radius: 44rpx; font-size: 28rpx; font-weight: 500;
  border: none; line-height: 88rpx;
}

/* 全部完成 */
.all-done-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin-top: 24rpx;
  padding: 16rpx;
  background: #f6ffed;
  border-radius: 12rpx;
}

.done-icon { font-size: 32rpx; }
.done-text { font-size: 26rpx; color: #52c41a; font-weight: 500; }

/* 打卡成功弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-modal {
  width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.success-icon { font-size: 80rpx; }
.success-title { font-size: 36rpx; font-weight: 700; color: #1a1a1a; }
.success-sub { font-size: 26rpx; color: #666; }

.success-dist {
  display: flex;
  align-items: center;
  gap: 16rpx;
  background: #f5f7fa;
  padding: 12rpx 32rpx;
  border-radius: 12rpx;
  margin: 8rpx 0;
}

.dist-label { font-size: 24rpx; color: #999; }
.dist-val { font-size: 32rpx; font-weight: 700; color: #1890FF; }

.btn-review-modal {
  width: 100%; height: 88rpx;
  background: linear-gradient(135deg, #1890FF, #52C41A); color: #fff;
  border-radius: 44rpx; font-size: 30rpx; font-weight: 600;
  border: none; line-height: 88rpx;
  margin-top: 8rpx;
}

.btn-skip {
  font-size: 26rpx; color: #999; margin-top: 8rpx;
}
</style>
