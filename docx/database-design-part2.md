### 7. routes_info（AI 路线表）

**表说明**：存储LLM规划的旅游路线，用户可分享。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| user_id | INT | NOT NULL, INDEX, FOREIGN KEY | 关联user.id | 1 |
| route_name | VARCHAR(100) | NOT NULL | 路线名称 | 上海3日游 |
| poi_list | JSON | NOT NULL | POI ID列表 | [1,3,5,7,9] |
| route_detail | JSON | NULL | 路线详情 | {"day1":[{"poi_id":1,"stay_time":2,"reason":"..."}]} |
| total_days | INT | NOT NULL | 游玩天数 | 3 |
| use_count | INT | DEFAULT 0 | 使用次数（被其他用户复用） | 15 |
| status | TINYINT(1) | DEFAULT 0, INDEX | 状态（0已生成1已完成） | 0 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 | 2024-01-01 10:00:00 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 | 2024-01-01 10:00:00 |

**索引设计**：
- PRIMARY KEY: `id`
- INDEX: `idx_user_id` ON `user_id`
- INDEX: `idx_use_count` ON `use_count` （用于热门路线排行）
- INDEX: `idx_created_at` ON `created_at`

**字段说明**：
- `route_detail`：存储每天的详细行程，包含POI ID、停留时长、推荐理由等
- `use_count`：其他用户复用该路线时递增

---

### 8. check_info（打卡表）

**表说明**：存储用户打卡记录，支撑防刷评、**自由打卡 / 路线打卡**双模式、客流与多维时段分析。时间维度字段与 `check_time` **同源**，在服务端按统一时区（建议东八区）写入，避免与 `check_time` 不一致。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| user_id | INT | NOT NULL, INDEX, FOREIGN KEY | 关联 user.id | 1 |
| poi_id | INT | NOT NULL, INDEX, FOREIGN KEY | 关联 poi_info.id | 5 |
| route_id | INT | NULL, INDEX, FOREIGN KEY | 关联 routes_info.id；**NULL = 自由打卡**，非空 = 路线打卡 | 3 |
| check_time | DATETIME | NOT NULL, INDEX | 打卡时刻（业务时区） | 2024-01-01 14:30:00 |
| longitude | DECIMAL(10,7) | NOT NULL | 打卡经度（GCJ-02） | 116.317848 |
| latitude | DECIMAL(10,7) | NOT NULL | 打卡纬度（GCJ-02） | 39.994085 |
| stay_mins | INT | NULL | 停留时长（分钟）；入场打卡可空，离场或问卷补录 | 45 |
| hour_tag | TINYINT | NOT NULL, INDEX | 小时段 0–23，与 `check_time` 一致 | 14 |
| week_tag | TINYINT | NOT NULL, INDEX | 周几，**1=周一 … 7=周日** | 1 |
| month_tag | TINYINT | NOT NULL, INDEX | 月份 1–12 | 3 |
| year_tag | INT | NOT NULL, INDEX | 年份 YYYY | 2024 |
| day_tag | DATE | NOT NULL, INDEX | 打卡日期，=`DATE(check_time)` | 2024-01-01 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 记录创建时间 | 2024-01-01 14:30:05 |

**索引设计**：
- PRIMARY KEY: `id`
- INDEX: `idx_poi_time` ON `(poi_id, check_time)`
- INDEX: `idx_poi_day` ON `(poi_id, day_tag)`（对齐 `poi_stats` 日汇）
- INDEX: `idx_poi_day_hour` ON `(poi_id, day_tag, hour_tag)`（按小时客流）
- INDEX: `idx_route_id` ON `route_id`
- INDEX: `idx_user_poi_day` ON `(user_id, poi_id, day_tag)`（自由打卡防重、审计）
- UNIQUE INDEX: `idx_user_poi_route` ON `(user_id, poi_id, route_id)`：**对 `route_id` 非空** 时，禁止重复路线打卡；**`route_id` 为 NULL 时** MySQL 唯一索引不互斥多条 NULL，故**不能**单靠本索引限制自由打卡次数。

