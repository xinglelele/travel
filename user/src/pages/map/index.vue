<template>
  <view class="map-page">
    <!-- 地图（全屏） -->
    <map
      id="tourism-map"
      class="amap"
      :latitude="mapCenter.latitude"
      :longitude="mapCenter.longitude"
      :scale="mapScale"
      :markers="allMarkers"
      :polyline="routePolyline"
      :show-location="true"
      :enable-satellite="darkMode"
      enable-zoom
      enable-scroll
      @markertap="onMarkerTap"
      @regionchange="onRegionChange"
    />

    <!-- 热力图画布叠加层 -->
    <canvas
      v-if="showHeatmap"
      canvas-id="heatmap-canvas"
      class="heatmap-canvas"
      :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
    />

    <!-- 可拖动悬浮控制面板 -->
    <view
      class="float-panel"
      :style="{ top: panelY + 'px', left: panelX + 'px', transition: isSnapping ? 'top 0.35s cubic-bezier(.34,1.56,.64,1), left 0.35s cubic-bezier(.34,1.56,.64,1)' : 'none' }"
      @touchstart="onPanelTouchStart"
      @touchmove="onPanelTouchMove"
      @touchend="onPanelTouchEnd"
    >
      <!-- 折叠/展开按钮：隐藏时变猫咪 -->
      <view
        class="panel-toggle"
        :class="{ hidden: isHidden, 'peek-left': peekSide === 'left', 'peek-right': peekSide === 'right', 'peek-top': peekSide === 'top', 'peek-bottom': peekSide === 'bottom' }"
        @tap="onPanelToggleTap"
      >
        <AppIcon v-if="isHidden" name="cat" :size="48" />
        <AppIcon v-else-if="panelOpen" name="settings" :size="44" />
        <AppIcon v-else name="settings" :size="44" />
      </view>

      <!-- 面板内容 -->
      <view v-if="panelOpen" class="panel-content">
        <!-- 定位 -->
        <view class="panel-section panel-section--btn" @tap="locateMe">
          <view class="panel-label-row">
            <AppIcon name="locate" :size="36" />
            <text class="panel-label">回到我的位置</text>
          </view>
        </view>

        <view class="panel-divider" />
        <view class="panel-section">
          <view class="panel-label-row">
            <AppIcon name="heatmap" :size="36" />
            <text class="panel-label">人流热力图</text>
          </view>
          <view class="switch-row" @tap="toggleHeatmap">
            <view class="switch-track" :class="{ on: showHeatmap }">
              <view class="switch-thumb" />
            </view>
          </view>
        </view>

        <view class="panel-divider" />

        <!-- POI类别筛选 -->
        <view class="panel-section">
          <view class="panel-label-row">
            <AppIcon name="locate" :size="36" />
            <text class="panel-label">景点类别</text>
          </view>
          <view class="category-list">
            <view
              v-for="cat in poiCategories"
              :key="cat.key"
              class="cat-item"
              :class="{ active: selectedCategory === cat.key }"
              @tap="selectCategory(cat.key)"
            >
              <AppIcon :name="cat.icon as any" :size="36" />
              <text class="cat-name">{{ cat.name }}</text>
            </view>
          </view>
        </view>

        <view class="panel-divider" />

        <!-- 路线显示开关 -->
        <view class="panel-section">
          <view class="panel-label-row">
            <AppIcon name="route" :size="36" />
            <text class="panel-label">显示规划路线</text>
          </view>
          <view class="switch-row" @tap="toggleRouteDisplay">
            <view class="switch-track" :class="{ on: showRoute }">
              <view class="switch-thumb" />
            </view>
          </view>
        </view>

        <view class="panel-divider" />

        <!-- 卫星图模式 -->
        <view class="panel-section">
          <view class="panel-label-row">
            <AppIcon name="satellite" :size="36" />
            <text class="panel-label">卫星图模式</text>
          </view>
          <view class="switch-row" @tap="darkMode = !darkMode">
            <view class="switch-track" :class="{ on: darkMode }">
              <view class="switch-thumb" />
            </view>
          </view>
        </view>

        <view class="panel-divider" />

        <!-- 选择已保存路线 -->
        <view class="panel-section panel-section--btn" @tap="openRouteSelector">
          <view class="panel-label-row">
            <AppIcon name="route" :size="36" />
            <text class="panel-label">选择路线</text>
          </view>
          <text class="panel-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 路线选择器悬浮面板 -->
    <view v-if="showRouteSelector" class="route-selector-mask" @tap="showRouteSelector = false">
      <view class="route-selector-panel" @tap.stop>
        <view class="route-selector-header">
          <text class="route-selector-title">选择路线</text>
          <text class="route-selector-close" @tap="showRouteSelector = false">✕</text>
        </view>
        <scroll-view scroll-y class="route-selector-list">
          <view v-if="savedRoutes.length === 0" class="route-selector-empty">
            <text>暂无已保存路线</text>
          </view>
          <view
            v-for="route in savedRoutes"
            :key="route.id"
            class="route-selector-item"
            @tap="loadSavedRoute(route)"
          >
            <view class="route-selector-info">
              <text class="route-selector-name">{{ route.name }}</text>
              <text class="route-selector-meta">{{ route.days }}天 · {{ route.poiCount || 0 }}个景点</text>
              <!-- 简要 POI 预览 -->
              <view class="route-selector-pois">
                <text
                  v-for="(day, i) in (route.schedule || []).slice(0, 1)"
                  :key="i"
                  class="route-selector-poi-tag"
                >
                  {{ (day.pois || []).slice(0, 3).map((p: any) => p.name).join(' → ') }}
                </text>
              </view>
            </view>
            <text class="route-selector-arrow">›</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- transit 换乘方案选择面板 -->
    <view v-if="showTransitPlans" class="route-selector-mask" @tap="showTransitPlans = false">
      <view class="route-selector-panel transit-plans-panel" @tap.stop>
        <view class="route-selector-header">
          <text class="route-selector-title">换乘方案</text>
          <text class="route-selector-close" @tap="showTransitPlans = false">✕</text>
        </view>
        <view v-if="transitPlanLoading" class="transit-loading">
          <view class="processing-dots">
            <view class="dot d1" /><view class="dot d2" /><view class="dot d3" />
          </view>
          <text class="transit-loading-text">加载方案中...</text>
        </view>
        <scroll-view v-else scroll-y class="route-selector-list">
          <view v-if="transitPlans.length === 0" class="route-selector-empty">
            <text>暂无可用方案</text>
          </view>
          <view
            v-for="(plan, pi) in transitPlans"
            :key="plan.index"
            class="transit-plan-item"
            @tap="selectTransitPlan(plan)"
          >
            <!-- 顶部：推荐标签 + 时间费用 -->
            <view class="transit-plan-header">
              <view class="transit-plan-badge" :class="pi === 0 ? 'badge-best' : 'badge-alt'">
                <text class="transit-plan-badge-text">{{ pi === 0 ? '推荐' : `方案${pi + 1}` }}</text>
              </view>
              <view class="transit-plan-stats">
                <text class="transit-plan-dur">{{ Math.round(plan.duration / 60) }}分钟</text>
                <text class="transit-plan-dot-sep">·</text>
                <text class="transit-plan-walk-dist">步行{{ Math.round(plan.walkingDistance) }}m</text>
                <text v-if="plan.cost > 0" class="transit-plan-dot-sep">·</text>
                <text v-if="plan.cost > 0" class="transit-plan-cost">¥{{ plan.cost }}</text>
              </view>
            </view>
            <!-- 换乘流程图 -->
            <view class="transit-plan-flow">
              <template v-for="(seg, si) in plan.segments" :key="si">
                <view class="transit-flow-seg" :class="`seg-${seg.type}`">
                  <view class="transit-flow-icon-wrap" :class="`icon-${seg.type}`">
                    <text class="transit-flow-icon">{{ seg.type === 'walking' ? '🚶' : seg.type === 'subway' ? '🚇' : '🚌' }}</text>
                  </view>
                  <view class="transit-flow-info">
                    <text class="transit-flow-name">{{ seg.type === 'walking' ? `步行 ${Math.round(seg.distance)}m` : seg.lineName }}</text>
                    <text v-if="seg.type !== 'walking' && seg.departStop" class="transit-flow-stops">{{ seg.departStop }} → {{ seg.arriveStop }}</text>
                  </view>
                </view>
                <!-- 箭头连接符 -->
                <text v-if="si < plan.segments.length - 1" class="transit-flow-arrow">›</text>
              </template>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>



    <!-- 底部POI卡片（从底部滑入） -->
    <view v-if="selectedPoi" class="poi-card" @tap.stop>
      <!-- 关闭按钮 -->
      <view class="poi-card-close" @tap.stop="selectedPoi = null">
        <text class="poi-card-close-icon">×</text>
      </view>
      <!-- 封面图 -->
      <image class="poi-card-img" :src="selectedPoi.images[0]" mode="aspectFill" />
      <!-- 内容区 -->
      <view class="poi-card-body">
        <view class="poi-card-title-row">
          <text class="poi-card-name">{{ selectedPoi.name }}</text>
          <view class="poi-card-rating">
            <text class="poi-card-star">★</text>
            <text class="poi-card-score">{{ selectedPoi.rating || '暂无' }}</text>
          </view>
        </view>
        <text class="poi-card-addr"><AppIcon name="locate" :size="28" style="vertical-align:middle;margin-right:4rpx;" />{{ selectedPoi.address }}</text>
        <view class="poi-card-tags">
          <text v-if="selectedPoi.distance" class="poi-card-tag">{{ formatDist(selectedPoi.distance) }}</text>
          <text v-if="selectedPoi.category" class="poi-card-tag">{{ selectedPoi.category }}</text>
        </view>
        <view class="poi-card-btn" @tap="goPoi(selectedPoi!.id)">
          <text class="poi-card-btn-text">查看详情</text>
          <text class="poi-card-btn-arrow">→</text>
        </view>
      </view>
    </view>

    <!-- 附近景点数量提示 -->
    <view v-if="!selectedPoi && !showVoiceResult && nearbyList.length > 0" class="nearby-tip">
      <text>附近 {{ nearbyList.length }} 个景点</text>
    </view>

    <!-- 超出上海提示 -->
    <view v-if="outOfShanghai" class="out-of-shanghai-tip">
      <AppIcon name="locate" :size="32" style="margin-right:6rpx;" />
      <text>您不在上海，已为您推荐热门景点</text>
    </view>

    <!-- 底部堆叠区：路线卡片 + 语音按钮，从下往上自然排列，互不遮挡 -->
    <view v-if="!selectedPoi || showVoiceResult" class="bottom-stack">

      <!-- 路线收起时的悬浮小方块 -->
      <view
        v-if="showVoiceResult && planResult && resultCollapsed"
        class="route-collapsed-fab"
        @tap="resultCollapsed = false"
        @longpress="showCollapsedTooltip = true"
        @touchend="hideTooltipDelay"
      >
        <text class="route-collapsed-fab-icon">🗺</text>
        <view v-if="showCollapsedTooltip" class="collapsed-tooltip">
          <text class="collapsed-tooltip-text">{{ planResult.title }}</text>
        </view>
      </view>

      <!-- 语音规划结果面板 -->
      <view v-if="showVoiceResult && planResult && !resultCollapsed" class="route-result-panel">
        <!-- 拖拽指示条 -->
        <view class="drag-handle" />
        <view class="result-header">
          <view class="result-title-block" @tap="onTitleTap">
            <text class="result-title">{{ planResult.title }}</text>
            <text class="result-subtitle">{{ planResult.description }}</text>
          </view>
          <view class="result-actions">
            <text class="result-action-btn" @tap="onStartNav">{{ t('route.startNavigation') }}</text>
            <text class="result-action-btn" @tap="saveRoute">保存</text>
            <view class="result-collapse-btn" @tap="resultCollapsed = true">
              <text class="result-collapse-icon">▼</text>
            </view>
            <text class="result-close" @tap="clearPlanResult">✕</text>
          </view>
        </view>
        <!-- 天数 Tab + 出行方式 -->
        <view class="result-toolbar">
          <scroll-view scroll-x class="day-tabs">
            <view
              v-for="(day, di) in planResult.schedule"
              :key="day.day"
              class="day-tab"
              :class="{ active: activeDay === day.day }"
              :style="activeDay === day.day ? `background: ${getDayColor(di)}; box-shadow: 0 4rpx 12rpx ${getDayColor(di)}55` : ''"
              @tap="activeDay = day.day"
            >
              <view class="day-tab-dot" :style="`background: ${getDayColor(di)}`" />
              <text class="day-tab-text">第{{ day.day }}天</text>
            </view>
          </scroll-view>
                    <!-- 当前天出行方式（作用于当前天所有段） -->
          <view class="travel-modes">
            <view
              v-for="m in TRAVEL_MODES"
              :key="m.mode"
              class="travel-mode-btn"
              :class="{ active: activeDayMode === m.mode }"
              @tap="switchMode(m.mode)"
            >
              <text class="mode-icon">{{ m.icon }}</text>
            </view>
          </view></view>
        <!-- 当天 POI 列表（含段间交通方式） -->
        <scroll-view scroll-x class="result-pois">
          <template v-for="(item, idx) in currentDayPois" :key="item.poi.id">
            <view class="result-poi-item" @tap="goPoi(item.poi.id)">
              <view class="poi-seq" :style="`background: linear-gradient(135deg, ${activeDayColor}, ${activeDayColor}cc)`">{{ idx + 1 }}</view>
              <view class="poi-item-info">
                <text class="poi-item-name">{{ item.poi.name }}</text>
                <text v-if="item.stayTime" class="poi-item-stay">{{ item.stayTime }}h</text>
              </view>
            </view>
            <!-- 段间交通方式选择（最后一个POI后不显示） -->
            <view v-if="idx < currentDayPois.length - 1" class="segment-mode-picker">
              <view
                v-for="m in TRAVEL_MODES"
                :key="m.mode"
                class="seg-mode-btn"
                :class="{ active: (item.segmentMode ?? travelMode) === m.mode }"
                @tap.stop="setSegmentMode(activeDayIndex, idx, m.mode)"
              ><text class="seg-mode-icon">{{ m.icon }}</text></view>
              <text class="seg-arrow">→</text>
            </view>
          </template>
        </scroll-view>
        <!-- 当天描述 -->
        <text v-if="currentDayDesc" class="result-day-desc">{{ currentDayDesc }}</text>
      </view>

      <!-- 彩蛋：随机漫游提示 -->
      <view v-if="showEasterEgg" class="easter-egg-toast">
        <text class="easter-egg-icon">🎲</text>
        <text class="easter-egg-text">随机漫游已触发！</text>
      </view>
      <!-- 识别中：声波冒泡动画 -->
      <view v-if="!showVoiceResult" class="voice-area">
        <view v-if="voiceState === 'listening'" class="voice-wave-wrap">
        <view class="wave-rings">
          <view class="wave-ring r1" />
          <view class="wave-ring r2" />
          <view class="wave-ring r3" />
        </view>
        <text v-if="voiceTranscript" class="voice-transcript">"{{ voiceTranscript }}"</text>
      </view>

      <!-- AI思考中：processing 动画 -->
      <view v-if="voiceState === 'processing' || voiceState === 'routing'" class="voice-processing-wrap">
        <view class="processing-dots">
          <view class="dot d1" />
          <view class="dot d2" />
          <view class="dot d3" />
        </view>
        <text class="processing-label">{{ processingLabel }}</text>
        <text v-if="voiceTranscript" class="voice-transcript">"{{ voiceTranscript }}"</text>
      </view>

      <!-- 错误提示 -->
      <view v-if="voiceState === 'error'" class="voice-status">
        <text class="voice-status-text error">{{ voiceError }}</text>
      </view>

      <!-- 文本输入框（idle 状态展开输入） -->
      <view v-if="voiceState === 'idle' && showTextInput" class="voice-text-input-wrap">
        <input
          class="voice-text-input"
          v-model="textInputValue"
          placeholder="输入行程需求，如：去外滩和豫园一天游"
          confirm-type="send"
          @confirm="onTextInputConfirm"
        />
        <view class="voice-text-send" @tap="onTextInputConfirm">
          <text class="voice-text-send-icon">→</text>
        </view>
      </view>

      <!-- 语音按钮 + 键盘切换 -->
      <view class="voice-btn-row">
        <view
          class="voice-btn"
          :class="{ listening: voiceState === 'listening', processing: voiceState === 'processing' || voiceState === 'routing' }"
          @tap="onVoiceTap"
        >
          <AppIcon v-if="voiceState === 'listening'" name="stop" :size="52" />
          <AppIcon v-else-if="voiceState === 'processing' || voiceState === 'routing'" name="loading" :size="52" />
          <AppIcon v-else name="mic" :size="52" />
          <text class="voice-btn-label">
            {{ voiceState === 'listening' ? '点击停止' : (voiceState === 'processing' || voiceState === 'routing') ? '规划中' : '语音规划' }}
          </text>
        </view>
        <!-- 切换文字输入 -->
        <view v-if="voiceState === 'idle'" class="voice-keyboard-btn" @tap="showTextInput = !showTextInput">
          <text class="voice-keyboard-icon">{{ showTextInput ? '🎤' : '⌨️' }}</text>
        </view>
      </view>
      </view> <!-- voice-area end -->
    </view> <!-- bottom-stack end -->
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePoiStore } from '../../stores/poi'
import { useUserStore } from '../../stores/user'
import { useRouteStore } from '../../stores/route'
import { DEFAULT_CENTER, DEFAULT_SCALE, isInShanghai, SHANGHAI_RECOMMENDED_POIS, DEV_MOCK_LOCATION, toHttpsImage } from '../../utils/amap-config'
import { planMultiSegmentRoute, amapTransitPlans, TRAVEL_MODES } from '../../utils/amap-api'
import type { TravelMode, TransitPlan } from '../../utils/amap-api'
import { routeApi } from '../../api/route'
import { poiApi } from '../../api/poi'
import type { POI } from '../../stores/poi'
import AppIcon from '../../components/AppIcon.vue'
import { systemInfo, initSystemInfo } from '../../utils/system-info'

