# 数据库设计文档

## 数据库类型

MySQL 8.0+

---

## 数据表设计

### 1. poi_info（POI 地点信息表）

**表说明**：存储景点、商户等兴趣点的基础信息，支持多语言。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| poi_uuid | VARCHAR(50) | UNIQUE, NOT NULL, INDEX | 高德地图POI唯一标识 | B0FFFPD48E |
| poi_type | VARCHAR(100) | INDEX | 地图原始分类 | 科教文化服务；学校；高等院校 |
| type_code | VARCHAR(20) | INDEX | 地图原始分类编码 | 141201 |
| poi_name | JSON | NOT NULL | 名称（多语言） | {"zh":"外滩","en":"The Bund"} |
| description | JSON | NULL | 描述（多语言） | {"zh":"上海著名景点","en":"Famous Shanghai landmark"} |
| longitude | DECIMAL(10,7) | NOT NULL | 经度 | 121.490317 |
| latitude | DECIMAL(10,7) | NOT NULL | 纬度 | 31.240764 |
| address | JSON | NULL | 地址（多语言） | {"zh":"黄浦区中山东一路","en":"Zhongshan East 1st Rd, Huangpu District"} |
| tel | VARCHAR(20) | NULL | 联系电话 | 021-12345678 |
| email | VARCHAR(100) | NULL | 邮箱 | contact@example.com |
| photos | JSON | NULL | 照片列表 | [{"title":{"zh":"正门","en":"Main Entrance"},"url":"http://xx.jpg"}] |
| street_view | VARCHAR(512) | NULL | 街景图/静态街景服务 URL（地图标记、详情页展示；无则回退 photos） | https://... |
| district_id | INT | FOREIGN KEY → district(id), NULL, INDEX | 所属行政区（关联 district 表，不可用自由文本） | 1 |
| is_free | TINYINT(1) | DEFAULT 0 | 是否免费（0否1是） | 1 |
| need_tickets | TINYINT(1) | DEFAULT 0 | 是否需要门票（0否1是） | 1 |
| official_url | VARCHAR(255) | NULL | 官方预约/购票链接 | https://example.com |
| need_book | TINYINT(1) | DEFAULT 0 | 是否需要预约（0否1是） | 0 |
| status | TINYINT(1) | DEFAULT 1, INDEX | 状态（0不正常1正常） | 1 |
| location_point | POINT | SRID 4326, NULL | 可选：由经纬度生成的地理点，用于空间检索 | （计算列） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 | 2024-01-01 10:00:00 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 | 2024-01-01 10:00:00 |

**索引设计**：
- PRIMARY KEY: `id`
- UNIQUE INDEX: `idx_poi_uuid` ON `poi_uuid`
- INDEX: `idx_status` ON `status`
- INDEX: `idx_district_id` ON `district_id`（关联查询、行政区聚合）
- INDEX: `idx_lat_lng` ON `(latitude, longitude)`（就近查询、矩形范围；MVP 推荐）
- SPATIAL INDEX: `idx_location` ON `location_point`（若启用 `POINT` 列则使用；**不可**在单独 `longitude`/`latitude` DECIMAL 上直接建 SPATIAL）

**业务规则**：
- 系统内置POI的初始status为1
- 商户新增POI的初始status为0，商户审核通过后status变为1
- 若使用高德等平台坐标，实际为 **GCJ-02**；`location_point` 若声明 SRID 4326（WGS84）仅在与地图引擎一致的前提下使用，否则以应用层做范围查询（`idx_lat_lng`）为主，避免空间函数语义与数据源不符

---

### 1.5 district（行政区参考表）

**表说明**：上海市 16 个行政区枚举表，作为 `poi_info.district_id` 的外键约束来源，确保 POI 区域数据规范化、不可自由填写。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| code | VARCHAR(10) | UNIQUE, NOT NULL | 行政区划代码（国家统一编码） | 310101 |
| name | VARCHAR(50) | NOT NULL | 行政区标准名称 | 黄浦区 |
| short_name | VARCHAR(20) | NULL | 简称 | 黄浦 |
| lng | DECIMAL(10,7) | NULL | 行政区几何中心经度 | 121.4815 |
| lat | DECIMAL(10,7) | NULL | 行政区几何中心纬度 | 31.2304 |
| sort_order | INT | DEFAULT 0 | 排序序号（数值越小排越前） | 1 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 | 2024-01-01 |

