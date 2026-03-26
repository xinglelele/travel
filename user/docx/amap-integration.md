# 高德地图集成文档（uni-app 版）

## 概述

用户端基于 **uni-app（Vue 3 + Vite）** 开发，使用高德地图作为地图画布和地图服务提供商，提供地图展示、POI 搜索、路径规划、热力图等核心功能。

uni-app 的 `<map>` 组件在微信小程序平台底层即为高德地图，无需额外配置地图引擎，只需申请高德 Key 并引入高德 SDK 即可使用路径规划、POI 搜索等扩展能力。

---

## 高德地图 SDK 集成

### 1. SDK 版本要求

- **SDK 版本**：高德地图微信小程序 SDK v1.2 或更高版本
- **下载地址**：https://lbs.amap.com/api/wx/summary
- **文档地址**：https://lbs.amap.com/api/wx/guide/create-project/get-key

### 2. 已配置的 Key 信息

- **API Key**：`8929223e5d738fc0d2f2d875717fc56b`
- **平台类型**：微信小程序
- **状态**：已激活

#### Key 使用注意事项

- ⚠️ 请勿将 Key 提交到公开的代码仓库
- ⚠️ 生产环境建议使用环境变量管理 Key
- ⚠️ 定期检查 Key 的调用量和配额使用情况
- ⚠️ 如 Key 泄露，请立即在高德平台重置

#### 配置文件

```javascript
// /utils/amap-config.js
export const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || '8929223e5d738fc0d2f2d875717fc56b';
export const AMAP_SDK_VERSION = '1.2.0';
```

### 3. SDK 引入

将下载的 `amap-wx.130.js` 放入 `/src/libs/` 目录，在需要使用路径规划、POI 搜索等功能的页面中引入：

```javascript
// /src/utils/amap.js —— 统一封装高德 SDK 实例
import AmapFile from '@/libs/amap-wx.130.js';
import { AMAP_KEY } from './amap-config';

let amapInstance = null;

export function getAmapManager() {
  if (!amapInstance) {
    amapInstance = new AmapFile.AMapWX({ key: AMAP_KEY });
  }
  return amapInstance;
}
```

---

## 核心功能实现（uni-app Vue 3 写法）

### 1. 地图组件配置

#### 基础地图模板

```vue
<!-- /src/pages/map/index.vue -->
<template>
  <map
    id="map"
    class="map-container"
    :longitude="longitude"
    :latitude="latitude"
    :scale="scale"
    :markers="markers"
    :polyline="polyline"
    :show-location="true"
    :enable-3D="true"
    :enable-overlooking="false"
    :enable-zoom="true"
    :enable-scroll="true"
    :enable-rotate="false"
    @markertap="onMarkerTap"
    @regionchange="onRegionChange"
    @tap="onMapTap"
  >
    <cover-view class="map-controls">
      <cover-view class="control-btn location-btn" @tap="onLocationTap">
        <cover-image src="/static/icon-location.png" />
      </cover-view>
      <cover-view class="control-btn layer-btn" @tap="onLayerTap">
        <cover-image src="/static/icon-layer.png" />
      </cover-view>
    </cover-view>
  </map>
</template>
```

#### 地图初始化

```vue
<script setup>
import { ref, onMounted } from 'vue';

const longitude = ref(121.473701); // 上海市中心经度
const latitude = ref(31.230416);   // 上海市中心纬度
const scale = ref(13);             // 缩放级别（3-20）
const markers = ref([]);
const polyline = ref([]);
let mapContext = null;

onMounted(() => {
  // 创建地图上下文
  mapContext = uni.createMapContext('map');
  getUserLocation();
  loadNearbyPOI();
});

// 获取用户位置
const getUserLocation = () => {
  uni.getLocation({
    type: 'gcj02', // 高德坐标系
    success: (res) => {
      longitude.value = res.longitude;
      latitude.value = res.latitude;
    },
    fail: () => {
      uni.showToast({ title: '定位失败，请授权位置权限', icon: 'none' });
    }
  });
};
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100vh;
}
</style>
```

