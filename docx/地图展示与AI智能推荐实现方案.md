# 地图展示与AI智能推荐实现方案

## 一、方案概述

本方案详细描述智慧旅游平台中**地图展示模块**和**AI智能推荐模块**的技术实现细节，包括前端小程序实现和后端服务实现。

### 1.1 模块关系图

```
┌─────────────────────────────────────────────────────────────┐
│                      用户端小程序                             │
│  ┌─────────────────┐          ┌──────────────────────┐    │
│  │    地图页        │          │    路线规划页         │    │
│  │  (pages/map)    │◄────────►│  (pages/route/plan)  │    │
│  └────────┬────────┘          └──────────┬───────────┘    │
│           │                              │                 │
│           ▼                              ▼                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Pinia 状态管理                    │   │
│  │              poiStore / routeStore                  │   │
│  └────────────────────────┬────────────────────────────┘   │
└───────────────────────────┼────────────────────────────────┘
                            │ HTTP API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      后端服务                               │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  POI模块        │  │  路线模块        │                   │
│  │ (modules/poi)   │  │ (modules/route) │                   │
│  └────────┬────────┘  └────────┬────────┘                   │
│           │                    │                            │
│           ▼                    ▼                            │
│  ┌─────────────────────────────────────────────┐           │
│  │              AI服务层 (external/qwen.ts)      │           │
│  │              通义千问 API                    │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## 二、地图展示模块

### 2.1 技术实现概述

| 项目 | 技术方案 | 说明 |
|------|----------|------|
| 地图组件 | uni-app `<map>` | 微信小程序原生地图组件 |
| 地图服务 | 高德地图SDK | POI数据、定位、导航 |
| 坐标系 | GCJ-02 | 中国国测局坐标系 |
| 状态管理 | Pinia | poiStore 管理附近POI列表 |
| 样式方案 | Scoped CSS | 组件级样式隔离 |

### 2.2 核心功能列表

| 功能 | 优先级 | 状态 |
|------|--------|------|
| 地图渲染与定位 | P0 | ✅ 已实现 |
| POI标记显示 | P0 | ✅ 已实现 |
| POI类别筛选 | P1 | ✅ 已实现 |
| 热力图叠加 | P1 | ✅ 已实现 |
| 路线折线绘制 | P0 | ✅ 已实现 |
| 可拖动控制面板 | P2 | ✅ 已实现 |
| 语音输入规划 | P1 | ✅ 已实现 |
| 交通方式切换 | P2 | ✅ 已实现 |
| 已保存路线加载 | P2 | ✅ 已实现 |

### 2.3 页面结构

```
pages/map/index.vue          # 地图主页面
├── map 组件                  # 高德地图
├── float-panel              # 可拖动控制面板
│   ├── 定位按钮
│   ├── 热力图开关
│   ├── POI类别筛选
│   ├── 路线显示开关
│   ├── 卫星图模式
│   └── 路线选择器入口
├── poi-card                 # POI详情卡片（底部滑入）
├── route-result-panel       # AI路线结果面板
├── transit-plans-panel      # 换乘方案选择面板
└── voice-area               # 语音输入区域
```

### 2.4 核心代码实现

#### 2.4.1 地图组件配置

```vue
<!-- map/index.vue -->
<template>
  <view class="map-page">
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
  </view>
</template>

<script setup lang="ts">
// 地图状态
const mapCenter = ref({ latitude: DEFAULT_CENTER.latitude, longitude: DEFAULT_CENTER.longitude })
const mapScale = ref(DEFAULT_SCALE)

// 标记点（POI + 路线POI）
const allMarkers = computed(() => [...nearbyMarkers.value, ...routeMarkers.value])

// 路线折线
const routePolyline = computed(() => {
  if (!showRoute.value || !showVoiceResult.value || !planResult.value) return []
  return planResult.value.schedule
    .filter(day => day.polylinePath && day.polylinePath.length >= 2)
    .map((day, dayIdx) => ({
      points: day.polylinePath,
      color: getDayColor(dayIdx),
      width: 6,
      arrowLine: true,
      borderColor: '#fff',
      borderWidth: 2
    }))
})
</script>
```

#### 2.4.2 POI标记生成

```typescript
// POI类别配置
const poiCategories = [
  { key: 'all', icon: 'cat-all', name: '全部', types: '110000|140000|141200|141300' },
  { key: 'scenic', icon: 'cat-scenic', name: '景点', types: '110000' },
  { key: 'museum', icon: 'cat-museum', name: '博物馆', types: '141200' },
  { key: 'park', icon: 'cat-park', name: '公园', types: '140000' },
  { key: 'food', icon: 'cat-food', name: '美食', types: '050000' },
  { key: 'shopping', icon: 'cat-shopping', name: '购物', types: '060000' },
]

// 普通POI标记
const nearbyMarkers = computed(() => {
  if (showVoiceResult.value) return []  // 路线模式下隐藏
  return nearbyList.value.map((poi, idx) => ({
    id: idx,
    latitude: poi.latitude,
    longitude: poi.longitude,
    title: poi.name,
    iconPath: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png',
    width: 28,
    height: 36,
    anchor: { x: 0.5, y: 1 },
    callout: {
      content: poi.name,
      color: '#333',
      fontSize: 11,
      borderRadius: 4,
      bgColor: '#fff',
      padding: 4,
      display: 'BYCLICK'  // 点击显示
    }
  }))
})

// 路线POI标记（按天分色）
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
        iconPath: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
        width: 36,
        height: 46,
        label: {
          content: `${idx + 1}`,
          color: '#fff',
          fontSize: 14,
          anchorX: 0,
          anchorY: 0,
          bgColor: color,
          padding: 4,
          borderRadius: 4
        },
        callout: {
          content: `第${day.day}天 ${idx + 1}. ${item.poi.name}`,
          color: color,
          fontSize: 12,
          borderRadius: 4,
          bgColor: '#fff',
          padding: 4,
          display: 'ALWAYS'  // 始终显示
        }
      })
    })
  })
  return markers
})
```

#### 2.4.3 定位功能实现

```typescript
function doGetLocation() {
  if (DEV_MOCK_LOCATION) {
    // 开发模式：使用模拟定位
    mapCenter.value = { latitude: DEV_MOCK_LOCATION.latitude, longitude: DEV_MOCK_LOCATION.longitude }
    moveMapTo(DEV_MOCK_LOCATION.latitude, DEV_MOCK_LOCATION.longitude)
    loadNearby(DEV_MOCK_LOCATION.latitude, DEV_MOCK_LOCATION.longitude)
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
        // 不在上海：使用默认位置
        outOfShanghai.value = true
        mapCenter.value = { latitude: DEFAULT_CENTER.latitude, longitude: DEFAULT_CENTER.longitude }
        poiStore.setNearbyList(SHANGHAI_RECOMMENDED_POIS as any)
      }
    },
    fail: () => uni.showToast({ title: '定位失败', icon: 'none' })
  })
}

function moveMapTo(latitude: number, longitude: number) {
  mapCenter.value = { latitude, longitude }
  const mapCtx = uni.createMapContext('tourism-map')
  mapCtx.moveToLocation({
    latitude,
    longitude,
    fail: () => {}  // 开发者工具不支持时静默忽略
  })
}
```

#### 2.4.4 附近POI加载

```typescript
async function loadNearby(lat: number, lng: number) {
  if (isRouteMode.value) return  // 路线模式下不刷新

  const cat = poiCategories.find(c => c.key === selectedCategory.value)
  try {
    const res = await poiApi.nearby({
      latitude: lat,
      longitude: lng,
      radius: 5000,
      pageSize: 50
    })

    let list = res.list

    // 按类别过滤
    if (cat && cat.key !== 'all') {
      const keywords: Record<string, string[]> = {
        scenic: ['景点', '风景', '公园'],
        museum: ['博物馆', '展览', '馆'],
        park: ['公园', '园林', '绿化'],
        food: ['美食', '餐厅', '餐饮', '小吃'],
        shopping: ['购物', '商场', '超市', '商店']
      }
      const kws = keywords[cat.key] || []
      if (kws.length > 0) {
        list = list.filter(p =>
          kws.some(k => (p.name + p.category + (p.description || '')).includes(k))
        )
      }
    }

    poiStore.setNearbyList(list)
  } catch {
    uni.showToast({ title: '加载附近景点失败', icon: 'none' })
  }
}
```

#### 2.4.5 地图视野适配

```typescript
/** 根据 POI 列表自动缩放地图到合适视野 */
function fitMapToPois(pois: Array<{ latitude: number; longitude: number }>) {
  if (pois.length === 0) return
  if (pois.length === 1) {
    mapCenter.value = { latitude: pois[0].latitude, longitude: pois[0].longitude }
    mapScale.value = 15
    return
  }

  // 计算边界
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

  // 使用 includePoints API 精确适配
  const mapCtx = uni.createMapContext('tourism-map')
  mapCtx.includePoints({
    points: pois.map(p => ({ latitude: p.latitude, longitude: p.longitude })),
    padding: [80, 40, 280, 40]  // 上右下左，留给底部卡片空间
  })
}
```

### 2.5 面板拖动交互

```typescript
// 面板拖动实现
const BTN_SIZE = 36  // 按钮半径
let dragStartX = 0, dragStartY = 0
let panelStartX = 0, panelStartY = 0
let isDragging = false, dragMoved = false

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

  // 允许拖出屏幕，但最多超出 BTN_SIZE
  panelX.value = Math.min(Math.max(-BTN_SIZE, panelStartX + dx), SCREEN_W - BTN_SIZE)
  panelY.value = Math.min(Math.max(-BTN_SIZE, panelStartY + dy), SCREEN_H - BTN_SIZE)
}

