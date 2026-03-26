# 用户端（微信小程序）详细需求文档

## 简介

用户端是智慧旅游平台面向游客的微信小程序，采用原生开发，提供 AI 智能推荐、路线规划、地图打卡、内容分享等核心功能。

**技术栈**：
- uni-app（Vue 3 + Vite）开发
- 发布目标：微信小程序 + H5（可选：APP、支付宝小程序）
- UI 框架：uni-ui 组件库
- 状态管理：Pinia
- 高德地图：uni-app map 组件 + 高德地图插件

**地图服务说明**：
- 使用高德地图作为地图画布和地图服务提供商
- uni-app 的 `<map>` 组件完美支持高德地图
- 需申请高德开放平台微信小程序 Key（已配置：8929223e5d738fc0d2f2d875717fc56b）
- 支持地图展示、POI 搜索、路径规划、热力图等功能

**uni-app 开发说明**：
- 使用 Vue 3 Composition API（`<script setup>`）
- 支持条件编译，针对不同平台优化
- 使用 HBuilderX 或 VS Code + uni-app 插件开发
- 一套代码可同时发布微信小程序和 H5，便于演示

**核心价值**：
- 解决传统旅游规划信息碎片化问题
- 提供个性化 AI 推荐和路线规划
- 支持多语言国际化，服务全球游客
- 打卡防刷评机制，保证内容真实性

**地图服务集成**：
详细的高德地图集成文档请参考：[高德地图集成文档](./amap-integration.md)
（注：文档中的原生小程序示例代码可直接用于 uni-app，语法完全兼容）

**uni-app 技术选型说明**：
详细的技术选型分析请参考：[技术选型建议](./tech-stack-recommendation.md)

---

## 功能模块划分

### 1. 用户认证与偏好模块
- 微信登录
- 冷启动偏好收集
- 语言切换
- 个人信息管理

### 2. AI 推荐与路线规划模块
- 智能 POI 推荐
- 语音/文字路线规划
- 路线详情展示
- 路线编辑与保存

### 3. 地图与导航模块
- 地图 POI 展示
- 热力图图层
- 打卡功能
- 路线导航

### 4. 内容与社区模块
- 评论发布
- Vlog/图文浏览
- 官方内容推荐
- 内容搜索

### 5. 行程管理模块
- 我的路线
- 打卡记录
- 行程海报生成
- 分享功能

---

## 详细功能需求

### 需求 1.1：微信登录与账号绑定

**用户故事**：作为游客，我希望使用微信快速登录小程序，无需注册账号，以便快速开始使用。

#### 验收标准

1. WHEN 用户首次打开小程序，THE Mini_App SHALL 调用 uni.login() 获取用户临时登录凭证 code
2. THE Mini_App SHALL 将 code 发送至后端，后端通过微信服务器换取 openid 和 session_key
3. WHEN 后端成功获取 openid，THE Mini_App SHALL 在 user 表中创建或更新用户记录
4. THE Mini_App SHALL 将后端返回的 JWT Token 存储在 uni.setStorageSync() 中
5. WHEN 用户授权获取微信昵称和头像，THE Mini_App SHALL 调用 uni.getUserProfile() 获取用户信息
6. THE Mini_App SHALL 更新 user 表的 nickname 和 avatar 字段
7. IF 用户拒绝授权，THEN THE Mini_App SHALL 使用默认昵称"游客"和默认头像
8. THE Mini_App SHALL 在每次 API 请求时携带 JWT Token 进行身份验证

**uni-app API 说明**：
- `uni.login()`：替代微信原生的 `wx.login()`
- `uni.getUserProfile()`：替代微信原生的 `wx.getUserProfile()`
- `uni.setStorageSync()`：替代微信原生的 `wx.setStorageSync()`

**交互流程**：
```
用户打开小程序 → 自动调用uni.login() → 后端验证 → 返回Token → 存储Token → 进入首页
```

