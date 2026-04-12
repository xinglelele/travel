<template>
  <div class="heatmap-container" :class="{ 'fullscreen-mode': isFullscreen }">
    <!-- 筛选条件栏 -->
    <div class="filter-bar">
      <el-form inline :model="filterForm" size="small">
        <el-form-item label="时间范围">
          <el-select v-model="filterForm.period" @change="handlePeriodChange" style="width: 120px">
            <el-option label="今日" value="today" />
            <el-option label="近7天" value="7d" />
            <el-option label="近30天" value="30d" />
            <el-option label="近90天" value="90d" />
            <el-option label="自定义" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="filterForm.period === 'custom'" label="开始日期">
          <el-date-picker
            v-model="filterForm.startDate"
            type="date"
            placeholder="选择开始日期"
            value-format="YYYY-MM-DD"
            style="width: 140px"
            @change="fetchData"
          />
        </el-form-item>
        <el-form-item v-if="filterForm.period === 'custom'" label="结束日期">
          <el-date-picker
            v-model="filterForm.endDate"
            type="date"
            placeholder="选择结束日期"
            value-format="YYYY-MM-DD"
            style="width: 140px"
            @change="fetchData"
          />
        </el-form-item>
        <el-form-item label="分析维度">
          <el-select v-model="filterForm.dimension" @change="handleDimensionChange" style="width: 120px">
            <el-option label="全部" value="all" />
            <el-option label="按小时" value="hour" />
            <el-option label="按星期" value="week" />
            <el-option label="按月份" value="month" />
            <el-option label="按年份" value="year" />
            <el-option label="按日" value="day" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="filterForm.dimension !== 'all'" label="具体值">
          <el-select
            v-model="filterForm.dimensionValue"
            placeholder="请选择"
            style="width: 140px"
            @change="fetchData"
            clearable
          >
            <el-option
              v-for="item in dimensionOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="显示模式">
          <el-radio-group v-model="filterForm.layerType" @change="handleLayerTypeChange">
            <el-radio-button value="heatmap">热力图</el-radio-button>
            <el-radio-button value="marker">散点图</el-radio-button>
            <el-radio-button value="overlay">叠加图</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchData">刷新</el-button>
          <el-button @click="toggleCompareMode">
            {{ compareMode ? '退出对比' : '对比热力' }}
          </el-button>
          <el-button @click="exportData">导出</el-button>
          <el-button @click="toggleFullscreen">
            {{ isFullscreen ? '退出全屏' : '全屏' }}
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 对比面板 -->
    <div v-if="compareMode" class="compare-panel">
      <el-card shadow="never">
        <template #header>
          <span>对比热力配置</span>
        </template>
        <el-form inline :model="compareForm" size="small">
          <el-form-item label="第一组">
            <el-select v-model="compareForm.dimensionA" @change="handleCompareDimensionChange" style="width: 100px">
              <el-option label="按星期" value="week" />
              <el-option label="按小时" value="hour" />
              <el-option label="按月份" value="month" />
            </el-select>
            <el-select
              v-model="compareForm.valueA"
              placeholder="选择"
              style="width: 100px; margin-left: 8px"
              @change="handleCompareChange"
              clearable
            >
              <el-option
                v-for="item in compareDimensionOptionsA"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="第二组">
            <el-select v-model="compareForm.dimensionB" @change="handleCompareDimensionChangeB" style="width: 100px">
              <el-option label="按星期" value="week" />
              <el-option label="按小时" value="hour" />
              <el-option label="按月份" value="month" />
            </el-select>
            <el-select
              v-model="compareForm.valueB"
              placeholder="选择"
              style="width: 100px; margin-left: 8px"
              @change="handleCompareChange"
              clearable
            >
              <el-option
                v-for="item in compareDimensionOptionsB"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="叠加模式">
            <el-select v-model="compareForm.overlayMode" style="width: 100px">
              <el-option label="分屏对比" value="split" />
              <el-option label="颜色叠加" value="color" />
              <el-option label="差异热力" value="diff" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="fetchCompareData">开始对比</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 主内容区（全屏时 fixed 只套在外层容器，避免挡住顶部「退出全屏」按钮） -->
    <div class="main-content">
      <!-- 地图区域 -->
      <div class="map-wrapper">
        <div ref="mapContainerRef" class="map-container"></div>
        <div v-if="mapLoading" class="map-loading">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span>地图加载中...</span>
        </div>
        <div v-if="!mapLoaded && !mapLoading" class="map-error">
          <el-icon><WarningFilled /></el-icon>
          <span>{{ mapError || '地图加载失败' }}</span>
          <el-button type="primary" size="small" @click="initMap">重新加载</el-button>
        </div>
      </div>

      <!-- 右侧信息栏 -->
      <div class="side-panel">
        <!-- 维度分布 -->
        <el-card class="dimension-card" shadow="never">
          <template #header>
            <span>{{ dimensionTitle }}</span>
          </template>
          <div v-if="dimensionLoading" class="loading-placeholder">
            <el-icon class="is-loading"><Loading /></el-icon>
          </div>
          <div v-else-if="dimensionData.length === 0" class="empty-placeholder">
            暂无数据
          </div>
          <div v-else class="dimension-list">
            <div
              v-for="(item, index) in dimensionData"
              :key="item.value"
              class="dimension-item"
              @click="handleDimensionSelect(item.value)"
              :class="{ active: filterForm.dimensionValue === item.value }"
            >
              <span class="dimension-rank">{{ index + 1 }}</span>
              <span class="dimension-label">{{ item.label }}</span>
              <div class="dimension-bar-wrapper">
                <div
                  class="dimension-bar"
                  :style="{ width: (item.count / maxDimensionCount * 100) + '%' }"
                ></div>
              </div>
              <span class="dimension-count">{{ formatNumber(item.count) }}</span>
            </div>
          </div>
        </el-card>

        <!-- 行政区排行 -->
        <el-card class="district-card" shadow="never">
          <template #header>
            <span>各区打卡排行</span>
          </template>
          <div v-if="districtLoading" class="loading-placeholder">
            <el-icon class="is-loading"><Loading /></el-icon>
          </div>
          <div v-else-if="districtData.length === 0" class="empty-placeholder">
            暂无数据
          </div>
          <div v-else class="district-list">
            <div class="district-summary">
              <span>累计打卡</span>
              <strong>{{ formatNumber(overallCheckCount) }}</strong>
            </div>
            <div
              v-for="(item, index) in districtData"
              :key="item.districtId"
              class="district-item"
              @click="handleDistrictSelect(item)"
              :class="{ active: selectedDistrict?.districtId === item.districtId }"
            >
              <span class="district-rank">{{ index + 1 }}</span>
              <span class="district-name">{{ item.districtName }}</span>
              <span class="district-count">{{ formatNumber(item.count) }}</span>
              <span class="district-percent">{{ item.percentage }}%</span>
            </div>
          </div>
        </el-card>

        <!-- 对比结果表 -->
        <el-card v-if="compareMode && compareResult.length > 0" class="compare-card" shadow="never">
          <template #header>
            <span>对比分析</span>
          </template>
          <el-table :data="compareResult" size="small" max-height="300">
            <el-table-column prop="poiName" label="景点" min-width="100" show-overflow-tooltip />
            <el-table-column :prop="compareForm.valueA ? 'countA' : 'countB'" label="第一组" width="70" align="right" />
            <el-table-column :prop="compareForm.valueA ? 'countB' : 'countA'" label="第二组" width="70" align="right" />
            <el-table-column prop="diff" label="差值" width="70" align="right">
              <template #default="{ row }">
                <span :class="row.diff > 0 ? 'text-success' : row.diff < 0 ? 'text-danger' : ''">
                  {{ row.diff > 0 ? '+' : '' }}{{ row.diff }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="changeRate" label="涨跌幅" width="80" align="right">
              <template #default="{ row }">
                <span :class="row.changeRate > 0 ? 'text-success' : row.changeRate < 0 ? 'text-danger' : ''">
                  {{ row.changeRate > 0 ? '+' : '' }}{{ row.changeRate }}%
                </span>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </div>
    </div>

    <!-- POI 详情弹窗 -->
    <el-dialog
      v-model="poiDialogVisible"
      title="景点详情"
      width="400px"
      :close-on-click-modal="false"
    >
      <div v-if="currentPoi" class="poi-detail">
        <h3>{{ currentPoi.poiName }}</h3>
        <div class="poi-info-grid">
          <div class="info-item">
            <span class="label">打卡次数</span>
            <span class="value">{{ formatNumber(currentPoi.checkCount) }}</span>
          </div>
          <div class="info-item">
            <span class="label">评分</span>
            <span class="value">{{ currentPoi.rating || '暂无' }}</span>
          </div>
          <div class="info-item">
            <span class="label">行政区</span>
            <span class="value">{{ currentPoi.district }}</span>
          </div>
          <div class="info-item">
            <span class="label">经纬度</span>
            <span class="value">{{ currentPoi.lng?.toFixed(4) }}, {{ currentPoi.lat?.toFixed(4) }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="goToPoiDetail">查看景点详情</el-button>
        <el-button @click="poiDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, WarningFilled } from '@element-plus/icons-vue'
import {
  getCheckHeatmap,
  getCheckHeatmapDimensions,
  getCheckHeatmapDistrict,
  getCheckHeatmapCompare
} from '@/api/modules/government'

// 类型定义
interface PoiItem {
  poiId: number
  poiName: string
  lng: number
  lat: number
  checkCount: number
  rating: number
  district: string
}

interface DimensionItem {
  value: number | string
  label: string
  count: number
}

interface DistrictItem {
  districtId: number
  districtName: string
  count: number
  poiCount: number
  percentage: number
}

// 状态
const mapContainerRef = ref<HTMLElement>()
const mapLoading = ref(false)
const mapLoaded = ref(false)
const mapError = ref('')
const dimensionLoading = ref(false)
const districtLoading = ref(false)
const isFullscreen = ref(false)
const compareMode = ref(false)
const poiDialogVisible = ref(false)
const currentPoi = ref<PoiItem | null>(null)

// 地图实例（高德 JS API 2.0 热力图插件类名为 AMap.HeatMap，旧名 AMap.Heatmap 已废弃）
let mapInstance: any = null
let heatmapLayer: any = null
let markers: any[] = []

// 表单数据
const filterForm = reactive({
  period: '30d',
  startDate: '',
  endDate: '',
  dimension: 'all',
  dimensionValue: undefined as number | undefined,
  layerType: 'heatmap'
})

const compareForm = reactive({
  dimensionA: 'week',
  dimensionB: 'week',
  valueA: undefined as number | undefined,
  valueB: undefined as number | undefined,
  overlayMode: 'split'
})

// 数据
const dimensionData = ref<DimensionItem[]>([])
const districtData = ref<DistrictItem[]>([])
const compareResult = ref<any[]>([])
const overallCheckCount = ref(0)
const heatmapData = ref<PoiItem[]>([])

// 计算属性
const dimensionTitle = computed(() => {
  const titles: Record<string, string> = {
    all: '维度分布（全部）',
    hour: '小时分布',
    week: '星期分布',
    month: '月份分布',
    year: '年份分布',
    day: '日期分布'
  }
  return titles[filterForm.dimension] || '维度分布'
})

const maxDimensionCount = computed(() => {
  if (dimensionData.value.length === 0) return 1
  return Math.max(...dimensionData.value.map(d => d.count))
})

// 维度选项
const dimensionOptions = computed(() => {
  const dim = filterForm.dimension
  if (dim === 'hour') {
    return Array.from({ length: 24 }, (_, i) => ({ value: i, label: `${i}点` }))
  }
  if (dim === 'week') {
    return [
      { value: 1, label: '周一' },
      { value: 2, label: '周二' },
      { value: 3, label: '周三' },
      { value: 4, label: '周四' },
      { value: 5, label: '周五' },
      { value: 6, label: '周六' },
      { value: 7, label: '周日' }
    ]
  }
  if (dim === 'month') {
    return Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}月` }))
  }
  if (dim === 'year') {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 5 }, (_, i) => ({ value: currentYear - i, label: `${currentYear - i}年` }))
  }
  if (dim === 'day') {
    return Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `${i + 1}日` }))
  }
  return []
})

const compareDimensionOptionsA = computed(() => {
  if (compareForm.dimensionA === 'week') {
    return [
      { value: 1, label: '周一' },
      { value: 2, label: '周二' },
      { value: 3, label: '周三' },
      { value: 4, label: '周四' },
      { value: 5, label: '周五' },
      { value: 6, label: '周六' },
      { value: 7, label: '周日' }
    ]
  }
  if (compareForm.dimensionA === 'hour') {
    return Array.from({ length: 24 }, (_, i) => ({ value: i, label: `${i}点` }))
  }
  if (compareForm.dimensionA === 'month') {
    return Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}月` }))
  }
  return []
})