function onPanelTouchEnd() {
  isDragging = false
  if (!dragMoved) return

  // 检测是否吸附到边缘
  const snapMargin = BTN_SIZE
  isSnapping.value = true

  if (panelX.value < snapMargin) {
    panelX.value = -BTN_SIZE / 2
    peekSide.value = 'left'
    isHidden.value = true
  } else if (panelX.value > SCREEN_W - BTN_SIZE * 2 - snapMargin) {
    panelX.value = SCREEN_W - BTN_SIZE * 3 / 2
    peekSide.value = 'right'
    isHidden.value = true
  } else if (panelY.value < snapMargin) {
    panelY.value = -BTN_SIZE / 2
    peekSide.value = 'top'
    isHidden.value = true
  } else if (panelY.value > SCREEN_H - BTN_SIZE * 2 - snapMargin) {
    panelY.value = SCREEN_H - BTN_SIZE * 3 / 2
    peekSide.value = 'bottom'
    isHidden.value = true
  }

  if (isHidden.value) {
    panelOpen.value = false  // 隐藏时关闭展开内容
  }

  setTimeout(() => { isSnapping.value = false }, 400)
}
```

---

## 三、AI智能推荐模块

### 3.1 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                    AI智能推荐系统                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐    ┌─────────────────┐                │
│  │   用户端小程序   │    │   后端服务       │                │
│  │                 │    │                 │                │
│  │  route/plan.vue │───►│  route.routes   │                │
│  │  route/detail   │◄──│                 │                │
│  │                 │    │                 │                │
│  └────────┬────────┘    └────────┬────────┘                │
│           │                     │                         │
│           │    HTTP + JSON      │                         │
│           └─────────────────────┼────────────────────────►│
│                                 │                          │
│                                 ▼                          │
│                    ┌────────────────────┐                  │
│                    │   AI服务层         │                  │
│                    │  external/qwen.ts │                  │
│                    └─────────┬──────────┘                  │
│                              │                             │
│                              ▼                             │
│                    ┌────────────────────┐                  │
│                    │   通义千问 API      │                  │
│                    │   (阿里云 DashScope)│                  │
│                    └────────────────────┘                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 AI能力矩阵

| 能力 | 实现方式 | 优先级 | 状态 |
|------|----------|--------|------|
| POI推荐 | **文本向量相似度匹配** + 标签权重 | P0 | 🔄 待完善 |
| 个性化推荐 | 用户偏好embedding + 语义匹配 | P0 | 🔄 待完善 |
| 路线生成 | 通义千问 LLM | P0 | 🔄 待完善 |
| 意图识别 | NLP解析用户输入 | P1 | 🔄 待完善 |
| 行程优化 | 路径规划算法 | P1 | ✅ 已实现 |
| 语音识别 | 微信同声传译插件 | P1 | ✅ 已实现 |

### 3.3 POI推荐算法

#### 3.3.1 推荐流程（基于文本向量相似度）

```
用户请求推荐
     │
     ▼
┌─────────────────┐
│ 解析用户偏好     │
│ (标签 + 历史行为) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 构建用户向量     │  ┌────────────────────┐
│ 文本描述向量     │  │ 调用通义千问Embedding│
│ 标签向量加权     │  │ 生成1024维向量      │
└────────┬────────┘  └────────────────────┘
         │
         ▼
┌─────────────────┐
│ 候选POI预筛选   │──── 热门POI + 附近POI
│ (数量: 100-500) │──── 优先取有embedding的POI
└────────┬────────┘
         │
         ▼
┌─────────────────┐  ┌────────────────────┐
│ 计算向量相似度   │  │ 余弦相似度计算      │
│ (cosine_sim)    │  │ user_vec · poi_vec │
└────────┬────────┘  └────────────────────┘
         │
         ▼
┌─────────────────┐
│ 多维度综合评分   │
│ • 向量相似度 40% │
│ • 热度分数 30%  │
│ • 距离评分 20%  │
│ • 标签匹配 10%  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 返回Top-N推荐   │
│ (N=20, 分页)   │
└─────────────────┘
```

#### 3.3.2 向量相似度匹配原理

```typescript
/**
 * 基于文本向量相似度的POI推荐算法
 *
 * 核心思想：
 * 1. 将POI的名称、描述、标签等文本信息转换为向量表示
 * 2. 将用户偏好转换为向量表示
 * 3. 计算用户向量与POI向量的余弦相似度
 * 4. 结合热度、距离、标签权重进行综合排序
 */

// 向量维度（通义千问 text-embedding-v3 标准维度）
const EMBEDDING_DIM = 1024

// 综合评分权重
const SCORE_WEIGHTS = {
  vectorSimilarity: 0.4,  // 向量相似度
  heatScore: 0.3,         // 热度分数
  distanceScore: 0.2,      // 距离评分
  tagMatch: 0.1           // 标签匹配
}

// 余弦相似度计算
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) return 0
  return dotProduct / (normA * normB)
}

// 多维度综合评分
function calculateRecommendScore(params: {
  vectorSimilarity: number  // 0-1
  heatScore: number          // 0-100
  distance: number           // 米
  tagMatchWeight: number     // 0-1
}): number {
  const vectorScore = params.vectorSimilarity  // 已经是0-1
  const heatScore = params.heatScore / 100     // 归一化到0-1

  // 距离评分：5km内线性衰减
  const maxDistance = 5000
  const distanceScore = Math.max(0, 1 - params.distance / maxDistance)

  const totalScore =
    vectorScore * SCORE_WEIGHTS.vectorSimilarity +
    heatScore * SCORE_WEIGHTS.heatScore +
    distanceScore * SCORE_WEIGHTS.distanceScore +
    params.tagMatchWeight * SCORE_WEIGHTS.tagMatch

  return Math.round(totalScore * 100) / 100
}
```

#### 3.3.3 POI文本embedding生成

```typescript
// backend/src/modules/poi/poi.service.ts

import { callQwen } from '../../external/qwen'

interface POIEmbedding {
  poiId: number
  poiUuid: string
  embedding: number[]  // 1024维向量
  textContent: string  // 用于生成向量的原始文本
}

/**
 * 为POI生成文本embedding
 * 组合POI的多语言名称、描述、标签构建文本
 */
async function generatePOITextEmbedding(poi: any): Promise<POIEmbedding> {
  // 构建POI的文本描述
  const textParts: string[] = []

  // 1. POI名称（取中文名，无则取英文）
  if (typeof poi.poiName === 'string') {
    textParts.push(poi.poiName)
  } else {
    textParts.push(poi.poiName?.zh || poi.poiName?.['zh-CN'] || poi.poiName?.en || '')
  }

  // 2. POI描述
  if (poi.description) {
    if (typeof poi.description === 'string') {
      textParts.push(poi.description)
    } else {
      textParts.push(poi.description?.zh || poi.description?.['zh-CN'] || '')
    }
  }

  // 3. 标签名称
  if (poi.poiTags && poi.poiTags.length > 0) {
    const tagNames = poi.poiTags.map((rel: any) => {
      const tag = rel.tag
      if (typeof tag.tagName === 'string') return tag.tagName
      return tag.tagName?.zh || tag.tagName?.['zh-CN'] || ''
    }).filter(Boolean)
    textParts.push(...tagNames)
  }

  // 4. 类型分类
  if (poi.poiType) {
    textParts.push(poi.poiType)
  }

  // 组合为完整文本
  const textContent = textParts.join('。')

  // 调用通义千问生成embedding
  const embedding = await generateEmbedding(textContent)

  return {
    poiId: poi.id,
    poiUuid: poi.poiUuid,
    embedding,
    textContent
  }
}