**推荐：生成列统一唯一（路线 + 自由一并防重）**  
- `check_dedup_key` VARCHAR(96) STORED：当 `route_id IS NOT NULL` 时为 `CONCAT('R:', user_id, ':', poi_id, ':', route_id)`；当 `route_id IS NULL` 时为 `CONCAT('F:', user_id, ':', poi_id, ':', day_tag)`。  
- `UNIQUE(check_dedup_key)`：**路线模式**「每用户每 POI 每条路线至多一次」；**自由模式**默认「每用户每 POI 每个自然日至多一次」。若产品允许**同一日多次**自由签，勿采用 `day_tag` 粒度，应改 `hour_tag` 或去掉该唯一键改业务审核。

**若不建生成列**：至少保留 `UNIQUE(user_id, poi_id, route_id)`，并对自由打卡在应用层做 `(user_id, poi_id, day_tag)` 幂等校验。

**业务规则**：
- **双模式**：`route_id` 非空为**路线打卡**（跟随 AI/用户路线）；`route_id` 为空为**自由打卡**（地图上主动签到，仍须 GPS 围栏校验）。  
- **评论权限**：与需求一致时，**仅「路线打卡」且 `route_id` 与评论一致**可作为发表评论前置；自由打卡不参与评论解锁。  
- **GPS**：到达 POI 附近（如 ≤200 m）才允许写入；经纬度存档备审计。  
- **时间维度**：`hour_tag = HOUR(check_time)`（按业务时区）；`week_tag` 采用 ISO 周历习惯 **1=周一**（实现时注意与 MySQL `DAYOFWEEK`（周日为 1）做转换）；`month_tag`/`year_tag`/`day_tag` 均由 `check_time` 推导，**禁止客户端随意传与 `check_time` 冲突的值**。  
- **停留**：`stay_mins` 可为空；离开展点补传或后端根据同一用户下一 POI 打卡估算（二期），汇总进 `poi_stats.avg_stay_time` 时见 `poi_stats` 一节公式。

---

### 9. merchants（商户表）

**表说明**：存储商户账号信息，支持审核流程。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| merchant_name | VARCHAR(100) | NOT NULL | 商户名称 | 上海博物馆 |
| tel | VARCHAR(20) | UNIQUE, NOT NULL, INDEX | 手机号（用于登录） | 13800138000 |
| password | VARCHAR(255) | NOT NULL | 密码（哈希） | $2a$10$... |
| business_license | VARCHAR(255) | NULL | 营业执照URL | https://example.com/license.jpg |
| status | TINYINT(1) | DEFAULT 0, INDEX | 状态（0待审核1审核成功2封禁3驳回4注销） | 0 |
| reject_reason | VARCHAR(255) | NULL | 驳回原因 | 营业执照不清晰 |
| merchant_category | VARCHAR(50) | NULL, INDEX | 经营类别/业态（注册时选择，如景区、博物馆、餐饮） | museum |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 | 2024-01-01 10:00:00 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 | 2024-01-01 10:00:00 |

**索引设计**：
- PRIMARY KEY: `id`
- UNIQUE INDEX: `idx_tel` ON `tel`
- INDEX: `idx_status` ON `status`
- INDEX: `idx_merchant_category` ON `merchant_category`

**业务规则**：
- 商户注册后初始status为0（待审核）
- 审核通过后status变为1，关联的POI的status也变为1

---

### 10. merchant_poi_rel（商户POI关联表）

**表说明**：商户与POI的多对多关系表（一个商户可管理多个POI）。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| merchant_id | INT | NOT NULL, INDEX, FOREIGN KEY | 关联merchants.id | 1 |
| poi_id | INT | NOT NULL, INDEX, FOREIGN KEY | 关联poi_info.id | 5 |
| is_primary | TINYINT(1) | DEFAULT 0 | 是否主POI（0否1是） | 1 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 | 2024-01-01 10:00:00 |

