# 需求文档：文旅智慧导览小程序用户端页面结构

## 简介

本文档定义文旅智慧导览小程序（用户端）的完整页面结构，包括所有页面名称与功能说明、底部 tabBar 导航设计、每个页面的核心模块布局、页面间跳转逻辑，以及小程序核心业务流程。

技术栈：uni-app + Vue3 + TypeScript，发布目标为微信小程序。设计风格为简约现代文旅自然风，主色调蓝色系（#1890FF）+ 绿色系（#52C41A）。

## 词汇表

- **Mini_App**：微信小程序用户端
- **TabBar**：底部固定导航栏，包含首页、地图、发现、我的四个 Tab
- **POI**（Point of Interest）：兴趣点，即地图上的景点、商户、地标等地理位置实体
- **AI_Engine**：负责 POI 推荐与路线规划的 AI 模块（LLM + 数据库过滤）
- **Map_Service**：地图服务模块，基于高德地图 SDK
- **Check_Service**：打卡服务模块，负责 GPS 校验与打卡记录
- **Route**：AI 生成或用户编辑的旅游路线，包含有序 POI 列表
- **冷启动弹窗**：新用户首次启动时展示的偏好收集引导弹窗
- **热力图**：基于 poi_stats.heat_score 数据生成的地图可视化图层
- **打卡**：用户到达 POI 现场（GPS ≤ 200 米）后触发的签到行为，是发表评论的前置条件

---

## 需求 1：底部 TabBar 导航结构

**用户故事：** 作为游客，我希望通过底部导航栏快速切换小程序的主要功能区，以便高效使用各核心功能。

### 验收标准

1. THE Mini_App SHALL 在页面底部固定展示包含 4 个 Tab 的导航栏
2. THE Mini_App SHALL 按以下顺序排列 Tab：首页（home）→ 地图（map）→ 发现（discover）→ 我的（profile）
3. THE Mini_App SHALL 为每个 Tab 提供默认图标和选中图标，选中状态使用主色调（蓝绿色系）高亮
4. WHEN 用户点击 Tab 图标，THE Mini_App SHALL 使用 uni.switchTab() 切换到对应页面
5. THE Mini_App SHALL 在"我的"Tab 图标上展示未读消息数量红点（来自消息通知模块）
6. THE Mini_App SHALL 在所有 TabBar 页面保持底部导航栏可见，子页面不显示 TabBar

---

## 需求 2：首页（pages/home/index）

**用户故事：** 作为游客，我希望打开小程序首页就能看到个性化推荐内容和 AI 规划入口，以便快速开始旅游规划。

### 验收标准

1. WHEN 用户进入首页，THE Mini_App SHALL 在页面顶部展示搜索框和消息通知图标
2. THE Mini_App SHALL 在搜索框下方展示官方内容轮播图（来自 official_content 表，最多5张）
3. WHEN 用户进入首页，THE Mini_App SHALL 自动调用 GET /api/poi/recommend 接口获取 5 个个性化推荐 POI
4. THE Mini_App SHALL 以卡片列表形式展示推荐 POI，每张卡片包含封面图、POI 名称、推荐理由、距离和热力指数
5. THE Mini_App SHALL 在推荐列表上方展示"AI 规划路线"入口按钮，点击后跳转到路线规划页
6. WHEN 用户下拉刷新，THE Mini_App SHALL 重新请求推荐接口获取新的推荐列表
7. WHEN 用户点击 POI 卡片，THE Mini_App SHALL 跳转到 POI 详情页（pages/poi/detail）
8. WHEN 用户点击搜索框，THE Mini_App SHALL 跳转到搜索页（pages/search/index）
9. WHEN 用户点击消息图标，THE Mini_App SHALL 跳转到消息列表页（pages/message/list）
10. IF 推荐接口返回失败，THEN THE Mini_App SHALL 展示按 heat_score 排序的热门 POI 列表作为降级方案
11. WHEN 用户首次启动且无偏好记录，THE Mini_App SHALL 在首页加载完成后展示冷启动偏好收集弹窗