/**
 * 调用通义千问text-embedding接口
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await callQwenEmbedding({
    model: 'text-embedding-v3',  // 通义千问embedding模型
    input: text
  })

  return response.output.embedding
}
```

#### 3.3.4 推荐服务实现

```typescript
// backend/src/modules/poi/poi.service.ts

export class POIRecommendService {
  // 缓存用户embedding，避免重复计算
  private userEmbeddingCache: Map<string, { embedding: number[], expireAt: number }> = new Map()
  private readonly CACHE_TTL = 5 * 60 * 1000  // 5分钟缓存

  /**
   * 获取POI推荐列表
   */
  async getRecommend(params: {
    userId?: number
    latitude?: number
    longitude?: number
    page?: number
    pageSize?: number
    useEmbedding?: boolean  // 是否使用向量匹配
  }) {
    const { page = 1, pageSize = 20, useEmbedding = true } = params

    // 1. 获取候选POI（预筛选100-500个）
    const candidatePois = await this.getCandidatePOIs({
      userId: params.userId,
      limit: 200
    })

    if (candidatePois.length === 0) {
      return { list: [], total: 0, personalized: false }
    }

    // 2. 获取用户向量（若有偏好）
    let userEmbedding: number[] | null = null
    let userPreferences: string[] = []

    if (params.userId) {
      const userVec = await this.getUserEmbedding(params.userId)
      userEmbedding = userVec?.embedding || null

      // 获取用户偏好标签
      const preferences = await this.getUserPreferences(params.userId)
      userPreferences = this.flattenPreferenceTags(preferences)
    }

    // 3. 计算综合评分
    const scoredPois = await Promise.all(
      candidatePois.map(async (poi) => {
        // 获取/生成POI embedding
        let poiEmbedding = await this.getPOIEmbedding(poi.id)

        // 计算向量相似度
        let vectorSimilarity = 0
        if (userEmbedding && poiEmbedding) {
          vectorSimilarity = cosineSimilarity(userEmbedding, poiEmbedding)
        }

        // 计算标签匹配度
        const tagMatchWeight = this.calculateTagMatch(poi, userPreferences)

        // 计算综合评分
        const score = calculateRecommendScore({
          vectorSimilarity,
          heatScore: poi.stats?.heatScore || 0,
          distance: params.latitude && params.longitude
            ? calculateDistance(params.latitude, params.longitude,
                Number(poi.latitude), Number(poi.longitude))
            : 0,
          tagMatchWeight
        })

        return {
          ...this.transformPoi(poi),
          score,
          vectorSimilarity,
          tagMatchWeight
        }
      })
    )

    // 4. 按综合评分排序
    scoredPois.sort((a, b) => b.score - a.score)

    // 5. 分页返回
    const total = scoredPois.length
    const list = scoredPois
      .slice((page - 1) * pageSize, page * pageSize)
      .map(p => ({ ...p, score: undefined }))  // 移除内部字段

    return {
      list,
      total,
      personalized: !!userEmbedding || userPreferences.length > 0,
      hasEmbedding: !!userEmbedding
    }
  }

  /**
   * 获取用户embedding
   */
  private async getUserEmbedding(userId: number): Promise<{ embedding: number[] } | null> {
    // 检查缓存
    const cacheKey = `user:${userId}`
    const cached = this.userEmbeddingCache.get(cacheKey)
    if (cached && cached.expireAt > Date.now()) {
      return { embedding: cached.embedding }
    }

    // 获取用户偏好
    const preferences = await this.getUserPreferences(userId)
    if (!preferences) return null

    // 构建用户偏好文本
    const userText = this.buildUserPreferenceText(preferences)

    // 生成embedding
    const embedding = await generateEmbedding(userText)

    // 更新缓存
    this.userEmbeddingCache.set(cacheKey, {
      embedding,
      expireAt: Date.now() + this.CACHE_TTL
    })

    return { embedding }
  }

  /**
   * 构建用户偏好文本
   */
  private buildUserPreferenceText(preferences: any): string {
    const parts: string[] = []

    // 偏好类型描述
    if (preferences.preferenceTags) {
      const tags = preferences.preferenceTags

      if (tags.intensity) {
        const intensityMap: Record<string, string> = {
          'leisure': '喜欢休闲轻松的旅行方式',
          'explorer': '喜欢探索冒险',
          'intimate': '喜欢深度体验'
        }
        tags.intensity.forEach((code: string) => {
          if (intensityMap[code]) parts.push(intensityMap[code])
        })
      }

      if (tags.interests) {
        const interestMap: Record<string, string> = {
          'historical': '对历史建筑感兴趣',
          'nature': '喜欢自然风光',
          'art': '喜欢艺术展览',
          'food': '喜欢美食',
          'coffee': '喜欢咖啡文化'
        }
        tags.interests.forEach((code: string) => {
          if (interestMap[code]) parts.push(interestMap[code])
        })
      }

      if (tags.theme) {
        tags.theme.forEach((code: string) => {
          parts.push(code)
        })
      }
    }

    // 国籍（影响语言偏好和推荐风格）
    const regionMap: Record<number, string> = {
      0: '日韩游客',
      1: '国内游客',
      2: '欧美游客',
      3: '本地居民'
    }
    if (preferences.fromRegion !== undefined && regionMap[preferences.fromRegion]) {
      parts.push(regionMap[preferences.fromRegion])
    }

    return parts.join('。')
  }

  /**
   * 计算标签匹配度
   */
  private calculateTagMatch(poi: any, userPreferences: string[]): number {
    if (!userPreferences.length || !poi.poiTags?.length) return 0

    const poiTags = poi.poiTags.map((rel: any) => rel.tag.tagCode)
    const matchedCount = userPreferences.filter(pref =>
      poiTags.some((poiTag: string) =>
        poiTag.includes(pref) || pref.includes(poiTag)
      )
    ).length

    return matchedCount / Math.max(userPreferences.length, 1)
  }

  /**
   * 获取候选POI
   */
  private async getCandidatePOIs(params: {
    userId?: number
    limit: number
  }): Promise<any[]> {
    // 优先返回热门POI
    return await prisma.poiInfo.findMany({
      where: { status: 1 },
      include: {
        poiTags: { include: { tag: true } },
        stats: true,
        tickets: { where: { status: 1 }, take: 1 }
      },
      orderBy: { stats: { heatScore: 'desc' } },
      take: params.limit
    })
  }

  /**
   * 获取POI embedding（带缓存）
   */
  private async getPOIEmbedding(poiId: number): Promise<number[] | null> {
    // 先查数据库缓存
    const cached = await prisma.poiEmbedding.findUnique({
      where: { poiId }
    })

    if (cached) {
      return cached.embedding as number[]
    }

    // 生成新embedding
    const poi = await prisma.poiInfo.findUnique({
      where: { id: poiId },
      include: { poiTags: { include: { tag: true } } }
    })

    if (!poi) return null

    const { embedding } = await generatePOITextEmbedding(poi)

    // 存储到数据库
    await prisma.poiEmbedding.upsert({
      where: { poiId },
      create: { poiId, embedding: embedding as any },
      update: { embedding: embedding as any }
    })

    return embedding
  }

  /**
   * 批量生成POI embedding（初始化脚本）
   */
  async batchGeneratePOIEmbeddings(batchSize: number = 50) {
    // 获取未生成embedding的POI
    const pois = await prisma.poiInfo.findMany({
      where: {
        status: 1,
        embedding: null  // 假设添加embedding字段
      },
      include: { poiTags: { include: { tag: true } } },
      take: batchSize
    })

    const results = []
    for (const poi of pois) {
      try {
        const { embedding, textContent } = await generatePOITextEmbedding(poi)

        await prisma.poiInfo.update({
          where: { id: poi.id },
          data: { embedding: embedding as any }
        })

        results.push({ poiId: poi.id, success: true })
      } catch (error) {
        results.push({ poiId: poi.id, success: false, error: String(error) })
      }
    }

    return results
  }
}

export const poiRecommendService = new POIRecommendService()
```
        personalized: !!userId && preferenceTags.length > 0  // 是否个性化
      }
    })
  } catch (error) {
    next(error)
  }
})
```

### 3.4 路线生成算法

#### 3.4.1 路线生成流程

```
用户输入需求
     │
     ▼
┌─────────────────┐
│ 输入验证        │──── 少于10字 ──► 提示补充
│ (≥10字符)       │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ 检查AI次数      │──── 次数不足 ──► 提示升级
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ 调用通义千问 API │
│ 生成结构化路线   │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ 保存路线到数据库│
│ (routes_info)  │
└─────────────────┘
     │
     ▼
┌─────────────────┐
│ 返回路线ID      │
│ 跳转详情页      │
└─────────────────┘
```

#### 3.4.2 AI服务封装

```typescript
// backend/src/external/qwen.ts
import axios from 'axios'
import { env } from '../config/env'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function callQwen(messages: Message[]): Promise<string> {
  const response = await axios({
    method: 'POST',
    url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    headers: {
      'Authorization': `Bearer ${env.openai.apiKey}`,
      'Content-Type': 'application/json'
    },
    data: {
      model: env.openai.model || 'qwen-turbo',
      input: { messages },
      parameters: {
        result_format: 'text'
      }
    }
  })

  return response.data.output.text
}
```