---

### 2. POI 标记点展示

#### 标记点数据结构

```javascript
// POI 标记点格式（与原生小程序完全一致）
const buildMarker = (poi, index) => ({
  id: poi.id,
  longitude: poi.longitude,
  latitude: poi.latitude,
  iconPath: getMarkerIcon(poi.category),
  width: 30,
  height: 40,
  title: poi.poi_name.zh,
  callout: {
    content: `${poi.poi_name.zh} · ${poi.heat_score}🔥`,
    color: '#333333',
    fontSize: 12,
    borderRadius: 5,
    bgColor: '#FFFFFF',
    padding: 10,
    display: 'BYCLICK',
    textAlign: 'center'
  },
  label: {
    content: String(index + 1), // 路线顺序序号
    color: '#FFFFFF',
    fontSize: 14,
    x: 0,
    y: -10,
    borderRadius: 10,
    bgColor: '#FF5A5F',
    padding: 5
  }
});

const getMarkerIcon = (category) => {
  const iconMap = {
    history: '/static/marker-red.png',
    nature:  '/static/marker-green.png',
    food:    '/static/marker-orange.png',
    coffee:  '/static/marker-brown.png',
    art:     '/static/marker-purple.png',
    default: '/static/marker-gray.png'
  };
  return iconMap[category] || iconMap.default;
};
```

#### 加载附近 POI

```vue
<script setup>
const loadNearbyPOI = async () => {
  const [err, res] = await uni.request({
    url: `${import.meta.env.VITE_API_BASE}/api/poi/nearby`,
    method: 'GET',
    data: {
      longitude: longitude.value,
      latitude: latitude.value,
      radius: 5000
    }
  });

  if (!err && res.data?.code === 0) {
    markers.value = res.data.data.map((poi, index) => buildMarker(poi, index));
  }
};
</script>
```

---

### 3. 路径规划与绘制

#### 路径连线数据结构

```javascript
// polyline 格式（与原生小程序完全一致）
const buildPolyline = (points) => ([{
  points,           // [{ longitude, latitude }, ...]
  color: '#FF5A5F',
  width: 4,
  dottedLine: true,
  arrowLine: true,
  borderColor: '#FFFFFF',
  borderWidth: 1
}]);
```

#### 使用高德 SDK 规划路径

```vue
<script setup>
import { getAmapManager } from '@/utils/amap';

// 步行路径规划
const planWalkingRoute = (startPoint, endPoint) => {
  const amapManager = getAmapManager();

  amapManager.getWalkingRoute({
    origin: `${startPoint.longitude},${startPoint.latitude}`,
    destination: `${endPoint.longitude},${endPoint.latitude}`,
    success: (data) => {
      if (!data.paths?.length) return;

      const points = [];
      data.paths[0].steps.forEach(step => {
        step.polyline.split(';').forEach(point => {
          const [lng, lat] = point.split(',');
          points.push({ longitude: parseFloat(lng), latitude: parseFloat(lat) });
        });
      });

      polyline.value = buildPolyline(points);

      // 调整地图视野
      mapContext.includePoints({ points, padding: [50, 50, 50, 50] });
    },
    fail: (err) => {
      console.error('路径规划失败', err);
      uni.showToast({ title: '路径规划失败', icon: 'none' });
    }
  });
};

// 驾车路径规划
const planDrivingRoute = (startPoint, endPoint) => {
  const amapManager = getAmapManager();
  amapManager.getDrivingRoute({
    origin: `${startPoint.longitude},${startPoint.latitude}`,
    destination: `${endPoint.longitude},${endPoint.latitude}`,
    success: (data) => {
      // 处理逻辑同步行路径
    }
  });
};
</script>
```

---

### 4. POI 搜索

