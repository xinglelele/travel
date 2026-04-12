# 智慧旅游平台 — 政府端（监管运营端）需求文档

> **文档版本**：v1.0
> **编写日期**：2026-04-07
> **适用系统**：智慧旅游平台 政府端 Web 管理后台
> **技术栈**：Vue3 + Element Plus + TypeScript + Vite + Pinia + Axios + ECharts

---

## 一、产品定位与使用角色

### 1.1 产品定位

政府端（监管运营端）是智慧旅游平台的三端之一，面向**文旅局、景区管理方等政府/运营机构**，提供 POI 审核管理、商户监管、评论审核、内容发布、数据统计、系统公告等核心功能。

政府端是平台监管与运营的核心枢纽：

```
┌──────────────────────────────────────────────────────────────────┐
│                     智慧旅游平台                                    │
│                                                                │
│   ┌────────────┐   ┌──────────────────────────┐   ┌──────────┐│
│   │  用户端     │   │       商户端             │   │ 政府端（本文档）│
│   │ 微信小程序  │◄──│    Vue3 Web 管理后台    │──►│ Web管理后台││
│   └────────────┘   └──────────────────────────┘   └──────────┘│
│         ▲                    │                       ▲          │
│         │                    │                       │          │
│         ▼                    ▼                       ▼          │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                  后端 REST API（Node.js + Express）       │  │
│   │          backend/src/modules/government/ 模块              │  │
│   └─────────────────────────────────────────────────────────┘  │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                MySQL 8.0（共用同一数据库）                 │  │
│   └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 目标用户


|| 用户类型       | 角色描述             | 典型场景               |
|| ---------- | ---------------- | ------------------ |
| **超级管理员**  | 文旅局系统管理员       | 账号管理、权限分配、全局数据查看 |
| **普通管理员** | 文旅局审核运营人员      | POI 审核、评论审核、内容发布、数据统计 |
| **审核员**   | 专职内容审核人员        | 仅处理评论举报审核      |

### 1.3 角色权限说明

> **说明**：政府端采用三级角色体系，通过 `government.role` 字段区分，权限由后端中间件 `authGovernment` 控制。

| 角色（role） | 角色名称     | 可操作功能                                              |
| --------- | -------- | --------------------------------------------------- |
| 0         | 超级管理员    | 全部功能：账号管理、POI审核、商户管理、评论审核、内容发布、数据统计、系统公告 |
| 1         | 普通管理员    | POI 审核、商户管理、评论审核、内容发布、数据统计、系统公告                |
| 2         | 审核员      | 仅评论审核（待审核评论列表、举报处理、审核通过/拒绝）                        |

> **注意**：`government.status = 0` 时账号禁用，禁止登录；`status = 1` 为正常。政府账号由系统初始化或超级管理员创建，不开放自助注册。

### 1.4 与其他端的关系


|| 关系方       | 数据交互                                | 说明                                                      |
|| --------- | ----------------------------------- | ------------------------------------------------------- |
| **用户端**   | 举报记录、评论内容、用户数据                    | 政府端接收用户举报、处理违规评论、查看用户统计数据                          |
| **商户端**   | POI 审核队列、商户入驻审核、商户封禁              | 商户提交的信息进入 `poi_audit_queue`；政府审核通过后生效；可封禁商户       |
| **共用数据库** | poi_info、comment_info、merchant、announcement 等 | 政府端通过 `poi_audit_queue`、`government_review` 等表执行监管操作       |


---

## 二、核心业务流程

### 2.1 政府账号登录流程

> **设计原则**：政府账号不开放自助注册，由超管创建或系统初始化。登录方式为用户名 + 密码，JWT 认证。

```
政府管理员输入用户名 + 密码
      │
      ▼
后端验证 government 表（username + password，bcrypt）
      │
      ▼
验证通过 → 生成 JWT Token（有效期 7 天）
写入 government.last_login_at
      │
      ▼
返回 Token + 政府管理员信息（id、username、real_name、role、department）
```

**Government 账号 status 状态机**：

| status | 状态   | 可操作                         |
| ------ | ---- | --------------------------- |
| 0      | 禁用   | 禁止登录，展示"账号已禁用"               |
| 1      | 正常   | 全功能可用（受 role 权限约束）             |

### 2.2 POI 审核流程

> **前置条件**：商户提交入驻或编辑景点后，POI 进入 `poi_audit_queue`，等待政府端处理。

```
商户提交 POI（新增/编辑）
      │
      ▼
写入 poi_info（status = 0，audit_status = 0）
写入 poi_audit_queue（submitter_type = "merchant"，submitter_id = merchantId）
      │
      ▼
政府端「POI 审核」页面展示队列
      │
      ├── 审核员 / 普通管理员 / 超级管理员 → 点击审核
      │
      ▼
查看 POI 详情（poi_info 全量字段）
      │
      ├── 通过 → poi_info.audit_status → 1，poi_info.status → 1，poi_audit_queue.status → 1
      │        写入 government_review（action = "approve"）
      │        通知商户（消息推送）
      │
      └── 拒绝 → poi_info.audit_status → 2，poi_audit_queue.status → 1
               写入 government_review（action = "reject"）
               记录审核备注（audit_remark）
               通知商户（消息推送）
```

**POI audit_status 状态说明**：

| audit_status | 含义    | 触发方        |
| ----------- | ----- | ----------- |
| 0           | 待审核   | 系统自动（新增时）  |
| 1           | 审核通过  | 政府审核员       |
| 2           | 审核拒绝  | 政府审核员       |

**POI status 状态说明**（与审核状态联动）：

| status | 含义     | 说明              |
| ------ | ------ | --------------- |
| 0      | 待审核    | 提交审核中，暂不对用户展示 |
| 1      | 已上线    | 审核通过，用户可见      |
| 2      | 已下架    | 商户主动下架或政府强制下架 |

### 2.3 商户入驻审核流程

```
商户提交入驻申请（merchant 表写入，status = 0）
      │
      ▼
写入 merchant_review（action = "submit"，status_before = null，status_after = 0）
      │
      ▼
政府端「商户审核」页面展示待审核商户
      │
      ├── 通过 → merchant.status → 1
      │        写入 merchant_review（action = "approve"）
      │        商户 POI 进入 poi_audit_queue（由系统自动触发）
      │
      └── 拒绝 → merchant.status → 3，merchant.reject_reason 写入拒绝原因
               写入 merchant_review（action = "reject"）
               通知商户
```

### 2.4 评论审核流程

```
用户发表评论（comment_info 写入，audit_status = 0）
      │
      ├── 自动通过（无敏感词）→ audit_status → 3（放行），前端展示
      │
      └── 被举报 → 写入 comment_audit_queue（status = 0）
                或用户举报 → 写入 report_record（target_type = "comment"）
                         优先级提升
      │
      ▼
政府端「评论审核」页面展示待审核队列
      │
      ├── 通过 → comment_info.audit_status → 3（放行），前端展示
      │
      └── 违规 → comment_info.audit_status → 2（违规），前端隐藏
               写入 government_review（action = "reject"）
               通知被举报用户（如有）
```

**comment_info.audit_status 状态说明**：

| audit_status | 含义   | 说明               |
| ----------- | ---- | ---------------- |
| 0           | 正常   | 无敏感词，直接通过      |
| 1           | 待审核   | 被举报或被系统识别，进入审核队列 |
| 2           | 违规   | 审核拒绝，不对外展示      |
| 3           | 放行   | 审核通过，正常对外展示     |

### 2.5 举报处理流程

```
用户举报内容（report_record 写入，status = 0）
      │
      ▼
政府端「举报处理」页面展示待处理举报
      │
      ├── 查看举报详情（举报人信息、被举报内容、证据截图）
      │
      ├── 处理结果 → 有效举报
      │        → report_record.status → 1（已处理）
      │        → report_record.handler_id → government.id
      │        → report_record.handle_time → NOW()
      │        → report_record.handle_result → 处理结果描述
      │        → 联动处理目标（删除违规内容 / 警告用户 / 封禁商户）
      │
      └── 处理结果 → 无效举报
               → report_record.status → 2（无效）
               → 通知举报人
```

**report_record.status 状态说明**：

| status | 含义   | 说明      |
| ------ | ---- | ------- |
| 0      | 待处理   | 进入处理队列  |
| 1      | 已处理   | 有处理结果   |
| 2      | 无效   | 举报无效    |

### 2.6 内容发布流程

```
政府管理员在「内容管理」页面新建官方内容
      │
      ▼
填写标题、摘要、正文（均支持多语言 JSON）
选择内容类型（article / video）
上传封面图 / 视频
关联 POI（可选，从 poi_info 表读取已上线 POI）
设置标签、分类
      │
      ▼
保存草稿（announcement.status → 0，official_content.status → 0）
      │
      ▼
预览确认 → 发布（official_content.status → 1，published_at → NOW()）
      │
      ▼
用户端/商户端看到新内容
```

### 2.7 系统公告发布流程

```
政府管理员在「公告管理」页面新建公告
      │
      ▼
填写标题、内容（announcement 表）
选择公告类型（type）
选择目标范围（target_scope = "user" / "merchant" / "government" / "all"）
      │
      ▼
发布 → announcement.status → 1，published_at → NOW()
      │
      ▼