**索引设计**：
- PRIMARY KEY: `id`
- UNIQUE INDEX: `idx_merchant_poi` ON `(merchant_id, poi_id)` （防止重复关联）
- INDEX: `idx_poi_id` ON `poi_id`

---

### 11. government（政府管理员表）

**表说明**：存储政府管理员账号信息。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 用户名 | admin |
| tel | VARCHAR(20) | UNIQUE, NOT NULL, INDEX | 手机号（用于登录） | 13800138000 |
| password | VARCHAR(255) | NOT NULL | 密码（哈希） | $2a$10$... |
| role | TINYINT(1) | DEFAULT 1, INDEX | 角色（0超级管理1普通管理） | 0 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 | 2024-01-01 10:00:00 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 | 2024-01-01 10:00:00 |

**索引设计**：
- PRIMARY KEY: `id`
- UNIQUE INDEX: `idx_tel` ON `tel`
- UNIQUE INDEX: `idx_username` ON `username`

**业务规则**：
- role=0（超级管理）可执行封禁操作
- role=1（普通管理）权限受限

---

### 12. comment_info（评论表）

**表说明**：存储用户评论，支持商户追评。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| user_id | INT | NOT NULL, INDEX, FOREIGN KEY | 关联user.id | 1 |
| poi_id | INT | NOT NULL, INDEX, FOREIGN KEY | 关联poi_info.id | 5 |
| route_id | INT | NULL, INDEX, FOREIGN KEY | 关联routes_info.id | 3 |
| content | TEXT | NOT NULL | 评论内容 | 景色很美，值得一去 |
| score | TINYINT(1) | NOT NULL, INDEX | 评分（1-5） | 5 |
| images | JSON | NULL | 图片列表 | ["http://xx.com/1.jpg","http://yy.com/2.jpg"] |
| is_seen | TINYINT(1) | DEFAULT 0, INDEX | 商家是否已查看（0否1是） | 0 |
| merchant_reply | TEXT | NULL | 商户追评回复 | 感谢您的支持！ |
| reply_time | DATETIME | NULL | 回复时间 | 2024-01-02 10:00:00 |
| type | TINYINT(1) | DEFAULT 0, INDEX | 类型（0草稿1已提交） | 1 |
| is_reported | TINYINT(1) | DEFAULT 0, INDEX | 是否曾被举报（0否1是） | 0 |
| audit_status | TINYINT(1) | DEFAULT 0, INDEX | 审核状态（见下） | 0 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 | 2024-01-01 10:00:00 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 | 2024-01-01 10:00:00 |

**索引设计**：
- PRIMARY KEY: `id`
- UNIQUE INDEX: `idx_user_poi_route` ON `(user_id, poi_id, route_id)` （防止同一路线下重复评论）
- INDEX: `idx_poi_score` ON `(poi_id, score)` （用于评分排序）
- INDEX: `idx_type_created` ON `(type, created_at)` （用于内容推荐）
- INDEX: `idx_user_id` ON `user_id`
- INDEX: `idx_audit_reported` ON `(audit_status, is_reported)` （政府/运营筛违规与待审）

**audit_status 枚举**：
- `0`：正常展示
- `1`：待审核（如被举报后进入队列）
- `2`：违规已隐藏（用户端不展示，商户/政府可见）
- `3`：举报不成立 / 人工放行，维持展示

**业务规则**：
- 用户必须先在对应路线下打卡该POI才能评论（通过check_info表校验 `user_id + poi_id + route_id`）
- 同一用户在同一路线下对同一POI只能评论一次（由唯一索引保证）
- 用户在不同路线下打卡同一POI，可分别发表评论
- type=0为草稿，type=1为已提交
- 商户可通过merchant_reply字段追评
- C 端列表默认仅展示 `audit_status=0` 且 `type=1`；政府端可查询 `audit_status IN (1,2)` 做处置

