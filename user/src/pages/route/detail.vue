<template>
  <view class="route-detail">
    <view class="page-header">
      <text class="page-title">{{ route?.title || t('route.detail') }}</text>
      <!-- Edit button (only for saved routes, not temp AI routes) -->
      <view v-if="route && !String(route.id).startsWith('ai_') && !isEditMode" class="edit-btn" @tap="enterEditMode">
        <text class="edit-btn-text">{{ t('route.edit') || '编辑' }}</text>
      </view>
    </view>

    <scroll-view scroll-y class="detail-scroll">
      <view v-if="loading" class="state-block">
        <text class="state-text">{{ t('route.loadingRoute') }}</text>
      </view>

      <template v-else-if="route">
        <!-- 概览卡片 -->
        <view class="overview-card">
          <view class="overview-stats">
            <view class="stat">
              <text class="stat-val">{{ route.days }}</text>
              <text class="stat-label">{{ t('route.days') }}</text>
            </view>
            <view class="stat-divider" />
            <view class="stat">
              <text class="stat-val">{{ route.totalPoi ?? route.poiCount ?? 0 }}</text>
              <text class="stat-label">{{ t('poi.detail') }}</text>
            </view>
          </view>
          <view v-if="route.tags?.length" class="tag-row">
            <text v-for="tag in route.tags" :key="tag" class="tag-badge">{{ tag }}</text>
          </view>
        </view>

        <view v-if="route.description" class="desc-card">
          <text class="desc-text">{{ route.description }}</text>
        </view>

        <!-- 行程安排：摘要 + 纵向时间轴（避免小程序模板内 t(key,{n}) 占位符不替换） -->
        <view class="schedule-card">
          <view class="schedule-card-top">
            <text class="schedule-card-title">{{ t('route.scheduleTitle') }}</text>
            <text class="schedule-summary-pill">{{ scheduleSummaryText }}</text>
          </view>
          <view v-if="displaySchedule.length" class="schedule-timeline">
            <view
              v-for="(day, dayIndex) in displaySchedule"
              :key="'sch-' + day.day"
              class="timeline-day"
            >
              <view class="timeline-axis">
                <view class="timeline-dot">
                  <text class="timeline-dot-num">{{ dayNumberOnly(day.day) }}</text>
                </view>
                <view v-if="dayIndex < displaySchedule.length - 1" class="timeline-bar" />
              </view>
              <view class="timeline-content">
                <view class="timeline-day-title-row">
                  <text class="timeline-day-title">{{ formatDayLabel(day.day) }}</text>
                  <text class="timeline-day-meta">{{ dayPoiCountLine(day) }}</text>
                </view>
                <text v-if="day.description" class="timeline-day-desc">{{ day.description }}</text>
                <view class="timeline-pois">
                  <view
                    v-for="(poi, idx) in day.pois"
                    :key="'sch-p-' + day.day + '-' + poiRowKey(poi, idx)"
                    class="timeline-poi"
                  >
                    <text class="timeline-poi-num">{{ idx + 1 }}</text>
                    <view class="timeline-poi-main">
                      <text class="timeline-poi-name">📍 {{ poi.name || '—' }}</text>
                      <text v-if="poiReason(poi)" class="timeline-poi-reason">{{ poiReason(poi) }}</text>
                    </view>
                  </view>
                  <view v-if="!(day.pois?.length)" class="timeline-poi-empty">—</view>
                </view>
              </view>
            </view>
          </view>
          <view v-if="!displaySchedule.length" class="schedule-empty-tip">{{ t('route.noSchedule') }}</view>
        </view>

        <!-- 地图预览 -->
        <!-- <view class="map-card">
          <text class="card-title">{{ t('route.mapPreview') }}</text>
          <map
            v-if="mapMarkers.length > 0"
            id="route-preview-map"
            class="route-map"
            :latitude="mapViewCenter.latitude"
            :longitude="mapViewCenter.longitude"
            :scale="mapPreviewScale"
            :markers="mapMarkers"
            :include-points="mapIncludePoints"
          />
          <view v-else class="map-placeholder">
            <text class="map-placeholder-text">{{ t('route.mapPlaceholder') }}</text>
          </view>
        </view> -->

        <!-- 按天分组（卡片详情，可点进景点） -->
        <view v-for="(day, dayIndex) in displaySchedule" :key="isEditMode ? 'edit-' + dayIndex : 'd-' + day.day" :data-day="dayIndex" class="day-section">
          <view class="day-header">
            <text class="day-title">{{ formatDayLabel(day.day) }}</text>
            <view class="day-header-right">
              <text class="day-count">{{ day.pois.length }} {{ t('map.poiCount') }}</text>
            </view>
          </view>

          <!-- Edit mode: draggable POI list -->
          <view v-if="isEditMode" class="day-poi-list">
            <view
              v-for="(poi, idx) in day.pois"
              :key="'edit-d-' + dayIndex + '-' + poiRowKey(poi, idx)"
              class="poi-item edit-poi-item"
            >
              <view class="poi-drag-handle">
                <text class="drag-icon">☰</text>
              </view>
              <image class="poi-img" :src="poi.images?.[0] || '/static/logo.png'" mode="aspectFill" />
              <view class="poi-info">
                <text class="poi-name">{{ poi.name || '—' }}</text>
                <text class="poi-addr">{{ poi.address || '' }}</text>
              </view>
              <view class="poi-delete-btn" @tap="deletePoi(dayIndex, idx)">
                <text class="delete-icon">✕</text>
              </view>
            </view>
            <view v-if="!day.pois?.length" class="day-poi-empty">{{ t('route.noPoiInDay') || '当天暂无景点' }}</view>
          </view>

          <!-- Normal mode: read-only POI list -->
          <view v-else>
            <view
              v-for="(poi, idx) in day.pois"
              :key="'d-' + day.day + '-' + poiRowKey(poi, idx)"
              class="poi-item"
              @tap="onPoiTap(poi)"
            >
              <view class="poi-index">{{ idx + 1 }}</view>
              <image class="poi-img" :src="poi.images?.[0] || '/static/logo.png'" mode="aspectFill" />
              <view class="poi-info">
                <text class="poi-name">{{ poi.name || '—' }}</text>
                <text class="poi-addr">{{ poi.address || '' }}</text>
                <text v-if="poiReason(poi)" class="poi-reason">{{ poiReason(poi) }}</text>
                <text class="poi-rating">⭐ {{ poi.rating || 0 }}</text>
              </view>
              <view class="poi-actions">
                <text class="poi-arrow">›</text>
              </view>
            </view>
          </view>
        </view>
      </template>

      <view v-else-if="loadAttempted" class="state-block">
        <text class="state-text">{{ t('route.noRouteData') }}</text>
      </view>

      <view class="bottom-space" />
    </scroll-view>

    <!-- 底部操作栏：普通模式 -->
    <view v-if="!isEditMode" class="action-bar">
      <button class="action-btn secondary" @tap="onShare">{{ t('common.share') }}</button>
      <button class="action-btn primary" @tap="onStartNavigation">{{ t('route.startNavigation') }}</button>
    </view>

    <!-- 底部操作栏：编辑模式 -->
    <view v-else class="action-bar edit-bar">
      <button class="action-btn secondary" :disabled="savingEdit" @tap="onCancelEdit">
        {{ t('common.cancel') || '取消' }}
      </button>
      <button class="action-btn primary" :disabled="savingEdit" @tap="onSaveChanges">
        <text v-if="savingEdit">{{ t('route.saving') || '保存中...' }}</text>
        <text v-else>{{ t('route.saveChanges') || '保存修改' }}</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, unref, watch, nextTick, onUnmounted } from 'vue'
