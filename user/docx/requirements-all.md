# 需求文档

## 简介

智慧旅游规划平台（Smart Tourism Platform）是一个基于大模型 AI + 地图可视化的三端协同系统，旨在解决传统地图仅提供定位、旅游助手仅输出文本、各端数据孤岛等痛点。

系统由三端组成：
- **用户端**：uni-app 开发（发布为微信小程序 + H5），面向游客，提供 AI 推荐、路线规划、地图打卡等功能
- **商户端**：PC Web（Vue3 + Element Plus），面向景区/商户，提供客流分析、评论管理、AI 经营报告
- **政府端**：PC Web（Vue3 + Element Plus），面向城市管理者，提供全市热力监控、商户审核、官方内容发布

核心能力：AI 自动生成带坐标的旅游动线图、地图 POI 可视化、多语言国际化、三端权限管理。

**技术选型说明：**
- 用户端采用 uni-app（Vue 3）开发，一套代码多端运行（微信小程序 + H5 + APP）
- 商户端和政府端采用 Vue 3 + Element Plus，技术栈统一
- 微信小程序上线需完成ICP备案和微信小程序备案
- 地图服务基于高德地图（uni-app 完美支持）
- 后端推荐使用 Node.js/Koa（与前端技术栈统一）或 Java/SpringBoot

**uni-app 优势：**
- 使用 Vue 3 语法，学习成本低，开发效率高
- 一套代码可发布微信小程序、H5、APP 等多个平台
- 完善的组件化开发，代码复用率高
- 丰富的插件市场和 uni-ui 组件库
- 三端技术栈统一（都是 Vue），便于团队协作

---

---

## 数据库设计

详细的数据库设计文档请参考（与本文件同目录）：
- [数据库设计文档（第一部分）](./database-design.md)
- [数据库设计文档（第二部分）](./database-design-part2.md)

**数据库类型**：MySQL 8.0+

**核心表结构**：
1. **poi_info**：POI地点信息表（支持多语言）
2. **poi_stats**：POI统计表（按日聚合：打卡次数、热力分、平均停留；**计算口径见 database-design.md**）
3. **tag_info**：标签表（层级结构、多语言）
4. **poi_tag_rel**：POI与标签关联表（权重动态调整）
5. **user**：用户表（微信登录）
6. **user_prefer**：用户偏好表（国籍、活动强度、偏好标签）
7. **routes_info**：AI路线表（LLM规划结果、使用次数统计）
8. **check_info**：打卡表（防刷评、客流统计；自由/路线双模式；时段维度字段）
9. **merchants**：商户表（审核流程；含 `merchant_category` 注册类别）
10. **merchant_poi_rel**：商户POI关联表（多对多关系）
11. **government**：政府管理员表（角色权限）
12. **comment_info**：评论表（商户追评）
13. **ticket_info**：票务表（Mock数据）
14. **opening_time**：开放时间表（规则优先级）
15. **official_content**：官方内容表（图文/视频发布；可含 `source_type` / `source_url` 外源同步）
16. **chat_records**：AI 单轮对话记录（日志、重试、效果优化）
17. **route_share**：行程分享/海报生成记录（渠道、次数、海报 URL）
18. **user_behavior**（可选）：用户行为埋点（浏览、搜索、点击、收藏）

**主要优化点**：
- ✅ 新增 `user_prefer.preference_tags` JSON字段存储多个偏好标签
- ✅ 新增 `routes_info.use_count` 字段统计路线使用次数
- ✅ 新增 `comment_info.merchant_reply` 字段支持商户追评
- ✅ 新增 `merchant_poi_rel` 表支持商户管理多个POI
- ✅ 新增 `official_content` 表存储政府端发布的内容
- ✅ 新增 `tag_info.category` 字段明确标签分类
- ✅ 修改 `poi_stats.date` 类型为 DATE（原为DATETIME）
- ✅ 添加空间索引、复合索引优化查询性能
- ✅ `poi_info.street_view` 街景链接字段
- ✅ `comment_info.is_reported`、`audit_status` 举报与审核
- ✅ `chat_records`、`route_share`、`user_behavior`（可选）辅助表