**代码示例**：
```vue
<script setup>
import { onLaunch } from '@dcloudio/uni-app';

onLaunch(() => {
  // 微信登录
  uni.login({
    provider: 'weixin',
    success: (loginRes) => {
      // 发送 code 到后端
      uni.request({
        url: 'https://api.example.com/auth/login',
        method: 'POST',
        data: { code: loginRes.code },
        success: (res) => {
          // 存储 Token
          uni.setStorageSync('token', res.data.token);
        }
      });
    }
  });
});
</script>
```

---

### 需求 1.2：冷启动偏好收集弹窗

**用户故事**：作为新游客，我希望首次使用时能快速设置我的旅游偏好，以便获得个性化推荐。

#### 验收标准

1. WHEN 用户首次启动小程序且 user_prefer 表中无该用户记录，THE Mini_App SHALL 展示全屏偏好收集弹窗
2. THE Mini_App SHALL 在弹窗中展示以下选项：
   - **步骤1 - 国籍选择**（单选）：
     - 日韩（图标：🇯🇵🇰🇷）
     - 国内（图标：🇨🇳）
     - 欧美（图标：🇺🇸🇪🇺）
     - 本地（图标：📍）
   - **步骤2 - 活动强度**（单选）：
     - 暴走特种兵（图标：🏃，描述：高强度，每天8+景点）
     - 休闲漫步（图标：🚶，描述：中等强度，每天3-5景点）
     - 深度体验（图标：🧘，描述：低强度，每天1-2景点）
   - **步骤3 - 旅游偏好**（多选，至少选1个）：
     - 历史建筑 🏛️
     - 自然风光 🌄
     - 美食探店 🍜
     - 咖啡文化 ☕
     - 艺术展览 🎨
     - 购物娱乐 🛍️
     - 夜生活 🌃
     - 亲子游 👨‍👩‍👧
3. THE Mini_App SHALL 使用分步表单（Stepper）展示3个步骤，支持"上一步"和"下一步"按钮
4. WHEN 用户完成所有步骤并点击"完成"，THE Mini_App SHALL 调用 POST /api/user/preference 接口提交数据
5. WHEN 提交成功，THE Mini_App SHALL 将偏好数据写入 user_prefer 表并关闭弹窗
6. WHEN 用户点击弹窗右上角"跳过"按钮，THE Mini_App SHALL 记录跳过状态，下次启动时重新展示
7. IF 提交失败（网络错误），THEN THE Mini_App SHALL 将偏好数据缓存到本地 Storage，并在下次网络恢复时自动重试
8. THE Mini_App SHALL 根据用户选择的国籍自动设置默认语言：
   - 日韩 → 日文/韩文（根据系统语言判断）
   - 国内 → 中文简体
   - 欧美 → 英文
   - 本地 → 中文简体

**UI设计要点**：
- 使用卡片式设计，每个选项带图标和描述
- 步骤指示器显示当前进度（1/3, 2/3, 3/3）
- 选中状态使用主题色高亮边框
- 底部固定"上一步"、"下一步"、"完成"按钮

---

### 需求 1.3：多语言切换

**用户故事**：作为外籍游客，我希望能随时切换小程序的显示语言，以便更好地理解内容。

#### 验收标准

1. THE Mini_App SHALL 在"我的"页面提供语言切换入口
2. THE Mini_App SHALL 支持以下2种语言：
   - 中文简体（zh-CN）
   - English（en-US）
3. WHEN 用户选择语言后，THE Mini_App SHALL 将语言代码存储到 uni.setStorageSync('locale', languageCode)
4. THE Mini_App SHALL 立即刷新当前页面，使用新语言重新渲染所有文本
5. THE Mini_App SHALL 从以下来源读取多语言文本：
   - 界面文本：从本地 i18n 配置文件读取（如 `/locale/zh-CN.json`）
   - POI 名称：从 poi_info.poi_name JSON 字段读取对应语言
   - 标签名称：从 tag_info.tag_name JSON 字段读取对应语言
   - 票务信息：从 ticket_info.ticket_name JSON 字段读取对应语言