对应用户收到消息推送（message_info 或站内通知）
```


---

## 三、功能模块清单

### 模块 A：账号与认证

#### A-1. 登录与认证


| 子功能         | 功能说明                                       |
| ---------- | ------------------------------------------ |
| 用户名 + 密码登录 | 政府管理员使用用户名和密码登录                            |
| JWT Token  | 登录成功后返回 JWT Token，有效期 7 天，存储在 localStorage |
| Token 刷新   | Token 即将过期时自动刷新                            |
| 记住登录       | 提供"记住我"选项，最长 30 天                          |
| 退出登录       | 清除 Token，返回登录页                             |

**登录接口**：复用后端现有 `government` 模块接口，认证方式（用户名 + 密码 + JWT），由 `authGovernment` 中间件处理。

**登录字段约束**：

| 字段      | 约束             | 说明        |
| ------- | -------------- | --------- |
| username | 必填，唯一，2-50字 | 登录账号      |
| password | 必填，6位以上      | bcrypt 加密存储 |

#### A-2. 角色与权限控制

> 政府端基于 `government.role` 字段实现三级权限控制，前端根据 role 动态展示可访问菜单，后端中间件校验操作权限。

| 功能模块        | 超级管理员（role=0） | 普通管理员（role=1） | 审核员（role=2） |
| ----------- | -------------- | -------------- | --------- |
| 账号管理       | 可管理           | 不可见            | 不可见      |
| POI 审核      | 可操作           | 可操作            | 不可见      |
| 商户管理       | 可操作           | 可操作            | 不可见      |
| 评论审核       | 可操作           | 可操作            | 仅审核评论    |
| 举报处理       | 可操作           | 可操作            | 仅举报评论    |
| 内容发布       | 可操作           | 可操作            | 不可见      |
| 数据统计       | 可查看全部          | 可查看全部           | 仅查看      |
| 系统公告       | 可操作           | 可操作            | 不可见      |

---

### 模块 B：POI 管理

#### B-1. POI 审核队列

> 政府端「POI 审核」页面展示所有待审核 POI，支持按状态、提交时间、提交方类型筛选。

| 子功能      | 功能说明                                     | 数据来源             |
| ------- | ---------------------------------------- | ---------------- |
| 待审核列表   | 展示所有 audit_status=0 且 status=0 的 POI      | poi_audit_queue  |
| 按状态筛选   | 全部待审核 / 已通过 / 已拒绝                      | poi_info         |
| 按提交方筛选  | 商户提交 / 政府自建                            | poi_audit_queue.submitter_type |
| 按时间排序   | 最新提交优先                                  | poi_audit_queue.created_at |
| 审核数量徽标  | 侧边栏菜单显示待审核 POI 数量                      | poi_audit_queue.count |
| 批量分配    | 超级管理员可将待审核 POI 分配给指定审核员（assigned_to）   | poi_audit_queue |
| 优先级设置   | 支持设置优先级，高优先级优先展示                     | poi_audit_queue.priority |

**列表字段**：

| 字段          | 说明             | 来源                   |
| ----------- | -------------- | -------------------- |
| poi_id      | POI ID          | poi_info.id           |
| poi_name    | POI 名称（多语言，取当前语言） | poi_info.poi_name     |
| submitter_type | 提交方类型         | poi_audit_queue.submitter_type |
| submitter_name | 提交方名称（商户名/管理员名） | merchant / government |
| district    | 行政区           | poi_info.district     |
| status      | 状态（待审核/已上线/已下架） | poi_info.status       |
| submit_remark | 提交备注          | poi_audit_queue.submit_remark |
| created_at  | 提交时间          | poi_audit_queue.created_at |
| assigned_to | 分配给           | poi_audit_queue.assigned_to |
| priority    | 优先级           | poi_audit_queue.priority |

#### B-2. POI 详情审核

> 点击待审核 POI，进入详情审核页，展示 POI 全量字段，审核员可选择通过或拒绝。

| 子功能     | 功能说明                                    |
| ------- | --------------------------------------- |
| 基础信息展示 | POI 名称（多语言）、描述（多语言）、地址（多语言）           |
| 地理位置   | 经纬度、行政区（支持地图预览）                        |
| 联系方式   | 电话、邮箱、官方网址                              |
| 媒体信息   | 照片列表（最多 20 张，支持大图预览）                  |
| 基本属性   | 是否免费、是否需要门票、是否需要预约                    |
| 标签信息   | 关联标签列表（poi_tag_rel + tag_info）           |
| 开放时间   | opening_time 规则列表                      |
| 审核操作   | 通过（附备注选填）/ 拒绝（必填备注）                  |
| 审核历史   | 查看该 POI 的全部审核记录（merchant_poi_review）    |
| 关联商户   | 如为商户提交，显示关联商户信息（merchant_poi_rel）     |

#### B-3. POI 信息管理

> 政府端可自主管理平台所有 POI（不经过审核队列），包括新增、编辑、强制下架。

| 子功能    | 功能说明                                       |
| ------ | ------------------------------------------ |
| POI 列表  | 展示平台所有 POI，支持按状态、行政区、名称搜索           |
| 新增 POI  | 政府管理员直接新增 POI（created_by = government.id）   |
| 编辑 POI  | 修改 POI 字段（关键字段变更记录 merchant_poi_review）  |
| 强制下架  | 政府端强制将 POI 下架（poi_info.status → 2），无需审核   |
| 重新上线  | 下架后重新上线需进入 poi_audit_queue 审核              |
| 删除 POI  | 超级管理员可删除 POI（级联删除关联的评论、打卡等数据）        |

**政府直接操作的 POI 状态变化**：

| 操作          | 状态变化          | 是否入审核队列 | 通知商户  |
| ----------- | ------------- | -------- | ----- |
| 政府新增 POI    | 新增 status=1    | 否       | 否     |
| 政府编辑 POI    | 直接更新           | 否（记录 review） | 否     |
| 政府强制下架     | status → 2       | 否       | 是（发消息）|
| 商户编辑后政府通过 | status → 1       | 是       | 是     |

---

### 模块 C：商户管理

#### C-1. 商户列表

| 子功能      | 功能说明                                     | 数据来源       |
| ------- | ---------------------------------------- | ---------- |
| 商户列表   | 展示所有商户，支持按名称、手机号、状态、经营类目筛选         | merchant   |
| 按状态筛选   | 全部 / 待审核 / 审核通过 / 封禁 / 驳回 / 注销           | merchant.status |
| 按经营类目筛选 | 景区 / 博物馆 / 餐饮 等                        | merchant.merchant_category |
| 按时间排序   | 注册时间排序                                  | merchant.created_at |

**列表字段**：

| 字段              | 说明        | 来源        |
| --------------- | --------- | --------- |
| merchant_name   | 商户名称      | merchant  |
| tel             | 手机号       | merchant  |
| merchant_category | 经营类目    | merchant  |
| status          | 状态        | merchant  |
| contact_person  | 联系人       | merchant  |
| created_at      | 注册时间      | merchant  |
| poi_count       | 关联 POI 数量  | merchant_poi_rel.count |
| reject_reason   | 驳回原因（若有）  | merchant  |

#### C-2. 商户详情

| 子功能      | 功能说明                                     |
| ------- | ---------------------------------------- |
| 基本信息   | 商户名称、联系人、手机号、邮箱、简介、经营类目、Logo         |
| 营业执照   | 展示商户上传的营业执照图片                         |
| 关联 POI 列表 | 该商户关联的所有 POI（含 is_primary 标记）          |
| 审核历史   | 该商户的审核记录列表（merchant_review）             |
| 运营数据   | 该商户 POI 的打卡量、评分、评论数等                  |

#### C-3. 商户操作

| 子功能    | 功能说明                                       |
| ------ | ------------------------------------------ |
| 审核通过  | merchant.status → 1，商户 POI 进入 poi_audit_queue |
| 驳回    | merchant.status → 3，写入 reject_reason           |
| 封禁    | merchant.status → 2，禁止登录，写入封禁原因           |
| 解封    | merchant.status → 1，恢复登录                      |
| 注销    | merchant.status → 4，禁止登录，数据保留              |

#### C-4. 商户账号管理（超级管理员）

> 超级管理员可为商户重置密码，发送新密码到商户注册手机号。

| 子功能    | 功能说明                         |
| ------ | ---------------------------- |
| 重置密码  | 生成随机密码，bcrypt 加密后写入 merchant 表  |
| 发送通知  | 通过短信或站内消息通知商户新密码           |

---

### 模块 D：评论管理

#### D-1. 评论审核队列

> 政府端「评论审核」页面展示所有待审核（audit_status=1）的评论和举报记录。

| 子功能      | 功能说明                                     | 数据来源             |
| ------- | ---------------------------------------- | ---------------- |
| 待审核列表   | 展示所有 audit_status=1 的评论                | comment_info     |
| 举报列表   | 展示所有 target_type="comment" 且 status=0 的举报 | report_record    |
| 按来源筛选   | 系统识别 / 用户举报                            | comment_audit_queue / report_record |
| 按评分筛选   | 全部 / 1-2星 / 3星 / 4-5星                    | comment_info.rating |
| 按时间排序   | 最新优先                                     | comment_info.created_at |
| 审核数量徽标  | 侧边栏菜单显示待处理数量                        | 聚合计数             |

**列表字段**：

| 字段             | 说明         | 来源            |
| -------------- | ---------- | ------------- |
| comment_id     | 评论 ID      | comment_info  |
| user_nickname  | 评论用户昵称（脱敏） | user          |
| poi_name       | 被评价景点名称    | poi_info      |
| rating         | 评分（1-5星）   | comment_info  |
| content        | 评论内容（超100字折叠） | comment_info |
| images         | 评论图片（最多显示3张缩略图） | comment_info |
| is_reported    | 是否被举报      | comment_info  |
| report_reason  | 举报原因（若有）   | report_record |
| audit_status   | 审核状态       | comment_info  |
| created_at     | 评论时间       | comment_info  |

#### D-2. 评论详情与处理

| 子功能    | 功能说明                                       |
| ------ | ------------------------------------------ |
| 查看详情  | 展示完整评论内容、图片、评分、用户信息、被评价 POI            |
| 举报详情  | 举报人信息、举报原因、证据截图                         |
| 通过审核  | audit_status → 3（放行），前端正常展示               |
| 违规处理  | audit_status → 2（违规），前端隐藏，通知被举报用户        |
| 无效举报  | report_record.status → 2，不影响评论                 |
| 有效举报  | report_record.status → 1，联动处理评论                |

#### D-3. 举报处理

| 子功能     | 功能说明                                       |
| ------- | ------------------------------------------ |
| 举报列表   | 展示所有待处理举报（report_record.status=0）          |
| 举报详情   | 举报人信息、举报原因、证据截图、被举报内容                   |
| 处理结果填写 | 处理结果描述（最多 200 字）                          |
| 联动操作   | 可选择：删除评论、警告用户、封禁商户、无操作                |
| 处理记录   | 写入 report_record（handler_id、handle_result、handle_time） |
| 举报人通知  | 处理完成后通知举报人                                  |

---

### 模块 E：内容管理

#### E-1. 内容列表

| 子功能     | 功能说明                                     | 数据来源          |
| ------ | ---------------------------------------- | ------------- |
| 内容列表   | 展示所有官方内容，支持按类型、状态、分类筛选             | official_content |
| 按类型筛选  | 图文 / 视频                                 | official_content.content_type |
| 按状态筛选  | 全部 / 已发布 / 草稿 / 已下线                   | official_content.status |
| 按分类筛选  | 从 tag_info 读取分类标签                       | official_content.category |
| 排序      | 发布时间 / 浏览量 / 点赞量                       | official_content |

**列表字段**：

| 字段           | 说明      | 来源               |
| ------------ | ------- | ---------------- |
| content_id   | 内容 ID    | official_content |
| title       | 标题（多语言） | official_content |
| content_type | 内容类型   | official_content |
| category     | 分类      | official_content |
| gov_name     | 发布人姓名  | government.real_name |
| view_count   | 浏览次数    | official_content |
| like_count   | 点赞次数    | official_content |
| status       | 状态      | official_content |
| published_at | 发布时间    | official_content |
| created_at   | 创建时间    | official_content |

#### E-2. 新增/编辑内容

| 子功能       | 功能说明                                       |
| -------- | ------------------------------------------ |
| 内容标题     | 多语言 JSON，必填                              |
| 内容摘要     | 多语言 JSON，选填                              |
| 正文内容     | 多语言 JSON，必填，支持富文本编辑器                    |
| 内容类型     | 图文（article）/ 视频（video），必填               |
| 封面图上传   | 调用统一上传接口（POST /api/common/upload），选填      |
| 视频上传     | 视频 URL，选填（content_type=video 时必填）         |
| 关联 POI    | 从已上线 POI 中选择关联（写入 related_poi_ids）       |
| 标签设置     | 从 tag_info 选择标签                           |
| 分类设置     | 设置内容分类，便于筛选                           |
| 保存草稿     | status → 0                                 |
| 发布        | status → 1，published_at → NOW()             |
| 预览        | 发布前预览完整页面效果                           |

**多语言字段格式**（仅支持 zh 与 en 两种语言）：

```json
{
  "zh": "内容标题",
  "en": "Content Title"
}
```

#### E-3. 内容上下架

| 子功能   | 功能说明                                       |
| ----- | ------------------------------------------ |
| 下架   | official_content.status → 0，立即生效               |
| 上架   | official_content.status → 1，published_at → NOW() |
| 删除   | 超级管理员可删除内容                              |

---

### 模块 F：数据统计与运营看板

#### F-1. 全局运营仪表盘

> 政府端登录后的首页（Dashboard），展示平台全局核心运营指标：

| 指标        | 数据来源                            | 说明              |
| --------- | ------------------------------- | --------------- |
| 累计用户数    | user 表（COUNT）                      | 全平台注册用户总数       |
| 今日新增用户   | user 表（当日新增 COUNT）                 | 较昨日增长百分比         |
| 累计 POI 数   | poi_info 表（status=1）               | 已上线 POI 总数       |
| 今日新增 POI  | poi_info 表（当日新增）                  | 较昨日增长百分比         |
| 累计打卡次数   | check_info 表（COUNT）                 | 全平台历史打卡总次数      |
| 今日打卡次数   | check_info 表（当日 COUNT）              | 较昨日增长百分比         |
| 累计评论数    | comment_info 表（COUNT）               | 全平台评论总数          |
| 今日新增评论   | comment_info 表（当日新增）               | 较昨日增长百分比         |
| 累计路线数    | routes_info 表（COUNT）                 | 全平台 AI 路线总数      |
| 待审核 POI 数  | poi_audit_queue（status=0 COUNT）        | 审核队列积压数量        |
| 待处理举报数   | report_record（status=0 COUNT）          | 举报队列积压数量        |
| 待审核评论数   | comment_info（audit_status=1 COUNT）     | 评论审核队列积压数量     |

**Dashboard 卡片布局**：

```
┌──────────────────────────────────────────────────────────────────────┐
│                    全局运营 Dashboard                                    │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 累计用户数  │  │ 今日新增用户 │  │ 累计 POI  │  │ 今日新增 POI │              │
│  │  12,456  │  │   +128   │  │   3,421  │  │    +5     │              │
│  │           │  │  ↑15%    │  │           │  │           │              │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 累计打卡次数 │  │ 今日打卡次数 │  │ 累计评论数  │  │ 今日新增评论  │              │
│  │  89,234  │  │   +856   │  │   6,789  │  │   +42    │              │
│  │           │  │  ↑8.3%   │  │           │  │  ↑12%    │              │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │
│                                                                       │
│  ┌─────────────────────────────┐  ┌────────────────────────────┐      │
│  │      近30天用户增长趋势（折线图）   │  │    POI 分布热力图               │      │
│  └─────────────────────────────┘  └────────────────────────────┘      │
│                                                                       │
│  ┌─────────────────────────────┐  ┌────────────────────────────┐      │
│  │      近30天打卡趋势（折线图）       │  │    待审核队列概览（列表）              │      │
│  └─────────────────────────────┘  └────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────┘
```

#### F-2. 用户统计

| 子功能       | 功能说明                                       |
| --------- | ------------------------------------------ |
| 累计用户数趋势  | 折线图，横轴为日期，纵轴为累计用户数                  |
| 新增用户趋势   | 折线图，横轴为日期，纵轴为每日新增用户数                  |
| 用户来源分布   | 饼图，匿名用户 / 微信用户 / 手机号用户                  |
| 用户地域分布   | 柱状图/地图热力，按城市分组展示                        |
| 用户活跃度分析  | 活跃用户数（当日有行为的用户）、活跃率                   |
| 导出数据     | 支持导出 CSV 格式原始数据                         |

#### F-3. POI 统计

| 子功能       | 功能说明                                       |
| --------- | ------------------------------------------ |
| POI 总数趋势  | 折线图，按上线 / 待审核 / 已下架 分组展示              |
| 打卡量排名     | TOP 20 POI 打卡量排名（柱状图）                   |
| 评分排名      | TOP 20 POI 评分排名                          |
| 热力分布      | 地图热力图，按打卡密度展示 POI 热度                   |
| POI 分类分布   | 饼图，按 poi_info.poi_type 分组               |
| 导出数据     | 支持导出 CSV 格式原始数据                         |

#### F-4. 打卡统计

| 子功能       | 功能说明                                       |
| --------- | ------------------------------------------ |
| 打卡趋势     | 近 30 天 / 近 7 天 / 自定义日期范围折线图             |
| 高峰时段分析   | 柱状图，横轴为小时段（0-23），展示打卡集中时段           |
| 高峰日分析    | 柱状图，横轴为日期，展示打卡量最高 / 最低的日期           |
| 用户人均打卡次数 | 总打卡次数 / 活跃用户数                            |
| 路线打卡率    | 路线打卡次数 / 路线总使用次数                       |
| 导出数据     | 支持导出 CSV 格式原始数据                         |

#### F-5. 路线统计

| 子功能       | 功能说明                                       |
| --------- | ------------------------------------------ |
| 路线生成趋势  | 近 30 天 AI 路线生成数量折线图                    |
| 路线使用排行  | TOP 20 路线按 use_count 排序                  |
| 路线类型分布   | 饼图，按 total_days 分组（1天/2天/3天等）          |
| AI 路线占比   | AI 生成路线 vs 用户自建路线占比                   |
| 导出数据     | 支持导出 CSV 格式原始数据                         |

#### F-6. 内容统计

| 子功能       | 功能说明                                       |
| --------- | ------------------------------------------ |
| 内容浏览趋势  | 折线图，展示每日浏览量                            |
| 内容点赞趋势  | 折线图，展示每日点赞量                            |
| 内容发布统计  | 柱状图，按月统计官方内容发布数量                     |
| TOP 内容    | 浏览量最高的 TOP 10 内容列表                     |
| 内容类型分布   | 饼图，图文 vs 视频占比                           |

#### F-7. 图表技术实现

| 图表类型 | 组件 | 配置要点                                      |
| ---- | --- | ----------------------------------------- |
| 数字卡片 | Element Plus `el-statistic` | 显示数值 + 趋势箭头 + 同比百分比                 |
| 折线图   | ECharts `line` | 支持多折线（本期 vs 上期）、tooltip 悬停数据点    |
| 柱状图   | ECharts `bar` | 横向/纵向两种模式，支持堆叠柱                   |
| 饼图    | ECharts `pie` | 标签百分比，中心显示总数                       |
| 热力图   | ECharts `heatmap` | 用于 POI 分布热力图展示                |
| 仪表盘   | ECharts `gauge` | 用于好评率等单指标展示                  |

---

### 模块 G：系统公告

#### G-1. 公告列表

| 子功能      | 功能说明                                     | 数据来源      |
| ------- | ---------------------------------------- | --------- |
| 公告列表   | 展示所有公告，支持按类型、状态、目标范围筛选             | announcement |
| 按类型筛选  | 运营通知 / 活动公告 / 系统维护                    | announcement.type |
| 按目标范围筛选 | 全部 / 用户 / 商户 / 政府内部                   | announcement.target_scope |
| 按状态筛选  | 全部 / 已发布 / 草稿 / 已撤回                    | announcement.status |
| 按时间排序  | 发布时间排序                                 | announcement.published_at |

**列表字段**：

| 字段           | 说明      | 来源         |
| ------------ | ------- | ---------- |
| announcement_id | 公告 ID   | announcement |
| title         | 标题      | announcement |
| type          | 公告类型   | announcement |
| target_scope  | 目标范围   | announcement |
| publisher_name | 发布人姓名  | government.real_name |
| status        | 状态      | announcement |
| published_at  | 发布时间    | announcement |
| created_at    | 创建时间    | announcement |

#### G-2. 发布/编辑公告

| 子功能       | 功能说明                                       |
| -------- | ------------------------------------------ |
| 公告标题     | 必填，2-100 字                              |
| 公告内容     | 必填，支持富文本（最多 10000 字）                    |
| 公告类型     | 枚举：运营通知、活动公告、系统维护、政策解读               |
| 目标范围     | 枚举：all（全部）/ user（用户）/ merchant（商户）/ government（政府内部） |
| 定时发布     | 支持设置定时发布时间（published_at = 指定时间）         |
| 保存草稿     | announcement.status → 0                         |
| 立即发布     | announcement.status → 1，published_at → NOW()    |
| 撤回        | announcement.status → 2（已撤回）                    |

**公告推送规则**：

| 触发场景   | 推送内容                | 接收方         |
| ------ | ------------------- | ------------ |
| 发布面向用户公告 | 公告全文              | 用户端小程序       |
| 发布面向商户公告 | 公告全文              | 商户端 Web 管理后台  |
| 发布面向政府公告 | 公告全文              | 政府端内部         |
| 发布面向全部公告 | 公告全文              | 用户端 + 商户端 + 政府端 |

---

### 模块 H：账号与设置

#### H-1. 管理员账号管理（超级管理员）

> 超级管理员可管理所有政府账号（增删改查），普通管理员和审核员无此权限。

| 子功能      | 功能说明                                     |
| ------- | ---------------------------------------- |
| 账号列表   | 展示所有 government 账号，支持按部门、角色、状态筛选      |
| 新建账号   | 填写 username、tel、real_name、department、role，初始密码 |
| 编辑账号   | 修改 real_name、department、role、status           |
| 重置密码   | 生成随机密码，bcrypt 加密后写入，短信通知被创建人         |
| 禁用/启用账号 | government.status → 0 / 1                   |
| 删除账号   | 仅超级管理员可删除其他超管；不可删除自己                 |

**新建账号字段约束**：

| 字段        | 约束              | 说明          |
| --------- | --------------- | ----------- |
| username  | 必填，唯一，2-50字    | 登录账号       |
| tel       | 必填，唯一，11位手机号   | 联系方式       |
| password  | 必填，初始密码由系统生成  | bcrypt 加密存储 |
| real_name | 必填，2-50字       | 真实姓名       |
| department | 选填，2-100字      | 所属部门       |
| role      | 必填，枚举 0/1/2     | 角色         |

#### H-2. 账号信息设置

> 政府管理员可修改自身信息（仅限 real_name、department）。

| 子功能     | 功能说明                          |
| ------- | ----------------------------- |
| 基本信息编辑 | real_name、department               |
| 修改密码   | 输入旧密码 + 新密码 + 确认密码，验证后更新   |

#### H-3. 修改密码

| 子功能      | 功能说明                         |
| -------- | ---------------------------- |
| 修改当前账号密码 | 输入旧密码 + 新密码 + 确认密码，验证后更新    |
| 超管重置他人密码 | 超管可为其他管理员重置密码（见 H-1）        |

---

## 四、页面结构与接口

### 4.1 页面清单

```
merchantAndGovern/                     # 商户+政府端根目录（共建于同一项目）
│
├── shared/                           # 公共资源
│   ├── layouts/                      # 共享布局组件
│   │   ├── MainLayout.vue           # 主布局（侧边栏+顶部）
│   │   └── BlankLayout.vue          # 空白布局（登录/无导航页）
│   ├── components/                   # 共享业务组件
│   │   ├── PoiCard.vue              # POI 信息卡片
│   │   └── StatsCard.vue            # 统计数据卡片
│   ├── login/                        # 共享登录模块
│   │   ├── index.vue                 # 统一登录页（角色选择+登录表单）
│   │   └── register.vue              # 商户注册页（政府账号无需注册，系统生成）
│   └── store/                        # Pinia 共享 store
│
├── merchant/                          # 商户端模块
│   ├── layout/
│   │   └── AppLayout.vue             # 商户侧布局组件
│   ├── dashboard/
│   │   └── index.vue                 # 运营概览仪表盘
│   ├── poi/
│   │   ├── index.vue                 # 景点信息概览（展示/编辑）
│   │   └── history.vue               # 审核历史
│   ├── ticket/
│   │   ├── list.vue                  # 票种列表
│   │   └── edit.vue                  # 新增/编辑票种
│   ├── comment/
│   │   ├── list.vue                  # 评价列表
│   │   └── detail.vue                # 评价详情+回复
│   ├── stats/
│   │   ├── index.vue                 # 客流趋势与评分分析
│   │   └── ai-report.vue             # AI 经营分析报告
│   └── settings/
│       ├── profile.vue                # 商家信息
│       └── password.vue               # 修改密码
│
└── government/                        # 政府端模块（本文档对应）
    ├── layout/
    │   └── AppLayout.vue             # 政府侧布局组件
    ├── dashboard/
    │   └── index.vue                 # 全局运营仪表盘
    ├── audit/
    │   ├── poi.vue                   # POI 审核队列
    │   ├── poi-detail.vue            # POI 详情审核
    │   └── merchant.vue              # 商户入驻审核
    ├── poi/
    │   ├── list.vue                  # POI 列表管理
    │   ├── detail.vue                # POI 详情查看
    │   └── form.vue                  # 新增/编辑 POI
    ├── merchant/
    │   ├── list.vue                  # 商户列表管理
    │   └── detail.vue                # 商户详情
    ├── comment/
    │   ├── list.vue                  # 评论审核列表
    │   ├── detail.vue                # 评论详情
    │   └── report.vue                # 举报处理
    ├── content/
    │   ├── list.vue                  # 内容列表
    │   └── edit.vue                  # 新增/编辑内容
    ├── stats/
    │   ├── user.vue                  # 用户统计
    │   ├── poi.vue                   # POI 统计
    │   ├── check.vue                 # 打卡统计
    │   ├── route.vue                 # 路线统计
    │   └── content.vue               # 内容统计
    ├── announcement/
    │   ├── list.vue                  # 公告列表
    │   └── edit.vue                  # 发布/编辑公告
    └── settings/
        ├── profile.vue                # 账号信息
        ├── password.vue               # 修改密码
        └── admin.vue                 # 管理员账号管理（超管专属）