---

## 需求 3：地图页（pages/map/index）

**用户故事：** 作为游客，我希望在地图上直观看到景点分布和人流热度，以便规划行程和实时导航。

### 验收标准

1. WHEN 用户进入地图页，THE Mini_App SHALL 使用 uni-app `<map>` 组件渲染高德地图（GCJ-02 坐标系）
2. WHEN 用户进入地图页，THE Mini_App SHALL 调用 uni.getLocation() 自动定位并将地图中心移至用户当前位置
3. THE Mini_App SHALL 调用 GET /api/poi/nearby 接口获取附近 5 公里内的 POI 并在地图上标记
4. THE Mini_App SHALL 按 POI 类型使用不同颜色图标区分标记点（历史建筑红色、自然风光绿色、美食橙色等）
5. WHEN 用户点击 POI 标记，THE Mini_App SHALL 展示包含 POI 名称、距离、热力指数和"查看详情"按钮的气泡
6. WHEN 用户点击气泡中的"查看详情"，THE Mini_App SHALL 跳转到 POI 详情页（pages/poi/detail）
7. THE Mini_App SHALL 在地图右上角提供"定位"按钮，点击后调用 mapContext.moveToLocation() 回到用户位置
8. THE Mini_App SHALL 在地图右上角提供"图层"按钮，点击后展示图层切换菜单（普通地图 / 热力图）
9. WHEN 用户开启热力图图层，THE Mini_App SHALL 调用 GET /api/poi/heatmap 接口并使用 Canvas 叠加层渲染热力图
10. THE Mini_App SHALL 在地图底部展示可收起的 POI 列表面板，支持按类型筛选
11. WHEN 用户在地图底部面板点击 POI，THE Mini_App SHALL 将地图中心移至该 POI 并展示气泡
12. THE Mini_App SHALL 根据地图缩放级别动态调整标记点密度（scale>15 显示全部，scale<12 显示聚合点）

---

## 需求 4：发现页（pages/discover/index）

**用户故事：** 作为游客，我希望在发现页浏览其他用户的游记和官方内容，以便获取旅游灵感。

### 验收标准

1. WHEN 用户进入发现页，THE Mini_App SHALL 调用 GET /api/content/recommend 接口获取推荐内容列表
2. THE Mini_App SHALL 使用瀑布流布局展示内容卡片（两列），每张卡片包含封面图、标题、摘要、作者头像和昵称
3. THE Mini_App SHALL 优先在列表顶部展示官方内容（来自 official_content 表，status=1）
4. THE Mini_App SHALL 在官方内容卡片上展示"官方"标签以区分用户内容
5. THE Mini_App SHALL 在页面顶部提供内容分类筛选标签栏（全部 / 历史建筑 / 自然风光 / 美食探店 / 咖啡文化 / 艺术展览）
6. WHEN 用户点击分类标签，THE Mini_App SHALL 按对应分类重新请求并刷新内容列表
7. WHEN 用户点击内容卡片，THE Mini_App SHALL 跳转到内容详情页（pages/content/detail）
8. THE Mini_App SHALL 支持上拉加载更多内容（分页，每页20条）
9. THE Mini_App SHALL 支持下拉刷新重新获取最新内容列表

---

## 需求 5：我的页（pages/profile/index）

**用户故事：** 作为游客，我希望在"我的"页面管理个人信息、查看行程记录和访问各项设置，以便全面管理我的旅游数据。

### 验收标准