6. IF 某个字段的目标语言为空，THEN THE Mini_App SHALL 回退展示中文简体内容
7. THE Mini_App SHALL 在所有 API 请求的 Header 中携带 `Accept-Language` 字段，值为当前语言代码

**uni-app 国际化方案**：
```vue
<template>
  <view>
    <text>{{ $t('common.confirm') }}</text>
  </view>
</template>

<script setup>
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

const changeLanguage = (lang) => {
  locale.value = lang;
  uni.setStorageSync('locale', lang);
};
</script>
```

**i18n 配置文件示例**：
```json
// /locale/zh-CN.json
{
  "common": {
    "confirm": "确认",
    "cancel": "取消",
    "loading": "加载中..."
  },
  "home": {
    "title": "首页",
    "recommend": "为你推荐"
  }
}
```

---

### 需求 1.4：个人信息管理

**用户故事**：作为用户，我希望能查看和编辑我的个人信息，以便保持资料最新。

#### 验收标准

1. THE Mini_App SHALL 在"我的"页面展示用户头像、昵称、手机号（脱敏）
2. WHEN 用户点击"编辑资料"，THE Mini_App SHALL 跳转到个人信息编辑页
3. THE Mini_App SHALL 允许用户修改以下信息：
   - 昵称（1-20字符）
   - 头像（调用 wx.chooseImage 上传）
   - 手机号（调用 wx.getPhoneNumber 获取）
4. WHEN 用户点击"保存"，THE Mini_App SHALL 调用 PUT /api/user/profile 接口更新数据
5. WHEN 更新成功，THE Mini_App SHALL 显示"保存成功"提示并返回"我的"页面
6. THE Mini_App SHALL 在"我的"页面提供"修改偏好"入口，点击后重新展示偏好收集弹窗
7. THE Mini_App SHALL 在"我的"页面展示用户统计数据：
   - 打卡次数（来自 check_info 表）
   - 评论数量（来自 comment_info 表）
   - 路线数量（来自 routes_info 表）

---

### 需求 2.1：首页智能 POI 推荐

**用户故事**：作为游客，我希望打开小程序首页就能看到适合我的景点推荐，无需手动搜索。

#### 验收标准

1. WHEN 用户进入首页，THE Mini_App SHALL 自动调用 GET /api/poi/recommend 接口获取推荐 POI
2. THE Mini_App SHALL 在请求中携带用户偏好信息（从 user_prefer 表读取）
3. THE Mini_App SHALL 展示5个推荐 POI，每个 POI 卡片包含：
   - POI 封面图（从 photos JSON 字段取第一张）
   - POI 名称（多语言）
   - POI 地址（多语言）
   - 推荐理由（LLM 生成，不少于20字）
   - 距离（根据用户当前位置计算）
   - 热力指数（heat_score，显示为🔥图标数量）
4. WHEN 用户下拉刷新，THE Mini_App SHALL 重新请求推荐接口获取新的推荐列表
5. WHEN 用户点击某个 POI 卡片，THE Mini_App SHALL 跳转到 POI 详情页
6. THE Mini_App SHALL 在推荐列表上方展示轮播图，展示官方内容（来自 official_content 表）
7. IF 推荐接口返回失败，THEN THE Mini_App SHALL 展示默认推荐列表（热门 POI，按 heat_score 排序）

**后端推荐逻辑**：
```
1. 从 user_prefer 表读取用户偏好标签
2. 从 poi_tag_rel 表按标签粗筛候选 POI（匹配权重 weight > 0.5）
3. 按 heat_score 降序排序，取前 50 个
4. 将候选 POI 列表提交给 LLM，精选 5 个最优点位
5. LLM 返回推荐理由
6. 校验推荐 POI 的 poi_uuid 在数据库中存在
7. 返回推荐结果
```