---

### 13. ticket_info（票务表）

**表说明**：存储POI的票务信息（Mock数据）。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| poi_id | INT | NOT NULL, INDEX, FOREIGN KEY | 关联poi_info.id | 5 |
| ticket_name | JSON | NOT NULL | 票名称（多语言） | {"zh":"学生票","en":"Student Ticket"} |
| description | JSON | NULL | 票描述（多语言） | {"zh":"凭学生证","en":"With Student ID"} |
| price | DECIMAL(10,2) | NOT NULL | 价格 | 12.00 |
| stock | INT | DEFAULT 0 | 余票 | 20 |
| status | TINYINT(1) | DEFAULT 1, INDEX | 状态（0不在售1在售） | 1 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 | 2024-01-01 10:00:00 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 | 2024-01-01 10:00:00 |

**索引设计**：
- PRIMARY KEY: `id`
- INDEX: `idx_poi_status` ON `(poi_id, status)`

---

### 14. opening_time（开放时间表）

**表说明**：存储POI的开放时间规则。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| poi_id | INT | NOT NULL, INDEX, FOREIGN KEY | 关联poi_info.id | 5 |
| type | VARCHAR(20) | NOT NULL, INDEX | 类型 | week |
| value | VARCHAR(50) | NOT NULL | 类型值 | 1,2,3,4,5 |
| time | JSON | NOT NULL | 时间（多语言） | {"zh":"09:00-18:00","en":"09:00-18:00"} |
| priority | INT | DEFAULT 0, INDEX | 优先级（越小越优先） | 1 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 | 2024-01-01 10:00:00 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 | 2024-01-01 10:00:00 |

**索引设计**：
- PRIMARY KEY: `id`
- INDEX: `idx_poi_priority` ON `(poi_id, priority)` （用于规则匹配）

**type 枚举值**：
- `week`：周（value: 1-7，1=周一）
- `month`：每月（value: 1-31）
- `year`：每年固定日期（value: 01-01 到 12-31）
- `season`：月份（value: 1-12）
- `special`：特殊日期（value: 2024-01-01）

**业务规则**：
- 优先使用priority值最小的规则
- 支持闭馆日设置（time字段为{"zh":"闭馆","en":"Closed"}）

---

### 15. official_content（官方内容表）

**表说明**：存储政府端发布的官方图文/视频内容。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| gov_id | INT | NOT NULL, INDEX, FOREIGN KEY | 关联government.id | 1 |
| title | JSON | NOT NULL | 标题（多语言） | {"zh":"上海旅游攻略","en":"Shanghai Travel Guide"} |
| content | JSON | NOT NULL | 内容（多语言） | {"zh":"...","en":"..."} |
| content_type | VARCHAR(20) | NOT NULL, INDEX | 内容类型 | article |
| cover_image | VARCHAR(255) | NULL | 封面图 | https://example.com/cover.jpg |
| media_url | VARCHAR(255) | NULL | 视频URL | https://example.com/video.mp4 |
| related_poi_ids | JSON | NULL | 关联POI ID列表 | [1,3,5] |
| view_count | INT | DEFAULT 0 | 浏览次数 | 1500 |
| status | TINYINT(1) | DEFAULT 1, INDEX | 状态（0下线1发布） | 1 |
| published_at | DATETIME | NULL | 发布时间 | 2024-01-01 10:00:00 |
| source_type | VARCHAR(30) | NULL, INDEX | 来源类型（manual / wechat_article / import_url 等） | wechat_article |
| source_url | VARCHAR(512) | NULL | 外部原文链接（如公众号文章 URL），二期同步用 | https://... |
| fetched_at | DATETIME | NULL | 外部内容拉取时间 | 2024-01-01 10:00:00 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 | 2024-01-01 10:00:00 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 | 2024-01-01 10:00:00 |