```

### 4.2 路由守卫

所有非登录页路由均需校验 JWT Token，并根据 role 控制菜单和功能展示：

```
路由守卫逻辑：
  if (无 Token) → 跳转 /login
  if (Token 过期) → 跳转 /login，清除存储
  if (role == 2 且访问了无权限页面) → 跳转 /government/dashboard 或提示无权限
```

**前端权限控制**（菜单级别）：

| 菜单项           | 超级管理员 | 普通管理员 | 审核员 |
| -------------- | ------ | ------ | ---- |
| 仪表盘            | 可见    | 可见    | 可见   |
| POI 审核         | 可见    | 可见    | 不可见  |
| POI 管理         | 可见    | 可见    | 不可见  |
| 商户管理          | 可见    | 可见    | 不可见  |
| 评论审核          | 可见    | 可见    | 可见   |
| 举报处理          | 可见    | 可见    | 可见（仅评论）|
| 内容管理          | 可见    | 可见    | 不可见  |
| 数据统计          | 可见    | 可见    | 可见（只读） |
| 系统公告          | 可见    | 可见    | 不可见  |
| 账号管理          | 可见    | 不可见   | 不可见  |

### 4.3 关键 API 接口清单

下表列出政府端需调用的所有 API 接口，部分复用现有后端接口，部分需新增：

#### 认证相关

| 方法   | 路径                           | 说明              | 复用/新增              |
| ---- | ------------------------------ | --------------- | ------------------ |
| POST | `/api/gov/login`               | 政府用户名+密码登录    | **新增**（政府独立认证，与商户端区分） |
| GET  | `/api/gov/profile`             | 获取当前管理员信息     | **新增**              |
| PUT  | `/api/gov/profile`             | 更新管理员信息        | **新增**              |
| POST | `/api/gov/password`            | 修改密码            | **新增**              |
| POST | `/api/gov/logout`              | 退出登录            | **新增**              |

#### POI 审核

| 方法   | 路径                                | 说明               | 复用/新增  |
| ---- | --------------------------------- | ---------------- | ------ |
| GET  | `/api/gov/poi/audit/list`          | 获取待审核 POI 列表     | **新增** |
| GET  | `/api/gov/poi/:id/audit`           | 获取待审核 POI 详情     | **新增** |
| POST | `/api/gov/poi/:id/audit`           | 审核 POI（通过/拒绝）    | **新增** |
| GET  | `/api/gov/poi/audit/history`       | 获取 POI 审核历史       | **新增** |
| PUT  | `/api/gov/poi/:id/assign`          | 分配审核任务            | **新增** |

#### POI 管理

| 方法   | 路径                              | 说明         | 复用/新增  |
| ---- | ------------------------------- | ---------- | ------ |
| GET  | `/api/gov/poi/list`              | 获取 POI 列表    | **新增** |
| GET  | `/api/gov/poi/:id`               | 获取 POI 详情    | **新增** |
| POST | `/api/gov/poi`                  | 新增 POI（政府直建） | **新增** |
| PUT  | `/api/gov/poi/:id`               | 编辑 POI       | **新增** |
| PUT  | `/api/gov/poi/:id/offline`       | 强制下架 POI    | **新增** |
| DELETE | `/api/gov/poi/:id`             | 删除 POI       | **新增** |

#### 商户管理

| 方法   | 路径                                | 说明           | 复用/新增  |
| ---- | --------------------------------- | ------------ | ------ |
| GET  | `/api/gov/merchant/list`           | 获取商户列表        | **新增** |
| GET  | `/api/gov/merchant/:id`           | 获取商户详情        | **新增** |
| POST | `/api/gov/merchant/:id/audit`     | 审核商户（通过/拒绝）  | **新增** |
| PUT  | `/api/gov/merchant/:id/ban`        | 封禁商户          | **新增** |
| PUT  | `/api/gov/merchant/:id/unban`     | 解封商户          | **新增** |
| POST | `/api/gov/merchant/:id/reset-password` | 重置商户密码    | **新增** |
| GET  | `/api/gov/merchant/:id/pois`       | 获取商户关联的 POI   | **新增** |
| GET  | `/api/gov/merchant/:id/reviews`   | 获取商户审核历史     | **新增** |

#### 评论审核

| 方法     | 路径                                | 说明             | 复用/新增  |
| ------ | --------------------------------- | -------------- | ------ |
| GET    | `/api/gov/comment/audit/list`     | 获取待审核评论列表     | **新增** |
| GET    | `/api/gov/comment/:id`             | 获取评论详情         | **新增** |
| POST   | `/api/gov/comment/:id/audit`       | 审核评论（通过/违规）   | **新增** |
| GET    | `/api/gov/comment/audit/history`   | 获取评论审核历史     | **新增** |

#### 举报管理

| 方法   | 路径                           | 说明       | 复用/新增  |
| ---- | ------------------------------ | -------- | ------ |
| GET  | `/api/gov/report/list`         | 获取举报列表   | **新增** |
| GET  | `/api/gov/report/:id`          | 获取举报详情   | **新增** |
| POST | `/api/gov/report/:id/handle`   | 处理举报     | **新增** |
| GET  | `/api/gov/report/history`      | 获取举报处理历史 | **新增** |

#### 内容管理

| 方法     | 路径                               | 说明        | 复用/新增  |
| ------ | -------------------------------- | --------- | ------ |
| GET    | `/api/gov/content/list`           | 获取内容列表    | **新增** |
| GET    | `/api/gov/content/:id`            | 获取内容详情    | **新增** |
| POST   | `/api/gov/content`                | 新增内容      | **新增** |
| PUT    | `/api/gov/content/:id`            | 编辑内容      | **新增** |
| DELETE | `/api/gov/content/:id`            | 删除内容      | **新增** |
| PUT    | `/api/gov/content/:id/publish`    | 发布内容      | **新增** |
| PUT    | `/api/gov/content/:id/unpublish`  | 下架内容      | **新增** |

#### 数据统计

| 方法   | 路径                              | 说明          | 复用/新增  |
| ---- | ------------------------------- | ----------- | ------ |
| GET  | `/api/gov/stats/overview`       | 全局运营概览数据    | **新增** |
| GET  | `/api/gov/stats/user`           | 用户统计数据       | **新增** |
| GET  | `/api/gov/stats/poi`            | POI 统计数据       | **新增** |
| GET  | `/api/gov/stats/check`          | 打卡统计数据       | **新增** |
| GET  | `/api/gov/stats/route`          | 路线统计数据       | **新增** |
| GET  | `/api/gov/stats/content`         | 内容统计数据       | **新增** |

#### 系统公告

| 方法     | 路径                             | 说明     | 复用/新增  |
| ------ | ------------------------------ | ------ | ------ |
| GET    | `/api/gov/announcement/list`   | 获取公告列表 | **新增** |
| GET    | `/api/gov/announcement/:id`    | 获取公告详情 | **新增** |
| POST   | `/api/gov/announcement`        | 发布公告   | **新增** |
| PUT    | `/api/gov/announcement/:id`    | 编辑公告   | **新增** |
| DELETE | `/api/gov/announcement/:id`    | 删除公告   | **新增** |
| PUT    | `/api/gov/announcement/:id/recall` | 撤回公告 | **新增** |

#### 管理员账号管理（超管）

| 方法     | 路径                           | 说明       | 复用/新增  |
| ------ | ------------------------------ | -------- | ------ |
| GET    | `/api/gov/admin/list`          | 获取管理员列表  | **新增** |
| GET    | `/api/gov/admin/:id`           | 获取管理员详情  | **新增** |
| POST   | `/api/gov/admin`               | 新建管理员账号  | **新增** |
| PUT    | `/api/gov/admin/:id`           | 编辑管理员账号  | **新增** |
| DELETE | `/api/gov/admin/:id`           | 删除管理员账号  | **新增** |
| POST   | `/api/gov/admin/:id/reset-password` | 重置管理员密码 | **新增** |

#### 公共接口（复用）

| 方法   | 路径                   | 说明                 | 复用/新增  |
| ---- | -------------------- | ------------------ | ------ |
| POST | `/api/common/upload` | 图片上传               | 复用现有接口 |
| GET  | `/api/poi/nearby`    | 地图选点时获取附近 POI（参考用） | 复用现有接口 |
| GET  | `/api/user/send-code` | 发送短信验证码（超管重置密码通知） | 复用现有接口 |


---

## 五、权限与操作限制

### 5.1 账号权限

政府端采用三级角色体系，权限控制要点：

| 限制项       | 规则                                    |
| --------- | ------------------------------------- |
| 角色分级     | 超管（role=0）/ 普通管理员（role=1）/ 审核员（role=2） |
| 菜单可见性   | 前端根据 role 动态隐藏无权限菜单                    |
| 接口权限     | 后端 `authGovernment` 中间件校验 role             |
| 审核员限制    | 仅能操作评论相关（comment_audit_queue、report_record 中 comment 类） |
| 超管专属     | 账号管理、删除 POI、删除内容                       |

### 5.2 安全限制

| 限制项    | 规则                        |
| ------ | ------------------------- |
| 登录失败锁定 | 连续 5 次登录失败，锁定 30 分钟       |
| 密码强度   | 至少 6 位，包含字母和数字            |
| 数据导出   | 单次导出上限 10,000 条记录         |
| 接口频率限制 | 同一 IP 60 秒内最多 60 次 API 请求 |
| 超管删除   | 超管不可删除自己                    |
| 禁用自己   | 管理员不可禁用自己的账号               |


---

## 六、数据统计与运营看板（重点模块）

> 政府端的数据统计模块围绕全平台提供多维度监管分析，帮助政府管理员掌握平台整体运营状况，是政府端的核心价值模块之一。

### 6.1 全局运营概览

政府端登录后的首页（Dashboard），以数字卡片 + 图表组合方式展示全局核心运营指标：

**指标卡片定义**（全平台聚合数据）：

| 指标          | 计算方式                                        | 数据来源          | 同比说明                  |
| ----------- | ------------------------------------------- | ------------- | --------------------- |
| 累计用户数       | `COUNT(id)` WHERE `status = 0`（未注销）             | user           | 无                     |
| 今日新增用户      | `COUNT(id)` WHERE `DATE(created_at) = CURDATE()`   | user           | 较昨日增长/下降百分比            |
| 累计 POI 数      | `COUNT(id)` WHERE `status = 1`                      | poi_info       | 无                     |
| 今日新增 POI     | `COUNT(id)` WHERE `DATE(created_at) = CURDATE()`   | poi_info       | 较昨日增长/下降百分比            |
| 累计打卡次数      | `COUNT(id)`                                        | check_info     | 无                     |
| 今日打卡次数      | `COUNT(id)` WHERE `DATE(check_time) = CURDATE()`    | check_info     | 较昨日增长/下降百分比            |
| 累计评论数       | `COUNT(id)` WHERE `status = 1`                      | comment_info   | 无                     |
| 今日新增评论      | `COUNT(id)` WHERE `DATE(created_at) = CURDATE()`   | comment_info   | 较昨日增长/下降百分比            |
| 累计路线数       | `COUNT(id)`                                        | routes_info    | 无                     |
| 待审核 POI 数     | `COUNT(id)` WHERE `status = 0`                      | poi_audit_queue | 无（队列积压数量）             |
| 待处理举报数      | `COUNT(id)` WHERE `status = 0`                      | report_record  | 无（队列积压数量）             |
| 待审核评论数      | `COUNT(id)` WHERE `audit_status = 1`                | comment_info   | 无（队列积压数量）             |

### 6.2 用户统计

#### 6.2.1 用户增长趋势

| 子功能        | 功能说明                       |
| ---------- | -------------------------- |
| 累计用户趋势   | 折线图，横轴为日期，纵轴为累计用户数       |
| 新增用户趋势   | 折线图，横轴为日期，纵轴为每日新增用户数      |
| 对比上期      | 同比上周/上月数据（增长/下降百分比）        |

#### 6.2.2 用户分布分析

| 子功能      | 功能说明                      |
| ------- | ------------------------- |
| 来源分布    | 饼图：匿名 / 微信 / 手机号 用户占比   |
| 地域分布    | 柱状图：按城市分组展示用户数          |
| 活跃度分析   | 活跃用户数 vs 累计用户数（活跃率）     |

**SQL 示例**：

```sql
-- 用户增长趋势
SELECT DATE(created_at) as date, COUNT(*) as new_users
FROM user
WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY DATE(created_at)
ORDER BY date ASC;