1. THE Mini_App SHALL 在页面顶部展示用户头像、昵称和统计数据（打卡次数、评论数量、路线数量）
2. THE Mini_App SHALL 提供"编辑资料"入口，点击后跳转到个人信息编辑页（pages/profile/edit）
3. THE Mini_App SHALL 提供"我的路线"入口，点击后跳转到我的路线列表页（pages/route/my）
4. THE Mini_App SHALL 提供"打卡记录"入口，点击后跳转到打卡记录页（pages/check/list）
5. THE Mini_App SHALL 提供"消息通知"入口并展示未读消息数量红点，点击后跳转到消息列表页（pages/message/list）
6. THE Mini_App SHALL 提供"修改偏好"入口，点击后重新展示偏好收集弹窗
7. THE Mini_App SHALL 提供"设置"入口，点击后跳转到设置页（pages/setting/index）
8. WHILE 用户未登录，THE Mini_App SHALL 展示登录引导区域，点击后触发微信授权登录流程
9. THE Mini_App SHALL 在页面底部展示小程序版本号

---

## 需求 6：POI 详情页（pages/poi/detail）

**用户故事：** 作为游客，我希望查看景点的详细信息，包括介绍、照片、开放时间、票务和用户评论，以便决定是否前往。

### 验收标准

1. WHEN 用户进入 POI 详情页，THE Mini_App SHALL 调用 GET /api/poi/:id 接口获取 POI 完整信息
2. THE Mini_App SHALL 在页面顶部展示 POI 照片轮播图，并提供"街景"切换按钮
3. THE Mini_App SHALL 展示 POI 基础信息：名称（多语言）、地址（多语言）、联系电话、热力指数、距离
4. THE Mini_App SHALL 展示 POI 描述文本（多语言，支持富文本）
5. THE Mini_App SHALL 展示今日开放时间（从 opening_time 表读取，如闭馆则显示"今日闭馆"）
6. THE Mini_App SHALL 展示票务信息（从 ticket_info 表读取 Mock 数据，免费则显示"免费开放"）
7. THE Mini_App SHALL 展示 POI 标签列表（按当前语言展示标签名称）
8. THE Mini_App SHALL 在页面中部展示 POI 位置小地图（标记 POI 坐标）
9. THE Mini_App SHALL 展示最多 3 条用户评论预览，并提供"查看全部评论"入口跳转到评论列表页（pages/comment/list）
10. THE Mini_App SHALL 在页面底部固定展示操作按钮栏：导航、收藏、分享
11. WHEN 用户从路线详情页进入（携带 route_id 参数），THE Mini_App SHALL 在操作按钮栏额外展示"打卡"按钮
12. WHEN 用户点击"导航"，THE Mini_App SHALL 调用 uni.openLocation() 打开地图导航
13. IF 用户未授权位置权限，THEN THE Mini_App SHALL 提示"请授权位置权限以使用导航功能"

---

## 需求 7：路线规划页（pages/route/plan）

**用户故事：** 作为游客，我希望通过文字或语音描述旅游需求，让 AI 自动生成完整路线，以便快速获得个性化行程。

### 验收标准

1. THE Mini_App SHALL 在页面顶部展示文本输入框，提示文案为"告诉我你的旅游需求，例如：我想玩3天，喜欢历史建筑和美食"
2. THE Mini_App SHALL 在输入框旁提供"语音输入"按钮（麦克风图标）
3. THE Mini_App SHALL 在输入框下方展示快捷标签按钮（1天游 / 2天游 / 3天游 / 历史文化 / 自然风光 / 美食探店 / 亲子游 / 情侣游）
4. WHEN 用户点击快捷标签，THE Mini_App SHALL 将标签文本追加到输入框中
5. WHEN 用户按住"语音输入"按钮，THE Mini_App SHALL 调用 uni.getRecorderManager() 开始录音并展示录音动画
6. WHEN 用户松开"语音输入"按钮，THE Mini_App SHALL 停止录音并调用 POST /api/voice/recognize 接口识别文字，将识别结果填入输入框
7. WHEN 用户输入至少 10 个字符并点击"生成路线"，THE Mini_App SHALL 调用 POST /api/route/generate 接口
8. WHEN 后端开始处理，THE Mini_App SHALL 展示加载动画和提示文案"AI 正在为你规划路线，请稍候..."
9. WHEN 后端返回路线数据，THE Mini_App SHALL 跳转到路线详情页（pages/route/detail）展示结果
10. IF 后端返回错误，THEN THE Mini_App SHALL 展示错误提示并建议用户修改需求后重试
11. THE Mini_App SHALL 在页面底部展示最近 5 条路线生成历史记录，点击可直接跳转到对应路线详情页
12. IF 识别失败，THEN THE Mini_App SHALL 提示"识别失败，请重试或改用文字输入"