**索引设计**：
- PRIMARY KEY: `id`
- UNIQUE INDEX: `idx_code` ON `code`

**业务规则**：
- 初始数据由系统维护（seed），不允许前端自由新增
- 仅保留上海市 16 个区，不做扩展
- `poi_info.district_id` 为可选（可为空），表示尚未分配区域

**初始数据（上海 16 区）**：

| code | name | short_name | sort_order |
|------|------|------------|------------|
| 310101 | 黄浦区 | 黄浦 | 1 |
| 310104 | 徐汇区 | 徐汇 | 2 |
| 310105 | 长宁区 | 长宁 | 3 |
| 310106 | 静安区 | 静安 | 4 |
| 310107 | 普陀区 | 普陀 | 5 |
| 310109 | 虹口区 | 虹口 | 6 |
| 310110 | 杨浦区 | 杨浦 | 7 |
| 310112 | 闵行区 | 闵行 | 8 |
| 310113 | 宝山区 | 宝山 | 9 |
| 310114 | 嘉定区 | 嘉定 | 10 |
| 310115 | 浦东新区 | 浦东 | 11 |
| 310116 | 金山区 | 金山 | 12 |
| 310117 | 松江区 | 松江 | 13 |
| 310118 | 青浦区 | 青浦 | 14 |
| 310120 | 奉贤区 | 奉贤 | 15 |
| 310151 | 崇明区 | 崇明 | 16 |

---

### 2. poi_stats（POI 统计表）

**表说明**：存储 POI 的**按日聚合**统计数据（与 `check_info.day_tag` 对齐），用于热力图、商户看板、政府客流分析。表中指标均为 **T+0 / T+1 批处理或准实时汇总** 写入，不在查询时对全量 `check_info` 现场扫描（大表时可有从库/定时任务）。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| poi_id | INT | NOT NULL, INDEX, FOREIGN KEY | 关联poi_info.id | 1 |
| date | DATE | NOT NULL, INDEX | 统计日期（与 `check_info.day_tag` 一致） | 2024-01-01 |
| check_count | INT | DEFAULT 0 | 当日有效打卡次数（计次口径见下） | 150 |
| heat_score | DECIMAL(5,2) | DEFAULT 0.00 | 潮流指数（0–100，计算式见下） | 85.50 |
| avg_stay_time | DECIMAL(5,2) | DEFAULT 0.00 | 当日平均停留时长（**小时**，由分钟汇总见下） | 2.5 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 | 2024-01-01 10:00:00 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 | 2024-01-01 10:00:00 |

**索引设计**：
- PRIMARY KEY: `id`
- UNIQUE INDEX: `idx_poi_date` ON `(poi_id, date)` （防止重复统计）
- INDEX: `idx_heat_score` ON `heat_score` （用于热力图排序）
- INDEX: `idx_date` ON `date` （用于时间范围查询）

#### 指标计算依据（须与后端任务实现一致）

以下为**推荐默认口径**，可在配置表中系数可调；论文/方案中引用以本节为准。

1. **`check_count`（当日打卡次数）**  
   - **数据源**：`check_info`。  
   - **筛选**：`poi_id = poi_stats.poi_id` 且 `day_tag = poi_stats.date`（与 `check_time` 所在自然日一致，以业务时区为准，默认东八区）。  
   - **计数**：`COUNT(*)`，每条打卡记录计 1 次（**计次**，非 UV）。若产品需「去重用户」可另增字段 `check_uv`；当前表不维护 UV 时不在此字段体现。  
   - **剔除**：可选剔除非正常状态（若后续 `check_info` 增加 `status` 无效记录）。

2. **`avg_stay_time`（当日平均停留，单位：小时）**  
   - **数据源**：同上日、同 POI 的 `check_info`。  
   - **参与样本**：仅 `stay_mins IS NOT NULL` 且 `stay_mins >= 0` 的行。  
   - **公式**：`avg_stay_time = ROUND( (SUM(stay_mins) / COUNT(*)) / 60, 2 )`。  
   - **无样本时**：若无任何有效 `stay_mins`，默认保持 `0.00` 或**不更新该字段**（沿用昨日）— 实现时二选一并写死，建议 **0.00** 避免歧义。