import Sortable from 'sortablejs'
import { onLoad } from '@dcloudio/uni-app'
import { useI18n } from 'vue-i18n'
import { useRouteStore } from '../../stores/route'
import { routeApi } from '../../api/route'
import { showShareMenu } from '../../utils/share'
import { uniqueTagList } from '../../utils/tags'
import type { TravelRoute } from '../../stores/route'
import type { RouteDay } from '../../stores/route'
import type { POI } from '../../stores/poi'

const { t, locale } = useI18n()
const routeStore = useRouteStore()
const route = ref<TravelRoute | null>(null)
const loading = ref(false)
const loadAttempted = ref(false)

// ── Edit mode ──────────────────────────────────────────────────────────────────
const isEditMode = ref(false)
const editedRoute = ref<TravelRoute | null>(null)
const hasChanges = ref(false)
const savingEdit = ref(false)
const sortableInstances: Sortable[] = []

/** Enter edit mode: deep-clone current route into editedRoute */
function enterEditMode() {
  if (!route.value) return
  editedRoute.value = JSON.parse(JSON.stringify(route.value))
  isEditMode.value = true
  hasChanges.value = false
  nextTick(() => initSortable())
}

/** Exit edit mode without saving */
function exitEditMode(clear = true) {
  destroySortable()
  if (clear) {
    editedRoute.value = null
    hasChanges.value = false
  }
  isEditMode.value = false
}