-- 用户来源分布
SELECT
  SUM(CASE WHEN register_type = 0 THEN 1 ELSE 0 END) as anonymous,
  SUM(CASE WHEN register_type = 1 THEN 1 ELSE 0 END) as wechat,
  SUM(CASE WHEN register_type = 2 THEN 1 ELSE 0 END) as phone,
  SUM(CASE WHEN register_type = 3 THEN 1 ELSE 0 END) as wechat_phone
FROM user WHERE status = 0;
```

### 6.3 POI 统计

#### 6.3.1 POI 增长趋势

| 子功能      | 功能说明                      |
| ------- | ------------------------- |
| POI 总数趋势 | 折线图：上线数 / 待审核数 / 已下架数  |
| 新增 POI 趋势 | 折线图：每日新增上线 POI 数量     |

#### 6.3.2 POI 排行分析

| 子功能      | 功能说明                      |
| ------- | ------------------------- |
| 打卡量排名   | TOP 20 POI 打卡量柱状图        |
| 评分排名    | TOP 20 POI 评分柱状图         |
| 热力分布    | 地图热力图：按打卡密度展示 POI 热度  |
| 分类分布    | 饼图：按 poi_info.poi_type 分组  |

#### 6.3.3 POI 分类分布

| 子功能     | 功能说明                  |
| ------ | --------------------- |
| 类型分布   | 饼图：景区 / 博物馆 / 餐饮 / 购物 等 |
| 行政区分布  | 柱状图：各行政区 POI 数量       |
| 标签分布   | 柱状图：各标签关联 POI 数量     |

### 6.4 打卡统计

#### 6.4.1 打卡趋势

| 子功能        | 功能说明                       |
| ---------- | -------------------------- |
| 近 30 天打卡趋势 | 折线图，横轴为日期，纵轴为打卡次数        |
| 高峰时段分析    | 柱状图，横轴为小时段（0-23），展示打卡集中时段  |
| 高峰日分析     | 柱状图，横轴为日期，展示打卡量最高 / 最低的日期 |
| 对比上期      | 同比上周/上月数据                     |

**SQL 示例**：

```sql
-- 打卡趋势
SELECT DATE(check_time) as date, COUNT(*) as check_count
FROM check_info
WHERE check_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(check_time)
ORDER BY date ASC;