const poiStore = usePoiStore()
const routeStore = useRouteStore()
const userStore = useUserStore()
const { t } = useI18n()

// 地图状态
const mapCenter = ref({ latitude: DEFAULT_CENTER.latitude, longitude: DEFAULT_CENTER.longitude })
const mapScale = ref(DEFAULT_SCALE)
const outOfShanghai = ref(false)
const selectedPoi = ref<POI | null>(null)

// 面板状态
const panelOpen = ref(false)
const showHeatmap = ref(false)
const showRoute = ref(true)
const selectedCategory = ref('all')
const darkMode = ref(false)

// 面板拖动
const BTN_SIZE = 36  // 按钮半径 px，超出边缘时最多露出这么多
const panelX = ref(20)
const panelY = ref(80 + 44)
const isHidden = ref(false)   // 是否处于"躲边缘"状态
const peekSide = ref('')      // 'left' | 'right' | 'top' | 'bottom'
const isSnapping = ref(false) // 吸附动画中
let dragStartX = 0
let dragStartY = 0
let panelStartX = 0
let panelStartY = 0
let isDragging = false
let dragMoved = false
// 初始化系统信息并获取屏幕尺寸
initSystemInfo()
const SCREEN_W = systemInfo.windowWidth
const SCREEN_H = systemInfo.windowHeight