---

## 词汇表

- **POI**（Point of Interest）：兴趣点，即地图上的景点、商户、地标等地理位置实体
- **LLM**：大语言模型，用于 AI 推荐与路线规划
- **动线图**：包含多个 POI 坐标、顺序和路径的可视化旅游路线地图
- **打卡**：用户到达 POI 现场后触发的签到行为，是评论的前置条件
- **热力图**：基于人流密度数据生成的地图可视化图层
- **冷启动**：新用户首次使用时，通过偏好问卷收集初始数据的过程
- **System**：智慧旅游平台整体系统
- **Mini_App**：微信小程序用户端
- **Merchant_Portal**：商户 PC Web 管理端
- **Gov_Portal**：政府 PC Web 管理端
- **AI_Engine**：负责 POI 推荐与路线规划的 AI 模块（LLM + 数据库过滤）
- **Map_Service**：地图服务模块，负责 POI 展示、路线绘制、热力图渲染（基于高德地图 SDK）
- **Auth_Service**：认证与权限管理模块
- **POI_DB**：poi_info 及关联表构成的 POI 数据库
- **Mock_Service**：用于模拟票务、客流等外部数据的 Mock 模块

---

## 需求列表

### 需求 1：新用户冷启动偏好收集

**用户故事：** 作为新游客，我希望首次打开小程序时能设置我的国籍、游客类型和旅游偏好，以便系统为我提供个性化推荐。

#### 验收标准

1. WHEN 用户首次启动 Mini_App 且本地无偏好记录，THE Mini_App SHALL 展示冷启动引导弹窗
2. THE Mini_App SHALL 在弹窗中提供以下选项：
   - 国籍选择：日韩 / 国内 / 欧美 / 本地
   - 活动强度：暴走特种兵 / 休闲漫步 / 深度体验
   - 旅游偏好标签（多选）：历史建筑、自然风光、美食探店、咖啡文化、艺术展览、购物娱乐、夜生活、亲子游等
3. WHEN 用户完成偏好选择并提交，THE Mini_App SHALL 将偏好数据写入 user_prefer 表并关联当前用户
4. WHEN 用户关闭弹窗但未完成选择，THE Mini_App SHALL 保留弹窗状态，下次启动时重新展示
5. IF 偏好数据写入失败，THEN THE Mini_App SHALL 在本地缓存偏好数据并在下次网络恢复时重试

---

### 需求 2：多语言国际化支持

**用户故事：** 作为外籍游客，我希望小程序界面和 POI 信息以我熟悉的语言展示，以便我能顺畅使用。

#### 验收标准

1. THE Mini_App SHALL 支持中文简体、英文、日文、韩文四种语言的界面切换
2. WHEN 用户选择语言后，THE Mini_App SHALL 从 poi_info.poi_name（JSON 多语言字段）中读取对应语言的 POI 名称展示
3. WHEN 用户选择语言后，THE Mini_App SHALL 从 tag_info.tag_name（JSON 多语言字段）中读取对应语言的标签名称展示
4. IF 当前语言对应的翻译字段为空，THEN THE Mini_App SHALL 回退展示中文简体内容
5. THE Mini_App SHALL 根据用户冷启动时选择的国籍自动设置默认语言

---

### 需求 3：AI 智能 POI 推荐

**用户故事：** 作为游客，我希望系统根据我的偏好智能推荐最适合我的景点，以便我节省筛选时间。

#### 验收标准