3. **`heat_score`（0–100，潮流/热力综合分）**  
   - **目的**：把「当日打卡体量」与「停留」合成可比的 0–100 分，供地图热力图层、列表排序、政府大屏。  
   - **数据源**：当日该 POI 的 `check_count`、`avg_stay_time`；可选叠加 `user_behavior` 当日 `target_type='poi'` 且 `action_type IN ('click','view')` 的计数（无埋点表时可省略第三项）。  
   - **毕设推荐简化公式（可解释、易实现）**：  
     - 设当日全市（或当前城市数据集）内，所有 POI 的当日 `check_count` 最大值为 **C_max**；若 C_max = 0 则当日全体 `heat_score = 0`。  
     - **打卡分** `S_c`：`S_c = 70 * min(1, ln(1 + check_count) / ln(1 + C_max))`（自然对数 `ln` 压制极端爆款 POI）。  
     - **停留分** `S_s`：设当日该 POI 所有有效 `stay_mins` 的平均值为 **m_avg**（分钟）；取参照值 **m_ref** 为同类 POI 当日 `m_avg` 的 75 分位数，若无则用常量 120 分钟。`S_s = 30 * min(1, m_avg / m_ref)`；若无任何 `stay_mins` 样本则 `S_s = 0`。  
     - **结果**：`heat_score = ROUND( LEAST(100, S_c + S_s), 2 )`。  
   - **可选增强**（二期）：加入搜索次数、收藏次数，从 `user_behavior` 加权；或对昨日 `heat_score` 做指数平滑防抖动。

**业务规则**：
- 每日定时任务（或打卡写入后的异步汇总）按 `poi_id` + `date` **幂等更新** `poi_stats`（`INSERT ... ON DUPLICATE KEY UPDATE`）。  
- `check_info` 的 `hour_tag` / `week_tag` 等**不写入本表**；若需「按小时热力」可用 `check_info` 聚合视图或单独 `poi_stats_hourly` 表（二期）。

---

### 3. tag_info（标签表）

**表说明**：存储标签信息，支持层级结构和多语言。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| level | INT | NOT NULL, INDEX | 层级深度（1为顶级） | 1 |
| parent_id | INT | NULL, INDEX, FOREIGN KEY | 父级标签ID | NULL |
| tag_code | VARCHAR(50) | UNIQUE, NOT NULL, INDEX | 标签编码（唯一） | FOOD_SICHUAN |
| tag_name | JSON | NOT NULL | 标签名称（多语言） | {"zh":"川菜","en":"Sichuan Cuisine"} |
| category | VARCHAR(20) | INDEX | 标签分类 | cuisine |
| status | TINYINT(1) | DEFAULT 1, INDEX | 状态（0禁用1启用） | 1 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 | 2024-01-01 10:00:00 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 | 2024-01-01 10:00:00 |

**索引设计**：
- PRIMARY KEY: `id`
- UNIQUE INDEX: `idx_tag_code` ON `tag_code`
- INDEX: `idx_category` ON `category`
- INDEX: `idx_parent_level` ON `(parent_id, level)`

**标签分类（category）枚举值**：
- `cuisine`：菜系标签（川菜、粤菜、西餐等）
- `mood`：情绪标签（安静治愈、热闹繁华等）
- `service`：服务标签（外国人友好、英文菜单等）
- `theme`：主题标签（历史建筑、自然风光等）
- `intensity`：活动强度标签（暴走特种兵、休闲漫步等）
- `poi_attr`：POI地点属性标签（景区、博物馆、酒店等）
- `user_attr`：用户属性标签（地域、出行类型、兴趣偏好等）

### 3.1 tag_info 三级标签体系

**表说明**：利用 `level` 和 `parent_id` 字段实现三级层级结构，支撑 POI地点属性、用户属性、情绪氛围、服务 四大分类的完整标签体系。

#### 3.1.1 一级标签（level=1）

