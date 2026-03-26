### 需求 3.2：热力图图层

**用户故事**：作为游客，我希望看到景点的人流热度分布，避开拥挤的地方。

#### 验收标准

1. WHEN 用户在地图页点击"图层"按钮并选择"热力图"，THE Mini_App SHALL 调用 GET /api/poi/heatmap 接口获取热力数据
2. THE Mini_App SHALL 根据 poi_stats.heat_score 数据生成热力点数据
3. THE Mini_App SHALL 使用 Canvas 叠加层渲染热力图（微信小程序地图组件不直接支持热力图）
4. THE Mini_App SHALL 根据热力值使用渐变色：
   - heat_score > 80：红色（rgba(255, 0, 0, 0.8)）- 高热度
   - heat_score 60-80：橙色（rgba(255, 165, 0, 0.6)）- 中等热度
   - heat_score < 60：黄色（rgba(255, 255, 0, 0.3)）- 低热度
5. THE Mini_App SHALL 支持热力图透明度调节（0.3-0.8）
6. WHEN 用户关闭热力图图层，THE Mini_App SHALL 隐藏 Canvas 叠加层并恢复普通地图视图
7. THE Mini_App SHALL 在热力图模式下提供图例说明，解释颜色含义
8. THE Mini_App SHALL 使用径向渐变（radialGradient）绘制热力点，半径根据 heat_score 动态调整
9. THE Mini_App SHALL 在地图区域变化时重新计算热力点的 Canvas 坐标并重绘

**热力图实现方案**：
- 方案1：使用 Canvas 叠加层绘制（推荐）
- 方案2：后端生成热力图瓦片图片，前端叠加显示
- 方案3：使用第三方热力图库（如 heatmap.js）

**详细实现**：参考 [高德地图集成文档](./amap-integration.md) 第6节

**性能优化**：
- 热力点数量 > 100 时，使用聚合算法合并
- 缓存热力图数据，避免频繁请求
- 使用离屏 Canvas 提升绘制性能

---

### 需求 3.3：POI 打卡功能

**用户故事**：作为游客，我希望到达景点后能打卡记录，证明我来过这里。

#### 验收标准

1. WHEN 用户在 POI 详情页或地图页点击"打卡"按钮，THE Mini_App SHALL 调用 wx.getLocation() 获取用户当前位置
2. THE Mini_App SHALL 计算用户位置与 POI 位置的距离（使用 Haversine 公式）
3. IF 距离 > 200 米，THEN THE Mini_App SHALL 提示"您距离该景点较远，无法打卡"
4. IF 距离 ≤ 200 米，THEN THE Mini_App SHALL 调用 POST /api/check/create 接口创建打卡记录
5. THE Mini_App SHALL 在请求中携带：
   - poi_id：POI ID
   - route_id：路线 ID（必填，打卡必须在路线上下文中进行）
   - longitude：用户经度
   - latitude：用户纬度
   - check_time：打卡时间
6. WHEN 打卡成功，THE Mini_App SHALL 展示打卡成功动画（如烟花特效）
7. THE Mini_App SHALL 在打卡成功后弹出"发表评论"引导，点击后跳转到评论发布页（携带 route_id）
8. THE Mini_App SHALL 在路线详情页中每个 POI 卡片上展示该路线下的打卡状态：
   - 已打卡：显示"已打卡 ✓"和打卡时间
   - 未打卡：显示"打卡"按钮
   - 注意：同一 POI 在不同路线下的打卡状态相互独立
9. THE Mini_App SHALL 在"我的"页面展示打卡记录列表，按时间倒序排列
10. THE Mini_App SHALL 支持打卡记录的地图视图，展示所有打卡点位

**防作弊机制**：
- 同一用户在同一路线下对同一POI只能打卡一次（`user_id + poi_id + route_id` 唯一）
- 后端校验 GPS 距离，防止虚假打卡
- 打卡记录包含经纬度，便于后续审计