const compareDimensionOptionsB = computed(() => {
  if (compareForm.dimensionB === 'week') {
    return [
      { value: 1, label: '周一' },
      { value: 2, label: '周二' },
      { value: 3, label: '周三' },
      { value: 4, label: '周四' },
      { value: 5, label: '周五' },
      { value: 6, label: '周六' },
      { value: 7, label: '周日' }
    ]
  }
  if (compareForm.dimensionB === 'hour') {
    return Array.from({ length: 24 }, (_, i) => ({ value: i, label: `${i}点` }))
  }
  if (compareForm.dimensionB === 'month') {
    return Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}月` }))
  }
  return []
})

const selectedDistrict = ref<DistrictItem | null>(null)

// 工具函数
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString()
}

function applyAmapSecurityConfig() {
  const code = import.meta.env.VITE_AMAP_SECURITY_JS_CODE as string | undefined
  if (code) {
    ;(window as any)._AMapSecurityConfig = { securityJsCode: code }
  }
}

function buildAmapScriptUrl(amapKey: string): string {
  const plugins = 'AMap.HeatMap,AMap.Marker,AMap.InfoWindow'
  return `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(amapKey)}&plugin=${plugins}`
}

/** 异步加载热力图插件并创建实例（JS API 2.0 必须用 AMap.HeatMap + plugin） */
function createHeatMapLayer(map: any): Promise<any> {
  const AMap = (window as any).AMap
  return new Promise((resolve, reject) => {
    if (!AMap?.plugin) {
      reject(new Error('AMap.plugin 不可用'))
      return
    }
    AMap.plugin(['AMap.HeatMap'], () => {
      const HeatMapCtor = AMap.HeatMap
      if (typeof HeatMapCtor !== 'function') {
        reject(new Error('AMap.HeatMap 插件未加载成功，请检查 Key 类型是否为「Web端(JS API)」'))
        return
      }
      try {
        const layer = new HeatMapCtor(map, {
          radius: 30,
          opacity: [0.4, 0.8],
          gradient: {
            0.2: '#2c7bb6',
            0.4: '#abd9e9',
            0.6: '#ffffbf',
            0.8: '#fdae61',
            1.0: '#d7191c'
          }
        })
        resolve(layer)
      } catch (e) {
        reject(e)
      }
    })
  })
}

// 初始化地图
async function initMap() {
  if (!mapContainerRef.value) return

  mapLoading.value = true
  mapError.value = ''

  try {
    const amapKey = (import.meta.env.VITE_AMAP_KEY as string) || ''
    if (!amapKey || amapKey === 'YOUR_AMAP_KEY') {
      mapError.value = '请配置 VITE_AMAP_KEY（高德控制台「Web端(JS API)」Key）'
      return
    }

    applyAmapSecurityConfig()

    if (!(window as any).AMap) {
      await loadScript(buildAmapScriptUrl(amapKey))
    }

    await waitForAMap()

    const AMap = (window as any).AMap
    mapInstance = new AMap.Map(mapContainerRef.value, {
      zoom: 11,
      center: [121.4737, 31.2305],
      mapStyle: 'amap://styles/normal'
    })

    heatmapLayer = await createHeatMapLayer(mapInstance)

    mapLoaded.value = true

    await fetchData()
    await fetchDimensionData()
    await fetchDistrictData()
  } catch (error: any) {
    console.error('地图初始化失败:', error)
    mapError.value =
      (error?.message || '地图加载失败') +
      '。若控制台为 USERKEY_PLAT_NOMATCH：请在「应用管理」中为该 Key 勾选「Web端(JS API)」，Referer 白名单加入 localhost 与当前域名；并配置 VITE_AMAP_SECURITY_JS_CODE。'
  } finally {
    mapLoading.value = false
  }
}

// 加载外部脚本
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('脚本加载失败'))
    document.head.appendChild(script)
  })
}

// 等待 AMap 就绪
function waitForAMap(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).AMap && (window as any).AMap.Map) {
      resolve()
      return
    }
    const interval = setInterval(() => {
      if ((window as any).AMap && (window as any).AMap.Map) {
        clearInterval(interval)
        resolve()
      }
    }, 100)
    setTimeout(() => {
      clearInterval(interval)
      resolve()
    }, 10000)
  })
}

function setHeatmapVisible(visible: boolean) {
  if (!heatmapLayer) return
  if (typeof heatmapLayer.show === 'function' && typeof heatmapLayer.hide === 'function') {
    visible ? heatmapLayer.show() : heatmapLayer.hide()
  } else if (typeof heatmapLayer.setMap === 'function') {
    heatmapLayer.setMap(visible ? mapInstance : null)
  }
}

function applyHeatmapData(data: PoiItem[]) {
  if (!heatmapLayer) return
  const points = data.map(item => ({
    lng: item.lng,
    lat: item.lat,
    count: item.checkCount
  }))
  const max = data.length ? Math.max(...data.map(d => d.checkCount), 1) : 1
  if (typeof heatmapLayer.setDataSet === 'function') {
    heatmapLayer.setDataSet({ data: points, max })
  } else if (typeof heatmapLayer.setData === 'function') {
    heatmapLayer.setData(points)
    if (typeof heatmapLayer.setOptions === 'function') {
      heatmapLayer.setOptions({ max })
    }
  }
}

// 渲染热力图
function renderHeatmap(data: PoiItem[]) {
  if (!mapInstance || !heatmapLayer) return

  markers.forEach(m => {
    try {
      mapInstance.remove?.(m)
    } catch {
      m.setMap?.(null)
    }
  })
  markers = []

  applyHeatmapData(data)

  if (filterForm.layerType === 'heatmap') {
    setHeatmapVisible(true)
  } else if (filterForm.layerType === 'marker') {
    setHeatmapVisible(false)
    renderMarkers(data)
  } else {
    setHeatmapVisible(true)
    renderMarkers(data)
  }

  if (data.length > 0) {
    mapInstance.setFitView?.()
  }
}

// 渲染标注
function renderMarkers(data: PoiItem[]) {
  if (!mapInstance) return

  data.forEach(item => {
    const marker = new (window as any).AMap.Marker({
      position: [item.lng, item.lat],
      icon: new (window as any).AMap.Icon({
        size: new (window as any).AMap.Size(24, 24),
        image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-default.png',
        imageSize: new (window as any).AMap.Size(24, 24)
      }),
      offset: new (window as any).AMap.Pixel(-12, -24)
    })

    // 点击事件
    marker.on('click', () => {
      currentPoi.value = item
      poiDialogVisible.value = true
    })

    // 悬浮提示
    const infoWindow = new (window as any).AMap.InfoWindow({
      content: `<div style="padding: 8px;">
        <strong>${item.poiName}</strong><br/>
        打卡: ${item.checkCount}次<br/>
        评分: ${item.rating || '暂无'}
      </div>`,
      offset: new (window as any).AMap.Pixel(0, -25)
    })

    marker.on('mouseover', () => {
      infoWindow.open(mapInstance, [item.lng, item.lat])
    })
    marker.on('mouseout', () => {
      infoWindow.close()
    })

    markers.push(marker)
    mapInstance.add(marker)
  })
}

// 获取热力数据
async function fetchData() {
  try {
    const params: any = {
      period: filterForm.period
    }

    if (filterForm.period === 'custom') {
      if (filterForm.startDate) params.startDate = filterForm.startDate
      if (filterForm.endDate) params.endDate = filterForm.endDate
    }

    if (filterForm.dimension !== 'all') {
      params.dimension = filterForm.dimension
      if (filterForm.dimensionValue !== undefined) {
        params.dimensionValue = filterForm.dimensionValue
      }
    }

    const res = await getCheckHeatmap(params)

    if (res.code === 0 && res.data) {
      heatmapData.value = res.data.list || []
      renderHeatmap(heatmapData.value)
    }
  } catch (error) {
    console.error('获取热力数据失败:', error)
  }
}

// 获取维度分布数据
async function fetchDimensionData() {
  if (filterForm.dimension === 'all') {
    dimensionData.value = []
    return
  }

  dimensionLoading.value = true

  try {
    const params: any = {
      period: filterForm.period,
      dimension: filterForm.dimension
    }

    if (filterForm.period === 'custom') {
      if (filterForm.startDate) params.startDate = filterForm.startDate
      if (filterForm.endDate) params.endDate = filterForm.endDate
    }

    const res = await getCheckHeatmapDimensions(params)

    if (res.code === 0 && res.data) {
      dimensionData.value = res.data.distribution || []
    }
  } catch (error) {
    console.error('获取维度数据失败:', error)
  } finally {
    dimensionLoading.value = false
  }
}

// 获取行政区数据
async function fetchDistrictData() {
  districtLoading.value = true

  try {
    const params: any = {
      period: filterForm.period
    }

    if (filterForm.period === 'custom') {
      if (filterForm.startDate) params.startDate = filterForm.startDate
      if (filterForm.endDate) params.endDate = filterForm.endDate
    }

    if (filterForm.dimension !== 'all') {
      params.dimension = filterForm.dimension
      if (filterForm.dimensionValue !== undefined) {
        params.dimensionValue = filterForm.dimensionValue
      }
    }

    const res = await getCheckHeatmapDistrict(params)

    if (res.code === 0 && res.data) {
      districtData.value = res.data.total || []
      overallCheckCount.value = res.data.overallCount || 0
    }
  } catch (error) {
    console.error('获取行政区数据失败:', error)
  } finally {
    districtLoading.value = false
  }
}

// 获取对比数据
async function fetchCompareData() {
  if (compareForm.valueA === undefined || compareForm.valueB === undefined) {
    ElMessage.warning('请选择两组对比值')
    return
  }

  try {
    const res = await getCheckHeatmapCompare({
      dimension: compareForm.dimensionA,
      valueA: compareForm.valueA,
      valueB: compareForm.valueB,
      period: filterForm.period
    })

    if (res.code === 0 && res.data) {
      compareResult.value = res.data.list || []
    }
  } catch (error) {
    console.error('获取对比数据失败:', error)
  }
}

// 事件处理
function handlePeriodChange() {
  if (filterForm.period !== 'custom') {
    filterForm.startDate = ''
    filterForm.endDate = ''
  }
  fetchData()
  fetchDimensionData()
  fetchDistrictData()
}

function handleDimensionChange() {
  filterForm.dimensionValue = undefined
  fetchData()
  fetchDimensionData()
  fetchDistrictData()
}

function handleDimensionSelect(value: number | string) {
  filterForm.dimensionValue = value as number
  fetchData()
}

function handleDistrictSelect(item: DistrictItem) {
  if (selectedDistrict.value?.districtId === item.districtId) {
    selectedDistrict.value = null
  } else {
    selectedDistrict.value = item
  }
}

function handleLayerTypeChange() {
  if (heatmapData.value.length > 0) {
    renderHeatmap(heatmapData.value)
  }
}

function handleCompareDimensionChange() {
  compareForm.valueA = undefined
  handleCompareChange()
}

function handleCompareDimensionChangeB() {
  compareForm.valueB = undefined
  handleCompareChange()
}

function handleCompareChange() {
  compareResult.value = []
}

function toggleCompareMode() {
  compareMode.value = !compareMode.value
  if (!compareMode.value) {
    compareResult.value = []
  }
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  nextTick(() => {
    mapInstance?.resize()
  })
}

function onFullscreenKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false
    nextTick(() => mapInstance?.resize())
  }
}

function goToPoiDetail() {
  if (currentPoi.value) {
    window.open(`/gov/poi/${currentPoi.value.poiId}/edit`, '_blank')
  }
  poiDialogVisible.value = false
}

function exportData() {
  if (heatmapData.value.length === 0) {
    ElMessage.warning('暂无数据可导出')
    return
  }

  const headers = ['景点ID', '景点名称', '经度', '纬度', '打卡次数', '评分', '行政区']
  const rows = heatmapData.value.map(item => [
    item.poiId,
    item.poiName,
    item.lng,
    item.lat,
    item.checkCount,
    item.rating || '',
    item.district
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `打卡热力数据_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)

  ElMessage.success('导出成功')
}