-- 高峰时段
SELECT hour_tag, COUNT(*) as count
FROM check_info
WHERE check_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY hour_tag
ORDER BY hour_tag ASC;
```

#### 6.4.2 人均打卡分析

| 子功能      | 功能说明                      |
| ------- | ------------------------- |
| 人均打卡次数  | 总打卡次数 / 活跃用户数            |
| 用户打卡频率分布 | 柱状图：打卡1次/2次/3次+用户占比  |

#### 6.4.3 打卡热力图（地图可视化）

> 在地图上直观展示全平台打卡密度分布，帮助政府管理员掌握哪些区域/景点热度最高，支持按时间维度下钻，用于人流疏导指挥、景区运营决策等场景。

##### 6.4.3.1 功能概述

| 维度 | 说明 |
| --- | --- |
| 地图底图 | 使用 **高德地图 AMap** 作为底图（与用户端共用同一套地图服务） |
| 热力图层 | 在底图上叠加 **打卡热力图**，按 POI 经纬度 + 打卡密度渲染 |
| 数据源 | 基于 `check_info` 表，预计算字段 `hourTag / weekTag / monthTag / yearTag / dayTag` 直接用于维度筛选 |
| 数据关联 | 通过 `poi_id` 关联 `poi_info` 获取 `longitude / latitude` |
| 适用角色 | 普通管理员、超级管理员均可查看 |
| 入口 | 数据分析页面（`/gov/stats`）内新增一个独立卡片 |

##### 6.4.3.2 交互与功能点

| 功能点 | 描述 |
| --- | --- |
| **地图加载** | 页面打开时自动加载高德地图，中心点设为上海（或数据库中 POI 的中心经纬度） |
| **热力图展示** | 调用 AMap `Heatmap` 插件，根据打卡密度自动渲染颜色（蓝→绿→黄→红） |
| **时间范围筛选** | 支持按时间范围筛选热力数据：今日 / 近7天 / 近30天 / 自定义日期 |
| **时间维度切换** | 支持在以下维度之间切换热力图展示：<br>• **按小时**（hourTag 0-23）：展示一天内各小时的打卡热力分布<br>• **按星期**（weekTag 1-7）：展示周一至周日的打卡热力分布<br>• **按每月几号**（dayTag DATE）：展示每月1-31日的打卡热力分布<br>• **按每年几号**（yearTag 年份）：展示不同年份的整体热力对比 |
| **维度内切换** | 选定维度后，支持在该维度内切换具体值，如选定"按星期"后，可选择"只看周六"或"只看周日" |
| **图层切换** | 支持切换显示模式：热力图 / 散点图 / 热力图+POI标注叠加 |
| **POI 详情弹窗** | 点击热力区域/标注点，弹出气泡展示：景点名称、打卡次数、评分、区域、所属时间维度值 |
| **数据下钻** | 从热力图点击进入 POI 详情页（跳转至景点管理详情） |
| **图层控制** | 右下角提供图层切换控件（热力/散点/关闭） |
| **全屏模式** | 支持全屏查看地图热力分布 |
| **导出** | 支持将当前视图热力数据导出为 CSV（含 POI 经纬度、打卡量、维度标签） |
| **对比热力** | 支持叠加两个时间维度（如周六 vs 工作日、周一 vs 周日）的打卡热力，对比同一区域不同时段的冷热差异 |
| **行政区划热力** | 按区县聚合打卡数据，在地图侧边栏或弹窗中展示各区打卡总量排行榜，支持快速对比 |

##### 6.4.3.3 时间维度说明

`check_info` 表中已预计算以下时间标签字段，可直接用于筛选和聚合：

| 字段 | 类型 | 取值范围 | 说明 | 用途示例 |
| --- | --- | --- | --- | --- |
| `hourTag` | Int | 0-23 | 打卡小时 | 分析"下午14-16点是外滩打卡高峰" |
| `weekTag` | Int | 1-7 | 星期几 | 分析"周末东方明珠打卡量是工作日的3倍" |
| `monthTag` | Int | 1-12 | 月份 | 分析"7-8月暑假期间各景点热力变化" |
| `yearTag` | Int | 年份 | 哪一年 | 对比"2025 vs 2026同期热力变化" |
| `dayTag` | DATE | 每月日期 | 每月几号 | 分析"每月1日、节假日打卡峰值规律" |

**维度组合查询示例**：

```
场景：分析2026年所有周六的10-12点，哪些景点的打卡热力最高
  WHERE yearTag = 2026
    AND weekTag = 6          -- 周六
    AND hourTag IN (10,11,12)
  GROUP BY poi_id
```

##### 6.4.3.4 数据查询逻辑

```
用户选择时间范围（period） + 时间维度（dimension） + 维度值（dimensionValue）
        │
        ▼
基础过滤（时间范围）：
  WHERE check_time BETWEEN :startDate AND :endDate
        │
        ▼
维度过滤（根据 dimension 参数）：
  dimension=hour  → AND hourTag = :value
  dimension=week  → AND weekTag = :value
  dimension=month  → AND monthTag = :value
  dimension=year  → AND yearTag = :value
  dimension=day   → AND DAY(dayTag) = :value
        │
        ▼
按 POI 聚合打卡量：
  GROUP BY poi_id
        │
        ▼
关联 poi_info 表获取经纬度：
  JOIN poi_info ON check_info.poi_id = poi_info.id
  WHERE poi_info.status = 1
        │
        ▼
按 POI 聚合打卡量，构造成 AMap 热力图格式：
  [{ lng, lat, count, dimensionLabel }, ...]
        │
        ▼
前端调用 AMap Heatmap 渲染热力图
```

**热力权重计算**：
- `weight = check_count / max(check_count)` 归一化到 [0, 1]
- 热力半径、热力强度由前端配置（默认 radius: 30, blurRadius: 15）

##### 6.4.3.5 API 接口设计

| 接口 | 方法 | 路径 | 参数 | 返回值 |
| --- | --- | --- | --- | --- |
| 打卡热力数据 | GET | `/api/gov/stats/check-heatmap` | `period`, `dimension`, `dimensionValue`, `startDate`, `endDate` | 见返回示例 |
| 热力图维度分布 | GET | `/api/gov/stats/check-heatmap/dimensions` | `period`, `dimension`（hour/week/month/year/day） | 各维度值的打卡量分布 |
| 导出热力数据 | GET | `/api/gov/stats/check-heatmap/export` | `period`, `dimension`, `dimensionValue`, `startDate`, `endDate` | CSV 文件下载 |

**dimension 参数说明**：

| dimension 值 | 含义 | dimensionValue 示例 |
| --- | --- | --- |
| `hour` | 按小时 | `10`（只看10点的打卡） |
| `week` | 按星期 | `6`（只看周六） |
| `month` | 按月份 | `7`（只看7月） |
| `year` | 按年份 | `2026` |
| `day` | 按每月几号 | `1`（每月1号） |
| `all`（默认） | 不限维度 | 忽略 dimensionValue |

**热力数据返回示例**：

```json
{
  "code": 0,
  "data": {
    "dimension": "week",
    "dimensionValue": 6,
    "dimensionLabel": "周六",
    "period": "30d",
    "list": [
      {
        "poiId": 1,
        "poiName": "外滩",
        "lng": 121.4901,
        "lat": 31.2405,
        "checkCount": 850,
        "rating": 4.8,
        "district": "黄浦区"
      },
      {
        "poiId": 5,
        "poiName": "东方明珠",
        "lng": 121.5061,
        "lat": 31.2397,
        "checkCount": 620,
        "rating": 4.6,
        "district": "浦东新区"
      }
    ],
    "total": 50,
    "maxCount": 850
  }
}
```

**维度分布返回示例**（供维度选择器展示）：

```json
{
  "code": 0,
  "data": {
    "dimension": "week",
    "distribution": [
      { "value": 1, "label": "周一", "count": 320 },
      { "value": 2, "label": "周二", "count": 280 },
      { "value": 3, "label": "周三", "count": 310 },
      { "value": 4, "label": "周四", "count": 295 },
      { "value": 5, "label": "周五", "count": 450 },
      { "value": 6, "label": "周六", "count": 1200 },
      { "value": 7, "label": "周日", "count": 1150 }
    ]
  }
}
```

##### 6.4.3.6 前端实现方案

**技术选型**：

| 技术 | 说明 |
| --- | --- |
| 高德地图 JS API | 地图底图 + 热力图插件（AMap.Heatmap） |
| Vue 3 + Element Plus | 页面框架与 UI 组件（el-select、el-radio-group 等） |
| 按需加载 | 仅在进入数据分析页时动态加载 AMap SDK（减少首屏体积） |

**组件结构**：

```
pages/government/stats/
├── index.vue              # 数据分析主页（保留现有内容，新增热力图卡片）
└── components/
    └── CheckHeatmap.vue   # 【新增】打卡热力图子组件