---

### 需求 3.4：POI 详情页

**用户故事**：作为游客，我希望查看景点的详细信息，包括介绍、照片、开放时间、票务等。

#### 验收标准

1. WHEN 用户进入 POI 详情页，THE Mini_App SHALL 调用 GET /api/poi/:id 接口获取 POI 详细信息
2. THE Mini_App SHALL 在页面顶部展示 POI 照片轮播图（从 photos JSON 字段读取）
3. THE Mini_App SHALL 在照片轮播图中提供"街景"切换按钮，点击后展示该 POI 的街景图：
   - 街景图来源：调用高德地图静态街景 API（`https://restapi.amap.com/v3/staticmap`）或使用本地 Mock 图片
   - 展示格式：全屏图片，支持左右滑动切换多角度
   - IF 街景数据不可用，THEN THE Mini_App SHALL 隐藏街景按钮
4. THE Mini_App SHALL 展示以下基础信息：
   - POI 名称（多语言）
   - POI 地址（多语言）
   - 联系电话（可点击拨打）
   - 热力指数（🔥图标 + 数值）
   - 距离（根据用户当前位置计算）
5. THE Mini_App SHALL 展示 POI 描述（多语言，支持富文本）
6. THE Mini_App SHALL 展示开放时间信息：
   - 从 opening_time 表读取规则
   - 按 priority 排序，匹配当前日期
   - 显示今日开放时间（如"09:00-18:00"）
   - 如果今日闭馆，显示"今日闭馆"
7. THE Mini_App SHALL 展示票务信息：
   - 从 ticket_info 表读取（Mock 数据）
   - 显示票种、票价、余票数量
   - 如果免费，显示"免费开放"
   - 提供"购票"按钮（跳转到 official_url）
8. THE Mini_App SHALL 展示标签列表（从 poi_tag_rel 表读取，标签名称按当前语言展示）
9. THE Mini_App SHALL 在页面底部展示地图，标记 POI 位置
10. THE Mini_App SHALL 提供以下操作按钮：
    - 打卡：仅在从路线详情页进入时显示（携带 route_id），直接从地图/搜索进入时不显示打卡按钮
    - 导航：调用高德地图导航
    - 收藏：收藏该 POI（存储到本地或后端）
    - 分享：分享 POI 卡片
11. THE Mini_App SHALL 展示用户评论列表（最多显示3条，点击"查看更多"跳转到评论列表页）

---

### 需求 3.5：地图导航

**用户故事**：作为游客，我希望从当前位置导航到目标景点，获取路线指引。

#### 验收标准

1. WHEN 用户在 POI 详情页或地图页点击"导航"按钮，THE Mini_App SHALL 调用 uni.openLocation() 打开内置地图
2. THE Mini_App SHALL 传递以下参数：
   - latitude：POI 纬度（GCJ-02 坐标系）
   - longitude：POI 经度（GCJ-02 坐标系）
   - name：POI 名称
   - address：POI 地址
   - scale：地图缩放级别（默认18）
3. THE Mini_App SHALL 在内置地图中展示从用户当前位置到 POI 的导航路线
4. THE Mini_App SHALL 支持步行、驾车、公交三种导航方式（由系统地图提供）
5. IF 用户未授权位置权限，THEN THE Mini_App SHALL 提示"请授权位置权限以使用导航功能"
6. THE Mini_App SHALL 在地图页支持路径规划预览：
   - 调用后端 API 获取路径规划数据
   - 在地图上绘制路径连线（polyline）
   - 展示路径详情（总距离、预计时间）
7. THE Mini_App SHALL 调用 mapContext.includePoints() 调整地图视野包含起点和终点

**uni-app 导航示例**：
```vue
<template>
  <button @click="openNavigation">导航</button>
</template>

<script setup>
const openNavigation = () => {
  uni.openLocation({
    latitude: 31.230416,
    longitude: 121.473701,
    name: '外滩',
    address: '上海市黄浦区中山东一路',
    scale: 18,
    success: () => {
      console.log('打开导航成功');
    }
  });
};
</script>
```