// 生命周期
onMounted(() => {
  initMap()
  window.addEventListener('keydown', onFullscreenKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onFullscreenKeydown)
  if (mapInstance) {
    mapInstance.destroy()
    mapInstance = null
  }
})
</script>

<style scoped>
.heatmap-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f5f7fa;
}

.filter-bar {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

/* 内联表单项换行时与上一行拉开间距，避免控件与按钮贴在一起 */
.filter-bar :deep(.el-form--inline) {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  row-gap: 12px;
}

.compare-panel {
  margin-bottom: 16px;
}

.compare-panel :deep(.el-form--inline) {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  row-gap: 12px;
}

.main-content {
  display: flex;
  flex: 1;
  gap: 16px;
  min-height: 500px;
}

/* 全屏：固定整个热力图卡片区域（含筛选栏），否则仅地图区 fixed 会盖住「退出全屏」 */
.heatmap-container.fullscreen-mode {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #f5f7fa;
  padding: 16px;
  box-sizing: border-box;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
}

.heatmap-container.fullscreen-mode .filter-bar {
  flex-shrink: 0;
}

.heatmap-container.fullscreen-mode .compare-panel {
  flex-shrink: 0;
  max-height: 36vh;
  overflow: auto;
}

.heatmap-container.fullscreen-mode .main-content {
  flex: 1;
  min-height: 0;
}

.heatmap-container.fullscreen-mode .map-wrapper {
  min-height: 0;
  flex: 1;
}

.heatmap-container.fullscreen-mode .map-container {
  min-height: 0;
  height: 100%;
}

.heatmap-container.fullscreen-mode .side-panel {
  max-height: none;
  align-self: stretch;
  overflow-y: auto;
}

.map-wrapper {
  flex: 1;
  position: relative;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.map-loading,
.map-error {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.95);
  color: #666;
  gap: 12px;
}

.map-error {
  color: #f56c6c;
}

.side-panel {
  width: 320px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  max-height: calc(100vh - 250px);
}

.dimension-card,
.district-card,
.compare-card {
  background: #fff;
  border-radius: 8px;
}

.loading-placeholder,
.empty-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100px;
  color: #999;
}