function onPanelTouchStart(e: any) {
  const touch = e.touches[0]
  dragStartX = touch.clientX
  dragStartY = touch.clientY
  panelStartX = panelX.value
  panelStartY = panelY.value
  isDragging = true
  dragMoved = false
  isSnapping.value = false
}

function onPanelTouchMove(e: any) {
  if (!isDragging) return
  const touch = e.touches[0]
  const dx = touch.clientX - dragStartX
  const dy = touch.clientY - dragStartY
  if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragMoved = true
  // 允许拖出屏幕，但最多超出 BTN_SIZE（露出一半）
  panelX.value = Math.min(Math.max(-BTN_SIZE, panelStartX + dx), SCREEN_W - BTN_SIZE)
  panelY.value = Math.min(Math.max(-BTN_SIZE, panelStartY + dy), SCREEN_H - BTN_SIZE)
}

function onPanelTouchEnd() {
  isDragging = false
  if (!dragMoved) return
  // 松手后检测是否超出边缘，吸附到边缘
  const snapMargin = BTN_SIZE  // 距边缘多少 px 内触发吸附
  let snapped = false
  isSnapping.value = true

  if (panelX.value < snapMargin) {
    // 吸附左边，露出一半
    panelX.value = -BTN_SIZE / 2
    peekSide.value = 'left'
    snapped = true
  } else if (panelX.value > SCREEN_W - BTN_SIZE * 2 - snapMargin) {
    // 吸附右边
    panelX.value = SCREEN_W - BTN_SIZE * 3 / 2
    peekSide.value = 'right'
    snapped = true
  } else if (panelY.value < snapMargin) {
    // 吸附顶部
    panelY.value = -BTN_SIZE / 2
    peekSide.value = 'top'
    snapped = true
  } else if (panelY.value > SCREEN_H - BTN_SIZE * 2 - snapMargin) {
    // 吸附底部
    panelY.value = SCREEN_H - BTN_SIZE * 3 / 2
    peekSide.value = 'bottom'
    snapped = true
  }

  isHidden.value = snapped
  if (!snapped) {
    peekSide.value = ''
    setTimeout(() => { isSnapping.value = false }, 400)
  } else {
    // 关闭展开的面板内容
    panelOpen.value = false
    setTimeout(() => { isSnapping.value = false }, 400)
  }
}

function onPanelToggleTap() {
  if (dragMoved) { dragMoved = false; return }
  // 如果是隐藏状态，点击弹回屏幕内
  if (isHidden.value) {
    isSnapping.value = true
    isHidden.value = false
    peekSide.value = ''
    panelX.value = Math.min(Math.max(20, panelX.value), SCREEN_W - BTN_SIZE * 2 - 20)
    panelY.value = Math.min(Math.max(20, panelY.value), SCREEN_H - BTN_SIZE * 2 - 20)
    setTimeout(() => { isSnapping.value = false }, 400)
    return
  }
  panelOpen.value = !panelOpen.value
}

// 语音状态
type VoiceState = 'idle' | 'listening' | 'processing' | 'routing' | 'error'
const voiceState = ref<VoiceState>('idle')
const voiceTranscript = ref('')
const voiceError = ref('')
const processingLabel = ref('AI解析中...')
const showTextInput = ref(false)
const textInputValue = ref('')

function onTextInputConfirm() {
  const text = textInputValue.value.trim()
  if (!text) return
  textInputValue.value = ''
  showTextInput.value = false
  processVoiceInput(text)
}
let recognition: any = null

// 路线规划结果
interface PlanDayItem {
  poi: POI
  stayTime?: number
  reason?: string
  segmentMode?: TravelMode
  transitPlanIndex?: number  // transit 模式下选择的方案序号
}
interface PlanDay {
  day: number
  description?: string
  items: PlanDayItem[]
  polylinePath: Array<{ latitude: number; longitude: number }>  // 当天路径
}
interface PlanResult {
  title: string
  description: string
  pois: POI[]
  schedule: PlanDay[]
}
const planResult = ref<PlanResult | null>(null)
const showVoiceResult = ref(false)
const activeDay = ref(1)
const travelMode = ref<TravelMode>('walking')
const resultCollapsed = ref(false)
const showCollapsedTooltip = ref(false)
// 路线模式：激活时禁止高德附近搜索和 POI 缓存
const isRouteMode = ref(false)

// ===== 导航状态 =====
const isNavigating = ref(false)
const currentNavDayIdx = ref(0)
const currentNavItemIdx = ref(0)
const userLocation = ref({ latitude: 31.2304, longitude: 121.4737 })
const autoFollow = ref(false)
let locationChangeHandler: ((res: any) => void) | null = null

function startLocationTracking() {
  if (locationChangeHandler) return
  uni.startLocationUpdate({ type: 'gcj02' }).catch(() => {})
  locationChangeHandler = (res: any) => {
    userLocation.value = { latitude: res.latitude, longitude: res.longitude }
    if (autoFollow.value && Number.isFinite(res.latitude) && Number.isFinite(res.longitude)) {
      mapCenter.value = { latitude: res.latitude, longitude: res.longitude }
      const mapCtx = uni.createMapContext('tourism-map')
      mapCtx.moveToLocation({ latitude: res.latitude, longitude: res.longitude, fail: () => {} })
    }
  }
  uni.onLocationChange(locationChangeHandler)
}

function stopLocationTracking() {
  if (locationChangeHandler) {
    uni.offLocationChange(locationChangeHandler)
    locationChangeHandler = null
  }
  autoFollow.value = false
}

let tooltipTimer: any = null

function hideTooltipDelay() {
  clearTimeout(tooltipTimer)
  tooltipTimer = setTimeout(() => { showCollapsedTooltip.value = false }, 1500)
}

// 已保存路线选择面板
const showRouteSelector = ref(false)
const savedRoutes = ref<any[]>([])

// transit 方案选择面板
const showTransitPlans = ref(false)
const transitPlans = ref<TransitPlan[]>([])
const transitPlanLoading = ref(false)
// 当前正在选方案的段信息
let pendingTransitDayIdx = -1
let pendingTransitItemIdx = -1

// ============================================
// 热力图画布
// ============================================
const canvasWidth = ref(375)
const canvasHeight = ref(600)
const heatmapCtx = ref<UniApp.CanvasContext | null>(null)
const heatmapData = ref<Array<{ latitude: number; longitude: number; weight: number }>>([])

// 监听热力图开关，加载数据并绘制
watch(showHeatmap, async (val) => {
  if (val) {
    await loadHeatmapData()
    await nextTick()
    initHeatmapCanvas()
    drawHeatmap()
  }
})

// 监听地图视野变化，重新绘制热力图
watch(mapCenter, () => {
  if (showHeatmap.value) {
    drawHeatmap()
  }
})

watch(mapScale, () => {
  if (showHeatmap.value) {
    drawHeatmap()
  }
})

async function loadHeatmapData() {
  try {
    const res = await poiApi.heatmap({
      latitude: mapCenter.value.latitude,
      longitude: mapCenter.value.longitude,
      radius: 5000
    })
    heatmapData.value = res
  } catch {
    heatmapData.value = []
  }
}

function initHeatmapCanvas() {
  canvasWidth.value = systemInfo.windowWidth
  canvasHeight.value = systemInfo.windowHeight
  const ctx = uni.createCanvasContext('heatmap-canvas')
  heatmapCtx.value = ctx
}

function drawHeatmap() {
  const ctx = heatmapCtx.value
  if (!ctx) return

  // 清除画布
  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

  if (heatmapData.value.length === 0) return

  // 使用高德坐标转换（地图组件内置 GCJ-02）
  // 获取地图上下文用于坐标转换
  const mapCtx = uni.createMapContext('tourism-map')

  // 简单方式：基于当前地图视野推算像素坐标
  // mapScale: 每级 zoom 约 2倍视野，scale 范围约 4-18
  const zoom = mapScale.value
  // 每像素对应的经纬度（近似）
  const metersPerPixel = 156543.03392 * Math.cos(mapCenter.value.latitude * Math.PI / 180) / Math.pow(2, zoom)
  const lngPerPixel = metersPerPixel / 111320
  const latPerPixel = metersPerPixel / 110540

  // 计算地图区域（屏幕坐标转经纬度需要用 MapContext.pixelToCoord，真机支持）
  // 这里用近似法：中心点 + scale 估算视野范围
  const spanLng = canvasWidth.value * lngPerPixel
  const spanLat = canvasHeight.value * latPerPixel

  const minLng = mapCenter.value.longitude - spanLng / 2
  const maxLat = mapCenter.value.latitude + spanLat / 2

  for (const point of heatmapData.value) {
    // 判断点是否在屏幕视野内
    if (point.longitude < minLng || point.longitude > minLng + spanLng) continue
    if (point.latitude < maxLat - spanLat || point.latitude > maxLat) continue

    // 经纬度 → 屏幕像素
    const px = (point.longitude - minLng) / spanLng * canvasWidth.value
    const py = (maxLat - point.latitude) / spanLat * canvasHeight.value

    // 半径随缩放级别动态调整（米→像素）
    const radiusMeters = 500  // 每个热力点的影响半径 500m
    const radiusPx = Math.max(20, radiusMeters / metersPerPixel)

    // 绘制渐变圆（从中心往外透明度递减）
    const gradient = ctx.createCircularGradient(px, py, radiusPx)
    const alpha = Math.min(0.8, point.weight * 2 + 0.2)
    gradient.addColorStop(0, `rgba(255, 80, 80, ${alpha})`)
    gradient.addColorStop(0.4, `rgba(255, 180, 50, ${alpha * 0.7})`)
    gradient.addColorStop(1, `rgba(255, 255, 100, 0)`)

    ctx.beginPath()
    ctx.arc(px, py, radiusPx, 0, 2 * Math.PI)
    ctx.setFillStyle(gradient)
    ctx.fill()
  }

  ctx.draw()
}