**路径规划示例**：
```vue
<script setup>
const planRoute = async () => {
  const res = await uni.request({
    url: 'https://api.example.com/route/plan',
    data: {
      start: { lng: 121.473701, lat: 31.230416 },
      end: { lng: 121.480539, lat: 31.235929 }
    }
  });
  
  // 绘制路径
  polyline.value = [{
    points: res.data.points,
    color: '#FF5A5F',
    width: 4,
    dottedLine: true
  }];
};
</script>
```

**注意**：uni-app 的 `uni.openLocation()` 在不同平台会调用不同的地图：
- 微信小程序：调用微信内置地图
- H5：调用高德地图 H5 版
- APP：调用系统地图

---

### 需求 4.1：评论发布

**用户故事**：作为游客，我希望在打卡后发表评论，分享我的旅游体验。

#### 验收标准

1. WHEN 用户在路线详情页的 POI 卡片上点击"发表评论"，THE Mini_App SHALL 携带 route_id 和 poi_id 跳转到评论发布页
2. IF 用户从 POI 详情页直接点击"发表评论"（无 route_id），THEN THE Mini_App SHALL 提示"请先通过路线打卡后再评论"并拒绝进入评论页
3. WHEN 进入评论发布页，THE Mini_App SHALL 校验 check_info 表中是否存在 `user_id + poi_id + route_id` 的打卡记录：
   - IF 未打卡，THEN THE Mini_App SHALL 提示"需先打卡才能评论"并返回
   - IF 已打卡但已评论过，THEN THE Mini_App SHALL 提示"您已评论过该路线中的此景点"并返回
   - IF 已打卡且未评论，THEN THE Mini_App SHALL 展示评论发布表单
4. THE Mini_App SHALL 在评论发布页提供以下输入项：
   - 评分（1-5星，必填）
   - 评论内容（文本框，10-500字，必填）
   - 照片上传（最多9张，可选）
5. WHEN 用户点击"上传照片"，THE Mini_App SHALL 调用 wx.chooseImage() 选择照片
6. THE Mini_App SHALL 将照片上传到云存储或 OSS，获取图片 URL
7. WHEN 用户点击"发布"，THE Mini_App SHALL 调用 POST /api/comment/create 接口提交评论
8. THE Mini_App SHALL 在请求中携带：
   - poi_id：POI ID
   - route_id：路线 ID（必填）
   - content：评论内容
   - score：评分
   - images：图片 URL 列表（JSON 数组）
   - type：1（已提交）
9. WHEN 发布成功，THE Mini_App SHALL 显示"发布成功"提示并返回路线详情页
10. THE Mini_App SHALL 支持"保存草稿"功能，将 type 设为 0（草稿）
11. THE Mini_App SHALL 在"我的"页面展示草稿列表，用户可继续编辑或删除

**防刷评机制**：
- 评论入口仅在路线上下文中开放（必须携带 route_id）
- 后端校验 check_info 表，确认用户已在当前路线下打卡该POI（校验条件：`user_id + poi_id + route_id`）
- 同一用户在同一路线下对同一POI只能评论一次（由 comment_info 唯一索引保证）
- 用户在不同路线下打卡同一POI，可分别发表评论
- 评论内容进行敏感词过滤

---

### 需求 4.2：评论列表与详情

**用户故事**：作为游客，我希望查看其他用户对景点的评论，了解真实体验。

#### 验收标准

1. WHEN 用户在 POI 详情页点击"查看更多评论"，THE Mini_App SHALL 跳转到评论列表页
2. THE Mini_App SHALL 调用 GET /api/comment/list?poi_id=:id 接口获取评论列表
3. THE Mini_App SHALL 展示评论列表，每条评论包含：
   - 用户头像和昵称
   - 评分（星级）
   - 评论内容（超过3行折叠，点击"展开"查看全文）
   - 评论图片（最多显示3张，点击查看大图）
   - 发布时间（如"2天前"）
   - 商户回复（如果有）