**索引设计**：
- PRIMARY KEY: `id`
- INDEX: `idx_status_published` ON `(status, published_at)` （用于内容推荐）
- INDEX: `idx_content_type` ON `content_type`

**content_type 枚举值**：
- `article`：图文
- `video`：视频

---

### 16. chat_records（AI 单轮对话记录表）

**表说明**：记录用户与 LLM 的**单轮**请求与响应（推荐、路线生成等），便于日志审计、失败重试、提示词与模型效果优化。不承载多轮会话状态。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| user_id | INT | NULL, INDEX, FOREIGN KEY | 关联 user.id；未登录压测可为 NULL | 1 |
| scene | VARCHAR(32) | NOT NULL, INDEX | 业务场景 | poi_recommend、route_generate |
| user_input | TEXT | NULL | 用户原始输入（路线规划时的自然语言等） | 我想在上海玩3天… |
| context_json | JSON | NULL | 入参摘要（用户画像、候选 POI id 列表等，宜裁剪避免过大） | {"tag_ids":[1,2]} |
| model_name | VARCHAR(64) | NULL | 模型标识 | gpt-4o-mini |
| llm_response | JSON | NULL | 模型结构化输出原文或解析后 JSON | {"poi_ids":[1,2,3]} |
| raw_text | MEDIUMTEXT | NULL | 模型原始文本（可选，用于对账） | … |
| status | TINYINT(1) | DEFAULT 0, INDEX | 0失败 1成功 | 1 |
| error_message | VARCHAR(512) | NULL | 失败原因 | timeout |
| latency_ms | INT | NULL | 耗时（毫秒） | 2300 |
| route_id | INT | NULL, INDEX, FOREIGN KEY | 若本请求生成路线则关联 routes_info.id | 10 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, INDEX | 创建时间 | 2024-01-01 10:00:00 |

**索引设计**：
- PRIMARY KEY: `id`
- INDEX: `idx_user_scene_time` ON `(user_id, scene, created_at)`
- INDEX: `idx_status_created` ON `(status, created_at)`

**业务规则**：
- 定期归档或按时间分区，避免表无限膨胀；敏感字段遵守隐私政策

---

### 17. route_share（行程分享与海报记录表）

**表说明**：记录路线分享行为与海报生成结果，用于统计渠道效果、排查生成失败。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| user_id | INT | NOT NULL, INDEX, FOREIGN KEY | 关联 user.id | 1 |
| route_id | INT | NOT NULL, INDEX, FOREIGN KEY | 关联 routes_info.id | 3 |
| share_channel | VARCHAR(32) | NOT NULL, INDEX | 分享渠道 | wechat_session、wechat_timeline、poster_save |
| poster_url | VARCHAR(512) | NULL | 生成海报图片 CDN/OSS 地址（非海报渠道可空） | https://cdn/.../x.jpg |
| poster_status | TINYINT(1) | DEFAULT 0 | 海报任务：0未生成 1成功 2失败 | 1 |
| extra | JSON | NULL | 扩展日志（画布尺寸、客户端版本等） | {"w":750,"h":1334} |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, INDEX | 发生时间 | 2024-01-01 10:00:00 |

**索引设计**：
- PRIMARY KEY: `id`
- INDEX: `idx_route_channel` ON `(route_id, share_channel)`
- INDEX: `idx_user_created` ON `(user_id, created_at)`

**业务规则**：
- 与 `routes_info.use_count` 配合：分享卡片被打开复制路线时仍可只更新 `use_count`，本表侧重「分享动作」埋点

---

### 18. user_behavior（用户行为埋点表，可选）