#### 3.4.3 路线生成提示词设计

```typescript
// 系统角色提示词
const SYSTEM_PROMPT = `你是一位专业的旅游规划师，为用户提供个性化的旅游路线规划服务。

## 你的能力
1. 根据用户需求和偏好，从景点列表中选择最合适的景点
2. 合理安排每天的行程，确保路线具有可行性和趣味性
3. 考虑景点之间的距离和交通时间
4. 给出每日的简短描述和游览建议

## 输出格式要求
请严格按以下JSON格式输出，不要包含任何其他内容：

{
  "title": "路线名称",
  "description": "路线整体描述",
  "totalDays": 总天数,
  "schedule": [
    {
      "day": 1,
      "date": "第一天",
      "description": "当日行程描述",
      "pois": [
        {
          "id": "景点ID",
          "name": "景点名称",
          "reason": "推荐理由",
          "stayDuration": "建议停留时长",
          "openTime": "开放时间"
        }
      ]
    }
  ],
  "tips": ["旅行小贴士"]
}

## 注意事项
- 每天的景点数量建议3-5个
- 合理安排用餐时间
- 考虑景点间的交通时间
- 确保行程不会过于紧凑
`

// 用户输入解析提示词
const PARSE_PROMPT = `请从以下用户需求中提取关键信息，返回JSON格式：

{
  "days": 预计天数（默认1）,
  "keywords": ["关键词1", "关键词2"],
  "specialNeeds": "特殊需求描述"
}

用户需求：{userInput}
`
```

#### 3.4.4 路线生成接口

```typescript
// backend/src/modules/route/route.routes.ts

// AI生成路线
router.post('/generate', optionalAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId
    const { prompt, days, tags, startLatitude, startLongitude } = req.body

    // 验证输入
    if (!prompt || prompt.length < 10) {
      return errorResponse(res, '请详细描述您的旅行需求（至少10个字）', 400)
    }

    // 检查认证和AI次数
    if (!userId) {
      return errorResponse(res, '请先登录后再使用AI规划功能', 401)
    }

    const consumeResult = await userService.consumeAiPlan(userId)
    if (!consumeResult.success) {
      return errorResponse(res, 'AI规划次数已用完，请绑定手机号升级账号', 403)
    }

    // 获取用户偏好
    let userPreferences: string[] = []
    if (userId) {
      const profile = await userService.getProfile(userId)
      if (profile?.preference?.preferenceTags) {
        userPreferences = [
          ...profile.preference.preferenceTags.interests || [],
          ...profile.preference.preferenceTags.theme || []
        ]
      }
    }

    // 查询候选POI
    const candidatePois = await getCandidatePois({
      tags: tags || userPreferences,
      latitude: startLatitude,
      longitude: startLongitude,
      limit: 50
    })

    // 调用AI生成路线
    const aiResult = await generateRouteWithAI({
      userPrompt: prompt,
      days: days || 1,
      candidatePois,
      systemPrompt: SYSTEM_PROMPT
    })

    // 保存路线
    const route = await prisma.route.create({
      data: {
        userId,
        routeName: { 'zh-CN': aiResult.title, zh: aiResult.title, en: aiResult.title },
        description: { 'zh-CN': aiResult.description },
        totalDays: aiResult.totalDays,
        poiList: JSON.stringify(aiResult.schedule.flatMap(d => d.pois.map(p => ({
          poiId: p.id,
          dayNum: d.day,
          stayDuration: p.stayDuration
        })))),
        tags: JSON.stringify(tags || []),
        status: 1
      }
    })

    successResponse(res, {
      id: route.id,
      title: aiResult.title,
      description: aiResult.description,
      days: aiResult.totalDays,
      schedule: aiResult.schedule,
      remainingCount: consumeResult.remaining
    })
  } catch (error) {
    next(error)
  }
})

// 获取候选POI
async function getCandidatePois(params: {
  tags: string[],
  latitude?: number,
  longitude?: number,
  limit: number
}) {
  const where: any = { status: 1 }

  if (params.tags.length > 0) {
    where.poiTags = {
      some: {
        tag: { tagCode: { in: params.tags } },
        weight: { gte: 0.3 }
      }
    }
  }

  const pois = await prisma.poiInfo.findMany({
    where,
    include: {
      poiTags: { include: { tag: true } },
      stats: true
    },
    orderBy: { stats: { heatScore: 'desc' } },
    take: params.limit
  })

  return pois.map(p => ({
    id: p.poiUuid,
    name: typeof p.poiName === 'string' ? p.poiName : p.poiName?.zh || '',
    latitude: Number(p.latitude),
    longitude: Number(p.longitude),
    tags: p.poiTags.map(t => t.tag.tagCode),
    heatScore: p.stats?.heatScore || 0
  }))
}
```

### 3.5 路径规划实现

#### 3.5.1 交通方式支持

```typescript
// user/src/utils/amap-api.ts

// 出行方式类型
type TravelMode = 'walking' | 'driving' | 'transit'

// 交通方式配置
const TRAVEL_MODES = [
  { mode: 'walking', icon: '🚶', label: '步行' },
  { mode: 'driving', icon: '🚗', label: '驾车' },
  { mode: 'transit', icon: '🚇', label: '公交' }
]

// 多段路径规划
export async function planMultiSegmentRoute(
  pois: POI[],
  mode: TravelMode,
  planIndex: number = 0
): Promise<Array<{ latitude: number; longitude: number }>> {
  if (pois.length < 2) {
    return pois.map(p => ({ latitude: p.latitude, longitude: p.longitude }))
  }

  const allPoints: Array<{ latitude: number; longitude: number }> = []

  for (let i = 0; i < pois.length - 1; i++) {
    const origin = `${pois[i].longitude},${pois[i].latitude}`
    const destination = `${pois[i + 1].longitude},${pois[i + 1].latitude}`

    let segmentPoints: Array<{ latitude: number; longitude: number }> = []

    if (mode === 'walking') {
      segmentPoints = await amapWalkingRoute(origin, destination)
    } else if (mode === 'driving') {
      segmentPoints = await amapDrivingRoute(origin, destination)
    } else if (mode === 'transit') {
      const plans = await amapTransitPlans({ origin, destination })
      if (plans.length > planIndex) {
        segmentPoints = plans[planIndex].steps.flatMap(step => step.polyline || [])
      }
    }

    // 第一段保留全部，后续段去掉第一个点（避免重复）
    if (i === 0) {
      allPoints.push(...segmentPoints)
    } else if (segmentPoints.length > 0) {
      allPoints.push(...segmentPoints.slice(1))
    }
  }

  return allPoints
}

// 步行路线规划
async function amapWalkingRoute(
  origin: string,
  destination: string
): Promise<Array<{ latitude: number; longitude: number }>> {
  const url = `https://restapi.amap.com/v3/direction/walking`
  const params = new URLSearchParams({
    key: env.amap.key,
    origin,
    destination
  })

  const response = await fetch(`${url}?${params.toString()}`)
  const data = await response.json()

  if (data.status === '1' && data.route?.paths?.[0]?.steps) {
    const points: Array<{ latitude: number; longitude: number }> = []
    for (const step of data.route.paths[0].steps) {
      const stepPoints = decodePolyline(step.polyline)
      points.push(...stepPoints)
    }
    return points
  }

  return []
}

// 驾车路线规划
async function amapDrivingRoute(
  origin: string,
  destination: string
): Promise<Array<{ latitude: number; longitude: number }>> {
  const url = `https://restapi.amap.com/v3/direction/driving`
  const params = new URLSearchParams({
    key: env.amap.key,
    origin,
    destination,
    strategy: '0'  // 最速度优先
  })

  const response = await fetch(`${url}?${params.toString()}`)
  const data = await response.json()

  if (data.status === '1' && data.route?.paths?.[0]?.steps) {
    const points: Array<{ latitude: number; longitude: number }> = []
    for (const step of data.route.paths[0].steps) {
      const stepPoints = decodePolyline(step.polyline)
      points.push(...stepPoints)
    }
    return points
  }

  return []
}