| tag_code | tag_name | category | 说明 |
|----------|----------|----------|------|
| poi_attr | POI地点属性 | poi_attr | POI类型、地点属性分类 |
| user_attr | 用户属性标签 | user_attr | 用户地域、出行类型、兴趣偏好等 |
| mood | 情绪氛围标签 | mood | 氛围基调、体验感受、适合时段 |
| service | 服务标签 | service | 语言、票务、预约、基础设施等 |

#### 3.1.2 二级标签（level=2）

**POI地点属性分类下级：**

| tag_code | tag_name | parent_code | 说明 |
|----------|----------|-------------|------|
| poi_scenic | 景区/景点 | poi_attr | 风景名胜类 |
| poi_museum | 博物馆/文化场馆 | poi_attr | 博物馆、美术馆、历史故居等 |
| poi_hotel | 酒店/住宿 | poi_attr | 高端酒店、民宿、青年旅舍等 |
| poi_food | 餐饮美食 | poi_attr | 本帮菜、网红餐厅、咖啡酒馆等 |
| poi_transport | 交通枢纽 | poi_attr | 地铁站、火车站、机场等 |
| poi_shopping | 商业购物 | poi_attr | 商圈、商场、特色市集等 |
| poi_art_place | 文艺场所 | poi_attr | 书店、剧场、画廊等 |

**用户属性分类下级：**

| tag_code | tag_name | parent_code | 说明 |
|----------|----------|-------------|------|
| user_region | 地域来源 | user_attr | 本地、国内、欧美、日韩等 |
| user_travel_type | 出行类型 | user_attr | 亲子游、情侣游、Solo旅行等 |
| user_interest | 兴趣偏好 | user_attr | 历史文化、自然风景、美食探店等 |
| user_consume | 消费能力 | user_attr | 经济型、中端型、高端型 |
| user_duration | 出行时长 | user_attr | 1日游、2-3日短途、4-7日长途 |

**情绪氛围分类下级：**

| tag_code | tag_name | parent_code | 说明 |
|----------|----------|-------------|------|
| mood_base | 氛围基调 | mood | 热闹、安静、文艺、复古等 |
| mood_exp | 体验感受 | mood | 治愈、刺激、庄重、浪漫等 |
| mood_time | 适合时段 | mood | 白天游览、夜景绝佳、适合早间漫步等 |

**服务分类下级：**

| tag_code | tag_name | parent_code | 说明 |
|----------|----------|-------------|------|
| service_lang | 语言 | service | 中文、英文、日文、韩文等 |
| service_ticket | 票务 | service | 免费、需要买票 |
| service_book | 预约 | service | 需要、不需要 |
| service_basic | 基础需求 | service | 交通便利、靠近地铁、有停车场等 |
| service_special | 特色需求 | service | 看展、看剧、听Live、吃本帮菜等 |
| service_special_need | 特殊需求 | service | 亲子友好、宠物友好、无障碍等 |
| service_infra | 基础设施 | service | 公共厕所、共享充电宝、寄存柜等 |

#### 3.1.3 三级标签（level=3）

**景区/景点下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| scenic_river_view | 江景 | poi_scenic |
| scenic_garden | 园林 | poi_scenic |
| scenic_ancient_town | 古镇 | poi_scenic |
| scenic_heritage | 历史遗迹 | poi_scenic |

**博物馆/文化场馆下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| museum_general | 综合博物馆 | poi_museum |
| museum_professional | 专业馆 | poi_museum |
| museum_art | 美术馆 | poi_museum |
| museum_residence | 历史故居 | poi_museum |

**酒店/住宿下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| hotel_luxury | 高端酒店 | poi_hotel |
| hotel_boutique | 精品民宿 | poi_hotel |
| hotel_economy | 快捷酒店 | poi_hotel |
| hotel_youth | 青年旅舍 | poi_hotel |
| hotel_special | 特色民宿 | poi_hotel |

**餐饮美食下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| food_local | 本帮菜 | poi_food |
| food_trending | 网红餐厅 | poi_food |
| food_cafe_bar | 咖啡酒馆 | poi_food |
| food_michelin | 米其林餐厅 | poi_food |