4. THE Mini_App SHALL 支持评论排序：
   - 最新：按 created_at 倒序
   - 最热：按点赞数倒序（如果有点赞功能）
   - 高分优先：按 score 降序
5. THE Mini_App SHALL 支持评论筛选：
   - 全部评分
   - 5星好评
   - 1-2星差评
6. THE Mini_App SHALL 支持下拉刷新和上拉加载更多
7. WHEN 用户点击评论图片，THE Mini_App SHALL 调用 wx.previewImage() 预览大图
8. THE Mini_App SHALL 在评论列表顶部展示评分统计：
   - 平均评分（如"4.5分"）
   - 各星级评论数量分布（柱状图）

---

### 需求 4.3：内容推荐（Vlog / 图文）

**用户故事**：作为游客，我希望在小程序中看到其他用户的 Vlog 和图文内容，获取旅游灵感。

#### 验收标准

1. THE Mini_App SHALL 提供"发现"Tab 页，展示内容推荐
2. THE Mini_App SHALL 调用 GET /api/content/recommend 接口获取推荐内容
3. THE Mini_App SHALL 展示以下内容类型：
   - 用户评论（来自 comment_info 表，type=1）
   - 官方内容（来自 official_content 表，status=1）
4. THE Mini_App SHALL 优先展示官方内容（置顶）
5. THE Mini_App SHALL 使用瀑布流布局展示内容卡片，每个卡片包含：
   - 封面图（评论的第一张图片或官方内容的 cover_image）
   - 标题（评论的 POI 名称或官方内容的 title）
   - 摘要（评论内容前50字或官方内容摘要）
   - 作者头像和昵称
   - 点赞数和评论数（如果有）
6. WHEN 用户点击内容卡片，THE Mini_App SHALL 跳转到内容详情页
7. THE Mini_App SHALL 支持内容搜索，用户可按关键词搜索相关内容
8. THE Mini_App SHALL 支持内容分类筛选：
   - 全部
   - 历史建筑
   - 自然风光
   - 美食探店
   - 咖啡文化
   - 艺术展览

---

### 需求 4.4：官方内容详情

**用户故事**：作为游客，我希望查看政府发布的官方旅游内容，获取权威信息。

#### 验收标准

1. WHEN 用户点击官方内容卡片，THE Mini_App SHALL 调用 GET /api/content/:id 接口获取详情
2. THE Mini_App SHALL 展示以下信息：
   - 标题（多语言）
   - 发布时间
   - 浏览次数
   - 封面图
   - 正文内容（多语言，支持富文本）
   - 视频（如果 content_type 为 video）
3. IF content_type 为 video，THEN THE Mini_App SHALL 使用 <video> 组件播放视频
4. THE Mini_App SHALL 在内容底部展示关联 POI 列表（从 related_poi_ids 读取）
5. WHEN 用户点击关联 POI，THE Mini_App SHALL 跳转到 POI 详情页
6. THE Mini_App SHALL 提供"收藏"和"分享"按钮
7. THE Mini_App SHALL 在用户查看内容时调用 POST /api/content/:id/view 接口增加浏览次数

---

### 需求 5.1：我的路线

**用户故事**：作为游客，我希望查看我保存的所有旅游路线，方便随时查阅。

#### 验收标准

1. THE Mini_App SHALL 在"我的"页面提供"我的路线"入口
2. WHEN 用户点击入口，THE Mini_App SHALL 跳转到我的路线列表页
3. THE Mini_App SHALL 调用 GET /api/route/my 接口获取用户的路线列表
4. THE Mini_App SHALL 展示路线列表，每个路线卡片包含：
   - 路线名称
   - 总天数
   - POI 数量
   - 路线封面图（第一个 POI 的封面图）
   - 创建时间
   - 状态标签：
     - "已生成"（status=0）
     - "已完成"（status=1）