// 彩蛋：连续点击标题3次触发随机漫游
const showEasterEgg = ref(false)
let titleTapCount = 0
let titleTapTimer: any = null

function onTitleTap() {
  titleTapCount++
  clearTimeout(titleTapTimer)
  titleTapTimer = setTimeout(() => { titleTapCount = 0 }, 800)
  if (titleTapCount >= 3) {
    titleTapCount = 0
    triggerRandomWander()
  }
}

async function triggerRandomWander() {
  const pool = nearbyList.value.length >= 3 ? nearbyList.value : (poiStore.nearbyList.length >= 3 ? poiStore.nearbyList : [])
  if (pool.length < 2) {
    uni.showToast({ title: '附近景点不足，无法随机漫游', icon: 'none' })
    return
  }
  // 随机抽 3 个（或全部）
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const picked = shuffled.slice(0, Math.min(3, shuffled.length))

  showEasterEgg.value = true
  setTimeout(() => { showEasterEgg.value = false }, 2000)

  const items: PlanDayItem[] = picked.map(poi => ({ poi, stayTime: 1 }))
  const daySchedule: PlanDay[] = [{ day: 1, description: '随机探索，惊喜不断', items, polylinePath: [] }]
  const builtSchedule = await buildDayPolylines(daySchedule)
  planResult.value = {
    title: '🎲 随机漫游',
    description: `${picked.length}个随机景点`,
    pois: picked,
    schedule: builtSchedule
  }
  activeDay.value = 1
  showVoiceResult.value = true
  isRouteMode.value = true
  resultCollapsed.value = false
  selectedPoi.value = null
  fitMapToPois(picked)
}

const currentDayPois = computed(() => {
  if (!planResult.value) return []
  const day = planResult.value.schedule.find(d => d.day === activeDay.value)
  return day?.items ?? []
})

const activeDayIndex = computed(() => {
  if (!planResult.value) return 0
  return planResult.value.schedule.findIndex(d => d.day === activeDay.value)
})

const activeDayMode = computed<TravelMode>(() => {
  if (!planResult.value) return travelMode.value
  const day = planResult.value.schedule.find(d => d.day === activeDay.value)
  if (!day || day.items.length === 0) return travelMode.value
  // 取该天第一个有 segmentMode 的段，否则用全局默认
  const first = day.items.find(i => i.segmentMode)
  return first?.segmentMode ?? travelMode.value
})

const activeDayColor = computed(() => getDayColor(activeDayIndex.value))

const currentDayDesc = computed(() => {
  if (!planResult.value) return ''
  return planResult.value.schedule.find(d => d.day === activeDay.value)?.description ?? ''
})

// POI类别配置
const poiCategories = [
  { key: 'all', icon: 'cat-all', name: '全部', types: '110000|140000|141200|141300' },
  { key: 'scenic', icon: 'cat-scenic', name: '景点', types: '110000' },
  { key: 'museum', icon: 'cat-museum', name: '博物馆', types: '141200' },
  { key: 'park', icon: 'cat-park', name: '公园', types: '140000' },
  { key: 'food', icon: 'cat-food', name: '美食', types: '050000' },
  { key: 'shopping', icon: 'cat-shopping', name: '购物', types: '060000' },
]

const POI_ICON = 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png'
const ROUTE_POI_ICON = 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png'

const nearbyList = computed(() => poiStore.nearbyList)

// 普通POI标记：有路线时隐藏
const nearbyMarkers = computed(() => {
  if (showVoiceResult.value) return []  // 路线模式下不显示附近红色 marker
  return nearbyList.value.map((poi, idx) => ({
    id: idx,
    latitude: poi.latitude,
    longitude: poi.longitude,
    title: poi.name,
    iconPath: POI_ICON,
    width: 28,
    height: 36,
    anchor: { x: 0.5, y: 1 },
    callout: { content: poi.name, color: '#333', fontSize: 11, borderRadius: 4, bgColor: '#fff', padding: 4, display: 'BYCLICK' }
  }))
})