1. WHEN 用户请求 POI 推荐，THE AI_Engine SHALL 先从 POI_DB 中按用户偏好标签粗筛候选 POI 列表
2. WHEN 粗筛完成，THE AI_Engine SHALL 将候选 POI 列表提交给 LLM，从中精选 5 个最优点位
3. THE AI_Engine SHALL 为每个推荐 POI 返回推荐理由（不少于 20 字）
4. THE AI_Engine SHALL 仅从 POI_DB 中已存在的 POI 进行推荐，不得虚构或生成数据库中不存在的地点
5. WHEN LLM 返回结果，THE AI_Engine SHALL 校验每个推荐 POI 的 poi_uuid 在 POI_DB 中存在，IF 校验失败 THEN THE AI_Engine SHALL 从候选列表中补充替换
6. WHEN 推荐结果返回，THE Mini_App SHALL 在地图上标记推荐 POI 的坐标位置并展示推荐理由
7. THE System SHALL 支持以下标签分类体系：
   - **菜系标签**：川菜、粤菜、江浙菜、西餐、日料、韩餐等
   - **情绪标签**：安静治愈、热闹繁华、文艺小资、浪漫温馨、活力运动等
   - **服务标签**：外国人友好、英文菜单、中文菜单、无障碍设施、儿童友好、宠物友好等
   - **主题标签**：历史建筑、自然风光、现代艺术、科技体验、美食探店、网红打卡等
   - **活动强度标签**：暴走特种兵、休闲漫步、深度体验等
8. THE System SHALL 允许一个POI关联多个不同分类的标签，通过poi_tag_rel表的weight字段动态调整标签权重

---

### 需求 4：AI 路线规划与动线图生成

**用户故事：** 作为游客，我希望通过语音或文字描述我的旅游需求，让 AI 自动生成带地图标记的旅游路线，以便我直接按图出行。

#### 验收标准

1. WHEN 用户通过文字或语音输入旅游需求，THE Mini_App SHALL 将输入内容转换为文本并提交给 AI_Engine
2. WHEN AI_Engine 收到需求文本，THE AI_Engine SHALL 生成包含 POI 列表、游览顺序、建议停留时长的结构化路线数据
2.1. THE AI_Engine SHALL 使用以下提示词模板与LLM交互：
   ```
   你是一个上海资深导游。现在有一个用户的画像是：
   【国籍：{用户国籍}，偏好：{用户偏好标签列表}】
   用户的需求是："{用户输入的原始文本}"
   
   请从以下提供的候选POI库中（JSON数组），为该用户规划一条{天数}天的旅游路线。
   要求：
   1. 严格从候选库中选择POI，不得虚构地点
   2. 返回POI列表、游览顺序、建议停留时长
   3. 说明每个POI的推荐理由
   4. 严格以JSON格式返回
   
   候选POI库：{候选POI的JSON数组}
   ```
3. THE AI_Engine SHALL 仅从 POI_DB 中已存在的 POI 构建路线，不得虚构地点
4. WHEN 路线生成完成，THE Map_Service SHALL 在地图上按顺序标记各 POI 坐标并绘制路径连线
5. WHEN 用户点击路线中的 POI，THE Mini_App SHALL 展示该 POI 的街景图（Mock 数据）和票务状态（来自 Mock_Service）
6. WHEN 路线生成完成，THE Mini_App SHALL 将路线数据写入 routes_info 表并关联当前用户
7. IF AI_Engine 无法从 POI_DB 中匹配到满足需求的 POI，THEN THE AI_Engine SHALL 返回提示信息说明无法生成路线的原因

---

### 需求 5：地图核心能力

**用户故事：** 作为游客，我希望在地图上直观看到景点分布、人流热度，并能完成打卡操作，以便规划行程和记录旅途。

#### 验收标准