5. WHEN 用户点击路线卡片，THE Mini_App SHALL 跳转到路线详情页
6. THE Mini_App SHALL 支持路线搜索，用户可按路线名称搜索
7. THE Mini_App SHALL 支持路线删除，长按卡片弹出"删除"选项
8. WHEN 用户删除路线，THE Mini_App SHALL 调用 DELETE /api/route/:id 接口删除数据

---

### 需求 5.2：打卡记录

**用户故事**：作为游客，我希望查看我的所有打卡记录，回顾我的旅游足迹。

#### 验收标准

1. THE Mini_App SHALL 在"我的"页面提供"打卡记录"入口
2. WHEN 用户点击入口，THE Mini_App SHALL 跳转到打卡记录列表页
3. THE Mini_App SHALL 调用 GET /api/check/my 接口获取用户的打卡记录
4. THE Mini_App SHALL 展示打卡记录列表，每条记录包含：
   - POI 封面图
   - POI 名称
   - 打卡时间
   - 打卡位置（地址）
   - 关联路线（如果有）
5. THE Mini_App SHALL 支持按时间筛选：
   - 全部
   - 最近7天
   - 最近30天
   - 自定义时间范围
6. THE Mini_App SHALL 提供"地图视图"切换按钮
7. WHEN 用户切换到地图视图，THE Mini_App SHALL 在地图上标记所有打卡点位
8. THE Mini_App SHALL 支持打卡记录导出（生成图片或 PDF）

---

### 需求 5.3：行程海报生成

**用户故事**：作为游客，我希望将我的旅游路线生成精美海报，分享到朋友圈。

#### 验收标准

1. WHEN 用户在路线详情页点击"生成海报"，THE Mini_App SHALL 调用 Canvas API 绘制海报
2. THE Mini_App SHALL 在海报中包含以下元素：
   - 海报标题（路线名称）
   - 路线地图截图（标记所有 POI）
   - POI 列表（最多显示5个，带图标和名称）
   - 总天数和 POI 数量
   - 小程序二维码（用于分享）
   - 装饰元素（如边框、背景图）
3. THE Mini_App SHALL 使用以下海报尺寸：750px × 1334px（适配朋友圈）
4. WHEN 海报绘制完成，THE Mini_App SHALL 调用 wx.canvasToTempFilePath() 生成图片
5. THE Mini_App SHALL 展示海报预览，提供以下操作：
   - 保存到相册（调用 wx.saveImageToPhotosAlbum()）
   - 分享到微信（调用 wx.shareAppMessage()）
6. IF 海报生成失败，THEN THE Mini_App SHALL 提示"生成失败，请重试"并提供重试按钮
7. THE Mini_App SHALL 在海报生成过程中展示加载动画和进度提示

**海报设计要点**：
- 使用品牌主题色
- 地图截图清晰可见
- POI 图标美观统一
- 二维码位置显眼

---

### 需求 5.4：路线分享

**用户故事**：作为游客，我希望将我的旅游路线分享给朋友，让他们也能使用。

#### 验收标准

1. WHEN 用户在路线详情页点击"分享"，THE Mini_App SHALL 调用 wx.showShareMenu() 展示分享菜单
2. THE Mini_App SHALL 支持以下分享方式：
   - 分享给微信好友
   - 分享到微信群
   - 生成海报分享到朋友圈
3. WHEN 用户选择"分享给微信好友"，THE Mini_App SHALL 调用 wx.shareAppMessage() 分享小程序卡片
4. THE Mini_App SHALL 在分享卡片中包含：
   - 标题：路线名称
   - 描述："{总天数}天 · {POI数量}个景点"
   - 封面图：路线第一个 POI 的封面图
   - 路径：/pages/route/detail?id={route_id}