```vue
<script setup>
import { getAmapManager } from '@/utils/amap';

// 关键词搜索
const searchPOI = (keyword) => {
  const amapManager = getAmapManager();

  amapManager.getPoiAround({
    querykeywords: keyword,
    location: `${longitude.value},${latitude.value}`,
    radius: 5000,
    success: (data) => {
      if (data.poisData?.length) {
        const results = data.poisData.map(poi => ({
          id: poi.id,
          name: poi.name,
          address: poi.address,
          longitude: poi.location.split(',')[0],
          latitude: poi.location.split(',')[1],
          distance: poi.distance
        }));
        showSearchResults(results);
      } else {
        uni.showToast({ title: '未找到相关地点', icon: 'none' });
      }
    },
    fail: (err) => console.error('搜索失败', err)
  });
};

// 周边搜索（按类型）
const searchNearbyByType = (type) => {
  const amapManager = getAmapManager();
  amapManager.getPoiAround({
    querytypes: type,
    location: `${longitude.value},${latitude.value}`,
    radius: 3000,
    success: (data) => handleSearchResults(data.poisData)
  });
};
</script>
```

---

### 5. 地理编码与逆地理编码

```vue
<script setup>
import { getAmapManager } from '@/utils/amap';

// 地址转坐标
const geocodeAddress = (address) => {
  const amapManager = getAmapManager();
  amapManager.getRegeo({
    address,
    city: '上海',
    success: (data) => {
      if (data.geocodes?.length) {
        const [lng, lat] = data.geocodes[0].location.split(',');
        longitude.value = parseFloat(lng);
        latitude.value = parseFloat(lat);
      }
    }
  });
};

// 坐标转地址
const reverseGeocode = (lng, lat) => {
  const amapManager = getAmapManager();
  amapManager.getRegeo({
    location: `${lng},${lat}`,
    success: (data) => {
      if (data.regeocodeData) {
        const address = data.regeocodeData.formatted_address;
        const district = data.regeocodeData.addressComponent.district;
        showAddressInfo(address, district);
      }
    }
  });
};
</script>
```

---

### 6. 热力图实现

热力图通过 Canvas 叠加层实现（uni-app 与原生小程序方案相同）：

```vue
<template>
  <view class="map-wrapper">
    <map id="map" class="map-container" ... />
    <!-- Canvas 叠加层 -->
    <canvas
      v-if="heatmapVisible"
      canvas-id="heatmap-canvas"
      class="heatmap-canvas"
    />
  </view>
</template>

<script setup>
import { ref } from 'vue';

const heatmapVisible = ref(false);

// 渲染热力图
const renderHeatmap = (data) => {
  const ctx = uni.createCanvasContext('heatmap-canvas');

  data.forEach(point => {
    const { x, y } = convertToCanvasCoord(point.lng, point.lat);
    const radius = Math.max(20, point.count / 2);

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0,   'rgba(255, 0,   0,   0.8)'); // 高热度
    gradient.addColorStop(0.5, 'rgba(255, 165, 0,   0.6)'); // 中等
    gradient.addColorStop(1,   'rgba(255, 255, 0,   0.0)'); // 边缘透明

    ctx.setFillStyle(gradient);
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
  });

  ctx.draw();
};

// 获取热力图数据
const loadHeatmapData = async () => {
  const [err, res] = await uni.request({
    url: `${import.meta.env.VITE_API_BASE}/api/poi/heatmap`
  });
  if (!err) {
    heatmapVisible.value = true;
    renderHeatmap(res.data.data);
  }
};
</script>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
}
.map-container,
.heatmap-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
```

---

### 7. 地图交互事件

```vue
<script setup>
import { useRouter } from 'vue-router'; // uni-app 中用 uni.navigateTo

// 标记点点击
const onMarkerTap = (e) => {
  const markerId = e.detail.markerId;
  uni.navigateTo({ url: `/pages/poi/detail?id=${markerId}` });
};

// 地图区域变化（拖动/缩放结束后重新加载 POI）
const onRegionChange = (e) => {
  if (e.type === 'end') {
    mapContext.getCenterLocation({
      success: (res) => {
        loadNearbyPOI(res.longitude, res.latitude);
      }
    });
  }
};

// 地图空白区域点击
const onMapTap = (e) => {
  const { longitude: lng, latitude: lat } = e.detail;
  console.log('点击位置:', lng, lat);
};
</script>
```