1. THE Map_Service SHALL 基于高德地图 SDK 在小程序中渲染 POI 标记点
2. THE Map_Service SHALL 基于 poi_stats.heat_score 数据渲染潮流热力图图层
3. WHEN 用户到达 POI 附近（GPS 距离 ≤ 200 米），THE Mini_App SHALL 允许用户触发打卡操作
4. WHEN 用户完成打卡，THE Mini_App SHALL 将打卡记录写入 check_info 表，包含用户位置坐标和时间戳
5. WHEN 用户尝试对某 POI 发表评论，THE Mini_App SHALL 校验该用户是否已在当前路线下对该 POI 完成打卡（校验条件：`user_id + poi_id + route_id`），IF 未打卡 THEN THE Mini_App SHALL 拒绝提交并提示"需先打卡才能评论"
6. WHILE 用户浏览地图，THE Map_Service SHALL 支持 POI 标记点的点击展开详情操作

---

### 需求 6：行程海报生成与分享

**用户故事：** 作为游客，我希望将我的旅游路线生成精美海报并分享给朋友，以便传播旅游体验。

#### 验收标准

1. WHEN 用户选择生成行程海报，THE Mini_App SHALL 将路线名称、POI 列表、地图截图合成为图片海报
2. WHEN 海报生成完成，THE Mini_App SHALL 提供保存到相册和分享到微信的操作选项
3. THE Mini_App SHALL 在海报中展示路线包含的 POI 数量、总天数信息
4. IF 海报生成失败，THEN THE Mini_App SHALL 提示用户生成失败并提供重试选项

---

### 需求 7：内容推荐（Vlog / 评论）

**用户故事：** 作为游客，我希望在小程序中看到其他用户的 Vlog 和评论内容，以便获取真实的旅游参考。

#### 验收标准

1. THE Mini_App SHALL 在首页或发现页展示来自 comment_info 表中 type=1（已提交）的评论内容
2. THE Mini_App SHALL 按 comment_info.score 降序和 created_at 时间排序展示内容
3. WHEN 用户点击某条内容，THE Mini_App SHALL 展示评论详情，包含评分、图片和关联 POI 信息
4. WHERE 政府端已发布官方图文/视频内容，THE Mini_App SHALL 在内容推荐区优先展示官方内容

---

### 需求 8：商户注册与信息管理

**用户故事：** 作为商户，我希望能注册账号、完成认证并维护我的 POI 信息，以便在平台上展示我的业务。

#### 验收标准

1. WHEN 商户提交注册申请，THE Merchant_Portal SHALL 将商户信息写入 merchants 表，初始 status 设为 0（待审核）
2. WHEN 商户注册成功，THE Merchant_Portal SHALL 允许商户填写并关联 poi_info 中的 POI 信息
3. THE Merchant_Portal SHALL 允许已审核通过（status=1）的商户维护 POI 的名称、描述、标签、照片、开放时间等信息
4. IF 商户账号 status 为 2（封禁）或 3（驳回），THEN THE Merchant_Portal SHALL 拒绝该账号登录并展示对应状态说明
5. THE Auth_Service SHALL 对商户端所有接口进行身份校验，WHILE 商户未登录，THE Merchant_Portal SHALL 重定向至登录页

---

### 需求 9：商户客流数据可视化

**用户故事：** 作为商户，我希望查看我的 POI 客流数据和停留时长统计，以便了解经营状况。

#### 验收标准

1. THE Merchant_Portal SHALL 从 poi_stats 表读取关联 POI 的 check_count、heat_score、avg_stay_time 数据并展示
2. THE Merchant_Portal SHALL 以柱状图形式展示近 30 天的每日打卡数量趋势
3. THE Merchant_Portal SHALL 以热力图形式展示 POI 周边的人流分布
4. THE Merchant_Portal SHALL 展示 POI 的平均停留时长统计数据
5. WHEN 商户请求生成经营分析报告，THE AI_Engine SHALL 基于 poi_stats 数据生成不少于 200 字的文字分析报告

---

### 需求 10：商户评论管理

**用户故事：** 作为商户，我希望查看和管理用户对我的 POI 的评论，以便及时回应用户反馈。

#### 验收标准