// 每天对应的颜色
const DAY_COLORS = ['#1890FF', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2']

function getDayColor(dayIdx: number) {
  return DAY_COLORS[dayIdx % DAY_COLORS.length]
}

// 路线规划POI标记（按天分色，序号从每天第1个开始）
const routeMarkers = computed(() => {
  if (!showVoiceResult.value || !planResult.value) return []
  const markers: any[] = []
  planResult.value.schedule.forEach((day, dayIdx) => {
    const color = getDayColor(dayIdx)
    day.items.forEach((item, idx) => {
      markers.push({
        id: 10000 + dayIdx * 100 + idx,
        latitude: item.poi.latitude,
        longitude: item.poi.longitude,
        title: item.poi.name,
        iconPath: ROUTE_POI_ICON,
        width: 36,
        height: 46,
        anchor: { x: 0.5, y: 1 },
        label: { content: `${idx + 1}`, color: '#fff', fontSize: 14, anchorX: 0, anchorY: 0, bgColor: color, padding: 4, borderRadius: 4 },
        callout: { content: `第${day.day}天 ${idx + 1}. ${item.poi.name}`, color: color, fontSize: 12, borderRadius: 4, bgColor: '#fff', padding: 4, display: 'ALWAYS' }
      })
    })
  })
  return markers
})

const allMarkers = computed(() => [...nearbyMarkers.value, ...routeMarkers.value])

// 路线折线（每天一条，不同颜色）
const routePolyline = computed(() => {
  if (!showRoute.value || !showVoiceResult.value || !planResult.value) return []
  return planResult.value.schedule
    .filter(day => day.polylinePath && day.polylinePath.length >= 2)
    .map((day, dayIdx) => ({
      points: day.polylinePath,
      color: getDayColor(dayIdx),
      width: 6,
      dottedLine: false,
      arrowLine: true,
      arrowIconPath: '',
      borderColor: '#fff',
      borderWidth: 2
    }))
})

function formatDist(dist?: number) {
  if (!dist) return ''
  return dist >= 1000 ? `${(dist / 1000).toFixed(1)}km` : `${dist}m`
}

async function loadNearby(lat: number, lng: number) {
  if (isRouteMode.value) return // 路线模式下不刷新附近景点
  try {
    const res = await poiApi.nearby({
      latitude: lat,
      longitude: lng,
      radius: 5000,
      pageSize: 50,
      category: selectedCategory.value === 'all' ? undefined : selectedCategory.value
    })
    poiStore.setNearbyList(res.list)
  } catch {
    uni.showToast({ title: '加载附近景点失败', icon: 'none' })
  }
}

function doGetLocation() {
  if (DEV_MOCK_LOCATION) {
    const { latitude, longitude } = DEV_MOCK_LOCATION
    outOfShanghai.value = false
    mapCenter.value = { latitude, longitude }
    moveMapTo(latitude, longitude)
    loadNearby(latitude, longitude)
    return
  }
  uni.getLocation({
    type: 'gcj02',
    success: (res) => {
      if (isInShanghai(res.latitude, res.longitude)) {
        outOfShanghai.value = false
        mapCenter.value = { latitude: res.latitude, longitude: res.longitude }
        moveMapTo(res.latitude, res.longitude)
        loadNearby(res.latitude, res.longitude)
      } else {
        outOfShanghai.value = true
        mapCenter.value = { latitude: DEFAULT_CENTER.latitude, longitude: DEFAULT_CENTER.longitude }
        moveMapTo(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude)
        poiStore.setNearbyList(SHANGHAI_RECOMMENDED_POIS as any)
      }
    },
    fail: () => uni.showToast({ title: '定位失败', icon: 'none' })
  })
}

function moveMapTo(latitude: number, longitude: number) {
  mapCenter.value = { latitude, longitude }
  // 真机上额外调用 moveToLocation 触发平移动画
  const mapCtx = uni.createMapContext('tourism-map')
  mapCtx.moveToLocation({
    latitude,
    longitude,
    fail: () => {} // 开发者工具不支持时静默忽略
  })
}

function locateMe() {
  if (DEV_MOCK_LOCATION) { doGetLocation(); return }
  uni.getSetting({
    success: (res) => {
      if (res.authSetting['scope.userLocation']) {
        doGetLocation()
      } else if (res.authSetting['scope.userLocation'] === false) {
        uni.showModal({
          title: '位置权限', content: '需要获取您的位置，请在设置中开启位置权限',
          confirmText: '去设置', success: (m) => { if (m.confirm) uni.openSetting({}) }
        })
      } else {
        uni.authorize({ scope: 'scope.userLocation', success: () => doGetLocation(), fail: () => {} })
      }
    }
  })
}

function toggleHeatmap() { showHeatmap.value = !showHeatmap.value }
function toggleRouteDisplay() { showRoute.value = !showRoute.value }

function selectCategory(key: string) {
  selectedCategory.value = key
  loadNearby(mapCenter.value.latitude, mapCenter.value.longitude)
}

function onMarkerTap(e: { markerId: number }) {
  const id = e.markerId
  if (id >= 10000) {
    // 路线POI：id = 10000 + dayIdx*100 + itemIdx
    const offset = id - 10000
    const dayIdx = Math.floor(offset / 100)
    const itemIdx = offset % 100
    const poi = planResult.value?.schedule[dayIdx]?.items[itemIdx]?.poi
    if (poi) selectedPoi.value = poi
  } else {
    const poi = nearbyList.value[id]
    if (poi) selectedPoi.value = poi
  }
}

function onRegionChange(e: { type: string; detail?: { centerLocation?: { latitude: number; longitude: number } } }) {
  if (e.type === 'end' && e.detail?.centerLocation) {
    const { latitude, longitude } = e.detail.centerLocation
    if (!isInShanghai(latitude, longitude)) {
      mapCenter.value = { latitude: DEFAULT_CENTER.latitude, longitude: DEFAULT_CENTER.longitude }
      uni.showToast({ title: '已回到上海范围', icon: 'none', duration: 1500 })
      return
    }
    loadNearby(latitude, longitude)
  }
}

function goPoi(id: string) {
  const poi = nearbyList.value.find(p => p.id === id)
    || planResult.value?.pois.find(p => p.id === id)
  if (poi) {
    console.log('[Map] goPoi 传递 POI 数据:', JSON.stringify(poi))
    poiStore.setCurrentPoi(poi)
  }
  uni.navigateTo({ url: `/pages/poi/detail?id=${id}` })
}

// ===== 语音识别 =====
// 同声传译插件实例（小程序环境，全局唯一）
let siManager: any = null
let isSIRecording = false

function getSIManager() {
  if (siManager) return siManager
  try {
    const plugin = (globalThis as any).requirePlugin?.('WechatSI')
    if (plugin) {
      siManager = plugin.getRecordRecognitionManager()
      console.log('[Voice] 同声传译插件加载成功')
    }
  } catch (e) {
    console.warn('[Voice] 同声传译插件不可用:', e)
  }
  return siManager
}

function onVoiceTap() {
  if (voiceState.value === 'listening') {
    stopListening()
  } else if (voiceState.value === 'idle' || voiceState.value === 'error') {
    startListening()
  }
}

function startListening() {
  voiceTranscript.value = ''
  voiceError.value = ''
  voiceState.value = 'listening'

  // 优先尝试同声传译插件（小程序真机）
  const mgr = getSIManager()
  if (mgr) {
    mgr.onRecognize = (res: any) => {
      // 实时识别中间结果
      voiceTranscript.value = res.result
      console.log('[Voice] 实时识别:', res.result)
    }
    mgr.onStop = (res: any) => {
      isSIRecording = false
      const text = res.result || voiceTranscript.value
      console.log('[Voice] 同声传译最终结果:', text)
      if (text) {
        processVoiceInput(text)
      } else {
        // 开发者工具下识别结果为空（工具限制），提示用文字输入
        voiceState.value = 'idle'
        showTextInput.value = true
        uni.showToast({ title: '开发者工具不支持语音识别，请用文字输入', icon: 'none', duration: 3000 })
      }
    }
    mgr.onError = (res: any) => {
      isSIRecording = false
      console.error('[Voice] 同声传译错误:', res)
      voiceState.value = 'error'
      voiceError.value = '语音识别失败，请重试'
      setTimeout(() => { voiceState.value = 'idle' }, 2500)
    }
    isSIRecording = true
    mgr.start({ lang: 'zh_CN' })
    return
  }

  // 降级：WebSpeech API（H5/开发者工具）
  try {
    const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition
    if (SpeechRecognition) {
      recognition = new SpeechRecognition()
      recognition.lang = 'zh-CN'
      recognition.continuous = false
      recognition.interimResults = true
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('')
        voiceTranscript.value = transcript
        console.log('[Voice] WebSpeech 实时:', transcript)
        if (event.results[event.results.length - 1].isFinal) {
          console.log('[Voice] WebSpeech 最终结果:', transcript)
          stopListening(transcript)
        }
      }
      recognition.onerror = (event: any) => {
        console.error('[Voice] WebSpeech 错误:', event.error)
        voiceState.value = 'error'
        voiceError.value = event.error === 'not-allowed' ? '请允许麦克风权限' : '语音识别失败，请重试'
        setTimeout(() => { voiceState.value = 'idle' }, 2500)
      }
      recognition.onend = () => {
        if (voiceState.value === 'listening') {
          if (voiceTranscript.value) processVoiceInput(voiceTranscript.value)
          else voiceState.value = 'idle'
        }
      }
      recognition.start()
      return
    }
  } catch (e) {
    console.warn('[Voice] WebSpeech 不可用:', e)
  }

  // 两种方式都不可用
  voiceState.value = 'error'
  voiceError.value = '当前环境不支持语音识别，请使用文字输入'
  setTimeout(() => { voiceState.value = 'idle' }, 2500)
}

function stopListening(transcript?: string) {
  const mgr = getSIManager()
  if (mgr) {
    // 防止重复 stop（-30011 错误）
    if (!isSIRecording) return
    isSIRecording = false
    voiceState.value = 'processing'
    processingLabel.value = 'AI解析中...'
    try { mgr.stop() } catch {}
    // 结果由 onStop 回调处理，这里不再调 processVoiceInput
    return
  }
  if (recognition) {
    try { recognition.stop() } catch {}
  }
  const text = transcript || voiceTranscript.value
  if (text) {
    processVoiceInput(text)
  } else {
    voiceState.value = 'idle'
  }
}

async function processVoiceInput(text: string) {
  voiceState.value = 'processing'
  processingLabel.value = 'AI解析中...'
  voiceTranscript.value = text
  try {
    const route = await routeApi.generate({
      prompt: text,
      tags: [],
      startLatitude: mapCenter.value.latitude,
      startLongitude: mapCenter.value.longitude
    })
    routeStore.setCurrentRoute(route)

    // 将路线 schedule 转换为地图展示格式
    const allPois: POI[] = []
    const planSchedule: PlanDay[] = route.schedule.map(day => {
      const items: PlanDayItem[] = day.pois.map(poi => ({ poi, stayTime: 2 }))
      allPois.push(...day.pois)
      return { day: day.day, description: day.description, items, polylinePath: [] }
    })

    // 第二阶段：路径规划
    processingLabel.value = '路径规划中...'
    const builtSchedule = await buildDayPolylines(planSchedule)

    planResult.value = {
      title: route.title,
      description: `${route.days}天 · ${allPois.length}个景点`,
      pois: allPois,
      schedule: builtSchedule
    }
    activeDay.value = 1
    showVoiceResult.value = true
    isRouteMode.value = true
    resultCollapsed.value = false
    selectedPoi.value = null

    if (allPois.length > 0) {
      fitMapToPois(allPois)
    }
    voiceState.value = 'idle'
  } catch {
    voiceState.value = 'error'
    voiceError.value = 'AI规划失败，请重试'
    setTimeout(() => { voiceState.value = 'idle' }, 2500)
  }
}

/** 为每天的 items 规划路径，返回带 polylinePath 的 PlanDay[] */
async function buildDayPolylines(schedule: PlanDay[]): Promise<PlanDay[]> {
  return Promise.all(schedule.map(async (day) => {
    const pois = day.items.map(i => i.poi)
    if (pois.length < 2) return { ...day, polylinePath: pois.map(p => ({ latitude: p.latitude, longitude: p.longitude })) }
    // 每天内部各段并行请求（高德 QPS 限制由 enqueueRoute 单例队列兜底）
    const segmentPromises = pois.slice(0, -1).map((poi, i) => {
      const mode = day.items[i].segmentMode ?? travelMode.value
      return planMultiSegmentRoute([poi, pois[i + 1]], mode, day.items[i].transitPlanIndex ?? 0)
    })
    const results = await Promise.all(segmentPromises)
    // 拼接各段：第一段全保留，后续段去重第一个点
    const paths = results.flatMap((seg, i) => (i === 0 ? seg : seg.slice(1)))
    return { ...day, polylinePath: paths }
  }))
}

function onStartNav() {
  if (!planResult.value) return
  // 将 map 上的规划结果同步到 routeStore.currentRoute，供 navigate.vue 使用
  const currentRoute = routeStore.currentRoute
  if (currentRoute) {
    // AI 生成的路线 id 为 ai_，导航页会直接从 store 读取
    const allPois = planResult.value.pois
    const schedule = planResult.value.schedule.map((day, dayIdx) => ({
      day: day.day,
      pois: day.items.map(item => ({
        ...item.poi,
        id: item.poi.id || item.poi.poiId,
        poiId: item.poi.poiId || item.poi.id,
        name: item.poi.name,
        latitude: item.poi.latitude,
        longitude: item.poi.longitude,
        images: item.poi.images || ['/static/logo.png'],
        address: item.poi.address || '',
        rating: item.poi.rating || 4.5,
        category: item.poi.category || '',
        tags: item.poi.tags || [],
      })),
      description: day.description
    }))
    routeStore.setCurrentRoute({
      ...currentRoute,
      title: planResult.value.title,
      schedule,
      days: schedule.length,
      totalPoi: allPois.length,
      poiCount: allPois.length
    })
  }
  const routeId = currentRoute ? String(currentRoute.id) : 'ai_map_route'
  uni.navigateTo({ url: `/pages/route/navigate?id=${routeId}&tmp=${currentRoute?.id?.toString().startsWith('ai_') ? '1' : '0'}` })
}