```

**CheckHeatmap.vue 核心逻辑**：

```
1. onMounted:
   - 加载 AMap SDK（创建 script 标签动态引入）
   - 获取维度分布数据（供维度选择器使用）

2. AMap.ready:
   - 初始化地图实例 + Heatmap 图层
   - 设置地图中心点

3. 维度切换逻辑:
   - watch(dimension): 用户切换维度时，重新请求维度分布 + 清空地图热力
   - watch(dimensionValue): 用户切换具体值时，重新请求热力数据 + 刷新热力图
   - 维度选择器根据 dimension 显示不同选项：
       hour  → 下拉选择 0-23
       week  → 下拉选择 周一至周日
       month → 下拉选择 1-12月
       year  → 下拉选择已有年份
       day   → 下拉选择 1-31日

4. fetchHeatmapData():
   - 调用 GET /api/gov/stats/check-heatmap
   - 传入 period, dimension, dimensionValue

5. fetchDimensionDistribution():
   - 调用 GET /api/gov/stats/check-heatmap/dimensions
   - 获取当前时间范围内的维度打卡分布

6. renderHeatmap(data):
   - 将数据传入 AMap.Heatmap.setDataSet()
   - 更新 POI 标注图层

7. 维度标签叠加:
   - 热力图标题动态显示：如"周六打卡热力分布"

8. onUnmounted:
   - 销毁地图实例，防止内存泄漏