/** Confirm cancel with unsaved-changes warning */
function onCancelEdit() {
  if (hasChanges.value) {
    uni.showModal({
      title: t('route.discardChanges') || '放弃修改?',
      content: t('route.discardTip') || '未保存的更改将丢失',
      confirmText: t('common.confirm') || '确定',
      cancelText: t('common.cancel') || '取消',
      success: (res) => {
        if (res.confirm) exitEditMode()
      }
    })
  } else {
    exitEditMode()
  }
}

/** Persist edited route to backend */
async function onSaveChanges() {
  if (!editedRoute.value || savingEdit.value) return
  savingEdit.value = true
  try {
    const schedule = editedRoute.value.schedule || []
    const poiList = schedule.flatMap((day: RouteDay, dayIdx: number) =>
      (day.pois || []).map((poi: POI, seq: number) => ({
        poiId: poi.poiId || poi.id,
        dayNum: day.day || dayIdx + 1,
        sequence: seq + 1,
        stayTime: (poi as any).stayTime || 2
      }))
    )

    const totalPoi = schedule.reduce((n: number, d: RouteDay) => n + (d.pois?.length || 0), 0)
    const updateData = {
      id: String(editedRoute.value.id),
      name: editedRoute.value.name || editedRoute.value.title || '',
      days: schedule.length,
      description: editedRoute.value.description || '',
      pois: poiList,
      tags: editedRoute.value.tags || [],
      coverImage: editedRoute.value.coverImage || '',
    }

    await routeApi.update(updateData)

    // Sync store and local state
    const updated: TravelRoute = {
      ...route.value!,
      ...editedRoute.value,
      days: schedule.length,
      totalPoi,
      poiCount: totalPoi,
      schedule
    }
    routeStore.setCurrentRoute(updated)
    route.value = updated

    exitEditMode(false)
    hasChanges.value = false
    uni.showToast({ title: t('route.saveSuccess') || '保存成功', icon: 'success' })
  } catch (e: any) {
    uni.showToast({ title: e?.message || t('route.saveFailed') || '保存失败', icon: 'none' })
  } finally {
    savingEdit.value = false
  }
}

/** Delete a POI from a given day with confirmation */
function deletePoi(dayIndex: number, poiIndex: number) {
  if (!editedRoute.value) return
  uni.showModal({
    title: t('route.deletePoi') || '删除景点',
    content: t('route.deletePoiTip') || '确定要删除此景点吗?',
    confirmText: t('common.confirm') || '确定',
    cancelText: t('common.cancel') || '取消',
    success: (res) => {
      if (!res.confirm) return
      const schedule = editedRoute.value!.schedule!
      schedule[dayIndex].pois.splice(poiIndex, 1)
      hasChanges.value = true
    }
  })
}

// ── Sortable drag-drop ─────────────────────────────────────────────────────────
function initSortable() {
  destroySortable()
  if (!editedRoute.value) return
  const schedule = editedRoute.value.schedule || []
  schedule.forEach((_, dayIndex) => {
    nextTick(() => {
      const el = (document as any).querySelector(`[data-day="${dayIndex}"] .day-poi-list`)
      if (!el) return
      const s = Sortable.create(el as HTMLElement, {
        group: { name: 'pois', pull: true, put: true },
        animation: 180,
        handle: '.poi-drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        onEnd: (evt) => {
          if (!editedRoute.value) return
          const { from, to, oldIndex, newIndex } = evt
          if (!from || !to || oldIndex == null || newIndex == null) return
          const fromDay = Number((from.closest('[data-day]') as HTMLElement)?.dataset.day)
          const toDay = Number((to.closest('[data-day]') as HTMLElement)?.dataset.day)
          if (isNaN(fromDay) || isNaN(toDay)) return
          const schedule = editedRoute.value!.schedule!
          const [moved] = schedule[fromDay].pois.splice(oldIndex, 1)
          schedule[toDay].pois.splice(newIndex, 0, moved)
          hasChanges.value = true
        }
      })
      sortableInstances.push(s)
    })
  })
}