5. WHEN 好友点击分享卡片，THE Mini_App SHALL 打开路线详情页
6. THE Mini_App SHALL 在路线详情页提供"复制路线"按钮，好友可将路线复制到自己的账号
7. WHEN 好友复制路线，THE Mini_App SHALL 调用 POST /api/route/copy 接口创建新路线记录
8. THE Mini_App SHALL 在原路线的 use_count 字段 +1，用于热门路线统计

---

### 需求 6.1：搜索功能

**用户故事**：作为游客，我希望能搜索景点、路线、内容，快速找到我需要的信息。

#### 验收标准

1. THE Mini_App SHALL 在首页顶部提供搜索框
2. WHEN 用户点击搜索框，THE Mini_App SHALL 跳转到搜索页
3. THE Mini_App SHALL 在搜索页提供搜索历史记录（最多显示10条）
4. THE Mini_App SHALL 提供热门搜索词推荐（从后端获取）
5. WHEN 用户输入关键词，THE Mini_App SHALL 实时展示搜索建议（联想词）
6. WHEN 用户提交搜索，THE Mini_App SHALL 调用 GET /api/search?keyword=:keyword 接口
7. THE Mini_App SHALL 展示搜索结果，按类型分组：
   - POI（景点）
   - 路线
   - 内容（评论/官方内容）
8. THE Mini_App SHALL 支持搜索结果筛选：
   - 全部
   - 仅景点
   - 仅路线
   - 仅内容
9. THE Mini_App SHALL 支持搜索结果排序：
   - 相关度（默认）
   - 热度（heat_score）
   - 距离（由近到远）
10. THE Mini_App SHALL 将搜索关键词保存到本地历史记录

---

### 需求 6.2：消息通知

**用户故事**：作为游客，我希望收到系统通知，了解商户回复、官方推荐等信息。

#### 验收标准

1. THE Mini_App SHALL 在"我的"页面提供"消息"入口，显示未读消息数量红点
2. WHEN 用户点击入口，THE Mini_App SHALL 跳转到消息列表页
3. THE Mini_App SHALL 调用 GET /api/message/list 接口获取消息列表
4. THE Mini_App SHALL 展示以下消息类型：
   - 商户回复：商户对用户评论的追评
   - 系统通知：官方推荐、活动通知等
   - 点赞通知：其他用户点赞了你的评论（如果有点赞功能）
5. THE Mini_App SHALL 为每条消息展示：
   - 消息类型图标
   - 消息标题
   - 消息摘要
   - 发送时间
   - 未读标记（红点）
6. WHEN 用户点击消息，THE Mini_App SHALL 跳转到对应详情页并标记消息为已读
7. THE Mini_App SHALL 支持消息删除和全部已读操作
8. THE Mini_App SHALL 在收到新消息时调用 wx.showTabBarRedDot() 显示红点提示

---

### 需求 6.3：设置页面

**用户故事**：作为用户，我希望能管理小程序的设置，如语言、通知、隐私等。

#### 验收标准

1. THE Mini_App SHALL 在"我的"页面提供"设置"入口
2. WHEN 用户点击入口，THE Mini_App SHALL 跳转到设置页
3. THE Mini_App SHALL 提供以下设置项：
   - 语言切换（中文/English/日本語/한국어）
   - 通知设置（开启/关闭消息通知）
   - 隐私设置（位置权限、相册权限）
   - 清除缓存
   - 关于我们
   - 用户协议
   - 隐私政策
4. WHEN 用户点击"清除缓存"，THE Mini_App SHALL 清除本地存储的图片、数据缓存
5. WHEN 用户点击"关于我们"，THE Mini_App SHALL 展示小程序版本号、开发团队信息
6. THE Mini_App SHALL 提供"退出登录"按钮（清除本地 Token）

---

## 页面结构与导航

### Tab Bar 页面（底部导航）

使用 uni-app 的 `pages.json` 配置 tabBar：