function clearPlanResult() {
  planResult.value = null
  showVoiceResult.value = false
  isRouteMode.value = false
  voiceTranscript.value = ''
}

/** 根据 POI 列表自动缩放地图到合适视野 */
function fitMapToPois(pois: Array<{ latitude: number; longitude: number }>) {
  if (pois.length === 0) return
  if (pois.length === 1) {
    mapCenter.value = { latitude: pois[0].latitude, longitude: pois[0].longitude }
    mapScale.value = 15
    return
  }
  const lats = pois.map(p => p.latitude)
  const lngs = pois.map(p => p.longitude)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  // 中心点
  mapCenter.value = { latitude: (minLat + maxLat) / 2, longitude: (minLng + maxLng) / 2 }
  // 根据跨度估算缩放级别
  const span = Math.max(maxLat - minLat, maxLng - minLng)
  if (span < 0.01) mapScale.value = 15
  else if (span < 0.03) mapScale.value = 14
  else if (span < 0.08) mapScale.value = 13
  else if (span < 0.2) mapScale.value = 12
  else mapScale.value = 11
  // 用 includePoints API 精确适配（真机支持）
  try {
    const mapCtx = uni.createMapContext('tourism-map')
    mapCtx.includePoints({
      points: pois.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
      padding: [80, 40, 280, 40]  // 上右下左，下方留给底部卡片
    })
  } catch {}
}

async function switchMode(mode: TravelMode) {
  travelMode.value = mode
  if (!planResult.value) return
  if (mode === 'transit') {
    // transit 全天模式：逐段拉方案（取第0个方案）
    const dayIdx = activeDayIndex.value
    const schedule = planResult.value.schedule.map((day, di) => {
      if (di !== dayIdx) return day
      const items = day.items.map(item => ({ ...item, segmentMode: mode as TravelMode, transitPlanIndex: 0 }))
      return { ...day, items, polylinePath: [] as Array<{ latitude: number; longitude: number }> }
    })
    try {
      const updatedDay = await buildDayPolylines([schedule[dayIdx]])
      schedule[dayIdx] = updatedDay[0]
      planResult.value = { ...planResult.value, schedule }
    } catch {
      uni.showToast({ title: '路径规划失败', icon: 'none' })
    }
    return
  }
  const dayIdx = activeDayIndex.value
  const schedule = planResult.value.schedule.map((day, di) => {
    if (di !== dayIdx) return day
    const items = day.items.map(item => ({ ...item, segmentMode: mode as TravelMode }))
    return { ...day, items, polylinePath: [] as Array<{ latitude: number; longitude: number }> }
  })
  try {
    const updatedDay = await buildDayPolylines([schedule[dayIdx]])
    schedule[dayIdx] = updatedDay[0]
    planResult.value = { ...planResult.value, schedule }
  } catch {
    uni.showToast({ title: '路径规划失败', icon: 'none' })
  }
}

/** 修改某段的交通方式并重新规划该天路径 */
async function setSegmentMode(dayIdx: number, itemIdx: number, mode: TravelMode) {
  if (!planResult.value) return
  // transit 模式：先拉取所有方案让用户选
  if (mode === 'transit') {
    const day = planResult.value.schedule[dayIdx]
    const poi1 = day.items[itemIdx].poi
    const poi2 = day.items[itemIdx + 1]?.poi
    if (!poi2) return
    pendingTransitDayIdx = dayIdx
    pendingTransitItemIdx = itemIdx
    transitPlanLoading.value = true
    showTransitPlans.value = true
    transitPlans.value = []
    try {
      const plans = await amapTransitPlans({
        origin: `${poi1.longitude},${poi1.latitude}`,
        destination: `${poi2.longitude},${poi2.latitude}`,
      })
      transitPlans.value = plans
    } catch {
      uni.showToast({ title: '获取公交方案失败', icon: 'none' })
      showTransitPlans.value = false
    } finally {
      transitPlanLoading.value = false
    }
    return
  }
  applySegmentMode(dayIdx, itemIdx, mode, 0)
}

async function selectTransitPlan(plan: TransitPlan) {
  showTransitPlans.value = false
  await applySegmentMode(pendingTransitDayIdx, pendingTransitItemIdx, 'transit', plan.index)
}

async function applySegmentMode(dayIdx: number, itemIdx: number, mode: TravelMode, transitPlanIndex: number) {
  if (!planResult.value) return
  const schedule = planResult.value.schedule.map((day, di) => {
    if (di !== dayIdx) return day
    const items = day.items.map((item, ii) =>
      ii === itemIdx ? { ...item, segmentMode: mode, transitPlanIndex } : item
    )
    return { ...day, items, polylinePath: [] as Array<{ latitude: number; longitude: number }> }
  })
  const updatedDay = await buildDayPolylines([schedule[dayIdx]])
  schedule[dayIdx] = updatedDay[0]
  planResult.value = { ...planResult.value, schedule }
}

async function saveRoute() {
  if (!planResult.value) {
    uni.showToast({ title: '请先生成路线', icon: 'none' })
    return
  }
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => uni.switchTab({ url: '/pages/home/index' }), 1500)
    return
  }
  try {
    // 从 planResult（规划结果）构造完整保存对象
    // pois 存每天的 poi id 列表，days/stayTime 来自规划结果
    const allDays = planResult.value.schedule
    // 后端 poiList 格式: { poiId, dayNum, stayTime }
    // poiId 来自 AI 路线回填的 poiId（数据库主键），用于 /detail 回查
    const poiList = allDays.flatMap(day =>
      day.items.map(item => ({
        poiId: item.poi.poiId,
        dayNum: day.day,
        stayTime: item.stayTime || 2
      }))
    )
    const savePayload = {
      name: planResult.value.title?.trim() || planResult.value.description?.trim() || '我的路线',
      days: allDays.length,
      pois: poiList,
      tags: planResult.value.pois.flatMap((p: POI) => p.tags || []).filter(Boolean),
      description: planResult.value.description,
      coverImage: planResult.value.pois[0]?.images?.[0] || ''
    }
    await routeApi.save(savePayload as any)
    uni.showToast({ title: '路线已保存', icon: 'success' })
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

async function openRouteSelector() {
  showRouteSelector.value = true
  panelOpen.value = false
  try {
    const res = await routeApi.my()
    savedRoutes.value = res.list || []
  } catch {
    savedRoutes.value = []
  }
}

async function loadSavedRoute(route: any) {
  showRouteSelector.value = false
  routeStore.setCurrentRoute(route)

  // /my 只返回列表摘要，/detail 才返回完整的 schedule+POI详情
  let fullRoute: any
  try {
    fullRoute = await routeApi.detail(String(route.id))
  } catch {
    uni.showToast({ title: '加载路线失败', icon: 'none' })
    return
  }

  const allPois: POI[] = []
  const planSchedule: PlanDay[] = (fullRoute.schedule || []).map((day: any) => {
    const items: PlanDayItem[] = (day.pois || []).map((poi: any) => {
      const normalized = {
        id: poi.id || '',
        poiId: poi.poiId || poi.id || 0,
        name: poi.name || '',
        category: poi.category || '',
        description: poi.description || '',
        images: ((poi.images || []).length > 0 ? poi.images : ['/static/logo.png']).map((img: string) => toHttpsImage(img)),
        latitude: Number(poi.latitude) || 0,
        longitude: Number(poi.longitude) || 0,
        address: poi.address || '',
        openTime: '',
        ticketPrice: 0,
        phone: '',
        rating: Number(poi.rating) || 4.5,
        commentCount: 0,
        tags: poi.tags || []
      } as POI
      return { poi: normalized, stayTime: poi.stayTime || 2 }
    })
    allPois.push(...(day.pois || []).map((p: any) => ({
      id: p.id || '',
      poiId: p.poiId || p.id || 0,
      name: p.name || '',
      category: p.category || '',
      description: '',
      images: ((p.images || []).length > 0 ? p.images : ['/static/logo.png']).map((img: string) => toHttpsImage(img)),
      latitude: Number(p.latitude) || 0,
      longitude: Number(p.longitude) || 0,
      address: p.address || '',
      openTime: '',
      ticketPrice: 0,
      phone: '',
      rating: Number(p.rating) || 4.5,
      commentCount: 0,
      tags: p.tags || []
    } as POI)))
    return { day: day.day, description: day.description || '', items, polylinePath: [] }
  })

  const builtSchedule = await buildDayPolylines(planSchedule)

  // 副标题用「天 + 景点数」：数据库里 description 可能存成错误的「X天 · 0个景点」，不能优先用它
  const dayCount = Number(fullRoute.days) || planSchedule.length || 1
  const poiTotal =
    allPois.length ||
    Number(fullRoute.poiCount) ||
    Number(fullRoute.totalPoi) ||
    0

  planResult.value = {
    title: fullRoute.title || fullRoute.name || '我的路线',
    description: `${dayCount}天 · ${poiTotal}个景点`,
    pois: allPois,
    schedule: builtSchedule
  }
  activeDay.value = 1
  showVoiceResult.value = true
  isRouteMode.value = true
  resultCollapsed.value = false
  selectedPoi.value = null
  if (allPois.length > 0) fitMapToPois(allPois)
}

onMounted(() => locateMe())
onUnmounted(() => {
  if (recognition) try { recognition.abort() } catch {}
  if (isSIRecording) {
    const mgr = getSIManager()
    if (mgr) try { mgr.stop() } catch {}
    isSIRecording = false
  }
})
</script>

<style scoped>
.map-page {
  position: relative;
  height: 100vh;
  overflow: hidden;
}

.amap {
  width: 100%;
  height: 100%;
}

/* 热力图画布层 */
.heatmap-canvas {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 5;
  pointer-events: none;
}

/* ===== 可拖动悬浮面板 ===== */
.float-panel {
  position: absolute;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
  touch-action: none;
}

.panel-toggle {
  width: 72rpx;
  height: 72rpx;
  background: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.18);
  font-size: 32rpx;
  transition: transform 0.2s, box-shadow 0.2s;
}