---

### 8. 地图控制方法

```vue
<script setup>
// 回到用户当前位置
const onLocationTap = () => {
  mapContext.moveToLocation({
    longitude: longitude.value,
    latitude: latitude.value
  });
};

// 调整视野包含所有标记点
const fitAllMarkers = () => {
  const points = markers.value.map(m => ({
    longitude: m.longitude,
    latitude: m.latitude
  }));
  mapContext.includePoints({ points, padding: [50, 50, 50, 50] });
};

// 地图截图（用于海报生成）
const takeMapSnapshot = () => {
  mapContext.takeSnapshot({
    type: 'png',
    quality: 1.0,
    success: (res) => {
      generatePoster(res.tempFilePath);
    }
  });
};
</script>
```

---

### 9. 导航功能

```vue
<script setup>
// 调用系统地图导航（微信小程序调用微信内置地图）
const openNavigation = (poi) => {
  uni.openLocation({
    latitude: poi.latitude,
    longitude: poi.longitude,
    name: poi.poi_name.zh,
    address: poi.address.zh,
    scale: 18
  });
};
</script>
```

---

## API 与原生小程序对照表

| 功能 | 原生小程序 | uni-app |
|------|-----------|---------|
| 获取位置 | `wx.getLocation()` | `uni.getLocation()` |
| 创建地图上下文 | `wx.createMapContext()` | `uni.createMapContext()` |
| 发起请求 | `wx.request()` | `uni.request()` |
| 提示 | `wx.showToast()` | `uni.showToast()` |
| 页面跳转 | `wx.navigateTo()` | `uni.navigateTo()` |
| 打开导航 | `wx.openLocation()` | `uni.openLocation()` |
| 本地存储 | `wx.setStorageSync()` | `uni.setStorageSync()` |
| 生命周期 | `onReady()` | `onMounted()` |
| 数据绑定 | `this.setData({})` | `ref()` / `reactive()` |
| 高德 SDK | 直接引入 | 直接引入（完全兼容） |

> 高德 SDK（`amap-wx.130.js`）的所有方法调用方式与原生小程序完全一致，无需修改。

---

## 根据缩放级别动态加载标记点

```vue
<script setup>
const onRegionChange = (e) => {
  if (e.type === 'end' && e.causedBy === 'scale') {
    const currentScale = e.detail.scale;

    if (currentScale > 15) {
      loadAllMarkers();          // 显示所有标记点
    } else if (currentScale > 12) {
      loadHotMarkers();          // 仅显示热门（heat_score > 60）
    } else {
      loadClusteredMarkers();    // 聚合显示
    }
  }
};
</script>
```

---

## 高德地图 API 配额说明

- **日调用量**：每个 Key 每日免费 30 万次
- **并发量**：每秒最大 200 次
- **优化建议**：
  - 本地缓存 POI 数据（`uni.setStorageSync`），缓存有效期 30 分钟
  - 仅加载可视区域内的 POI
  - 地图截图结果缓存，避免重复生成

---

## 常见问题

### 地图不显示
- 检查高德 Key 是否正确，AppID 是否与高德平台绑定一致
- 确保 `.map-container` 设置了宽高（`width: 100%; height: 100vh`）

### 标记点不显示
- 检查 `markers` 数组格式，`iconPath` 图片路径需存在于 `/static/` 目录
- 坐标系必须为 GCJ-02

### 路径规划失败
- 确认高德 Key 已开通路径规划服务
- 检查起终点坐标是否有效

### 定位不准
- 使用 `type: 'gcj02'`，不要用 `wgs84`
- 室内环境精度会降低，提示用户开启 GPS

---

## 参考资源

- 高德开放平台：https://lbs.amap.com/
- uni-app map 组件文档：https://uniapp.dcloud.net.cn/component/map.html
- 高德微信小程序 SDK：https://lbs.amap.com/api/wx/summary
- 微信小程序地图组件：https://developers.weixin.qq.com/miniprogram/dev/component/map.html