---

## 需求 8：路线详情页（pages/route/detail）

**用户故事：** 作为游客，我希望查看 AI 生成的路线详情，包括每天行程安排、POI 信息和地图预览，以便按图出行。

### 验收标准

1. WHEN 用户进入路线详情页，THE Mini_App SHALL 调用 GET /api/route/:id 接口获取路线完整数据
2. THE Mini_App SHALL 在页面顶部展示路线概览：路线名称、总天数、POI 数量、生成时间
3. THE Mini_App SHALL 按天分组展示行程安排，每天包含日期标题和该天 POI 有序列表
4. THE Mini_App SHALL 为每个 POI 展示卡片：封面图、名称、推荐理由、建议停留时长、开放时间、票务状态
5. THE Mini_App SHALL 在每个 POI 卡片上展示该路线下的打卡状态（已打卡显示"✓ 已打卡"和时间，未打卡显示"打卡"按钮）
6. WHEN 用户点击 POI 卡片上的"查看详情"，THE Mini_App SHALL 携带 route_id 参数跳转到 POI 详情页
7. WHEN 用户点击 POI 卡片上的"打卡"按钮，THE Mini_App SHALL 触发打卡流程（GPS 校验 → 打卡 → 引导评论）
8. THE Mini_App SHALL 在页面中部展示地图预览，标记所有 POI 位置（数字顺序标记）并绘制路径连线
9. THE Mini_App SHALL 在页面底部固定展示操作按钮栏：保存路线、分享路线、编辑路线、生成海报
10. WHEN 用户点击"编辑路线"，THE Mini_App SHALL 进入编辑模式，允许拖拽排序和删除 POI
11. WHEN 用户在编辑模式点击"添加景点"，THE Mini_App SHALL 跳转到搜索页（pages/search/index）选择 POI
12. WHEN 用户点击"生成海报"，THE Mini_App SHALL 调用 Canvas API 绘制行程海报并展示预览
13. WHEN 用户点击"分享路线"，THE Mini_App SHALL 调用 wx.shareAppMessage() 分享路线卡片

---

## 需求 9：评论发布页（pages/comment/create）

**用户故事：** 作为游客，我希望在打卡后发表评论分享旅游体验，以便帮助其他游客做决策。

### 验收标准

1. WHEN 用户进入评论发布页，THE Mini_App SHALL 校验 check_info 表中是否存在 `user_id + poi_id + route_id` 的打卡记录
2. IF 未打卡，THEN THE Mini_App SHALL 提示"需先打卡才能评论"并返回上一页
3. IF 已打卡且已评论，THEN THE Mini_App SHALL 提示"您已评论过该路线中的此景点"并返回上一页
4. THE Mini_App SHALL 在页面顶部展示被评论的 POI 名称和封面图
5. THE Mini_App SHALL 提供星级评分组件（1-5 星，必填）
6. THE Mini_App SHALL 提供评论文本框（10-500 字，必填），展示实时字数统计
7. THE Mini_App SHALL 提供照片上传区域（最多 9 张，可选），点击后调用 uni.chooseImage()
8. THE Mini_App SHALL 在页面底部提供"发布"和"保存草稿"两个按钮
9. WHEN 用户点击"发布"，THE Mini_App SHALL 调用 POST /api/comment/create 接口提交评论（type=1）
10. WHEN 发布成功，THE Mini_App SHALL 显示"发布成功"提示并返回路线详情页
11. WHEN 用户点击"保存草稿"，THE Mini_App SHALL 调用接口提交草稿（type=0）并返回上一页
12. IF 用户从 POI 详情页直接进入（无 route_id），THEN THE Mini_App SHALL 提示"请先通过路线打卡后再评论"并拒绝进入