/* 猫咪躲边缘状态 */
.panel-toggle.hidden {
  background: linear-gradient(135deg, #fff9e6, #fff3cd);
  box-shadow: 0 4rpx 20rpx rgba(255,180,0,0.35);
  animation: peek-bounce 2s ease-in-out infinite;
  font-size: 38rpx;
}

.panel-toggle.peek-left {
  border-radius: 0 50% 50% 0;
  transform-origin: left center;
}
.panel-toggle.peek-right {
  border-radius: 50% 0 0 50%;
  transform-origin: right center;
}
.panel-toggle.peek-top {
  border-radius: 0 0 50% 50%;
  transform-origin: center top;
}
.panel-toggle.peek-bottom {
  border-radius: 50% 50% 0 0;
  transform-origin: center bottom;
}

@keyframes peek-bounce {
  0%, 100% { transform: scale(1) rotate(0deg); }
  20%       { transform: scale(1.15) rotate(-8deg); }
  40%       { transform: scale(1.1) rotate(6deg); }
  60%       { transform: scale(1.12) rotate(-4deg); }
  80%       { transform: scale(1.05) rotate(2deg); }
}

.panel-content {
  margin-top: 12rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx 0;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.15);
  min-width: 200rpx;
}

.panel-section {
  padding: 16rpx 24rpx;
}

.panel-label {
  display: block;
  font-size: 24rpx;
  color: #555;
  margin-bottom: 14rpx;
  font-weight: 500;
}

.panel-label-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 14rpx;
}

.panel-divider {
  height: 1rpx;
  background: #f0f0f0;
  margin: 4rpx 0;
}

/* 开关 */
.switch-row {
  display: flex;
  justify-content: flex-end;
}

.switch-track {
  width: 80rpx;
  height: 44rpx;
  border-radius: 22rpx;
  background: #d9d9d9;
  position: relative;
  transition: background 0.2s;
}

.switch-track.on {
  background: #1890FF;
}

.switch-thumb {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.2);
  transition: left 0.2s;
}

.switch-track.on .switch-thumb {
  left: 40rpx;
}

/* POI类别列表 */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.cat-item {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 16rpx;
  border-radius: 12rpx;
  background: #f5f7fa;
}

.cat-item.active {
  background: #e6f4ff;
}

.cat-icon { font-size: 26rpx; }

.cat-name {
  font-size: 24rpx;
  color: #555;
}

.cat-item.active .cat-name {
  color: #1890FF;
  font-weight: 500;
}

/* ===== POI卡片（底部滑入） ===== */
.poi-card {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  overflow: hidden;
  box-shadow: 0 -8rpx 40rpx rgba(0,0,0,0.18);
  z-index: 25;
  animation: slide-up 0.32s cubic-bezier(.34,1.2,.64,1) both;
}

@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0.6; }
  to   { transform: translateY(0);    opacity: 1; }
}

.poi-card-close {
  position: absolute;
  top: 20rpx;
  right: 24rpx;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}

.poi-card-close-icon {
  font-size: 36rpx;
  color: #fff;
  line-height: 1;
  margin-top: -2rpx;
}

.poi-card-img {
  width: 100%;
  height: 280rpx;
  display: block;
}

.poi-card-body {
  padding: 28rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
}

.poi-card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.poi-card-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
  flex: 1;
  margin-right: 16rpx;
}

.poi-card-rating {
  display: flex;
  align-items: center;
  gap: 4rpx;
  background: #fff8e1;
  border-radius: 20rpx;
  padding: 6rpx 16rpx;
}

.poi-card-star {
  font-size: 24rpx;
  color: #faad14;
}

.poi-card-score {
  font-size: 26rpx;
  font-weight: 600;
  color: #fa8c16;
}

.poi-card-addr {
  font-size: 24rpx;
  color: #888;
  display: block;
  margin-bottom: 16rpx;
  line-height: 1.5;
}

.poi-card-tags {
  display: flex;
  gap: 12rpx;
  margin-bottom: 28rpx;
  flex-wrap: wrap;
}

.poi-card-tag {
  font-size: 22rpx;
  color: #1890FF;
  background: #e6f4ff;
  border-radius: 20rpx;
  padding: 6rpx 18rpx;
}

.poi-card-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  background: linear-gradient(135deg, #1890FF, #36cfc9);
  border-radius: 48rpx;
  height: 88rpx;
}

.poi-card-btn-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #fff;
}

.poi-card-btn-arrow {
  font-size: 30rpx;
  color: rgba(255,255,255,0.85);
}

/* ===== 底部堆叠容器：路线卡片 + 语音区域，从下往上自然排列 ===== */
.bottom-stack {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  z-index: 15;
  pointer-events: none;
}

/* ===== 路线收起悬浮小方块 ===== */
.route-collapsed-fab {
  position: absolute;
  right: 24rpx;
  bottom: 200rpx;
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  z-index: 16;
  animation: fab-pop 0.3s cubic-bezier(.34,1.56,.64,1) both;
}

@keyframes fab-pop {
  from { transform: scale(0.4); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

.route-collapsed-fab-icon {
  font-size: 40rpx;
}

.collapsed-tooltip {
  position: absolute;
  bottom: 96rpx;
  right: 0;
  background: rgba(0,0,0,0.75);
  border-radius: 12rpx;
  padding: 10rpx 20rpx;
  white-space: nowrap;
  animation: tooltip-fade 0.2s ease both;
}

@keyframes tooltip-fade {
  from { opacity: 0; transform: translateY(6rpx); }
  to   { opacity: 1; transform: translateY(0); }
}

.collapsed-tooltip-text {
  font-size: 24rpx;
  color: #fff;
}

/* ===== 路线规划结果面板 ===== */
.route-result-panel {
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 8rpx 24rpx calc(32rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -8rpx 40rpx rgba(0,0,0,0.18);
  pointer-events: auto;
  animation: panel-slide-up 0.38s cubic-bezier(.34,1.2,.64,1) both;
}

@keyframes panel-slide-up {
  from { transform: translateY(100%); opacity: 0.5; }
  to   { transform: translateY(0);    opacity: 1; }
}

/* 拖拽指示条 */
.drag-handle {
  width: 64rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: #e0e0e0;
  margin: 0 auto 16rpx;
}

.result-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14rpx;
}

.result-title-block {
  flex: 1;
  margin-right: 16rpx;
}

.result-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
  display: block;
}

.result-subtitle {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-top: 4rpx;
}

.result-actions {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.result-action-btn {
  font-size: 24rpx;
  color: #1890FF;
  padding: 8rpx 20rpx;
  border: 1.5rpx solid #1890FF;
  border-radius: 24rpx;
  font-weight: 500;
}

.result-collapse-btn {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.2s;
}

.result-collapse-btn:active {
  background: #e6f4ff;
  transform: scale(0.9);
}

.result-collapse-icon {
  font-size: 22rpx;
  color: #888;
}

.result-close {
  font-size: 32rpx;
  color: #bbb;
  padding: 4rpx 8rpx;
}

/* 天数 Tab + 出行方式工具栏 */
.result-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 14rpx;
  gap: 12rpx;
}

.day-tabs {
  flex: 1;
  white-space: nowrap;
}

.day-tab {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  justify-content: center;
  padding: 8rpx 28rpx;
  margin-right: 12rpx;
  border-radius: 30rpx;
  background: #f5f7fa;
  transition: background 0.2s, transform 0.15s;
}

.day-tab:active {
  transform: scale(0.95);
}

.day-tab.active {
  box-shadow: 0 4rpx 12rpx rgba(24,144,255,0.35);
}

.day-tab-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.day-tab.active .day-tab-dot {
  background: rgba(255,255,255,0.8) !important;
}

.day-tab-text {
  font-size: 24rpx;
  color: #555;
}

.day-tab.active .day-tab-text {
  color: #fff;
  font-weight: 600;
}

/* 段间交通方式选择器 */
.segment-mode-picker {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  margin-right: 8rpx;
  vertical-align: middle;
}

.seg-mode-btn {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: #f0f0f0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.1s;
}

.seg-mode-btn:active {
  transform: scale(0.88);
}

.seg-mode-btn.active {
  background: #1890FF;
}

.seg-mode-icon {
  font-size: 20rpx;
}

.seg-arrow {
  font-size: 22rpx;
  color: #ccc;
  margin-left: 2rpx;
}

/* 出行方式切换 */
.travel-modes {
  display: flex;
  gap: 8rpx;
  flex-shrink: 0;
}

.travel-mode-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
}

.travel-mode-btn:active {
  transform: scale(0.9);
}