function destroySortable() {
  sortableInstances.forEach(s => s.destroy())
  sortableInstances.length = 0
}

onUnmounted(() => destroySortable())

// ── Display schedule (normal vs edit) ──────────────────────────────────────────
const displaySchedule = computed(() => {
  if (isEditMode.value && editedRoute.value) return editedRoute.value.schedule || []
  return route.value?.schedule || []
})

/** 小程序端模板里传 t('route.day',{n}) 时插值常失效，改为脚本内拼接 */
function formatDayLabel(dayNum: unknown): string {
  const n = Math.max(1, Math.floor(Number(dayNum)) || 1)
  return unref(locale) === 'en' ? `Day ${n}` : `第${n}天`
}

function dayNumberOnly(dayNum: unknown): string {
  return String(Math.max(1, Math.floor(Number(dayNum)) || 1))
}

const scheduleSummaryText = computed(() => {
  const r = route.value
  if (!r) return ''
  const days = r.days ?? displaySchedule.value.length ?? 1
  const n = r.totalPoi ?? r.poiCount ?? 0
  return unref(locale) === 'en' ? `${days} days · ${n} attractions` : `${days}天 · ${n}个景点`
})

function dayPoiCountLine(day: { pois?: unknown[] }): string {
  const c = day.pois?.length ?? 0
  return unref(locale) === 'en' ? `${c} stops` : `${c} 个景点`
}

function normalizeRoute(raw: TravelRoute): TravelRoute {
  const schedule = (raw.schedule || []).map((day: any, i: number) => ({
    day: typeof day?.day === 'number' && !Number.isNaN(day.day) ? day.day : Number(day?.day) || i + 1,
    description: typeof day?.description === 'string' ? day.description : '',
    pois: Array.isArray(day?.pois) ? day.pois : []
  }))
  const poiN = schedule.reduce((n, d) => n + d.pois.length, 0)
  return {
    ...raw,
    schedule,
    days: raw.days && raw.days > 0 ? raw.days : Math.max(schedule.length, 1),
    totalPoi: raw.totalPoi != null ? raw.totalPoi : poiN,
    poiCount: raw.poiCount != null ? raw.poiCount : poiN
  }
}

function poiRowKey(poi: any, idx: number) {
  const raw = poi?.poiId ?? poi?.id
  return `${raw != null ? String(raw) : 'x'}-${idx}`
}

function poiReason(poi: any): string {
  const r = poi?.reason
  return typeof r === 'string' && r.trim() ? r : ''
}

let loadedFromOnLoad = false
let routePageId = ''

onLoad((options) => {
  routePageId = (options?.id as string) || ''
  loadedFromOnLoad = true
  if (routePageId) {
    loadData(routePageId)
  } else {
    loadAttempted.value = true
    uni.showToast({ title: '缺少路线参数', icon: 'none' })
  }
})

const mapMarkers = computed(() => {
  const markers: Array<{ id: number; latitude: number; longitude: number; title: string }> = []
  let mid = 0
  displaySchedule.value.forEach(day => {
    (day.pois || []).forEach((poi, idx) => {
      const lat = Number(poi.latitude)
      const lng = Number(poi.longitude)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
      markers.push({
        id: mid++,
        latitude: lat,
        longitude: lng,
        title: `${idx + 1}. ${poi.name || ''}`
      })
    })
  })
  return markers
})

/** 与 markers 一致，供 include-points 自动缩放到包含全部标注 */
const mapIncludePoints = computed(() =>
  mapMarkers.value.map(m => ({ latitude: m.latitude, longitude: m.longitude }))
)

/** 视野中心：多点取几何中心，避免只盯住第一个点导致边缘点被裁切 */
const mapViewCenter = computed(() => {
  const pts = mapIncludePoints.value
  if (!pts.length) return { latitude: 31.230416, longitude: 121.473701 }
  let lat = 0
  let lng = 0
  pts.forEach(p => {
    lat += p.latitude
    lng += p.longitude
  })
  return { latitude: lat / pts.length, longitude: lng / pts.length }
})