---

## 需求 10：评论列表页（pages/comment/list）

**用户故事：** 作为游客，我希望查看某景点的全部用户评论，以便了解真实旅游体验。

### 验收标准

1. WHEN 用户进入评论列表页，THE Mini_App SHALL 调用 GET /api/comment/list?poi_id=:id 接口获取评论列表
2. THE Mini_App SHALL 在页面顶部展示评分统计：平均评分和各星级评论数量分布
3. THE Mini_App SHALL 提供排序选项（最新 / 最热 / 高分优先）和评分筛选（全部 / 5星 / 1-2星）
4. THE Mini_App SHALL 展示评论列表，每条评论包含用户头像、昵称、评分、内容（超3行折叠）、图片（最多3张）、发布时间
5. WHEN 用户点击评论图片，THE Mini_App SHALL 调用 uni.previewImage() 预览大图
6. THE Mini_App SHALL 展示商户回复内容（如果有）
7. THE Mini_App SHALL 支持下拉刷新和上拉加载更多（分页，每页20条）

---

## 需求 11：内容详情页（pages/content/detail）

**用户故事：** 作为游客，我希望查看官方或用户发布的旅游内容详情，以便获取深度旅游信息。

### 验收标准

1. WHEN 用户进入内容详情页，THE Mini_App SHALL 调用 GET /api/content/:id 接口获取内容详情
2. THE Mini_App SHALL 展示内容标题（多语言）、发布时间、浏览次数、封面图
3. THE Mini_App SHALL 展示正文内容（多语言，支持富文本）
4. IF content_type 为 video，THEN THE Mini_App SHALL 使用 `<video>` 组件在正文顶部播放视频
5. THE Mini_App SHALL 在内容底部展示关联 POI 列表，点击 POI 跳转到 POI 详情页（pages/poi/detail）
6. THE Mini_App SHALL 提供"收藏"和"分享"按钮
7. WHEN 用户进入页面，THE Mini_App SHALL 调用 POST /api/content/:id/view 接口增加浏览次数

---

## 需求 12：搜索页（pages/search/index）

**用户故事：** 作为游客，我希望通过关键词搜索景点、路线和内容，以便快速找到目标信息。

### 验收标准

1. WHEN 用户进入搜索页，THE Mini_App SHALL 自动聚焦搜索输入框
2. THE Mini_App SHALL 展示搜索历史记录（最多10条）和热门搜索词推荐
3. WHEN 用户输入关键词，THE Mini_App SHALL 实时展示搜索联想词（防抖 300ms）
4. WHEN 用户提交搜索，THE Mini_App SHALL 调用 GET /api/search?keyword=:keyword 接口
5. THE Mini_App SHALL 展示搜索结果，按类型分组：POI（景点）/ 路线 / 内容
6. THE Mini_App SHALL 提供结果类型筛选（全部 / 仅景点 / 仅路线 / 仅内容）和排序（相关度 / 热度 / 距离）
7. WHEN 用户点击搜索结果，THE Mini_App SHALL 跳转到对应详情页
8. THE Mini_App SHALL 将搜索关键词保存到本地历史记录，提供"清除历史"按钮

---

## 需求 13：消息列表页（pages/message/list）

**用户故事：** 作为游客，我希望查看系统通知和商户回复消息，以便及时了解互动动态。

### 验收标准