**交通枢纽下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| transport_subway | 地铁站 | poi_transport |
| transport_bus | 公交站 | poi_transport |
| transport_train | 火车站 | poi_transport |
| transport_airport | 机场 | poi_transport |
| transport_ferry | 轮渡码头 | poi_transport |

**商业购物下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| shopping_district | 商圈 | poi_shopping |
| shopping_mall | 商场 | poi_shopping |
| shopping_market | 特色市集 | poi_shopping |
| shopping_creative | 文创商店 | poi_shopping |

**文艺场所下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| art_bookstore | 书店 | poi_art_place |
| art_livehouse | Livehouse | poi_art_place |
| art_theater | 剧场 | poi_art_place |
| art_gallery | 画廊 | poi_art_place |
| art_cinema | 独立影院 | poi_art_place |

**地域来源下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| region_local | 本地游客 | user_region |
| region_domestic | 国内游客 | user_region |
| region_europe | 欧美 | user_region |
| region_asia_east | 日韩 | user_region |
| region_asia_se | 东南亚 | user_region |
| region_americas | 美洲/大洋洲 | user_region |
| region_russia_mid | 俄语/中东 | user_region |

**出行类型下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| travel_family | 亲子游 | user_travel_type |
| travel_couple | 情侣游 | user_travel_type |
| travel_friends | 朋友结伴 | user_travel_type |
| travel_solo | Solo旅行 | user_travel_type |
| travel_business | 商务出行 | user_travel_type |
| travel_elder | 老年游 | user_travel_type |

**兴趣偏好下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| interest_history | 历史文化 | user_interest |
| interest_nature | 自然风景 | user_interest |
| interest_food | 美食探店 | user_interest |
| interest_art | 艺术展览 | user_interest |
| interest_trend | 潮流打卡 | user_interest |
| interest_family | 亲子娱乐 | user_interest |

**消费能力下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| consume_economy | 经济型 | user_consume |
| consume_mid | 中端型 | user_consume |
| consume_high | 高端型 | user_consume |

**出行时长下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| duration_one_day | 1日游 | user_duration |
| duration_short | 2-3日短途 | user_duration |
| duration_long | 4-7日长途 | user_duration |

**氛围基调下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| mood_lively | 热闹 | mood_base |
| mood_quiet | 安静 | mood_base |
| mood_artistic | 文艺 | mood_base |
| mood_vintage | 复古 | mood_base |
| mood_modern | 现代 | mood_base |
| mood_folk | 市井 | mood_base |

**体验感受下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| exp_healing | 治愈 | mood_exp |
| exp_exciting | 刺激 | mood_exp |
| exp_solemn | 庄重 | mood_exp |
| exp_romantic | 浪漫 | mood_exp |
| exp_niche | 小众 | mood_exp |

**适合时段下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| time_day | 白天游览 | mood_time |
| time_night | 夜景绝佳 | mood_time |
| time_night_walk | 适合夜游 | mood_time |
| time_morning | 适合早间漫步 | mood_time |

**语言服务下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| lang_zh | 中文 | service_lang |
| lang_en | 英文 | service_lang |
| lang_jp | 日文 | service_lang |
| lang_kr | 韩文 | service_lang |

**票务下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| ticket_free | 免费 | service_ticket |
| ticket_needed | 需要买票 | service_ticket |

**预约下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| book_needed | 需要 | service_book |
| book_not_needed | 不需要 | service_book |

**基础需求下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| basic_convenient | 交通便利 | service_basic |
| basic_subway | 靠近地铁 | service_basic |
| basic_free_visit | 免费参观 | service_basic |
| basic_parking | 有停车场 | service_basic |
| basic_photo | 适合拍照 | service_basic |

**特色需求下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| special_exhibition | 看展 | service_special |
| special_theater | 看剧 | service_special |
| special_live | 听Live | service_special |
| special_market | 逛市集 | service_special |
| special_local_food | 吃本帮菜 | service_special |
| special_coffee | 喝咖啡 | service_special |
| special_souvenir | 买伴手礼 | service_special |