---

### 需求 2.2：AI 路线规划（文字输入）

**用户故事**：作为游客，我希望通过文字描述我的旅游需求，让 AI 自动生成完整的旅游路线。

#### 验收标准

1. THE Mini_App SHALL 在首页提供"AI 规划路线"入口按钮
2. WHEN 用户点击按钮，THE Mini_App SHALL 跳转到路线规划页
3. THE Mini_App SHALL 在路线规划页展示文本输入框，提示文案："告诉我你的旅游需求，例如：我想在上海玩3天，喜欢历史建筑和美食"
4. THE Mini_App SHALL 提供快捷标签按钮（可选）：
   - 1天游 / 2天游 / 3天游
   - 历史文化 / 自然风光 / 美食探店
   - 亲子游 / 情侣游 / 独自旅行
5. WHEN 用户输入文字（至少10字）并点击"生成路线"，THE Mini_App SHALL 调用 POST /api/route/generate 接口
6. THE Mini_App SHALL 在请求中携带：
   - 用户输入文本（user_input）
   - 用户偏好信息（from_region, preference_tags）
   - 当前位置（longitude, latitude）
7. WHEN 后端开始处理，THE Mini_App SHALL 展示加载动画和提示文案："AI 正在为你规划路线，请稍候..."
8. WHEN 后端返回路线数据，THE Mini_App SHALL 跳转到路线详情页展示结果
9. IF 后端返回错误（如"无法匹配到合适的 POI"），THEN THE Mini_App SHALL 展示错误提示并建议用户修改需求
10. THE Mini_App SHALL 支持路线生成历史记录，用户可查看最近5条生成记录
11. THE Mini_App SHALL 仅支持单轮路线生成，不支持基于上次结果的追问或修改对话；如需调整路线，用户应使用"编辑路线"功能（需求2.5）或重新输入需求生成新路线

**后端路线生成逻辑**：
```
1. 使用 NLP 解析用户输入，提取关键信息：
   - 天数（total_days）
   - 偏好关键词（如"历史建筑"、"美食"）
   - 明确 POI 名称（如"外滩"、"南京路"）
2. 根据偏好关键词从 tag_info 表匹配标签
3. 从 poi_tag_rel 表按标签粗筛候选 POI
4. 如果用户输入包含明确 POI 名称，从 poi_info 表精确匹配
5. 按 heat_score 降序排序，取前 50 个候选 POI
6. 将候选 POI 列表和用户画像提交给 LLM，使用提示词模板生成路线
7. LLM 返回结构化路线数据（JSON 格式）
8. 校验路线中所有 POI 的 poi_uuid 在数据库中存在
9. 将路线数据写入 routes_info 表
10. 返回路线 ID 和详情
```

---

### 需求 2.3：AI 路线规划（语音输入）

**用户故事**：作为游客，我希望通过语音描述我的旅游需求，更方便快捷地生成路线。

#### 验收标准

1. THE Mini_App SHALL 在路线规划页提供"语音输入"按钮（麦克风图标）
2. WHEN 用户点击按钮，THE Mini_App SHALL 调用 uni.startRecord() 开始录音
3. THE Mini_App SHALL 展示录音动画和提示文案："正在录音，松开结束"
4. WHEN 用户松开按钮，THE Mini_App SHALL 调用 uni.stopRecord() 停止录音并获取音频文件路径
5. THE Mini_App SHALL 调用 POST /api/voice/recognize 接口上传音频文件
6. THE Mini_App SHALL 在上传过程中展示"识别中..."加载动画
7. WHEN 后端返回识别文本，THE Mini_App SHALL 将文本填充到输入框中
8. THE Mini_App SHALL 允许用户编辑识别文本后再提交
9. IF 识别失败（如音频质量差），THEN THE Mini_App SHALL 提示"识别失败，请重试"
10. THE Mini_App SHALL 支持最长60秒录音