```json
{
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#FF5A5F",
    "backgroundColor": "#FFFFFF",
    "list": [
      {
        "pagePath": "pages/home/index",
        "text": "首页",
        "iconPath": "static/tabbar/home.png",
        "selectedIconPath": "static/tabbar/home-active.png"
      },
      {
        "pagePath": "pages/map/index",
        "text": "地图",
        "iconPath": "static/tabbar/map.png",
        "selectedIconPath": "static/tabbar/map-active.png"
      },
      {
        "pagePath": "pages/discover/index",
        "text": "发现",
        "iconPath": "static/tabbar/discover.png",
        "selectedIconPath": "static/tabbar/discover-active.png"
      },
      {
        "pagePath": "pages/profile/index",
        "text": "我的",
        "iconPath": "static/tabbar/profile.png",
        "selectedIconPath": "static/tabbar/profile-active.png"
      }
    ]
  }
}
```

1. **首页**（Home）
   - 路径：pages/home/index
   - 图标：🏠
   - 功能：推荐 POI、AI 规划入口、轮播图

2. **地图**（Map）
   - 路径：pages/map/index
   - 图标：🗺️
   - 功能：地图展示、POI 标记、热力图

3. **发现**（Discover）
   - 路径：pages/discover/index
   - 图标：🔍
   - 功能：内容推荐、Vlog/图文浏览

4. **我的**（Profile）
   - 路径：pages/profile/index
   - 图标：👤
   - 功能：个人信息、我的路线、打卡记录、设置

### 子页面

使用 `uni.navigateTo()` 进行页面跳转：

- POI 详情页：pages/poi/detail
- 路线详情页：pages/route/detail
- 路线规划页：pages/route/plan
- 评论发布页：pages/comment/create
- 评论列表页：pages/comment/list
- 内容详情页：pages/content/detail
- 搜索页：pages/search/index
- 消息列表页：pages/message/list
- 设置页：pages/setting/index

**页面跳转示例**：
```vue
<script setup>
// 跳转到 POI 详情页
const goToDetail = (id) => {
  uni.navigateTo({
    url: `/pages/poi/detail?id=${id}`
  });
};

// 返回上一页
const goBack = () => {
  uni.navigateBack();
};
</script>
```

---

## 性能与体验优化

### 1. 加载性能

- 使用 uni-app 的图片懒加载（`<image lazy-load>`）
- 地图 POI 分批加载（可视区域内）
- 列表数据分页加载（每页20条）
- 使用骨架屏提升加载体验（uni-skeleton）

**示例**：
```vue
<template>
  <!-- 图片懒加载 -->
  <image :src="imageUrl" lazy-load mode="aspectFill" />
  
  <!-- 骨架屏 -->
  <uni-skeleton v-if="loading" :rows="5" />
  <view v-else>
    <!-- 实际内容 -->
  </view>
</template>
```

### 2. 缓存策略

- POI 详情缓存30分钟（使用 uni.setStorageSync）
- 用户偏好缓存本地
- 图片使用 CDN 加速

**示例**：
```javascript
// 缓存 POI 详情
const cachePOI = (poi) => {
  uni.setStorageSync(`poi_${poi.id}`, {
    data: poi,
    timestamp: Date.now()
  });
};

// 读取缓存
const getCachedPOI = (id) => {
  const cached = uni.getStorageSync(`poi_${id}`);
  if (cached && Date.now() - cached.timestamp < 30 * 60 * 1000) {
    return cached.data;
  }
  return null;
};
```

### 3. 交互体验

- 所有操作提供加载状态反馈（uni.showLoading）
- 网络错误提供重试按钮
- 使用 uni-app 原生组件提升性能

**示例**：
```vue
<script setup>
const loadData = async () => {
  uni.showLoading({ title: '加载中...' });
  
  try {
    const res = await uni.request({
      url: 'https://api.example.com/data'
    });
    // 处理数据
  } catch (error) {
    uni.showToast({
      title: '加载失败',
      icon: 'none'
    });
  } finally {
    uni.hideLoading();
  }
};
</script>
```