**表说明**：记录浏览、搜索、点击、收藏等行为，用于优化推荐权重、热力估算、LLM 候选排序等。数据量大时建议分区或异步写入 OLAP。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| user_id | INT | NULL, INDEX, FOREIGN KEY | 关联 user.id；匿名浏览可 NULL | 1 |
| session_id | VARCHAR(64) | NULL, INDEX | 端上会话 ID，便于串联行为 | abc-123 |
| action_type | VARCHAR(32) | NOT NULL, INDEX | 行为类型 | view、search、click、favorite |
| target_type | VARCHAR(32) | NULL, INDEX | 对象类型 | poi、route、content |
| target_id | INT | NULL | 对象主键 id | 5 |
| keyword | VARCHAR(255) | NULL | 搜索关键词（action_type=search 时） | 外滩 |
| meta | JSON | NULL | 扩展（列表位次、来源页面等） | {"pos":2,"from":"home"} |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP, INDEX | 发生时间 | 2024-01-01 10:00:00 |

**索引设计**：
- PRIMARY KEY: `id`
- INDEX: `idx_user_action_time` ON `(user_id, action_type, created_at)`
- INDEX: `idx_target` ON `(target_type, target_id, created_at)`

**业务规则**：
- 遵守最小必要原则；可配置采样率；与隐私政策、留存周期一致

---

## 数据库优化建议

### 1. 性能优化

- **地理位置查询**：优先使用 `(latitude, longitude)` 复合 B-tree 做矩形范围/排序；若需 `ST_Contains`/`ST_Distance` 等函数，再使用 `POINT` 列 + **SPATIAL**（勿在两条 `DECIMAL` 上直接建 SPATIAL）
- **分区表**：poi_stats、check_info 等时间序列数据可按月分区
- **读写分离**：统计查询使用只读从库，减轻主库压力

### 2. 数据一致性

- **外键约束**：所有关联字段添加 FOREIGN KEY，确保引用完整性
- **事务处理**：商户审核、POI状态更新等操作使用事务保证原子性

### 3. 扩展性

- **JSON字段**：多语言、照片列表等使用JSON存储，便于扩展新语言
- **标签体系**：tag_info 支持层级结构，便于后续细化分类

### 4. 安全性

- **密码加密**：使用 bcrypt 或 Argon2 加密存储
- **敏感字段**：手机号、邮箱等添加脱敏处理

---

## 初始化SQL示例

```sql
-- 创建数据库
CREATE DATABASE smart_tourism DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE smart_tourism;

-- 创建poi_info表（示例）
CREATE TABLE poi_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    poi_uuid VARCHAR(50) UNIQUE NOT NULL,
    poi_type VARCHAR(100),
    type_code VARCHAR(20),
    poi_name JSON NOT NULL,
    description JSON,
    longitude DECIMAL(10,7) NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    address JSON,
    tel VARCHAR(20),
    email VARCHAR(100),
    photos JSON,
    street_view VARCHAR(512) NULL,
    district VARCHAR(50),
    is_free TINYINT(1) DEFAULT 0,
    need_tickets TINYINT(1) DEFAULT 0,
    official_url VARCHAR(255),
    need_book TINYINT(1) DEFAULT 0,
    status TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_poi_uuid (poi_uuid),
    INDEX idx_status (status),
    INDEX idx_district (district),
    INDEX idx_lat_lng (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 其他表创建语句省略...
```

---

## 数据迁移注意事项

1. **现有数据兼容**：如果已有数据，需编写迁移脚本
2. **JSON字段转换**：确保多语言字段格式统一
3. **索引创建**：大表添加索引时使用 ONLINE DDL 避免锁表
4. **备份策略**：迁移前完整备份，支持回滚

---

## 附录：馆内展区（二期可选）

课题若需表达「博物馆内部划分位置与停留」，可在 MVP 之外增加：

| 表名 | 用途 |
|------|------|
| `poi_zone` | `poi_id`、展区名称（多语言 JSON）、楼层、排序 |
| `zone_dwell_stats` | 按日/按展区统计停留或人次（可先 Mock 写入） |

与 `poi_stats.avg_stay_time` 并存：后者表示整馆或景点级，前者表示馆内热点展区。