.travel-mode-btn.active {
  background: linear-gradient(135deg, #e6f4ff, #d0eaff);
  box-shadow: 0 0 0 2.5rpx #1890FF;
}

.mode-icon {
  font-size: 30rpx;
}

/* POI 列表 */
.result-pois {
  white-space: nowrap;
  margin-bottom: 10rpx;
}

.result-poi-item {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  margin-right: 14rpx;
  padding: 10rpx 20rpx;
  background: linear-gradient(135deg, #f0f7ff, #e8f4ff);
  border-radius: 40rpx;
  border: 1rpx solid rgba(24,144,255,0.15);
  transition: transform 0.15s, box-shadow 0.15s;
}

.result-poi-item:active {
  transform: scale(0.95);
  box-shadow: 0 4rpx 12rpx rgba(24,144,255,0.2);
}

.poi-seq {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #1890FF, #36cfc9);
  color: #fff;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-weight: 600;
}

.poi-item-info {
  display: flex;
  flex-direction: column;
}

.poi-item-name {
  font-size: 24rpx;
  color: #333;
  font-weight: 500;
}

.poi-item-stay {
  font-size: 20rpx;
  color: #1890FF;
}

.result-day-desc {
  font-size: 22rpx;
  color: #aaa;
  display: block;
  padding: 4rpx 0 2rpx;
}

/* ===== 彩蛋 Toast ===== */
.easter-egg-toast {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #722ed1, #eb2f96);
  border-radius: 48rpx;
  padding: 16rpx 36rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  box-shadow: 0 8rpx 32rpx rgba(114,46,209,0.45);
  animation: egg-pop 0.4s cubic-bezier(.34,1.56,.64,1) both;
  pointer-events: none;
  z-index: 5;
  margin-bottom: 16rpx;
}

@keyframes egg-pop {
  from { transform: translateX(-50%) scale(0.5); opacity: 0; }
  to   { transform: translateX(-50%) scale(1);   opacity: 1; }
}

.easter-egg-icon {
  font-size: 36rpx;
}

.easter-egg-text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 600;
}

/* ===== 附近提示 ===== */
.nearby-tip {
  position: absolute;
  bottom: 220rpx;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.6);
  color: #fff;
  font-size: 24rpx;
  padding: 10rpx 24rpx;
  border-radius: 40rpx;
  z-index: 10;
  white-space: nowrap;
}

.out-of-shanghai-tip {
  position: absolute;
  top: calc(100rpx + var(--status-bar-height));
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 87, 34, 0.9);
  color: #fff;
  font-size: 22rpx;
  padding: 8rpx 20rpx;
  border-radius: 40rpx;
  z-index: 10;
  white-space: nowrap;
  display: flex;
  align-items: center;
}

/* ===== 语音按钮区域 ===== */
.voice-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: calc(16rpx + env(safe-area-inset-bottom)) 0 calc(24rpx + env(safe-area-inset-bottom));
  pointer-events: none;
  background: transparent;
}

/* 声波扩散动画（识别中） */
.voice-wave-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  pointer-events: none;
}

.wave-rings {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wave-ring {
  position: absolute;
  border-radius: 50%;
  border: 4rpx solid rgba(24, 144, 255, 0.6);
  animation: ring-expand 2s ease-out infinite;
}

.r1 { width: 120rpx; height: 120rpx; animation-delay: 0s; }
.r2 { width: 120rpx; height: 120rpx; animation-delay: 0.6s; }
.r3 { width: 120rpx; height: 120rpx; animation-delay: 1.2s; }

@keyframes ring-expand {
  0%   { transform: scale(1);   opacity: 0.8; }
  100% { transform: scale(2.8); opacity: 0; }
}

/* AI 思考中 processing 动画 */
.voice-processing-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  background: rgba(0,0,0,0.72);
  border-radius: 16rpx;
  padding: 16rpx 32rpx;
  pointer-events: none;
}

.processing-dots {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #faad14;
  animation: dot-bounce 1.2s ease-in-out infinite;
}

.d1 { animation-delay: 0s; }
.d2 { animation-delay: 0.2s; }
.d3 { animation-delay: 0.4s; }

@keyframes dot-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40%            { transform: translateY(-12rpx); opacity: 1; }
}

.processing-label {
  font-size: 24rpx;
  color: #faad14;
  font-weight: 500;
}

/* 错误状态 */
.voice-status {
  background: rgba(0,0,0,0.72);
  border-radius: 16rpx;
  padding: 12rpx 24rpx;
  pointer-events: none;
}

.voice-status-text {
  font-size: 24rpx;
  color: #fff;
}

.voice-status-text.error { color: #ff4d4f; }

.voice-transcript {
  font-size: 22rpx;
  color: rgba(255,255,255,0.75);
  max-width: 500rpx;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.voice-btn {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: #1890FF;
  box-shadow: 0 6rpx 24rpx rgba(24,144,255,0.5);
  justify-content: center;
  transition: all 0.2s;
}

.voice-btn.listening {
  background: #ff4d4f;
  box-shadow: 0 6rpx 24rpx rgba(255,77,79,0.5);
  animation: pulse 1.2s infinite;
}

.voice-btn.processing {
  background: #faad14;
  box-shadow: 0 6rpx 24rpx rgba(250,173,20,0.5);
}

.voice-btn-label {
  font-size: 18rpx;
  color: #fff;
  font-weight: 500;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 6rpx 24rpx rgba(255,77,79,0.5); }
  50% { transform: scale(1.08); box-shadow: 0 8rpx 32rpx rgba(255,77,79,0.7); }
}

/* 语音按钮行（按钮 + 键盘切换） */
.voice-btn-row {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  pointer-events: auto;
}

.voice-keyboard-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(255,255,255,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.15);
  margin-bottom: 24rpx;
}

.voice-keyboard-icon {
  font-size: 34rpx;
}

/* 文字输入框 */
.voice-text-input-wrap {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.96);
  border-radius: 48rpx;
  padding: 12rpx 12rpx 12rpx 28rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.15);
  width: 560rpx;
  pointer-events: auto;
}

.voice-text-input {
  flex: 1;
  font-size: 26rpx;
  color: #333;
  height: 56rpx;
  line-height: 56rpx;
}

.voice-text-send {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #1890FF;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.voice-text-send-icon {
  font-size: 30rpx;
  color: #fff;
  font-weight: 700;
}

/* ===== 面板选择路线按钮 ===== */
.panel-section--btn {
  cursor: pointer;
  justify-content: space-between;
  align-items: center;
  display: flex;
}

.panel-arrow {
  font-size: 36rpx;
  color: #bbb;
  line-height: 1;
}

/* ===== 路线选择器悬浮面板 ===== */
.route-selector-mask {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 30;
  display: flex;
  align-items: flex-end;
}

.route-selector-panel {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx 0 calc(24rpx + env(safe-area-inset-bottom));
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.route-selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.route-selector-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.route-selector-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}

.route-selector-list {
  flex: 1;
  overflow: hidden;
}

.route-selector-empty {
  padding: 60rpx 0;
  text-align: center;
  color: #bbb;
  font-size: 26rpx;
}

.route-selector-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.route-selector-item:active {
  background: #f5f7fa;
}

.route-selector-info {
  flex: 1;
}

.route-selector-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
  display: block;
  margin-bottom: 6rpx;
}

.route-selector-meta {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}

.route-selector-pois {
  display: flex;
  flex-wrap: wrap;
  gap: 6rpx;
}

.route-selector-poi-tag {
  font-size: 22rpx;
  color: #1890FF;
  background: #e6f4ff;
  border-radius: 20rpx;
  padding: 4rpx 14rpx;
}

.route-selector-arrow {
  font-size: 36rpx;
  color: #bbb;
  margin-left: 16rpx;
}

/* ===== 换乘方案面板 ===== */
.transit-plans-panel {
  max-height: 80vh;
}

.transit-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
}

.transit-loading-text {
  color: #999;
  font-size: 24rpx;
  margin-top: 16rpx;
}

.transit-plan-item {
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
  transition: background 0.15s;
}

.transit-plan-item:active {
  background: #f5f7fa;
}

.transit-plan-header {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.transit-plan-badge {
  border-radius: 8rpx;
  padding: 4rpx 14rpx;
  flex-shrink: 0;
}

.badge-best {
  background: linear-gradient(135deg, #1890FF, #36cfc9);
}

.badge-alt {
  background: #f0f0f0;
}

.transit-plan-badge-text {
  font-size: 20rpx;
  font-weight: 600;
  color: #fff;
}

.badge-alt .transit-plan-badge-text {
  color: #888;
}

.transit-plan-stats {
  display: flex;
  align-items: center;
  gap: 8rpx;
  flex: 1;
}

.transit-plan-dur {
  font-size: 30rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.transit-plan-dot-sep {
  font-size: 24rpx;
  color: #ccc;
}

.transit-plan-walk-dist {
  font-size: 22rpx;
  color: #999;
}

.transit-plan-cost {
  font-size: 22rpx;
  color: #fa8c16;
  font-weight: 500;
}

/* 换乘流程图 */
.transit-plan-flow {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
}

.transit-flow-seg {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background: #f5f7fa;
  border-radius: 12rpx;
  padding: 8rpx 14rpx;
  max-width: 280rpx;
}

.transit-flow-seg.seg-subway {
  background: #e6f4ff;
}

.transit-flow-seg.seg-bus {
  background: #f6ffed;
}

.transit-flow-seg.seg-walking {
  background: #fafafa;
}

.transit-flow-icon-wrap {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-subway { background: rgba(24,144,255,0.12); }
.icon-bus    { background: rgba(82,196,26,0.12); }
.icon-walking { background: rgba(0,0,0,0.04); }

.transit-flow-icon {
  font-size: 22rpx;
}

.transit-flow-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.transit-flow-name {
  font-size: 22rpx;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.transit-flow-stops {
  font-size: 18rpx;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.transit-flow-arrow {
  font-size: 28rpx;
  color: #ccc;
  flex-shrink: 0;
}
</style>