1. WHEN 用户进入消息列表页，THE Mini_App SHALL 调用 GET /api/message/list 接口获取消息列表
2. THE Mini_App SHALL 展示消息列表，每条消息包含类型图标、标题、摘要、发送时间和未读红点
3. THE Mini_App SHALL 支持以下消息类型：商户回复（对用户评论的追评）、系统通知（官方推荐、活动通知）
4. WHEN 用户点击消息，THE Mini_App SHALL 跳转到对应详情页并标记该消息为已读
5. THE Mini_App SHALL 提供"全部已读"和"删除消息"操作
6. WHEN 有新消息时，THE Mini_App SHALL 调用 wx.showTabBarRedDot() 在"我的"Tab 上显示红点

---

## 需求 14：设置页（pages/setting/index）

**用户故事：** 作为用户，我希望管理小程序的语言、通知和隐私设置，以便个性化使用体验。

### 验收标准

1. THE Mini_App SHALL 提供语言切换设置项（中文简体 / English / 日本語 / 한국어）
2. WHEN 用户切换语言，THE Mini_App SHALL 立即刷新页面并以新语言重新渲染所有文本
3. THE Mini_App SHALL 提供通知设置开关（开启/关闭消息通知）
4. THE Mini_App SHALL 提供隐私设置入口（位置权限、相册权限说明）
5. THE Mini_App SHALL 提供"清除缓存"按钮，点击后清除本地图片和数据缓存
6. THE Mini_App SHALL 提供"关于我们"入口，展示小程序版本号和开发团队信息
7. THE Mini_App SHALL 提供"用户协议"和"隐私政策"入口（跳转到对应 WebView 页面）
8. THE Mini_App SHALL 提供"退出登录"按钮，点击后清除本地 Token 并返回首页

---

## 需求 15：我的路线列表页（pages/route/my）

**用户故事：** 作为游客，我希望查看我保存的所有旅游路线，以便随时查阅和继续使用。

### 验收标准

1. WHEN 用户进入我的路线页，THE Mini_App SHALL 调用 GET /api/route/my 接口获取用户路线列表
2. THE Mini_App SHALL 展示路线卡片列表，每张卡片包含路线名称、总天数、POI 数量、封面图、创建时间和状态标签
3. THE Mini_App SHALL 展示路线状态标签：已生成（status=0）/ 已完成（status=1）
4. WHEN 用户点击路线卡片，THE Mini_App SHALL 跳转到路线详情页（pages/route/detail）
5. THE Mini_App SHALL 支持路线名称搜索
6. WHEN 用户长按路线卡片，THE Mini_App SHALL 弹出操作菜单（删除路线）
7. WHEN 用户确认删除，THE Mini_App SHALL 调用 DELETE /api/route/:id 接口并刷新列表

---

## 需求 16：打卡记录页（pages/check/list）

**用户故事：** 作为游客，我希望查看我的所有打卡记录，以便回顾旅游足迹。

### 验收标准

1. WHEN 用户进入打卡记录页，THE Mini_App SHALL 调用 GET /api/check/my 接口获取打卡记录列表
2. THE Mini_App SHALL 展示打卡记录列表，每条记录包含 POI 封面图、POI 名称、打卡时间、打卡位置和关联路线
3. THE Mini_App SHALL 提供时间筛选（全部 / 最近7天 / 最近30天）
4. THE Mini_App SHALL 提供"列表视图"和"地图视图"切换按钮
5. WHEN 用户切换到地图视图，THE Mini_App SHALL 在地图上标记所有打卡点位

---

## 需求 17：冷启动偏好收集弹窗（全局组件）

**用户故事：** 作为新游客，我希望首次使用时快速设置旅游偏好，以便获得个性化推荐。

### 验收标准