**uni-app 录音 API**：
```vue
<template>
  <button @touchstart="startRecord" @touchend="stopRecord">
    按住说话
  </button>
</template>

<script setup>
const recorderManager = uni.getRecorderManager();

const startRecord = () => {
  recorderManager.start({
    duration: 60000, // 最长60秒
    format: 'mp3'
  });
};

const stopRecord = () => {
  recorderManager.stop();
};

recorderManager.onStop((res) => {
  const tempFilePath = res.tempFilePath;
  // 上传音频文件
  uni.uploadFile({
    url: 'https://api.example.com/voice/recognize',
    filePath: tempFilePath,
    name: 'audio',
    success: (uploadRes) => {
      const text = JSON.parse(uploadRes.data).text;
      console.log('识别结果:', text);
    }
  });
});
</script>
```

**后端语音识别逻辑**：
```
1. 接收音频文件（支持 mp3、wav 格式）
2. 调用第三方语音识别 API（如百度语音、讯飞语音）
3. 返回识别文本
```

---

### 需求 2.4：路线详情展示

**用户故事**：作为游客，我希望查看 AI 生成的路线详情，包括每天的行程安排和 POI 信息。

#### 验收标准

1. WHEN 用户进入路线详情页，THE Mini_App SHALL 从 routes_info 表读取路线数据
2. THE Mini_App SHALL 在页面顶部展示路线概览：
   - 路线名称（route_name）
   - 总天数（total_days）
   - POI 数量（poi_list 长度）
   - 生成时间（created_at）
3. THE Mini_App SHALL 按天展示行程安排，每天包含：
   - 日期标题（如"第1天"）
   - 该天的 POI 列表（按游览顺序排列）
4. THE Mini_App SHALL 为每个 POI 展示卡片，包含：
   - POI 封面图
   - POI 名称（多语言）
   - 推荐理由（LLM 生成）
   - 建议停留时长（如"2小时"）
   - 开放时间（从 opening_time 表读取）
   - 票务状态（从 ticket_info 表读取，Mock 数据）
     - 需要门票：显示票价和余票数量
     - 免费：显示"免费开放"
   - 操作按钮：
     - "查看详情"：跳转到 POI 详情页
     - "导航"：调用地图导航
5. THE Mini_App SHALL 在页面底部展示地图，标记所有 POI 位置并绘制路径连线
6. THE Mini_App SHALL 提供"保存路线"按钮，点击后将路线保存到"我的路线"
7. THE Mini_App SHALL 提供"分享路线"按钮，点击后生成海报或分享卡片
8. THE Mini_App SHALL 提供"编辑路线"按钮，允许用户调整 POI 顺序或删除 POI

**地图展示要求**：
- 使用高德地图 SDK 渲染地图
- POI 标记使用数字标记（1、2、3...）表示游览顺序
- 路径连线使用虚线，颜色为主题色
- 支持点击标记查看 POI 简要信息

---

### 需求 2.5：路线编辑功能

**用户故事**：作为游客，我希望能调整 AI 生成的路线，删除不感兴趣的景点或调整顺序。

#### 验收标准

1. WHEN 用户在路线详情页点击"编辑路线"，THE Mini_App SHALL 进入编辑模式
2. THE Mini_App SHALL 在编辑模式下为每个 POI 卡片添加：
   - 删除按钮（❌图标）
   - 拖拽手柄（☰图标）