### 4. 无障碍支持

- 所有图片提供 alt 文本
- 按钮提供 aria-label
- 支持语音播报（VoiceOver）

### 5. 多端适配

uni-app 自动处理多端差异，但需注意：

```vue
<template>
  <!-- 条件编译：仅在微信小程序显示 -->
  <!-- #ifdef MP-WEIXIN -->
  <button open-type="getUserInfo">微信授权</button>
  <!-- #endif -->
  
  <!-- 条件编译：仅在 H5 显示 -->
  <!-- #ifdef H5 -->
  <button @click="h5Login">H5 登录</button>
  <!-- #endif -->
</template>
```

---

## 数据埋点与统计

### 1. 页面访问统计

- 记录每个页面的 PV、UV
- 记录页面停留时长

### 2. 功能使用统计

- AI 推荐点击率
- 路线生成成功率
- 打卡转化率
- 评论发布率

### 3. 用户行为分析

- 搜索关键词统计
- POI 浏览热度
- 路线复用次数

---

## 错误处理与容错

### 1. 网络错误

- 展示友好的错误提示
- 提供重试按钮
- 离线模式提示

### 2. 权限错误

- 位置权限：引导用户开启
- 相册权限：引导用户开启
- 通知权限：引导用户开启

### 3. 数据异常

- JSON 解析失败：使用默认值
- 图片加载失败：显示占位图
- 地图加载失败：降级到静态地图

---

## 安全与隐私

### 1. 数据加密

- 所有 API 请求使用 HTTPS
- 敏感数据（如手机号）加密传输

### 2. 隐私保护

- 用户位置数据仅用于打卡和导航
- 不收集用户聊天记录
- 遵守微信小程序隐私规范

### 3. 内容审核

- 评论内容敏感词过滤
- 图片内容安全检测（调用微信内容安全 API）

---

## 测试要点

### 1. 功能测试

- 所有页面跳转正常（uni.navigateTo）
- 所有表单提交成功
- 所有 API 调用正常

### 2. 兼容性测试

- 微信小程序（iOS + Android）
- H5 浏览器（Chrome、Safari、微信内置浏览器）
- 不同屏幕尺寸适配（uni-app 自动适配 rpx 单位）

**uni-app 响应式单位**：
```css
/* rpx 会自动适配不同屏幕 */
.container {
  width: 750rpx;  /* 等于屏幕宽度 */
  padding: 20rpx;
}
```

### 3. 性能测试

- 首屏加载时间 < 2秒
- 地图渲染流畅（60fps）
- 内存占用 < 100MB

### 4. 用户体验测试

- 操作流程顺畅
- 提示文案清晰
- 错误处理友好

### 5. 多端测试

使用 uni-app 开发者工具测试：
```bash
# 微信小程序
npm run dev:mp-weixin

# H5
npm run dev:h5

# APP（如需要）
npm run dev:app
```

---

## uni-app 开发工具

### 推荐开发工具

1. **HBuilderX**（推荐）
   - 官方 IDE，内置 uni-app 支持
   - 代码提示、自动补全
   - 实时预览、热重载
   - 下载：https://www.dcloud.io/hbuilderx.html

2. **VS Code + uni-app 插件**
   - 安装插件：uni-create-view、uni-helper
   - 配置 ESLint、Prettier
   - 使用命令行编译

### 调试工具

- 微信开发者工具：调试微信小程序
- Chrome DevTools：调试 H5 版本
- uni-app 官方调试工具

### 常用命令

```bash
# 安装依赖
npm install

# 运行微信小程序
npm run dev:mp-weixin

# 运行 H5
npm run dev:h5

# 构建微信小程序
npm run build:mp-weixin

# 构建 H5
npm run build:h5
```