1. WHEN 用户首次启动 Mini_App 且 user_prefer 表中无该用户记录，THE Mini_App SHALL 在首页加载完成后展示全屏偏好收集弹窗
2. THE Mini_App SHALL 使用分步表单（3步）展示偏好收集：步骤1 国籍选择（单选）→ 步骤2 活动强度（单选）→ 步骤3 旅游偏好标签（多选，至少1个）
3. THE Mini_App SHALL 展示步骤进度指示器（1/3、2/3、3/3）
4. THE Mini_App SHALL 根据国籍选择自动设置默认语言（日韩→日/韩文，国内/本地→中文，欧美→英文）
5. WHEN 用户完成所有步骤并点击"完成"，THE Mini_App SHALL 调用 POST /api/user/preference 接口提交偏好数据
6. WHEN 用户点击右上角"跳过"，THE Mini_App SHALL 记录跳过状态，下次启动时重新展示弹窗
7. IF 提交失败，THEN THE Mini_App SHALL 将偏好数据缓存到本地 Storage，并在下次网络恢复时自动重试

---

## 需求 18：页面跳转逻辑总览

**用户故事：** 作为开发者，我希望有清晰的页面跳转规范，以便正确实现页面间的导航逻辑。

### 验收标准

1. THE Mini_App SHALL 使用 uni.switchTab() 在 TabBar 页面之间切换（首页 ↔ 地图 ↔ 发现 ↔ 我的）
2. THE Mini_App SHALL 使用 uni.navigateTo() 从任意页面跳转到子页面，保留页面栈
3. THE Mini_App SHALL 使用 uni.navigateBack() 从子页面返回上一页
4. THE Mini_App SHALL 在跳转到 POI 详情页时，根据来源携带不同参数：
   - 来自路线详情页：携带 route_id 参数（显示打卡按钮）
   - 来自首页/地图/搜索：不携带 route_id（不显示打卡按钮）
5. THE Mini_App SHALL 在跳转到评论发布页时，必须携带 poi_id 和 route_id 参数
6. THE Mini_App SHALL 在跳转到路线详情页时，携带 route_id 参数
7. THE Mini_App SHALL 支持通过分享卡片直接打开路线详情页（/pages/route/detail?id={route_id}）

### 页面跳转关系图

```
TabBar（底部导航）
├── 首页（home/index）
│   ├── → 搜索页（search/index）          [点击搜索框]
│   ├── → 消息列表页（message/list）       [点击消息图标]
│   ├── → POI 详情页（poi/detail）         [点击推荐卡片]
│   ├── → 路线规划页（route/plan）         [点击AI规划入口]
│   └── ↗ 冷启动弹窗（全局组件）           [首次启动]
│
├── 地图（map/index）
│   └── → POI 详情页（poi/detail）         [点击气泡详情]
│
├── 发现（discover/index）
│   └── → 内容详情页（content/detail）     [点击内容卡片]
│
└── 我的（profile/index）
    ├── → 个人信息编辑页（profile/edit）   [点击编辑资料]
    ├── → 我的路线页（route/my）           [点击我的路线]
    ├── → 打卡记录页（check/list）         [点击打卡记录]
    ├── → 消息列表页（message/list）       [点击消息通知]
    └── → 设置页（setting/index）          [点击设置]

子页面跳转链
POI 详情页（poi/detail）
├── → 评论列表页（comment/list）           [点击查看全部评论]
├── → 导航（uni.openLocation）             [点击导航]
└── → 打卡流程 → 评论发布页（comment/create）[点击打卡，仅携带route_id时]

路线规划页（route/plan）
└── → 路线详情页（route/detail）           [AI生成完成]

路线详情页（route/detail）
├── → POI 详情页（poi/detail?route_id=x）  [点击查看详情]
├── → 搜索页（search/index）               [编辑模式添加景点]
└── → 评论发布页（comment/create）         [打卡后引导评论]

内容详情页（content/detail）
└── → POI 详情页（poi/detail）             [点击关联POI]
```

---

## 需求 19：核心业务流程

**用户故事：** 作为开发者，我希望有清晰的核心业务流程定义，以便正确实现各模块的交互逻辑。