1. THE Merchant_Portal SHALL 展示关联 POI 下 comment_info 表中 type=1 的所有评论列表
2. THE Merchant_Portal SHALL 支持商户对评论进行追评回复操作
3. THE Merchant_Portal SHALL 展示评论的已读/未读状态（is_seen 字段）
4. WHEN 商户查看评论详情，THE Merchant_Portal SHALL 将 comment_info.is_seen 更新为已读
5. THE Merchant_Portal SHALL 提供按评分、时间排序的评论筛选功能

---

### 需求 11：政府端商户审核

**用户故事：** 作为政府管理员，我希望审核商户入驻申请，以便确保平台商户的合规性。

#### 验收标准

1. THE Gov_Portal SHALL 展示 merchants 表中 status=0（待审核）的商户申请列表
2. WHEN 管理员审核通过，THE Gov_Portal SHALL 将 merchants.status 更新为 1（审核成功）并通知商户
3. WHEN 管理员驳回申请，THE Gov_Portal SHALL 将 merchants.status 更新为 3（驳回）并要求填写驳回原因
4. THE Auth_Service SHALL 仅允许 government 表中 role=0（超级管理）的账号执行封禁操作（status=2）
5. THE Gov_Portal SHALL 支持对已入驻商户执行封禁（status=2）和注销（status=4）操作

---

### 需求 12：政府端全市热力监控与应急指挥

**用户故事：** 作为政府管理员，我希望实时查看全市人流热力分布并规划应急路线，以便进行城市旅游管理和应急响应。

#### 验收标准

1. THE Gov_Portal SHALL 基于 poi_stats.heat_score 数据在全市地图上渲染人流热力图
2. THE Gov_Portal SHALL 支持按行政区（poi_info.district）筛选热力图展示范围
3. THE Gov_Portal SHALL 展示全市及各行政区的打卡数量统计（来自 check_info 表）
4. WHEN 管理员选择应急指挥模式，THE Gov_Portal SHALL 允许在地图上标记应急路线起终点并生成路线
5. THE Gov_Portal SHALL 展示热门路线排行榜，基于 routes_info 表中路线被使用次数统计

---

### 需求 13：政府端官方内容发布

**用户故事：** 作为政府管理员，我希望发布官方图文和视频内容，以便向游客推广优质旅游资源。

#### 验收标准

1. THE Gov_Portal SHALL 提供图文和视频内容的创建、编辑、发布功能
2. WHEN 官方内容发布后，THE System SHALL 将内容同步至 Mini_App 的内容推荐区
3. THE Gov_Portal SHALL 支持对已发布内容进行下线操作
4. THE Auth_Service SHALL 仅允许 government 表中的账号访问 Gov_Portal 的内容发布功能

---

### 需求 14：三端统一认证与权限管理

**用户故事：** 作为系统管理员，我希望三端有独立的认证体系和权限控制，以便确保数据安全和访问隔离。

#### 验收标准

1. THE Auth_Service SHALL 为 Mini_App 用户端提供基于微信 openid 的登录认证
2. THE Auth_Service SHALL 为 Merchant_Portal 提供基于手机号 + 密码的登录认证
3. THE Auth_Service SHALL 为 Gov_Portal 提供基于手机号 + 密码的登录认证，并区分 role=0 和 role=1 的权限范围
4. THE Auth_Service SHALL 对所有 API 接口进行 JWT Token 校验
5. IF Token 过期或无效，THEN THE Auth_Service SHALL 返回 401 状态码并拒绝请求
6. THE Auth_Service SHALL 确保商户端账号无法访问政府端接口，政府端账号无法访问商户端专属接口

---

### 需求 15：票务与开放时间 Mock 数据服务

**用户故事：** 作为开发者，我希望系统提供 Mock 票务和开放时间数据，以便在外部数据接入前完成功能开发和演示。

#### 验收标准