3. WHEN 用户点击删除按钮，THE Mini_App SHALL 弹出确认对话框："确定删除该景点吗？"
4. WHEN 用户确认删除，THE Mini_App SHALL 从 poi_list 中移除该 POI 并刷新页面
5. WHEN 用户长按拖拽手柄，THE Mini_App SHALL 允许用户拖动 POI 卡片调整顺序
6. THE Mini_App SHALL 实时更新地图上的标记顺序和路径连线
7. THE Mini_App SHALL 在编辑模式下提供"添加景点"按钮
8. WHEN 用户点击"添加景点"，THE Mini_App SHALL 展示 POI 搜索页，允许用户搜索并添加新 POI
9. THE Mini_App SHALL 在编辑模式下提供"保存"和"取消"按钮
10. WHEN 用户点击"保存"，THE Mini_App SHALL 调用 PUT /api/route/:id 接口更新路线数据
11. WHEN 更新成功，THE Mini_App SHALL 退出编辑模式并刷新页面
12. WHEN 用户点击"取消"，THE Mini_App SHALL 放弃所有修改并退出编辑模式

---

### 需求 3.1：地图首页与 POI 展示

**用户故事**：作为游客，我希望在地图上直观看到所有景点的分布，方便我规划行程。

#### 验收标准

1. THE Mini_App SHALL 提供"地图"Tab 页，使用 uni-app 的 `<map>` 组件渲染地图
2. THE Mini_App SHALL 使用高德地图 GCJ-02 坐标系（火星坐标系）
3. WHEN 用户进入地图页，THE Mini_App SHALL 调用 uni.getLocation() 自动定位到用户当前位置
4. THE Mini_App SHALL 调用 GET /api/poi/nearby 接口获取附近 POI 列表（半径5公里内）
5. THE Mini_App SHALL 在地图上标记所有 POI，使用不同颜色图标区分类型：
   - 🏛️ 历史建筑：红色
   - 🌄 自然风光：绿色
   - 🍜 美食：橙色
   - ☕ 咖啡：棕色
   - 🎨 艺术：紫色
   - 其他：灰色
6. WHEN 用户点击 POI 标记，THE Mini_App SHALL 展示 POI 简要信息气泡（callout）：
   - POI 名称
   - 距离
   - 热力指数
   - "查看详情"按钮
7. WHEN 用户点击"查看详情"，THE Mini_App SHALL 调用 uni.navigateTo() 跳转到 POI 详情页
8. THE Mini_App SHALL 支持地图缩放（scale: 3-20）和拖动，动态加载可视区域内的 POI
9. THE Mini_App SHALL 在地图右上角提供"定位"按钮，点击后调用 mapContext.moveToLocation() 回到用户当前位置
10. THE Mini_App SHALL 在地图右上角提供"图层"按钮，支持切换热力图图层
11. THE Mini_App SHALL 根据地图缩放级别调整标记点密度：
    - scale > 15：显示所有标记点
    - scale 12-15：显示热门标记点（heat_score > 60）
    - scale < 12：显示聚合标记点

**uni-app 地图组件示例**：
```vue
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
    @markertap="onMarkerTap"
    @regionchange="onRegionChange"
  >
    <!-- 定位按钮 -->
    <cover-view class="map-controls">
      <cover-view class="control-btn" @tap="onLocationTap">
        <cover-image src="/static/icon-location.png" />
      </cover-view>
    </cover-view>
  </map>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const longitude = ref(121.473701);
const latitude = ref(31.230416);
const scale = ref(13);
const markers = ref([]);
const mapContext = ref(null);

onMounted(() => {
  mapContext.value = uni.createMapContext('map');
  getUserLocation();
  loadNearbyPOI();
});

const getUserLocation = () => {
  uni.getLocation({
    type: 'gcj02',
    success: (res) => {
      longitude.value = res.longitude;
      latitude.value = res.latitude;
    }
  });
};

const onMarkerTap = (e) => {
  const markerId = e.detail.markerId;
  uni.navigateTo({
    url: `/pages/poi/detail?id=${markerId}`
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

**高德地图配置**：
- API Key：`8929223e5d738fc0d2f2d875717fc56b`
- uni-app 的 `<map>` 组件默认使用高德地图（微信小程序平台）
- 无需额外配置，直接使用即可

**详细实现**：参考 [高德地图集成文档](./amap-integration.md)（文档中的代码可直接用于 uni-app）

---