```

**维度选择器 UI 设计**：

```
┌──────────────────────────────────────────────────────────────┐
│  时间范围: [近30天 ▾]  维度: [ 按星期 ▾]  具体值: [ 周六 ▾ ]  │
│                      ↑                                       │
│  dimension          dimensionValue                           │
└──────────────────────────────────────────────────────────────┘
```

##### 6.4.3.7 后端实现方案

**Controller**：`GovernmentStatsController` 新增两个方法

```typescript
// GET /api/gov/stats/check-heatmap
// 支持维度过滤的热力数据查询
async getCheckHeatmap(req: Request, res: Response, next: NextFunction) {
  try {
    const { period = '30d', dimension = 'all', dimensionValue, startDate, endDate } = req.query;
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;

    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // 构建维度过滤条件
    const where: any = { checkTime: { gte: start, lte: end } };
    if (dimension === 'hour' && dimensionValue !== undefined) {
      where.hourTag = Number(dimensionValue);
    } else if (dimension === 'week' && dimensionValue !== undefined) {
      where.weekTag = Number(dimensionValue);
    } else if (dimension === 'month' && dimensionValue !== undefined) {
      where.monthTag = Number(dimensionValue);
    } else if (dimension === 'year' && dimensionValue !== undefined) {
      where.yearTag = Number(dimensionValue);
    } else if (dimension === 'day' && dimensionValue !== undefined) {
      // 按每月几号过滤：使用原生 SQL 提取 dayTag 的 DAY() 部分
      // Prisma 不支持 DAY() 函数，需要 $queryRaw
      const dayNum = Number(dimensionValue);
      const rawStats = await prisma.$queryRaw<{ poiId: number; check_count: BigInt }[]>`
        SELECT poi_id as poiId, COUNT(*) as check_count
        FROM check_info
        WHERE check_time >= ${start} AND check_time <= ${end}
          AND DAY(day_tag) = ${dayNum}
        GROUP BY poi_id
      `;
      const stats = rawStats.map(r => ({ poiId: r.poiId, _count: Number(r.check_count) }));

    const poiIds = stats.map(s => s.poiId);
    const pois = await prisma.poiInfo.findMany({
      where: { id: { in: poiIds }, status: 1 },
      select: { id: true, poiName: true, longitude: true, latitude: true, district: true }
    });
    const poiMap = new Map(pois.map(p => [p.id, p]));

    // 获取评分
    const ratings = await prisma.commentInfo.groupBy({
      by: ['poiId'],
      where: { poiId: { in: poiIds }, status: { in: [1, 3] } },
      _avg: { rating: true }
    });
    const ratingMap = new Map(ratings.map(r => [r.poiId, r._avg.rating || 0]));

    const list = stats.map(s => {
      const poi = poiMap.get(s.poiId);
      if (!poi) return null;
      return {
        poiId: s.poiId,
        poiName: (poi.poiName as any)?.zh || '未命名',
        lng: Number(poi.longitude),
        lat: Number(poi.latitude),
        checkCount: s._count,
        rating: ratingMap.get(s.poiId)
          ? Number(ratingMap.get(s.poiId)!.toFixed(1))
          : 0,
        district: poi.district || '未知'
      };
    }).filter(Boolean);

    const maxCount = list.length > 0
      ? Math.max(...list.map(l => (l as any).checkCount))
      : 0;

    return successResponse(res, {
      dimension,
      dimensionValue: dimensionValue ? Number(dimensionValue) : null,
      dimensionLabel: getDimensionLabel(dimension as string, dimensionValue as string),
      period,
      list,
      total: list.length,
      maxCount
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/gov/stats/check-heatmap/dimensions
// 获取各维度的打卡分布（供维度选择器）
async getCheckHeatmapDimensions(req: Request, res: Response, next: NextFunction) {
  try {
    const { period = '30d', dimension = 'week', startDate, endDate } = req.query;
    let days = 30;
    if (period === '7d') days = 7;
    else if (period === '90d') days = 90;

    const start = startDate
      ? new Date(startDate as string)
      : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const where: any = { checkTime: { gte: start, lte: end } };

    let groupByField: 'hourTag' | 'weekTag' | 'monthTag' | 'yearTag' | 'dayTag' = 'weekTag';
    if (dimension === 'hour') groupByField = 'hourTag';
    else if (dimension === 'month') groupByField = 'monthTag';
    else if (dimension === 'year') groupByField = 'yearTag';
    else if (dimension === 'day') groupByField = 'dayTag';

    const stats = await prisma.checkInfo.groupBy({
      by: [groupByField],
      where,
      _count: true
    });

    const labels: Record<string, Record<number, string>> = {
      week: { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日' },
      hour: Object.fromEntries(Array.from({ length: 24 }, (_, i) => [i, `${i}点`])),
      month: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, `${i + 1}月`])),
    };

    const distribution = stats.map(s => ({
      value: (s as any)[groupByField],
      label: labels[dimension as string]?.[(s as any)[groupByField]] || String((s as any)[groupByField]),
      count: s._count
    })).sort((a, b) => {
      if (dimension === 'day') return a.value - b.value;
      if (dimension === 'month') return a.value - b.value;
      if (dimension === 'hour') return a.value - b.value;
      return a.value - b.value;
    });

    return successResponse(res, { dimension, distribution });
  } catch (err) {
    next(err);
  }
}

function getDimensionLabel(dimension: string, value?: string): string {
  if (!value) return '全部';
  const weekLabels: Record<string, string> = { 1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日' };
  if (dimension === 'week') return weekLabels[value] || `周${value}`;
  if (dimension === 'hour') return `${value}点`;
  if (dimension === 'month') return `${value}月`;
  if (dimension === 'year') return `${value}年`;
  if (dimension === 'day') return `每月${value}日`;
  return '全部';
}
```

**路由注册**（`government.routes.ts`）：

```typescript
// 热力图
router.get('/stats/check-heatmap', auth.authGovToken, auth.authGovPermission([0, 1]), statsController.getCheckHeatmap.bind(statsController));
router.get('/stats/check-heatmap/dimensions', auth.authGovToken, auth.authGovPermission([0, 1]), statsController.getCheckHeatmapDimensions.bind(statsController));
```

##### 6.4.3.8 高德地图配置

**AMap Key 配置**：
- 前端通过 Vite 环境变量 `VITE_AMAP_KEY` 注入
- 与用户端共用同一套 AMap Key（后端 .env 中已配置 `AMAP_KEY`）

**需要引入的 AMap 插件**：

```javascript
// 动态加载 AMap SDK + 热力图插件
AMap.plugin(['AMap.Heatmap', 'AMap.Marker', 'AMap.InfoWindow'], () => {
  // 初始化热力图
})
```

##### 6.4.3.9 异常处理

| 场景 | 处理方式 |
| --- | --- |
| 地图加载失败 | 展示占位图 + "地图加载失败，请检查网络" 提示 |
| 热力数据为空 | 展示空白地图 + "当前时间范围内暂无打卡数据" |
| API 请求超时 | 展示骨架屏 + 重试按钮 |
| AMap Key 无效 | 控制台警告 + 降级为普通散点图（无热力效果） |
| 维度数据为空 | 维度选择器禁用该选项，提示"该维度暂无数据" |

##### 6.4.3.10 性能优化

| 优化项 | 说明 |
| --- | --- |
| 数据聚合在数据库层 | 通过 `GROUP BY poi_id` 减少传输数据量 |
| 热力点数量限制 | 单次最多返回 200 个 POI，超出按打卡量取 TOP 200 |
| 维度数据缓存 | 维度分布数据缓存 5 分钟，避免重复查询 |
| 地图懒加载 | 仅当用户切换到「打卡热力图」卡片时才加载 AMap SDK |
| 前端数据缓存 | 热力图数据缓存 2 分钟内相同参数的结果 |

##### 6.4.3.12 对比热力实现方案

> 支持同时叠加两个时间维度的热力图，直观对比不同人群结构（工作日 vs 周末）、不同季节（旺季 vs 淡季）的打卡热度差异。

**交互流程**：

```
用户点击「对比热力」按钮
        │
        ▼
弹出「对比维度选择面板」：
  第一组：[维度类型 ▾] [具体值 ▾]   ← 如「按星期 → 周六」
  第二组：[维度类型 ▾] [具体值 ▾]   ← 如「按星期 → 工作日」
        │
        ▼
点击「开始对比」
        │
        ▼
调用两个热力接口（并行）：
  热力A = GET /api/gov/stats/check-heatmap?period=30d&dimension=week&dimensionValue=6
  热力B = GET /api/gov/stats/check-heatmap?period=30d&dimension=week&dimensionValue=1
        │
        ▼
叠加渲染：热力A 和热力B 叠加显示
        │
        ▼
右侧边栏展示对比分析表：各 POI 在两个维度下的打卡量差值和涨跌幅
```

**叠加渲染策略**（三种模式）：

| 模式 | 描述 | 适用场景 |
| --- | --- | --- |
| **分屏对比** | 屏幕左右各占一半，分别渲染两个热力图 | 冷热对比明显时 |
| **颜色叠加** | 热力A 渲染为暖色（橙/红），热力B 渲染为冷色（蓝/青），叠加以紫区分 | 细微差异观察 |
| **差异热力** | 仅渲染打卡量差值（热力A - 热力B），升温色=差值正，降温色=差值负 | 快速定位变化区域 |

**对比分析表**（右侧边栏）：

| POI 名称 | 周六打卡量 | 工作日打卡量 | 差值 | 涨跌幅 |
| --- | --- | --- | --- | --- |
| 外滩 | 1200 | 450 | +750 | +166.7% |
| 东方明珠 | 800 | 300 | +500 | +166.7% |

**API 扩展**：

```typescript
// 新增专用对比接口（一次性返回两个维度的数据）
// GET /api/gov/stats/check-heatmap/compare
// 参数：dimension, valueA, valueB, period, startDate, endDate

async getCheckHeatmapCompare(req, res, next) {
  const { dimension, valueA, valueB, period = '30d' } = req.query;
  // 并行请求两个维度的热力数据
  const [dataA, dataB] = await Promise.all([
    fetchHeatmapByDimension(dimension, valueA, period),
    fetchHeatmapByDimension(dimension, valueB, period)
  ]);
  // 合并 POI 列表，计算差值和涨跌幅
  const poiMap = new Map();
  for (const item of dataA) {
    poiMap.set(item.poiId, { ...item, countA: item.checkCount, countB: 0 });
  }
  for (const item of dataB) {
    if (poiMap.has(item.poiId)) {
      const existing = poiMap.get(item.poiId);
      const diff = item.checkCount - existing.countA;
      existing.countB = item.checkCount;
      existing.diff = diff;
      existing.changeRate = existing.countA > 0
        ? Number((diff / existing.countA * 100).toFixed(1))
        : 0;
    } else {
      poiMap.set(item.poiId, { ...item, countA: 0, countB: item.checkCount, diff: item.checkCount, changeRate: 0 });
    }
  }
  return successResponse(res, {
    dimension, valueA, valueB,
    list: Array.from(poiMap.values()).sort((a, b) => b.diff - a.diff)
  });
}
```

**前端组件扩展（CheckHeatmap.vue）**：

```
新增组件状态：
  - compareMode: boolean           // 是否开启对比模式
  - compareConfig: { dimension, valueA, valueB }
  - compareOverlay: 'split' | 'color' | 'diff'

对比面板 UI：
┌─────────────────────────────────────────┐
│  对比热力                              │
│  第一组：[按星期 ▾] → [周六 ▾]         │
│  第二组：[按星期 ▾] → [工作日 ▾]       │
│  叠加模式：[分屏 ▾]                    │
│                              [开始对比] │
└─────────────────────────────────────────┘
```

##### 6.4.3.13 行政区划热力实现方案

> 在地图侧边栏或弹窗中展示各行政区（区县）的打卡总量排行榜，帮助政府管理员快速掌握哪个区的旅游热度最高，指导资源配置和精准营销。

**数据来源**：

- `check_info` → `poi_id` → `poi_info.district_id` → `district.id`（外键关联）
- 无需新增数据库字段，利用已有的 `district_id` 外键链路聚合
- `poi_info.district_id` 为可选（可为 null），null 时该 POI 不计入行政区统计

**API 接口**：

```typescript
// GET /api/gov/stats/check-heatmap/district
// 参数：period, dimension, dimensionValue, startDate, endDate

async getCheckHeatmapDistrict(req: Request, res: Response, next: NextFunction) {
  try {
    const { period = '30d', dimension, dimensionValue, startDate, endDate } = req.query;
    const { where } = buildWhereClause(period, dimension, dimensionValue, startDate, endDate);

    const stats = await prisma.checkInfo.groupBy({
      by: ['poiId'],
      where,
      _count: true
    });

    const poiIds = stats.map(s => s.poiId);
    const pois = await prisma.poiInfo.findMany({
      where: { id: { in: poiIds }, status: 1 },
      select: { id: true, district: { select: { id: true, name: true } } }
    });

    // 按行政区聚合（通过 districtId + district 关联）
    const districtMap = new Map<string, { districtId: number; districtName: string; count: number; poiIds: number[] }>();
    for (const s of stats) {
      const poi = pois.find(p => p.id === s.poiId);
      if (!poi || !poi.district) continue;
      if (!districtMap.has(poi.district.name)) {
        districtMap.set(poi.district.name, {
          districtId: poi.district.id,
          districtName: poi.district.name,
          count: 0,
          poiIds: []
        });
      }
      districtMap.get(poi.district.name)!.count += s._count;
      districtMap.get(poi.district.name)!.poiIds.push(s.poiId);
    }

    const total = Array.from(districtMap.values())
      .map(d => ({ districtId: d.districtId, districtName: d.districtName, count: d.count, poiCount: d.poiIds.length }))
      .sort((a, b) => b.count - a.count);

    const maxCount = total.length > 0 ? total[0].count : 0;
    const overallCount = total.reduce((sum, d) => sum + d.count, 0);

    return successResponse(res, {
      dimension,
      dimensionValue,
      period,
      total,
      overallCount,
      maxCount,
      // 附加占比信息
      breakdown: total.map(d => ({
        ...d,
        percentage: overallCount > 0 ? Number((d.count / overallCount * 100).toFixed(1)) : 0
      }))
    });
  } catch (err) {
    next(err);
  }
}
```

**返回示例**：

```json
{
  "code": 0,
  "data": {
    "dimension": "week",
    "dimensionValue": 6,
    "period": "30d",
    "total": [
      { "districtId": 1, "districtName": "黄浦区", "count": 12500, "poiCount": 8, "percentage": 31.2 },
      { "districtId": 11, "districtName": "浦东新区", "count": 9800, "poiCount": 12, "percentage": 24.5 },
      { "districtId": 4, "districtName": "静安区", "count": 6500, "poiCount": 6, "percentage": 16.2 }
    ],
    "overallCount": 40060,
    "maxCount": 12500
  }
}
```

**UI 呈现**：

```
┌──────────────────────────────────────────────────┐
│  各区打卡排行                    累计 40,060 次  │
│  ─────────────────────────────────────────────  │
│  ① 黄浦区    ████████████████████  12,500  31.2%│
│  ② 浦东新区  ████████████████       9,800  24.5%│
│  ③ 静安区    ████████████           6,500  16.2%│
│  ④ 徐汇区    ████████               4,200  10.5%│
│  ⑤ 长宁区    ██████                 3,060   7.6%│
│  ─────────────────────────────────────────────  │
│  点击区县可筛选地图，仅高亮该区景点热力              │
└──────────────────────────────────────────────────┘
```

**与地图联动**：

- 点击区县名称 → 地图仅高亮该区内的 POI 热力点，其他区域淡化
- 地图缩放时 → 区县排行榜同步更新可见范围（仅统计当前地图视口内 POI）
- 悬浮热力点气泡 → 显示该 POI 所属区县名称

**性能考虑**：

- 行政区聚合数据量小（通常不超过 20 个区县），可直接返回全部数据
- 与热力图数据并行请求（不阻塞主流程）

### 6.5 路线统计

| 子功能       | 功能说明                                       |
| --------- | ------------------------------------------ |
| 路线生成趋势   | 近 30 天 AI 路线生成数量折线图                     |
| 路线使用排行   | TOP 20 路线按 use_count 排序                    |
| 路线类型分布    | 饼图：按 total_days 分组（1天/2天/3天等）          |
| AI vs 自建  | 饼图：AI 生成路线 vs 用户自建路线占比                |
| 路线保存率    | 保存路线数 / 生成路线数（衡量路线质量）               |

### 6.6 内容统计

| 子功能      | 功能说明                      |
| ------- | ------------------------- |
| 内容浏览趋势  | 折线图：每日浏览量               |
| 内容点赞趋势  | 折线图：每日点赞量               |
| 内容发布统计  | 柱状图：按月统计官方内容发布数量      |
| TOP 内容   | 浏览量最高的 TOP 10 内容列表       |
| 内容类型分布   | 饼图：图文 vs 视频占比            |
| 内容互动率   | (点赞数 + 评论数) / 浏览数          |

### 6.7 导出功能

| 功能        | 格式 | 说明                          |
| --------- | --- | --------------------------- |
| 用户数据导出   | CSV | user_id, nickname, register_type, created_at |
| POI 数据导出  | CSV | poi_id, poi_name, status, district, check_count, avg_rating |
| 打卡数据导出  | CSV | date, check_count, check_user_count |
| 路线数据导出  | CSV | route_id, route_name, use_count, created_at |


---

## 七、异常与边界场景

### 7.1 账号与认证异常

| 场景           | 处理方式                                         |
| ------------ | -------------------------------------------- |
| 用户名不存在       | 提示"用户名不存在"，允许重试                        |
| 密码错误          | 提示"密码错误"，记录登录失败次数                    |
| 登录失败锁定       | 连续 5 次失败后锁定 30 分钟，提示"账号已锁定"         |
| 账号已禁用（status=0） | 禁止登录，提示"账号已禁用，请联系管理员"                 |
| Token 泄露       | 退出登录页提供"账号被盗"入口，可清除所有 Token           |
| 权限不足（role 限制）  | 提示"权限不足"，跳转至有权限页面                      |

### 7.2 POI 审核异常

| 场景              | 处理方式                                         |
| --------------- | -------------------------------------------- |
| POI 已被其他审核员处理  | 提示"该 POI 已被处理"，刷新列表                         |
| 分配给不存在的审核员    | 提示"分配失败，用户不存在"                               |
| 审核时 POI 已被删除    | 提示"该 POI 不存在"，自动从队列移除                     |
| 商户编辑后 POI 正在审核  | 商户再次提交编辑时，提示"有正在审核的修改，请等待审核完成"        |

### 7.3 评论审核异常

| 场景           | 处理方式                                         |
| ------------ | -------------------------------------------- |
| 评论已被处理       | 提示"该评论已处理"，刷新列表                           |
| 评论已被用户删除    | 提示"该评论已被删除"，自动从队列移除                     |
| 举报人为被举报人自己  | 提示"无法举报自己的内容"                              |
| 同一评论被多人举报    | 合并为一条举报记录（仅更新 evidence），显示举报人数           |
| 评论关联的 POI 已下架 | 仍可审核评论，但审核后不通知商户                         |

### 7.4 内容管理异常

| 场景          | 处理方式                                         |
| ----------- | -------------------------------------------- |
| 内容标题重复      | 允许保存，但不推荐重复标题                              |
| 视频 URL 无效    | 保存时校验视频 URL 格式，提示"视频链接无效"                |
| 删除已发布内容     | 允许删除（超级管理员），提示"删除后用户端将无法查看"            |
| 内容关联的 POI 已下架 | 仍可发布内容，但关联 POI 展示"已下线"标记               |

### 7.5 数据统计异常

| 场景        | 处理方式                                    |
| --------- | --------------------------------------- |
| 数据为空       | 图表展示空白状态（"暂无数据"），数字卡片显示 0         |
| 统计数据查询超时   | 提示"数据加载中，请稍后"，自动重试一次               |
| 导出数据量过大    | 超过 10,000 条时提示分批导出，或提供日期范围筛选       |
| 热力图 POI 数据为空 | 展示空白地图，提示"暂无打卡数据"                  |

### 7.6 系统级异常

| 场景       | 处理方式                              |
| -------- | --------------------------------- |
| 后端服务不可用 | 展示"服务暂不可用，请稍后再试"，记录错误日志           |
| 图片上传失败   | 提示上传失败，允许重试；重试 3 次仍失败提示联系技术支持     |
| 数据库连接失败  | 503 Service Unavailable，记录错误日志并告警 |


---

## 八、数据库调整说明

> **调整原则**：不破坏原有核心表结构，在不改变现有表字段含义和约束的前提下，政府端开发不涉及新增数据库表（Government 相关表已在 schema.prisma 中定义完毕）。

### 8.1 政府端相关表清单

以下为政府端涉及的已有表（均已在 `backend/prisma/schema.prisma` 中定义，无需新增）：

| 序号  | 表名                    | 用途                | 优先级    |
| --- | --------------------- | ----------------- | ------ |
| 1   | `government`           | 政府管理员账号表         | P0（已有） |
| 2   | `government_review`   | 政府审核记录表           | P0（已有） |
| 3   | `poi_audit_queue`      | POI 审核队列表         | P0（已有） |
| 4   | `comment_audit_queue`  | 评论审核队列表         | P0（已有） |
| 5   | `report_record`        | 举报记录表             | P0（已有） |
| 6   | `analytics_daily`      | 每日数据统计表          | P1（已有） |
| 7   | `announcement`          | 系统公告表             | P1（已有） |
| 8   | `official_content`     | 官方内容表             | P1（已有） |

### 8.2 Government 表字段说明

```prisma
model Government {
  id           Int       @id @default(autoincrement())
  username     String    @unique @map("username")
  tel          String    @unique @map("tel")
  password     String    @map("password")
  realName     String?   @map("real_name")
  department   String?   @map("department")
  role         Int       @default(1)  // 0超管 1管理员 2审核员
  status       Int       @default(1)  // 0禁用 1正常
  lastLoginAt  DateTime? @map("last_login_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  @@index([role])
  @@map("government")
}
```

**字段说明**：

| 字段       | 类型           | 约束                        | 说明              |
| -------- | ------------ | ------------------------- | --------------- |
| id       | INT          | PK                        | 主键              |
| username | VARCHAR(50)  | UNIQUE, NOT NULL          | 登录用户名           |
| tel      | VARCHAR(20)  | UNIQUE, NOT NULL          | 手机号（接收通知/重置密码） |
| password | VARCHAR(255) | NOT NULL                  | bcrypt 加密密码       |
| real_name | VARCHAR(50)  | NULL                      | 真实姓名            |
| department | VARCHAR(100) | NULL                      | 所属部门            |
| role     | INT          | DEFAULT 1                 | 角色：0超管，1管理员，2审核员 |
| status   | INT          | DEFAULT 1                 | 状态：0禁用，1正常       |
| last_login_at | DATETIME | NULL                      | 最后登录时间            |
| created_at | DATETIME     | DEFAULT NOW               | 创建时间              |
| updated_at | DATETIME     | ON UPDATE NOW             | 更新时间              |

### 8.3 Government Review 表字段说明

```prisma
model GovernmentReview {
  id          Int       @id @default(autoincrement())
  reviewerId  Int       @map("reviewer_id")
  targetType  String    @map("target_type")
  targetId    Int       @map("target_id")
  action      String    @map("action")
  remark      String?   @map("remark")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([reviewerId])
  @@map("government_review")
}
```

**操作类型说明**：

| action  | 说明    | 触发场景                    |
| ------- | ----- | ----------------------- |
| approve | 通过   | POI 审核通过 / 评论审核通过 / 商户审核通过 |
| reject  | 拒绝   | POI 审核拒绝 / 评论审核违规 / 商户审核拒绝   |
| ban     | 封禁   | 商户封禁                   |
| unban   | 解封   | 商户解封                   |

### 8.4 Poi Audit Queue 表字段说明

```prisma
model PoiAuditQueue {
  id            Int       @id @default(autoincrement())
  poiId         Int       @unique @map("poi_id")
  submitterType String    @map("submitter_type")
  submitterId   Int       @map("submitter_id")
  submitRemark  String?   @map("submit_remark")
  priority      Int       @default(0)
  status        Int       @default(0)   // 0待审核 1已审核
  assignedTo    Int?      @map("assigned_to")
  assignedAt    DateTime? @map("assigned_at")
  createdAt     DateTime  @default(now()) @map("created_at")

  @@index([status])
  @@map("poi_audit_queue")
}
```

### 8.5 Comment Audit Queue 表字段说明

```prisma
model CommentAuditQueue {
  id            Int       @id @default(autoincrement())
  commentId     Int       @unique @map("comment_id")
  reportReason  String?   @map("report_reason")
  reporterId    Int?      @map("reporter_id")
  priority      Int       @default(0)
  status        Int       @default(0)   // 0待审核 1已审核
  assignedTo    Int?      @map("assigned_to")
  assignedAt    DateTime? @map("assigned_at")
  createdAt     DateTime  @default(now()) @map("created_at")

  @@index([status])
  @@map("comment_audit_queue")
}
```

### 8.6 Report Record 表字段说明

```prisma
model ReportRecord {
  id           Int       @id @default(autoincrement())
  reporterId   Int       @map("reporter_id")
  targetType   String    @map("target_type")   // poi/comment
  targetId     Int       @map("target_id")
  reason       String    @map("reason")
  evidence     Json?     @map("evidence")
  status       Int       @default(0)   // 0待处理 1已处理 2无效
  handlerId    Int?      @map("handler_id")
  handleResult String?   @map("handle_result")
  handleTime   DateTime? @map("handle_time")
  createdAt    DateTime  @default(now()) @map("created_at")

  @@index([reporterId])
  @@index([status])
  @@map("report_record")
}
```

### 8.7 Analytics Daily 表字段说明

```prisma
model AnalyticsDaily {
  id            Int       @id @default(autoincrement())
  date          DateTime  @unique @db.Date
  totalUsers    Int       @default(0) @map("total_users")
  newUsers      Int       @default(0) @map("new_users")
  activeUsers   Int       @default(0) @map("active_users")
  totalPois     Int       @default(0) @map("total_pois")
  newPois       Int       @default(0) @map("new_pois")
  totalChecks   Int       @default(0) @map("total_checks")
  newChecks     Int       @default(0) @map("new_checks")
  totalComments Int       @default(0) @map("total_comments")
  newComments   Int       @default(0) @map("new_comments")
  totalRoutes   Int       @default(0) @map("total_routes")
  newRoutes     Int       @default(0) @map("new_routes")
  totalContents Int       @default(0) @map("total_contents")
  createdAt     DateTime  @default(now()) @map("created_at")

  @@map("analytics_daily")
}
```

### 8.8 Announcement 表字段说明

```prisma
model Announcement {
  id            Int       @id @default(autoincrement())
  title         String    @map("title")
  content       String    @db.Text @map("content")
  type          String    @map("type")
  targetScope   String    @default("all") @map("target_scope")
  publisherId   Int       @map("publisher_id")
  publisherType String    @map("publisher_type")
  status        Int       @default(1)   // 0草稿 1已发布 2已撤回
  publishedAt   DateTime? @map("published_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  @@index([type])
  @@index([status])
  @@map("announcement")
}
```

**公告类型（type）枚举值**：

| type       | 说明    |
| ---------- | ----- |
| operation   | 运营通知 |
| activity   | 活动公告 |
| maintenance | 系统维护 |
| policy     | 政策解读 |

**目标范围（target_scope）枚举值**：

| target_scope | 说明       |
| ------------ | -------- |
| all          | 全部       |
| user         | 用户端      |
| merchant     | 商户端      |
| government   | 政府内部     |

### 8.9 Official Content 表字段说明

```prisma
model OfficialContent {
  id             Int       @id @default(autoincrement())
  govId          Int       @map("gov_id")
  title          Json      @map("title")
  summary        Json?     @map("summary")
  content        Json      @map("content")
  contentType    String    @map("content_type")
  coverImage     String?   @map("cover_image")
  videoUrl       String?   @map("video_url")
  category       String?   @map("category")
  tags           Json?     @map("tags")
  relatedPoiIds  Json?     @map("related_poi_ids")
  viewCount      Int       @default(0) @map("view_count")
  likeCount      Int       @default(0) @map("like_count")
  status         Int       @default(1)  // 0草稿 1已发布
  publishedAt    DateTime? @map("published_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@index([govId])
  @@index([status])
  @@map("official_content")
}
```

### 8.10 现有表字段微调

#### `poi_info` 表：无需调整

原 schema 已包含政府端所需所有字段。

#### `comment_info` 表：无需调整

原 schema 已包含 `audit_status`（0正常/1待审/2违规/3放行）和 `is_reported` 字段，举报处理功能已可实现。

#### `merchant` 表：无需调整

原 schema 已包含 `status`（0待审核/1通过/2封禁/3驳回/4注销）和 `reject_reason` 字段，政府端封禁/审核功能已可实现。

---

## 九、开发与部署

### 9.1 项目初始化

```bash
# 创建政府端项目
cd merchantAndGovern
npm install

# 安装 Element Plus 和相关依赖
npm install element-plus @element-plus/icons-vue echarts axios vue-router pinia
npm install -D unplugin-vue-components unplugin-auto-import

# 配置环境变量
cp .env.example .env
# 填写 API_BASE_URL（指向 backend 服务地址）
```

### 9.2 开发命令

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 类型检查
npm run type-check
```

### 9.3 前后端接口对接

政府端前端通过 `src/api/` 目录下的模块化 API 文件调用后端接口。Token 存储在 `localStorage` 中，Axios 拦截器自动在请求头注入 `Authorization: Bearer {token}`。政府端使用独立的 `/api/gov/` 前缀接口，与商户端 `/api/merchant/` 完全分离。

### 9.4 默认管理员账号

政府端默认管理员账号在数据库初始化时创建（参考 `scripts/init-poi-data.ts` 或 SQL 脚本）：

| username | tel        | password（bcrypt占位） | real_name | department | role |
| -------- | ---------- | ---------------------- | --------- | ---------- | ---- |
| admin    | 13800000000 | $2a$10$xxxx            | 系统管理员    | 文旅局       | 0    |

> **注意**：密码需使用 bcrypt 加密，实际密码需在初始化脚本中设置。初次部署后请立即修改默认管理员密码。

---

## 十、附录

### 10.1 错误码定义（政府端扩展）

| 错误码    | 说明           |
| ----- | ------------ |
| 70001 | 政府账号不存在        |
| 70002 | 政府账号密码错误       |
| 70003 | 政府账号已被禁用       |
| 70004 | 操作权限不足（role不足）  |
| 70005 | POI 不存在          |
| 70006 | 评论不存在           |
| 70007 | 举报不存在           |
| 70008 | 商户不存在           |
| 70009 | 内容不存在           |
| 70010 | 公告不存在           |
| 70011 | 管理员账号不存在       |
| 70012 | 管理员手机号已被注册     |
| 70013 | 管理员用户名已被注册     |
| 70014 | 不能删除或禁用自己的账号   |
| 70015 | 审核员权限不足，无法操作此功能 |


### 10.2 多语言支持

政府端 Web 后台主要面向国内政府工作人员，默认使用简体中文。可预留英文语言包扩展能力。

### 10.3 参考文档

| 文档            | 路径                             | 说明            |
| ------------- | ------------------------------ | ------------- |
| 方案总览          | `docx/方案总览.md`                 | 系统三端架构、政府端定位  |
| 数据库设计         | `docx/数据库设计.md`                | 现有 28 张表设计详解  |
| 后端技术方案        | `docx/后端技术方案.md`              | 后端 API 接口定义   |
| Prisma Schema | `backend/prisma/schema.prisma` | 数据库 ORM 定义    |
| 商户端需求         | `docx/merchant-requirements.md` | 商户端完整需求（参考对照） |
| 用户端需求         | `docx/user-端-requirements.md`  | 用户端完整需求（参考对照） |

---

*文档完*