1. THE Mock_Service SHALL 基于 ticket_info 表结构提供 POI 票务信息的 Mock 数据接口
2. THE Mock_Service SHALL 基于 opening_time 表结构提供 POI 开放时间的 Mock 数据接口
3. WHEN Mini_App 请求某 POI 的票务状态，THE Mock_Service SHALL 返回包含票价、库存、状态的结构化数据
4. THE Mock_Service SHALL 支持通过配置开关在 Mock 模式和真实数据模式之间切换

---

### 需求 16：AI 路线规划意图识别策略

**用户故事：** 作为系统，我需要区分用户的明确意图和模糊意图，以便采用不同的路线规划策略。

#### 验收标准

1. WHEN 用户输入包含具体POI名称或地址（如"我想去外滩、南京路、城隍庙"），THE AI_Engine SHALL 采用"实体抽取"策略，从输入中提取POI实体并从数据库精确匹配
2. WHEN 用户输入仅包含模糊描述（如"想吃川菜"、"想看历史建筑"），THE AI_Engine SHALL 采用"语义检索"策略，根据用户偏好和标签从数据库检索候选POI
3. THE AI_Engine SHALL 将用户输入解析为结构化标签（如{"target": "川菜", "requirements": ["外国人友好", "英文菜单", "微辣"]}）用于数据库查询
4. WHEN 粗筛候选POI数量超过50个，THE AI_Engine SHALL 按poi_stats.heat_score降序截取前50个提交给LLM，避免超出上下文限制
5. WHEN 用户输入同时包含明确POI和模糊描述（如"我想去外滩，然后找个安静的咖啡馆"），THE AI_Engine SHALL 混合使用两种策略
6. THE AI_Engine SHALL 在返回路线时标注每个POI的匹配方式（精确匹配/语义推荐）

---

## 4. 功能实现规划（亮点 · 必须实现 · 之后再实现 · 难点）

本节对照《课题功能清单》与本文档既有需求（含 `user-端-requirements*.md`、`database-design*.md`），给出覆盖结论、交付分层与数据库补强建议。**采购与合规**：微信小程序 + H5 用户端、Vue3 Web 经营商/政府端、MySQL + LLM + 高德地图的总体方案已在「简介」与需求 1–16 中定型，本节不再重复业务细则。

### 4.1 与课题清单的对照总表