/** 单点仍用固定缩放；多点由 include-points / includePoints 控制 */
const mapPreviewScale = computed(() => (mapMarkers.value.length <= 1 ? 14 : 13))

function fitRouteMapBounds() {
  const pts = mapIncludePoints.value
  if (pts.length < 2) return
  nextTick(() => {
    const ctx = uni.createMapContext('route-preview-map')
    ctx.includePoints?.({
      points: pts,
      // 上右下左留白(px)，避免标注贴边被裁切
      padding: [48, 48, 48, 48]
    })
  })
}

watch(
  mapIncludePoints,
  pts => {
    if (pts.length < 2) return
    setTimeout(() => fitRouteMapBounds(), 200)
  },
  { deep: true }
)

function resolveRouteFromStore(rid: string): TravelRoute | null {
  if (routeStore.currentRoute && String(routeStore.currentRoute.id) === rid) {
    return routeStore.currentRoute as TravelRoute
  }
  const fromList = routeStore.myRoutes.find(r => String(r.id) === rid)
  return fromList ? (fromList as TravelRoute) : null
}

async function loadData(id?: string) {
  const rid = String((id ?? routePageId) || '').trim()
  if (!rid) return

  loading.value = true
  loadAttempted.value = false
  try {
    if (rid.startsWith('ai_')) {
      const hit = resolveRouteFromStore(rid)
      if (hit) {
        route.value = normalizeRoute(hit)
        routeStore.setCurrentRoute(route.value)
      } else {
        route.value = null
        uni.showToast({ title: t('route.tempRouteExpired'), icon: 'none' })
      }
      loadAttempted.value = true
      return
    }

    if (String(routeStore.currentRoute?.id) === rid) {
      route.value = normalizeRoute(routeStore.currentRoute as TravelRoute)
      loadAttempted.value = true
      return
    }

    const data = await routeApi.detail(rid)
    route.value = normalizeRoute(data)
    routeStore.setCurrentRoute(route.value)
    loadAttempted.value = true
  } catch (e: any) {
    route.value = null
    loadAttempted.value = true
    uni.showToast({ title: e?.message || t('route.loadFailed'), icon: 'none' })
  } finally {
    loading.value = false
  }
}

function onPoiTap(poi: any) {
  // 后端景点详情按 poiUuid 查询，与路线里 poi.id 一致
  const uuid = poi?.id != null && String(poi.id).trim() !== '' ? String(poi.id).trim() : ''
  if (!uuid || uuid.startsWith('ai_')) return
  uni.navigateTo({ url: `/pages/poi/detail?id=${encodeURIComponent(uuid)}` })
}

function onStartNavigation() {
  const firstPoi = displaySchedule.value[0]?.pois[0]
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
  if (!route.value) return
  showShareMenu({
    title: route.value.title || route.value.name || '我的旅行路线',
    routeId: route.value.id,
    days: route.value.days,
    poiCount: route.value.poiCount,
    coverImage: route.value.coverImage,
    tags: route.value.tags,
  })
}

onMounted(() => {
  if (!loadedFromOnLoad) {
    const pages = getCurrentPages()
    const page = pages[pages.length - 1] as any
    const id = page?.$page?.options?.id || page?.options?.id || ''
    routePageId = id
    if (id) loadData(id)
    else {
      loadAttempted.value = true
    }
  }
})
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
  height: 380rpx;
  border-radius: 12rpx;
}

.state-block {
  margin: 80rpx 48rpx;
  padding: 48rpx;
  text-align: center;
}

.state-text {
  font-size: 28rpx;
  color: #999;
}

.desc-card {
  background: #fff;
  margin: 0 24rpx 16rpx;
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
}

.desc-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
}

.schedule-card {
  background: #fff;
  margin: 16rpx 24rpx;
  border-radius: 20rpx;
  padding: 28rpx 24rpx 32rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(24, 144, 255, 0.08);
}

.schedule-card-top {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 28rpx;
}