// 公交路线规划
export async function amapTransitPlans(params: {
  origin: string
  destination: string
  city?: string
}): Promise<TransitPlan[]> {
  const url = `https://restapi.amap.com/v3/direction/transit/integrated`
  const queryParams = new URLSearchParams({
    key: env.amap.key,
    origin: params.origin,
    destination: params.destination,
    strategy: '0',  // 最速度优先
    nightflag: '0'
  })

  if (params.city) {
    queryParams.append('city', params.city)
  }

  const response = await fetch(`${url}?${queryParams.toString()`)
  const data = await response.json()

  if (data.status === '1' && data.route?.transits) {
    return data.route.transits.map((transit: any, index: number) => ({
      index,
      duration: transit.duration,
      walkingDistance: transit.walking_distance,
      cost: transit.basic_price || 0,
      segments: transit.segments.map((seg: any) => ({
        type: seg.bus?.buslines?.[0]?.type || 'walking',
        lineName: seg.bus?.buslines?.[0]?.name || '步行',
        departStop: seg.bus?.buslines?.[0]?.departure_stop?.name,
        arriveStop: seg.bus?.buslines?.[0]?.arrival_stop?.name,
        distance: seg.bus?.distance || seg.walking?.distance,
        polyline: seg.walking?.steps?.flatMap((s: any) => decodePolyline(s.polyline))
      }))
    }))
  }

  return []
}