| 模块 | 课题要点 | 文档覆盖情况 | 说明 |
|------|----------|--------------|------|
| 整体 | 国际化（界面 + POI/标签多语言） | **已覆盖** | 需求 2；`poi_info.poi_name`、`tag_info.tag_name` JSON；冷启动国籍联动默认语言。 |
| 整体 | 语音识别 → 标签/结构化意图 | **已覆盖** | 需求 4、16；语音转写后进入与文字相同的 NLP 流水线。 |
| 整体 | 用户小程序/H5，经营商与政府 Web | **已覆盖** | 简介与需求 14；详见独立用户端页面文档。 |
| 用户 | 冷启动偏好卡片（身份/偏好） | **已覆盖** | 需求 1；身份与「历史建筑、暴走特种兵、咖啡」等可归入 `preference_tags` 与 `intensity`。 |
| 用户 | 粗筛 + LLM 细选 TOP5、防幻觉 | **已覆盖** | 需求 3、4、16；候选规模上限 50、仅库内 `poi_uuid` 校验。**注意**：100 条候选易挤爆上下文，现行方案以 **≤50** 更稳妥；若模型窗口增大可配置为 80–100。 |
| 用户 | 路线可视化、街景、门票余票 | **已覆盖** | 需求 4–5、15；街景高德静态图/Mock；票务 `ticket_info` Mock。 |
| 用户 | 明确意图实体抽取 / 模糊语义检索 | **已覆盖** | 需求 16。 |
| 用户 | 菜系、情绪等细标签 | **已覆盖** | 需求 3 标签体系；`tag_info.category`。 |
| 用户 | 潮流热力图 | **已覆盖** | 需求 5、商户/政府可视化需求。 |
| 用户 | 搜索 + 推荐（Vlog、评论、街景） | **部分覆盖** | 评论、官方内容、搜索、街景已写；**独立「用户 Vlog」短视频流**若与「发现页 UGC」不同，需单独数据模型（见 4.3）。 |
| 用户 | 打卡、评论权限（打卡后置） | **已覆盖** | 需求 5；`check_info` 支持**路线 / 自由**双模式（`route_id` 可空），**发表评论仍以路线打卡为准**；见库表与唯一键说明。 |
| 用户 | 行程海报与分享 | **已覆盖** | 需求 6；用户端页面文档。 |
| 用户 | 仅单轮对话 | **已覆盖** | 用户端路线需求明确不支持多轮追问。 |
| 经营商 | 注册（类别） | **部分覆盖** | 有 `merchants` 与审核；**经营类目/业态字段**库表中未显式建模，建议补充（见 4.3）。 |
| 经营商 | 信息维护 + 标签 | **已覆盖** | 需求 8、`merchant_poi_rel`、`poi_tag_rel`。 |
| 经营商 | 客流、AI 报告、图表 | **已覆盖** | 需求 9；柱状图 + 热力图 + LLM 报告。 |
| 经营商 | 追评、评论分析 | **追评已覆盖**；**评论分析（情感/主题聚类）** | 文档侧重列表与追评；高阶分析列为「之后实现」。 |
| 经营商 | 博物馆内分区停留、吸引力 | **弱覆盖** | 仅有 `poi_stats.avg_stay_time` 整点级；**馆内展区级停留**需增量表或后续迭代。 |
| 政府 | 商户审核、行政区热力、应急 | **已覆盖** | 需求 11–12。 |
| 政府 | 路线热度、打卡统计、优质路线宣传 | **已覆盖** | `routes_info.use_count`、需求 12 排行榜；宣传依赖 `official_content`。 |
| 政府 | 公众号等外源抓取发布 | **未覆盖** | 无接口与表字段；列为「之后实现」并给出字段建议（4.3）。 |
| 政府 | 标签管理 | **已覆盖** | `tag_info` + 权限；需在政府端 PRD 中写清单面若尚未单独成文。 |

**文档一致性提示**：`user-端-requirements.md` 中「语言仅中英」与本文档需求 2（中/英/日/韩）不一致，**以本文档与 `database-design` 多语言字段为准**，避免实现阶段口径分裂。

### 4.2 亮点（论文与演示可重点写）

1. **数据库约束 + LLM 编排**：粗筛在库内完成，LLM 只做「在候选集合内排序/解释」，并对 `poi_uuid` 做存在性校验，从工程上压制地图类幻觉。
2. **冷启动可解释推荐**：问卷画像直接进 `user_prefer` + 标签体系，推荐链路可复盘（标签权重、`heat_score`）。
3. **刷评治理闭环**：`user_id + poi_id + route_id` 打卡唯一、评论唯一，与线下游览场景绑定，比纯文本反作弊更易举证。
4. **三端数据同源**：POI、统计、内容、路线共用同一套库，政府宣传与 C 端发现联动。

### 4.3 必须实现（MVP，与答辩强相关）

- 用户：微信登录、冷启动偏好、多语言展示、首页推荐（粗筛+LLM）、单轮路线生成、地图 POI/热力、打卡、检票 Mock、评论（打卡后）、海报/分享、基础搜索。
- 经营商：注册与审核通过后 POI/标签维护、`poi_stats` 只读看板、柱状/热力、AI 文字经营报告、评论列表与追评。
- 政府：商户审核、全市/行政区热力、`check_info` 聚合、应急路线标绘、官方图文/视频发布、`routes_info` 热门排行。
- 后端：JWT 分端鉴权、Mock_Service 可切换、核心表外键与唯一约束落地（含打卡与评论防重复）。