**特殊需求下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| special_kid | 亲子友好 | service_special_need |
| special_pet | 宠物友好 | service_special_need |
| special_accessible | 无障碍 | service_special_need |
| special_night_open | 夜间开放 | service_special_need |
| special_no_book | 免预约 | service_special_need |

**基础设施下级：**

| tag_code | tag_name | parent_code |
|----------|----------|-------------|
| infra_toilet | 公共厕所 | service_infra |
| infra_charger | 共享充电宝 | service_infra |
| infra_storage | 寄存柜 | service_infra |
| infra_medical | 医疗点 | service_infra |

**标签初始化说明**：
- 三级标签体系通过 `scripts/init-poi-data.ts` 脚本自动创建
- 运行脚本时会先将所有标签 upsert 到数据库
- 再次运行会同步更新已存在标签的名称/分类
- 标签总数约 120+ 个，包含原有的二级标签���新增的三级标签

---

### 4. poi_tag_rel（POI与标签关联表）

**表说明**：POI与标签的多对多关系表，支持权重动态调整。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| poi_id | INT | NOT NULL, INDEX, FOREIGN KEY | 关联poi_info.id | 1 |
| tag_id | INT | NOT NULL, INDEX, FOREIGN KEY | 关联tag_info.id | 5 |
| weight | DECIMAL(3,2) | DEFAULT 0.50 | 权重（0-1） | 0.85 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 | 2024-01-01 10:00:00 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 | 2024-01-01 10:00:00 |

**索引设计**：
- PRIMARY KEY: `id`
- UNIQUE INDEX: `idx_poi_tag` ON `(poi_id, tag_id)` （防止重复关联）
- INDEX: `idx_tag_weight` ON `(tag_id, weight)` （用于标签推荐排序）

**业务规则**：
- weight 根据热度、评分动态调整
- 一个POI可关联多个不同分类的标签

---

### 5. user（用户表）

**表说明**：存储用户基础信息，支持微信登录。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| tel | VARCHAR(20) | UNIQUE, NULL, INDEX | 手机号（用于登录） | 13800138000 |
| openid | VARCHAR(100) | UNIQUE, NOT NULL, INDEX | 微信唯一标识 | oXXXXXXXXXXXXXXXXXXXX |
| nickname | VARCHAR(50) | NULL | 昵称 | 张三 |
| password | VARCHAR(255) | NULL | 密码（哈希） | $2a$10$... |
| avatar | VARCHAR(255) | NULL | 头像地址 | https://example.com/avatar.jpg |
| email | VARCHAR(100) | NULL | 邮箱 | user@example.com |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 | 2024-01-01 10:00:00 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 | 2024-01-01 10:00:00 |
| status | TINYINT(1) | DEFAULT 0, INDEX | 状态（0正常1注销） | 0 |

**索引设计**：
- PRIMARY KEY: `id`
- UNIQUE INDEX: `idx_openid` ON `openid`
- UNIQUE INDEX: `idx_tel` ON `tel`
- INDEX: `idx_status` ON `status`

---

### 6. user_prefer（用户偏好表）

**表说明**：存储用户的国籍、活动强度和偏好标签。

| 字段名 | 类型 | 约束 | 说明 | 示例 |
|--------|------|------|------|------|
| id | INT | PRIMARY KEY, AUTO_INCREMENT | 主键 | 1 |
| user_id | INT | UNIQUE, NOT NULL, INDEX, FOREIGN KEY | 关联user.id | 1 |
| from_region | TINYINT(1) | NOT NULL | 国籍（0日韩1国内2欧美3本地） | 2 |
| intensity | VARCHAR(20) | NULL | 活动强度 | 暴走特种兵 |
| preference_tags | JSON | NULL | 偏好标签列表 | ["历史建筑","美食探店","咖啡文化"] |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 创建时间 | 2024-01-01 10:00:00 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 | 2024-01-01 10:00:00 |

**索引设计**：
- PRIMARY KEY: `id`
- UNIQUE INDEX: `idx_user_id` ON `user_id` （一个用户只有一条偏好记录）

**字段说明**：
- `from_region`：0=日韩，1=国内，2=欧美，3=本地
- `intensity`：暴走特种兵 / 休闲漫步 / 深度体验
- `preference_tags`：JSON数组，存储多个偏好标签

---