.schedule-card-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.schedule-summary-pill {
  align-self: flex-start;
  padding: 10rpx 24rpx;
  background: #f0f5ff;
  color: #1890ff;
  font-size: 24rpx;
  font-weight: 500;
  border-radius: 999rpx;
}

.schedule-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.timeline-day {
  display: flex;
  flex-direction: row;
  align-items: stretch;
}

.timeline-axis {
  width: 56rpx;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 6rpx;
}

.timeline-dot {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #1890ff, #52c41a);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.timeline-dot-num {
  font-size: 24rpx;
  font-weight: 700;
  color: #fff;
}

.timeline-bar {
  width: 4rpx;
  flex: 1;
  min-height: 32rpx;
  margin-top: 8rpx;
  margin-bottom: 8rpx;
  background: linear-gradient(180deg, #b7eb8f, #91d5ff);
  border-radius: 4rpx;
}

.timeline-content {
  flex: 1;
  padding-left: 20rpx;
  padding-bottom: 36rpx;
}

.timeline-day:last-child .timeline-content {
  padding-bottom: 8rpx;
}

.timeline-day-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.timeline-day-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1890ff;
}

.timeline-day-meta {
  font-size: 22rpx;
  color: #999;
}

.timeline-day-desc {
  display: block;
  font-size: 24rpx;
  color: #888;
  line-height: 1.5;
  margin-bottom: 16rpx;
}

.timeline-pois {
  background: #f8fafc;
  border-radius: 16rpx;
  padding: 8rpx 0;
  border: 1rpx solid #eef2f6;
}

.timeline-poi {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  padding: 16rpx 20rpx;
  gap: 16rpx;
}

.timeline-poi-num {
  width: 40rpx;
  height: 40rpx;
  line-height: 40rpx;
  text-align: center;
  background: #fff;
  color: #1890ff;
  font-size: 22rpx;
  font-weight: 600;
  border-radius: 10rpx;
  flex-shrink: 0;
  border: 1rpx solid #d6e4ff;
}

.timeline-poi-main {
  flex: 1;
  min-width: 0;
}

.timeline-poi-name {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  line-height: 1.45;
}

.timeline-poi-reason {
  display: block;
  font-size: 22rpx;
  color: #52c41a;
  margin-top: 8rpx;
  line-height: 1.4;
}

.timeline-poi-empty {
  padding: 24rpx 20rpx;
  font-size: 26rpx;
  color: #ccc;
  text-align: center;
}

.schedule-empty-tip {
  padding: 32rpx 0 8rpx;
  text-align: center;
  font-size: 26rpx;
  color: #999;
}

.map-placeholder {
  width: 100%;
  height: 380rpx;
  border-radius: 12rpx;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.map-placeholder-text {
  font-size: 24rpx;
  color: #999;
  padding: 0 32rpx;
  text-align: center;
}

.poi-reason {
  display: block;
  font-size: 22rpx;
  color: #52C41A;
  margin-top: 6rpx;
  line-height: 1.4;
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

.poi-actions {
  flex-shrink: 0;
  padding-left: 12rpx;
}

.day-header-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

/* ── Edit mode ─────────────────────────────────────── */
.edit-btn {
  position: absolute;
  right: 32rpx;
  top: 50%;
  transform: translateY(-50%);
  padding: 8rpx 24rpx;
  background: #1890FF;
  border-radius: 32rpx;
  border: none;
}

.edit-btn-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

.day-poi-list {
  padding: 8rpx 0;
}

.day-poi-empty {
  padding: 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #ccc;
}

.edit-poi-item {
  cursor: default;
}

.poi-drag-handle {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.drag-icon {
  font-size: 32rpx;
  color: #999;
  cursor: grab;
}

.poi-delete-btn {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.delete-icon {
  font-size: 28rpx;
  color: #ff4d4f;
  font-weight: 600;
}

/* Sortable states */
:global(.sortable-ghost) {
  opacity: 0.4;
  background: #e6f4ff !important;
}

:global(.sortable-chosen) {
  background: #f0f5ff;
}

:global(.sortable-drag) {
  opacity: 1 !important;
  background: #fff !important;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12) !important;
}

/* Edit action bar */
.edit-bar .action-btn {
  position: relative;
}

.edit-bar .action-btn[disabled] {
  opacity: 0.6;
}

.page-header {
  position: relative;
}
</style>