### 4.4 之后再实现（不影响 MVP 叙事，可写进「展望」）

1. **公众号/推文同步**：定时抓取或人工导入 URL，写入 `official_content`（建议字段见下）。
2. **商户侧评论智能分析**：情感分析、关键词、差评预警（可接大模型批处理或开源模型）。
3. **馆内细粒度停留**：展区 POI 子表、或蓝牙/UWB 演示数据；与当前 `avg_stay_time` 并存。
4. **独立 Vlog 流**：若与「评论带图」分流产品形态，增加 `ugc_video` 或在 `comment_info` 扩展 `video_urls` 与审核状态机。
5. **多轮对话式改行程**：需在会话状态、增量 diff 路由上与现「单轮+编辑路线」区分产品边界。

### 4.5 技术难点与对策

| 难点 | 对策（文档已有 + 补充） |
|------|-------------------------|
| LLM 虚构地点 | 仅库内候选 + 返回 JSON 仅含已有 `poi_uuid` + 服务端二次校验；失败则从候选池顺位替补。 |
| 上下文长度 | 候选 POI JSON 控制在 **≤50** 条，字段裁剪（uuid、名称、标签摘要、距离）；超长意图先结构化再查库。 |
| 语音链路成本与延迟 | ASR 走第三方 API；与路线生成异步排队，前端 loading 与重试（用户端已写）。 |
| 小程序热力图性能 | Canvas 叠加 + 分级聚合（用户端热力需求）；政府大屏可用 Web 侧增强。 |
| 余票真实接入 | 交期内以 `ticket_info` Mock + 开关；真源对接单独里程碑。 |
| MySQL 空间索引 | 设计中 `SPATIAL INDEX (longitude, latitude)` 在经典 InnoDB 中需 **POINT/GEOMETRY** 列；上线前改为 `POINT` 生成列 + SPATIAL，或**先用 `(latitude, longitude)` B-tree 二维范围查询 + Redis geo**（毕设可二选一并在论文中写明）。 |
| `check_info.route_id` | 已支持**可空**：自由打卡 `route_id` 为空；**评论解锁仅认路线打卡**（`route_id` 非空且与 `comment_info` 一致）。防重推荐 **生成列 `check_dedup_key` + UNIQUE**，见 `database-design-part2.md`。 |

### 4.6 数据库完善建议（增量，不改变既有表主旨）

以下在现行 `database-design*.md` 基础上**建议追加**，便于覆盖课题表述与后续扩展：

1. **`merchants` 表**：增加 `merchant_category`（或 `business_type`）`VARCHAR(50)`，表示景区/餐饮/博物馆等注册类别；可选 `license_type`。
2. **`official_content` 表**：增加 `source_type`（`manual` / `wechat_article` / `import_url`）、`source_url`（原文链接）、`fetched_at`（抓取时间），支撑「从公众号提取」的二期叙事。
3. **馆内展区（可选）**：新建 `poi_zone`（`id, poi_id, zone_name JSON, floor, sort_order`）与 `zone_dwell_stats`（`poi_id, zone_id, date, dwell_seconds`）用于「馆内是否分区」的学术化扩展；MVP 可仅用 Mock 数据演示。
4. **约束落库**：`check_info` 对自由打卡与路线打卡的防重采用 **`check_dedup_key`（生成列）+ UNIQUE** 或等价应用层幂等键；`poi_stats` 指标计算依据见 `database-design.md` §2。
5. **全文/搜索（可选）**：`poi_info`、`comment_info` 上对中文可做 **ngram 全文索引** 或引入 ES/OpenSearch；MVP 用 `LIKE` + 标签筛选可接受。

---

*（第 4 节为方案层增量说明；具体字段以 `database-design.md` / `database-design-part2.md` 为准，实施 DDL 前请在同名设计文档中同步补丁。）*