.dimension-list,
.district-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dimension-item,
.district-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.dimension-item:hover,
.district-item:hover {
  background: #f5f7fa;
}

.dimension-item.active,
.district-item.active {
  background: #ecf5ff;
}

.dimension-rank,
.district-rank {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #909399;
  color: #fff;
  border-radius: 50%;
  font-size: 11px;
  flex-shrink: 0;
}

.district-rank {
  background: #409eff;
}

.dimension-label,
.district-name {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dimension-bar-wrapper {
  width: 60px;
  height: 6px;
  background: #ebeef5;
  border-radius: 3px;
  overflow: hidden;
}

.dimension-bar {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  border-radius: 3px;
  transition: width 0.3s;
}

.dimension-count,
.district-count {
  font-size: 12px;
  color: #666;
  min-width: 40px;
  text-align: right;
}

.district-summary {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 13px;
}

.district-percent {
  font-size: 12px;
  color: #909399;
  min-width: 45px;
  text-align: right;
}

.poi-detail {
  padding: 8px 0;
}

.poi-detail h3 {
  margin: 0 0 16px;
  font-size: 18px;
  color: #303133;
}

.poi-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 12px;
  color: #909399;
}

.info-item .value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.text-success {
  color: #67c23a;
}

.text-danger {
  color: #f56c6c;
}

:deep(.el-card__header) {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
}

:deep(.el-form-item) {
  margin-bottom: 0;
}
</style>