### 验收标准

#### 流程 A：冷启动个性化推荐流程

1. WHEN 用户首次启动 Mini_App，THE Mini_App SHALL 执行以下流程：
   - 调用 uni.login() 获取微信 code → 后端换取 openid → 返回 JWT Token → 存储 Token
   - 检查 user_prefer 表是否有该用户记录
   - IF 无记录，THEN 展示冷启动偏好弹窗（3步：国籍 → 强度 → 偏好标签）
   - 用户完成偏好设置 → 写入 user_prefer 表 → 关闭弹窗
   - 首页根据偏好调用 AI 推荐接口，展示个性化 POI 列表

#### 流程 B：AI 路线生成流程

2. WHEN 用户使用 AI 路线规划功能，THE Mini_App SHALL 执行以下流程：
   - 用户在路线规划页输入文字或语音需求（≥10字）
   - 调用 POST /api/route/generate，后端执行：NLP 解析 → 标签匹配 → 候选 POI 粗筛（≤50个）→ LLM 精选 → 结构化路线数据
   - 前端跳转到路线详情页展示结果（地图标记 + 按天分组 POI 列表）
   - 用户可保存路线、编辑路线或直接开始打卡

#### 流程 C：打卡前置评论流程

3. WHEN 用户尝试对 POI 发表评论，THE Mini_App SHALL 执行以下流程：
   - 用户必须在路线详情页上下文中（携带 route_id）点击打卡
   - Check_Service 调用 uni.getLocation() 获取 GPS 坐标
   - 计算用户与 POI 的距离（Haversine 公式）
   - IF 距离 > 200 米，THEN 提示"您距离该景点较远，无法打卡"，流程终止
   - IF 距离 ≤ 200 米，THEN 调用 POST /api/check/create 写入打卡记录（user_id + poi_id + route_id）
   - 展示打卡成功动画，弹出"发表评论"引导
   - 用户进入评论发布页，后端再次校验打卡记录存在后允许提交评论

#### 流程 D：内容发现与浏览流程

4. WHEN 用户浏览发现页内容，THE Mini_App SHALL 执行以下流程：
   - 发现页加载官方内容（置顶）+ 用户评论（瀑布流）
   - 用户点击内容卡片 → 内容详情页（浏览次数+1）
   - 内容详情页底部展示关联 POI → 点击跳转 POI 详情页
   - POI 详情页展示评论列表 → 点击"查看全部"跳转评论列表页

---

## 需求 20：完整页面清单与路径规范

**用户故事：** 作为开发者，我希望有完整的页面路径清单，以便在 pages.json 中正确配置所有页面。

### 验收标准

1. THE Mini_App SHALL 按以下路径结构组织所有页面文件：

```
pages/
├── home/index.vue          # 首页（TabBar）
├── map/index.vue           # 地图页（TabBar）
├── discover/index.vue      # 发现页（TabBar）
├── profile/index.vue       # 我的页（TabBar）
├── profile/edit.vue        # 个人信息编辑页
├── poi/detail.vue          # POI 详情页
├── route/plan.vue          # 路线规划页
├── route/detail.vue        # 路线详情页
├── route/my.vue            # 我的路线列表页
├── comment/create.vue      # 评论发布页
├── comment/list.vue        # 评论列表页
├── content/detail.vue      # 内容详情页
├── search/index.vue        # 搜索页
├── message/list.vue        # 消息列表页
├── setting/index.vue       # 设置页
└── check/list.vue          # 打卡记录页
```

2. THE Mini_App SHALL 在 pages.json 中将 4 个 TabBar 页面配置为 tabBar.list，其余页面配置为 pages 数组
3. THE Mini_App SHALL 为所有页面配置 navigationBarTitleText（支持多语言）
4. THE Mini_App SHALL 为地图页（map/index）配置 navigationStyle 为 custom（自定义导航栏，避免遮挡地图）