// 解析高德地图polyline
function decodePolyline(encoded: string): Array<{ latitude: number; longitude: number }> {
  const points: Array<{ latitude: number; longitude: number }> = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let b: number
    let shift = 0
    let result = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1)
    lat += dlat

    shift = 0
    result = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : (result >> 1)
    lng += dlng

    points.push({
      latitude: lat / 1e6,
      longitude: lng / 1e6
    })
  }

  return points
}
```

---

## 四、数据模型

### 4.1 POI相关表

```prisma
// poi_info 表
model PoiInfo {
  id          Int      @id @default(autoincrement())
  poiUuid     String   @unique @map("poi_uuid")
  poiName     Json     @map("poi_name")           // 多语言：{"zh": "名称", "en": "Name"}
  description Json?                                  // 多语言描述
  address     Json     @map("poi_address")         // 多语言地址
  latitude    Float                                  // GCJ-02 纬度
  longitude   Float                                  // GCJ-02 经度
  poiType     String?   @map("poi_type")            // POI类型编码
  tel         String?                                  // 联系电话
  photos      Json?                                   // 照片URL数组
  status      Int      @default(1)                   // 0下架 1上架

  poiTags     PoiTagRel[]
  stats       PoiStats?
  tickets     TicketInfo[]
  openingTimes OpeningTime[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// poi_stats 表
model PoiStats {
  id          Int      @id @default(autoincrement())
  poiId       Int      @unique @map("poi_id")
  heatScore   Float    @default(0)   @map("heat_score")  // 热度评分 0-100
  visitCount  Int      @default(0)   @map("visit_count") // 访问次数

  poi         PoiInfo  @relation(fields: [poiId], references: [id])
}

// tag_info 表
model TagInfo {
  id          Int      @id @default(autoincrement())
  tagCode     String   @unique @map("tag_code")     // 标签编码
  tagName     Json                                  // 多语言标签名
  category    String                                // 分类：intensity/interests/theme/cuisine/mood

  poiTags     PoiTagRel[]
}

// poi_tag_rel 表
model PoiTagRel {
  id          Int      @id @default(autoincrement())
  poiId       Int      @map("poi_id")
  tagId       Int      @map("tag_id")
  weight      Float    @default(0.5)                 // 关联权重 0-1

  poi         PoiInfo  @relation(fields: [poiId], references: [id])
  tag         TagInfo  @relation(fields: [tagId], references: [id])

  @@unique([poiId, tagId])
}
```

### 4.2 路线相关表

```prisma
// routes_info 表
model Route {
  id          Int      @id @default(autoincrement())
  userId      Int      @map("user_id")
  routeName   Json                                  // 多语言路线名
  description Json?                                  // 多语言描述
  totalDays   Int      @map("total_days")           // 总天数
  poiList     Json?    @map("poi_list")              // POI列表JSON
  tags        Json?                                   // 标签数组
  coverImage  String?   @map("cover_image")         // 封面图
  status      Int      @default(1)                   // 0草稿 1正式
  isAiGenerated Boolean @default(false) @map("is_ai_generated")
  sourcePrompt String?   @map("source_prompt")      // AI生成时的原始prompt

  user        User     @relation(fields: [userId], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 4.3 用户偏好表

```prisma
// user_prefer 表
model UserPrefer {
  id              Int      @id @default(autoincrement())
  userId          Int      @unique @map("user_id")
  nationality     String?                              // 国籍
  locale          String?                              // 语言设置
  preferenceTags  Json?    @map("preference_tags")   // 偏好标签

  user            User     @relation(fields: [userId], references: [id])

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// preferenceTags 结构
// {
//   "intensity": ["leisure", "moderate"],        // 活动强度
//   "interests": ["history", "museum", "nature"], // 兴趣偏好
//   "theme": ["family", "couple"],               // 主题类型
//   "cuisine": ["local_food", "cafe"],          // 美食偏好
//   "mood": ["relaxed", "adventure"]             // 旅行心情
// }
```

---

## 五、API接口定义

### 5.1 POI推荐接口

**请求**
```
GET /api/poi/recommend?page=1&pageSize=20
Authorization: Bearer <token>  (可选)
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "poi_uuid_xxx",
        "name": "外滩",
        "category": "scenic",
        "description": "上海最著名的景观带...",
        "images": ["url1", "url2"],
        "latitude": 31.240,
        "longitude": 121.490,
        "address": "中山东一路",
        "rating": 4.8,
        "commentCount": 1234,
        "distance": 1200,
        "tags": ["历史建筑", "夜景", "地标"],
        "ticketPrice": 0
      }
    ],
    "total": 100,
    "personalized": true
  }
}
```

### 5.2 附近POI接口

**请求**
```
GET /api/poi/nearby?latitude=31.230&longitude=121.470&radius=5000&page=1&pageSize=20
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [...],
    "total": 50
  }
}
```

### 5.3 路线生成接口

**请求**
```
POST /api/route/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "prompt": "我想去上海玩3天，喜欢历史建筑和美食",
  "days": 3,
  "tags": ["history", "local_food"],
  "startLatitude": 31.230,
  "startLongitude": 121.470
}
```

**响应**
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 123,
    "title": "上海历史文化3日游",
    "description": "穿越百年外滩，品味老城厢...",
    "days": 3,
    "schedule": [
      {
        "day": 1,
        "date": "第一天",
        "description": "感受外滩万国建筑魅力",
        "pois": [
          {
            "id": "poi_uuid_xxx",
            "name": "外滩",
            "reason": "上海地标，建筑博览",
            "stayDuration": "2小时",
            "openTime": "全天开放"
          }
        ]
      }
    ],
    "remainingCount": 4
  }
}
```

### 5.4 路线保存接口

**请求**
```
POST /api/route/save
Authorization: Bearer <token>

{
  "name": "我的上海之旅",
  "days": 3,
  "pois": [
    { "poiId": "xxx", "dayNum": 1, "stayDuration": "2h" }
  ],
  "tags": ["history", "food"],
  "coverImage": "https://..."
}
```

---

## 六、前端实现细节

### 6.1 路线规划页面

```vue
<!-- pages/route/plan.vue -->
<template>
  <view class="plan-page">
    <!-- 输入区域 -->
    <view class="input-card">
      <textarea
        v-model="inputText"
        :placeholder="t('route.inputPlaceholder')"
        maxlength="500"
        auto-height
      />
      <view class="input-footer">
        <text class="char-count">{{ inputText.length }}/500</text>
        <view class="voice-btn" @tap="onVoiceInput">
          <text>🎤</text>
          <text>{{ t('route.voiceInput') }}</text>
        </view>
      </view>
    </view>

    <!-- 快捷标签 -->
    <view class="tags-section">
      <text class="section-title">{{ t('route.quickTags') }}</text>
      <view class="tags-wrap">
        <view
          v-for="tag in quickTags"
          :key="tag.key"
          class="tag-chip"
          :class="{ active: selectedTags.includes(tag.key) }"
          @tap="toggleTag(tag.key)"
        >
          {{ t(`route.tags.${tag.key}`) }}
        </view>
      </view>
    </view>

    <!-- 生成按钮 -->
    <view class="generate-area">
      <button
        class="generate-btn"
        :loading="generating"
        :disabled="!inputText.trim() && selectedTags.length === 0"
        @tap="onGenerate"
      >
        {{ generating ? t('route.generating') : t('route.generateBtn') }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
const inputText = ref('')
const selectedTags = ref<string[]>([])

const quickTags = [
  { key: 'family' }, { key: 'couple' }, { key: 'solo' }, { key: 'group' },
  { key: 'budget' }, { key: 'luxury' }, { key: 'oneDay' }, { key: 'twoDay' }, { key: 'threeDay' }
]

function toggleTag(key: string) {
  const idx = selectedTags.value.indexOf(key)
  if (idx > -1) selectedTags.value.splice(idx, 1)
  else selectedTags.value.push(key)
}

async function onGenerate() {
  const prompt = inputText.value.trim() ||
    selectedTags.value.map(k => t(`route.tags.${k}`)).join('、')
  if (!prompt) return

  routeStore.setGenerating(true)
  routeStore.addHistory(prompt)

  try {
    const route = await routeApi.generate({
      prompt,
      tags: selectedTags.value
    })
    routeStore.setCurrentRoute(route)
    routeStore.addRoute(route)
    uni.navigateTo({ url: `/pages/route/detail?id=${route.id}` })
  } catch {} finally {
    routeStore.setGenerating(false)
  }
}
</script>
```

### 6.2 语音识别实现

```typescript
// 微信同声传译插件
let siManager: any = null

function getSIManager() {
  if (siManager) return siManager
  try {
    const plugin = requirePlugin('WechatSI')
    siManager = plugin.getRecordRecognitionManager()
  } catch (e) {
    console.warn('同声传译插件不可用')
  }
  return siManager
}

function startListening() {
  const mgr = getSIManager()
  if (mgr) {
    mgr.onRecognize = (res: any) => {
      voiceTranscript.value = res.result
    }
    mgr.onStop = (res: any) => {
      if (res.result) {
        processVoiceInput(res.result)
      }
    }
    mgr.onError = (res: any) => {
      voiceState.value = 'error'
      voiceError.value = '语音识别失败'
    }
    mgr.start({ lang: 'zh_CN' })
    voiceState.value = 'listening'
  }
}

function stopListening() {
  const mgr = getSIManager()
  if (mgr) {
    mgr.stop()
  }
  voiceState.value = 'processing'
}
```

### 6.3 状态管理

```typescript
// stores/route.ts
import { defineStore } from 'pinia'

interface DayPOI {
  id: string
  name: string
  latitude: number
  longitude: number
  // ...
}

interface DaySchedule {
  day: number
  description?: string
  pois: DayPOI[]
}

interface TravelRoute {
  id: string
  title: string
  description: string
  days: number
  schedule: DaySchedule[]
}

export const useRouteStore = defineStore('route', {
  state: () => ({
    currentRoute: null as TravelRoute | null,
    myRoutes: [] as TravelRoute[],
    generateHistory: [] as string[],
    generating: false
  }),

  actions: {
    setCurrentRoute(route: TravelRoute) {
      this.currentRoute = route
    },
    addRoute(route: TravelRoute) {
      this.myRoutes.unshift(route)
    },
    setGenerating(loading: boolean) {
      this.generating = loading
    },
    addHistory(prompt: string) {
      this.generateHistory = [prompt, ...this.generateHistory.filter(h => h !== prompt)].slice(0, 10)
      uni.setStorageSync('routeHistory', this.generateHistory)
    },
    loadHistory() {
      this.generateHistory = uni.getStorageSync('routeHistory') || []
    }
  }
})
```

---

## 七、关键算法

### 7.1 Haversine距离计算

```typescript
// 计算两点间距离（米）
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000  // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
```

### 7.2 POI推荐评分

```typescript
// 计算POI推荐得分
function calculateRecommendScore(params: {
  heatScore: number      // 热度评分 0-100
  distance: number       // 距离（米）
  tagMatchWeight: number // 标签匹配权重 0-1
  visitCount: number     // 历史访问次数
}): number {
  // 热度权重 40%
  const heatWeight = 0.4
  const heatScore = params.heatScore / 100

  // 距离权重 30%（距离越近分数越高）
  const distanceWeight = 0.3
  const maxDistance = 5000  // 5km
  const distanceScore = Math.max(0, 1 - params.distance / maxDistance)

  // 标签匹配权重 20%
  const tagWeight = 0.2
  const tagScore = params.tagMatchWeight

  // 去重权重 10%（未访问过的优先）
  const dedupWeight = 0.1
  const dedupScore = Math.min(1, 1 - params.visitCount / 10)

  return (
    heatScore * heatWeight +
    distanceScore * distanceWeight +
    tagScore * tagWeight +
    dedupScore * dedupWeight
  )
}
```

### 7.3 路线优化（贪心算法）

```typescript
// 基于贪心的路线优化
function optimizeRouteOrder(pois: POI[], startPoint?: POI): POI[] {
  if (pois.length <= 2) return pois

  const result: POI[] = []
  const remaining = [...pois]
  let current = startPoint || remaining.shift()!

  while (remaining.length > 0) {
    // 找到距离最近的下一个POI
    let nearestIdx = 0
    let nearestDist = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const dist = calculateDistance(
        current.latitude, current.longitude,
        remaining[i].latitude, remaining[i].longitude
      )
      if (dist < nearestDist) {
        nearestDist = dist
        nearestIdx = i
      }
    }

    // 添加到结果并更新当前位置
    result.push(remaining[nearestIdx])
    current = remaining[nearestIdx]
    remaining.splice(nearestIdx, 1)
  }

  return result
}
```

---

## 八、环境配置

### 8.1 高德地图配置

```typescript
// backend/src/config/env.ts
export const env = {
  // 高德地图
  amap: {
    key: process.env.AMAP_KEY || 'your_amap_key',
    secret: process.env.AMAP_SECRET
  }
}
```

### 8.2 阿里云通义千问配置

```typescript
// backend/src/config/env.ts
export const env = {
  // AI服务（阿里云 DashScope）
  openai: {
    apiKey: process.env.DASHSCOPE_API_KEY || 'sk-xxx',
    model: process.env.AI_MODEL || 'qwen-turbo'
  }
}
```

### 8.3 前端环境变量

```typescript
// user/src/utils/amap-config.ts
export const AMapConfig = {
  key: 'your_amap_key',
  // 开发模式模拟位置
  DEV_MOCK_LOCATION: {
    latitude: 31.230,
    longitude: 121.470
  }
}
```

---

## 九、POI数据初始化方案

### 9.1 问题背景

当前数据库中POI表为空，需要初始化数据。考虑到：
1. 手动录入效率低
2. 需要覆盖多语言
3. 需要维护POI与标签的关联
4. 需要生成文本embedding用于推荐

### 9.2 数据来源方案

| 方案 | 优点 | 缺点 | 推荐度 |
|------|------|------|--------|
| 高德地图API导入 | 数据准确、包含坐标 | 需付费、无描述 | ⭐⭐⭐ |
| 公开数据集 | 免费、数据量广 | 需清洗、缺坐标 | ⭐⭐ |
| 手动录入+AI辅助 | 质量可控 | 效率低 | ⭐⭐⭐⭐ |
| 模拟数据+AI生成 | 快速可用 | 非真实数据 | ⭐⭐⭐⭐⭐ |

**推荐方案**：采用"模拟数据+AI辅助生成"方式快速启动，使用真实POI结构，通过AI生成描述和推荐理由。

### 9.3 模拟数据初始化脚本

```typescript
// scripts/init-poi-data.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 上海景点基础数据
const SHANGHAI_POIS = [
  {
    name: { zh: '外滩', 'zh-CN': '外滩', en: 'The Bund' },
    description: {
      zh: '外滩位于黄浦江畔，全长约1.5公里，是上海最著名的景观带。这里矗立着52幢风格各异的古典复兴大楼，被誉为"万国建筑博览群"。夜晚的灯光秀更是不可错过的视觉盛宴。',
      'zh-CN': '外滩位于黄浦江畔...',
      en: 'The Bund is a waterfront area located on the western bank of the Huangpu River...'
    },
    address: { zh: '黄浦区中山东一路', 'zh-CN': '黄浦区中山东一路', en: 'Zhongshan Dong Yi Road, Huangpu District' },
    latitude: 31.2405,
    longitude: 121.4902,
    district: '黄浦区',
    poiType: '风景名胜',
    typeCode: '110000',
    photos: [
      'https://example.com/bund-1.jpg',
      'https://example.com/bund-2.jpg'
    ],
    tags: ['historical', 'night_view', 'architecture', 'free'],
    isFree: true,
    needTickets: false
  },
  {
    name: { zh: '东方明珠广播电视塔', 'zh-CN': '东方明珠塔', en: 'Oriental Pearl Tower' },
    description: {
      zh: '东方明珠塔矗立于上海浦东陆家嘴，塔高468米，是上海的标志性建筑之一。塔内设有观光厅、旋转餐厅和上海城市历史发展陈列馆。',
      'zh-CN': '东方明珠塔矗立于上海浦东陆家嘴...',
      en: 'Standing in Lujiazui, Pudong, the Oriental Pearl Tower is 468 meters high...'
    },
    address: { zh: '浦东新区世纪大道1号', 'zh-CN': '浦东新区世纪大道1号', en: 'No.1 Century Avenue, Pudong New Area' },
    latitude: 31.2397,
    longitude: 121.4998,
    district: '浦东新区',
    poiType: '旅游景点',
    typeCode: '110000',
    photos: [
      'https://example.com/pearl-1.jpg'
    ],
    tags: ['landmark', 'tower', 'view', 'tickets_required'],
    isFree: false,
    needTickets: true
  },
  {
    name: { zh: '豫园', 'zh-CN': '豫园', en: 'Yu Garden' },
    description: {
      zh: '豫园是明代江南园林的代表，始建于1559年，距今已有400多年历史。园内亭台楼阁、假山池塘布局精巧，体现了中国古典园林艺术的精华。',
      'zh-CN': '豫园是明代江南园林的代表...',
      en: 'Yu Garden is a classical Chinese garden built in the Ming Dynasty...'
    },
    address: { zh: '黄浦区安仁街218号', 'zh-CN': '黄浦区安仁街218号', en: 'No.218 Anren Street, Huangpu District' },
    latitude: 31.2277,
    longitude: 121.4854,
    district: '黄浦区',
    poiType: '风景名胜',
    typeCode: '110000',
    photos: [
      'https://example.com/yugarden-1.jpg'
    ],
    tags: ['historical', 'garden', 'culture', 'architecture'],
    isFree: false,
    needTickets: true
  },
  {
    name: { zh: '上海博物馆', 'zh-CN': '上海博物馆', en: 'Shanghai Museum' },
    description: {
      zh: '上海博物馆是一座面向世界的中国古代艺术博物馆，馆藏文物近102万件，其中珍贵文物逾14万件。建筑外观形似古代铜鼎，极具特色。',
      'zh-CN': '上海博物馆是一座面向世界的中国古代艺术博物馆...',
      en: 'Shanghai Museum is a world-oriented museum of ancient Chinese art...'
    },
    address: { zh: '黄浦区人民大道201号', 'zh-CN': '黄浦区人民大道201号', en: 'No.201 People's Avenue, Huangpu District' },
    latitude: 31.2304,
    longitude: 121.4736,
    district: '黄浦区',
    poiType: '博物馆',
    typeCode: '141200',
    photos: [
      'https://example.com/shmuseum-1.jpg'
    ],
    tags: ['museum', 'art', 'culture', 'historical', 'free'],
    isFree: true,
    needTickets: false
  },
  {
    name: { zh: '田子坊', 'zh-CN': '田子坊', en: 'Tianzifang' },
    description: {
      zh: '田子坊是上海最具特色的石库门里弄建筑群改造而成的时尚地标，汇聚了各种特色小店、咖啡馆、艺术工作室，充满老上海风情与文艺气息。',
      'zh-CN': '田子坊是上海最具特色的石库门里弄建筑群...',
      en: 'Tianzifang is a fashionable landmark transformed from Shikumen buildings...'
    },
    address: { zh: '黄浦区泰康路210弄', 'zh-CN': '黄浦区泰康路210弄', en: 'Lane 210, Taikang Road, Huangpu District' },
    latitude: 31.2168,
    longitude: 121.4771,
    district: '黄浦区',
    poiType: '特色街区',
    typeCode: '110000',
    photos: [
      'https://example.com/tianzifang-1.jpg'
    ],
    tags: ['culture', 'art', 'shopping', 'cafe', 'free'],
    isFree: true,
    needTickets: false
  },
  {
    name: { zh: '南京路步行街', 'zh-CN': '南京路步行街', en: 'Nanjing Road Pedestrian Street' },
    description: {
      zh: '南京路步行街是上海最繁华的商业街之一，全长约1.2公里，集购物、餐饮、娱乐于一体，被誉为"中华商业第一街"。',
      'zh-CN': '南京路步行街是上海最繁华的商业街之一...',
      en: 'Nanjing Road Pedestrian Street is one of the most prosperous commercial streets in Shanghai...'
    },
    address: { zh: '黄浦区南京东路', 'zh-CN': '黄浦区南京东路', en: 'East Nanjing Road, Huangpu District' },
    latitude: 31.2376,
    longitude: 121.4834,
    district: '黄浦区',
    poiType: '购物场所',
    typeCode: '060000',
    photos: [
      'https://example.com/nanjinglu-1.jpg'
    ],
    tags: ['shopping', 'food', 'landmark', 'free'],
    isFree: true,
    needTickets: false
  },
  {
    name: { zh: '陆家嘴金融中心', 'zh-CN': '陆家嘴金融中心', en: 'Lujiazui Financial Center' },
    description: {
      zh: '陆家嘴是中国改革开放的象征，也是上海建设国际金融中心的核心功能区。摩天大楼林立，夜景璀璨，被誉为"东方曼哈顿"。',
      'zh-CN': '陆家嘴是中国改革开放的象征...',
      en: 'Lujiazui is a symbol of China reform and opening-up...'
    },
    address: { zh: '浦东新区陆家嘴环路', 'zh-CN': '浦东新区陆家嘴环路', en: 'Lujiazui Ring Road, Pudong New Area' },
    latitude: 31.2398,
    longitude: 121.5015,
    district: '浦东新区',
    poiType: '地标建筑',
    typeCode: '110000',
    photos: [
      'https://example.com/lujiazui-1.jpg'
    ],
    tags: ['landmark', 'architecture', 'night_view', 'free'],
    isFree: true,
    needTickets: false
  },
  {
    name: { zh: '城隍庙', 'zh-CN': '城隍庙', en: 'City God Temple' },
    description: {
      zh: '城隍庙是上海著名的道观，已有近600年历史。周边形成的豫园商城是体验老上海年味的必去之地，小笼包、南翔馒头等美食闻名遐迩。',
      'zh-CN': '城隍庙是上海著名的道观...',
      en: 'City God Temple is a famous Taoist temple in Shanghai...'
    },
    address: { zh: '黄浦区方浜中路249号', 'zh-CN': '黄浦区方浜中路249号', en: 'No.249 Fangbang Middle Road, Huangpu District' },
    latitude: 31.2253,
    longitude: 121.4842,
    district: '黄浦区',
    poiType: '宗教场所',
    typeCode: '110000',
    photos: [
      'https://example.com/chenghuangmiao-1.jpg'
    ],
    tags: ['historical', 'culture', 'food', 'architecture'],
    isFree: false,
    needTickets: true
  },
  {
    name: { zh: '上海迪士尼乐园', 'zh-CN': '上海迪士尼乐园', en: 'Shanghai Disney Resort' },
    description: {
      zh: '上海迪士尼乐园是中国内地首座迪士尼主题乐园，包含七大主题园区，超过30个游乐项目，是家庭亲子游的理想选择。',
      'zh-CN': '上海迪士尼乐园是中国内地首座迪士尼主题乐园...',
      en: 'Shanghai Disney Resort is the first Disney theme park in mainland China...'
    },
    address: { zh: '浦东新区川沙镇黄赵路310号', 'zh-CN': '浦东新区川沙镇黄赵路310号', en: 'No.310 Huangzhao Road, Chuansha Town, Pudong' },
    latitude: 31.1435,
    longitude: 121.6587,
    district: '浦东新区',
    poiType: '主题乐园',
    typeCode: '110000',
    photos: [
      'https://example.com/disney-1.jpg'
    ],
    tags: ['theme_park', 'family', 'entertainment', 'tickets_required'],
    isFree: false,
    needTickets: true
  },
  {
    name: { zh: '新天地', 'zh-CN': '新天地', en: 'Xintiandi' },
    description: {
      zh: '新天地是以上海独特的石库门建筑旧区为基础改造而成的时尚休闲娱乐区，汇聚了世界各国的美食、酒吧和艺术展览，中西合璧，格调独特。',
      'zh-CN': '新天地是以上海独特的石库门建筑旧区为基础...',
      en: 'Xintiandi is a fashionable entertainment area based on Shikumen buildings...'
    },
    address: { zh: '黄浦区太仓路181弄', 'zh-CN': '黄浦区太仓路181弄', en: 'Lane 181, Taicang Road, Huangpu District' },
    latitude: 31.2226,
    longitude: 121.4715,
    district: '黄浦区',
    poiType: '特色街区',
    typeCode: '110000',
    photos: [
      'https://example.com/xintiandi-1.jpg'
    ],
    tags: ['nightlife', 'food', 'cafe', 'culture', 'art'],
    isFree: true,
    needTickets: false
  }
]

// 标签映射
const TAG_MAP: Record<string, { tagCode: string; tagName: { zh: string }; category: string }> = {
  'historical': { tagCode: 'historical', tagName: { zh: '历史建筑' }, category: 'theme' },
  'night_view': { tagCode: 'night_view', tagName: { zh: '夜景' }, category: 'theme' },
  'architecture': { tagCode: 'architecture', tagName: { zh: '建筑艺术' }, category: 'theme' },
  'free': { tagCode: 'free', tagName: { zh: '免费景点' }, category: 'theme' },
  'landmark': { tagCode: 'landmark', tagName: { zh: '地标建筑' }, category: 'theme' },
  'tower': { tagCode: 'tower', tagName: { zh: '观光塔' }, category: 'theme' },
  'view': { tagCode: 'view', tagName: { zh: '观景胜地' }, category: 'theme' },
  'tickets_required': { tagCode: 'tickets_required', tagName: { zh: '需购票' }, category: 'theme' },
  'garden': { tagCode: 'garden', tagName: { zh: '园林' }, category: 'theme' },
  'culture': { tagCode: 'culture', tagName: { zh: '文化体验' }, category: 'theme' },
  'museum': { tagCode: 'museum', tagName: { zh: '博物馆' }, category: 'theme' },
  'art': { tagCode: 'art', tagName: { zh: '艺术展览' }, category: 'theme' },
  'shopping': { tagCode: 'shopping', tagName: { zh: '购物娱乐' }, category: 'theme' },
  'food': { tagCode: 'food', tagName: { zh: '美食探店' }, category: 'cuisine' },
  'cafe': { tagCode: 'cafe', tagName: { zh: '咖啡文化' }, category: 'cuisine' },
  'nightlife': { tagCode: 'nightlife', tagName: { zh: '夜生活' }, category: 'mood' },
  'theme_park': { tagCode: 'theme_park', tagName: { zh: '主题乐园' }, category: 'theme' },
  'family': { tagCode: 'family', tagName: { zh: '亲子游' }, category: 'intensity' }
}

async function main() {
  console.log('开始初始化POI数据...')

  // 1. 创建/更新标签
  console.log('创建标签...')
  for (const [code, tag] of Object.entries(TAG_MAP)) {
    await prisma.tagInfo.upsert({
      where: { tagCode: code },
      create: {
        tagCode: tag.tagCode,
        tagName: tag.tagName as any,
        category: tag.category,
        level: 1,
        status: 1
      },
      update: {
        tagName: tag.tagName as any,
        category: tag.category
      }
    })
  }

  // 2. 创建POI
  console.log('创建POI...')
  for (const poiData of SHANGHAI_POIS) {
    const poiUuid = `shanghai_${poiData.name['zh-CN'].toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`

    const poi = await prisma.poiInfo.upsert({
      where: { poiUuid },
      create: {
        poiUuid,
        poiName: poiData.name as any,
        description: poiData.description as any,
        address: poiData.address as any,
        latitude: poiData.latitude,
        longitude: poiData.longitude,
        district: poiData.district,
        poiType: poiData.poiType,
        typeCode: poiData.typeCode,
        photos: poiData.photos as any,
        isFree: poiData.isFree ? 1 : 0,
        needTickets: poiData.needTickets ? 1 : 0,
        status: 1
      },
      update: {}
    })

    // 3. 创建POI与标签的关联
    for (const tagCode of poiData.tags) {
      const tag = await prisma.tagInfo.findUnique({ where: { tagCode } })
      if (tag) {
        await prisma.poiTagRel.upsert({
          where: {
            poiId_tagId: { poiId: poi.id, tagId: tag.id }
          },
          create: {
            poiId: poi.id,
            tagId: tag.id,
            weight: 0.8
          },
          update: {}
        })
      }
    }

    // 4. 创建POI统计记录
    await prisma.poiStats.upsert({
      where: { poiId: poi.id },
      create: {
        poiId: poi.id,
        heatScore: Math.random() * 50 + 50,  // 随机热度50-100
        visitCount: Math.floor(Math.random() * 1000)
      },
      update: {}
    })

    console.log(`  ✅ 创建POI: ${poiData.name.zh}`)
  }

  console.log('POI数据初始化完成！')
  console.log(`共创建 ${SHANGHAI_POIS.length} 个POI`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### 9.4 Embedding初始化脚本

```typescript
// scripts/generate-poi-embeddings.ts

import { PrismaClient } from '@prisma/client'
import { callQwen } from '../src/external/qwen'

const prisma = new PrismaClient()

const BATCH_SIZE = 10  // 每批处理数量，避免API限流
const DELAY_MS = 500   // 请求间隔（毫秒）

interface EmbeddingResponse {
  output: {
    embedding: number[]
  }
}

/**
 * 调用通义千问embedding接口
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await callQwen({
      messages: [
        {
          role: 'user',
          content: `请为以下文本生成embedding向量（仅返回JSON数组格式的向量）：\n\n${text}`
        }
      ]
    })

    // 尝试解析返回的文本为向量
    // 如果返回的是普通文本，需要调用专门的embedding API
    // 这里假设有text-embedding-v3接口
    const embeddingResult = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        model: 'text-embedding-v3',
        input: { text },
        parameters: { result_format: 'message' }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DASHSCOPE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    return embeddingResult.data.output.embedding
  } catch (error) {
    console.error('生成embedding失败:', error)
    throw error
  }
}

/**
 * 为POI生成文本内容
 */
function buildPOIText(poi: any): string {
  const parts: string[] = []

  // 名称
  const name = typeof poi.poiName === 'string'
    ? poi.poiName
    : poi.poiName?.zh || poi.poiName?.['zh-CN'] || ''
  parts.push(`景点名称：${name}`)

  // 描述
  const desc = typeof poi.description === 'string'
    ? poi.description
    : poi.description?.zh || poi.description?.['zh-CN'] || ''
  if (desc) parts.push(`景点描述：${desc}`)

  // 标签
  if (poi.poiTags?.length > 0) {
    const tagNames = poi.poiTags.map((rel: any) => {
      const tag = rel.tag
      return typeof tag.tagName === 'string'
        ? tag.tagName
        : tag.tagName?.zh || tag.tagName?.['zh-CN'] || ''
    }).filter(Boolean)
    parts.push(`景点标签：${tagNames.join('、')}`)
  }

  // 类型
  if (poi.poiType) {
    parts.push(`景点类型：${poi.poiType}`)
  }

  // 地区
  if (poi.district) {
    parts.push(`所在地区：${poi.district}`)
  }

  return parts.join('\n')
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('开始生成POI embedding向量...')

  // 获取所有POI
  const pois = await prisma.poiInfo.findMany({
    where: { status: 1 },
    include: { poiTags: { include: { tag: true } } }
  })

  console.log(`共 ${pois.length} 个POI需要生成embedding`)

  let successCount = 0
  let failCount = 0

  // 分批处理
  for (let i = 0; i < pois.length; i += BATCH_SIZE) {
    const batch = pois.slice(i, i + BATCH_SIZE)
    console.log(`\n处理批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(pois.length / BATCH_SIZE)}`)

    for (const poi of batch) {
      try {
        const text = buildPOIText(poi)
        console.log(`  生成 ${poi.poiName?.zh || poi.poiName} 的embedding...`)

        const embedding = await generateEmbedding(text)

        // 存储embedding（使用JSON格式存储）
        await prisma.poiInfo.update({
          where: { id: poi.id },
          data: {
            embedding: embedding as any
          }
        })

        successCount++
        console.log(`  ✅ 成功`)
      } catch (error) {
        failCount++
        console.error(`  ❌ 失败:`, error)
      }

      // 请求间隔
      if (i + batch.indexOf(batch[batch.length - 1]) < pois.length - 1) {
        await sleep(DELAY_MS)
      }
    }
  }

  console.log(`\n========== 完成 ==========`)
  console.log(`成功: ${successCount}`)
  console.log(`失败: ${failCount}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

### 9.5 数据库字段扩展

```prisma
// schema.prisma - 添加embedding字段

model PoiInfo {
  // ... 现有字段 ...

  embedding     Json?    @map("embedding")  // 文本向量，1024维

  // 关联关系
  poiTags       PoiTagRel[]
  stats         PoiStats?
  tickets       TicketInfo[]
  openingTimes  OpeningTime[]
}
```

---

## 十、待完善功能

| 功能 | 优先级 | 说明 |
|------|--------|------|
| **POI数据初始化** | P0 | 数据库暂无数据，需运行初始化脚本 |
| **POI Embedding生成** | P0 | 需调用通义千问API生成文本向量 |
| AI路线生成对接 | P0 | 目前返回mock数据，需对接通义千问 |
| 热力图Canvas渲染 | P1 | 当前热力图开关未实际渲染 |
| 语音识别完善 | P1 | 需接入微信同声传译插件 |
| 公交换乘方案UI | P2 | 换乘方案面板交互优化 |
| 实时路况 | P2 | 显示交通拥堵情况 |
| AR导览 | P3 | AR场景识别导航 |

### 10.1 快速启动步骤

```bash
# 1. 安装依赖
cd backend
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑.env，填写必要的API Key

# 3. 数据库迁移
npx prisma generate
npx prisma migrate dev

# 4. 初始化POI数据
npx ts-node scripts/init-poi-data.ts

# 5. 生成POI Embedding（如需向量推荐）
npx ts-node scripts/generate-poi-embeddings.ts

# 6. 启动服务
npm run dev
```
