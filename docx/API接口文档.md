# 智慧旅游平台 API 接口文档

## 一、接口概述

### 1.1 基本信息
- **API版本**: v1
- **Base URL**: `https://api.example.com`
- **数据格式**: JSON
- **字符编码**: UTF-8

### 1.2 认证方式
本系统采用**三级用户认证体系**：

| 认证层级 | 说明 | Token | 使用场景 |
|---------|------|-------|---------|
| 公共接口 | 无需认证 | 无 | POI搜索、POI详情、附近POI、热力图、官方内容 |
| 可选认证 | 登录可选 | optionalAuth | 个性化推荐、AI规划、设置偏好 |
| 必须认证 | 必须登录 | requiredAuth | 打卡、评论、创建路线、消息、个人中心 |

### 1.3 请求头
| Header | 必填 | 说明 |
|--------|------|------|
| Content-Type | 是 | application/json |
| Accept-Language | 否 | zh-CN / en-US，多语言支持 |
| Authorization | 视接口而定 | Bearer Token（需认证接口） |

---

## 二、统一响应格式

### 2.1 成功响应
```json
{
  "code": 0,
  "message": "success",
  "data": {
    // 业务数据
  }
}
```

### 2.2 分页响应
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}
```

### 2.3 错误响应
```json
{
  "code": 40001,
  "message": "参数错误",
  "data": null
}
```

---

## 三、错误码定义

| 错误码 | 说明 |
|--------|------|
| 0 | 成功 |
| 40001 | 参数错误 |
| 40002 | 缺少必填参数 |
| 40003 | 参数格式错误 |
| 40101 | 未登录或登录已过期 |
| 40102 | Token无效 |
| 40301 | 无权限访问 |
| 40401 | 资源不存在 |
| 40402 | 找不到相关数据 |
| 50001 | 服务器内部错误 |
| 50002 | 服务暂不可用 |
| 50003 | AI服务调用失败 |

---

## 四、用户模块 (User)

### 4.1 匿名登录（自动Token）
**接口地址**: `POST /api/user/anonymous`

**认证**: 无需认证

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| 无 | - | - | 无需任何参数，自动生成匿名账号 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": 1,
    "isAnonymous": true,
    "aiPlanRemaining": 3
  }
}
```

**说明**: 自动创建匿名账号，返回Token。可用于冷启动场景，无需任何信息即可体验。匿名用户AI规划次数限制为3次。

---

### 4.2 微信登录
**接口地址**: `POST /api/user/wechat-login`

**认证**: 无需认证

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| code | string | 是 | 微信登录code |

**请求示例**:
```json
{
  "code": "0811A11o0xxxxx"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": 1,
    "isAnonymous": false,
    "isNewUser": true,
    "needPhoneBind": true,
    "aiPlanRemaining": 5
  }
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|------|------|------|
| isNewUser | boolean | 是否为新用户 |
| needPhoneBind | boolean | 是否需要绑定手机号 |
| aiPlanRemaining | number | AI规划剩余次数（正式用户5次） |

---

### 4.3 手机号登录
**接口地址**: `POST /api/user/phone-login`

**认证**: 无需认证

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| phone | string | 是 | 手机号 |
| password | string | 是 | 密码 |
| code | string | 否 | 验证码（注册时必填） |

**登录请求示例**:
```json
{
  "phone": "13800138000",
  "password": "xxxxxx"
}
```

**注册请求示例**（新用户）:
```json
{
  "phone": "13800138000",
  "password": "xxxxxx",
  "code": "123456"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": 1,
    "message": "登录成功"
  }
}
```

**错误响应**:
```json
{
  "code": 400,
  "message": "请输入验证码",
  "data": null
}
```

---

### 4.4 发送验证码
**接口地址**: `POST /api/user/send-code`

**认证**: 无需认证

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| phone | string | 是 | 手机号 |
| type | string | 是 | 验证码类型：bind(绑定)/login(登录)/reset(重置密码) |

**请求示例**:
```json
{
  "phone": "13800138000",
  "type": "bind"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "验证码已发送",
  "data": null
}
```

**限制说明**:
- 每分钟最多发送1次
- 每天最多发送10次
- 验证码有效期5分钟

---

### 4.5 绑定手机号（匿名用户升级）
**接口地址**: `POST /api/user/bind-phone`

**认证**: 可选认证（匿名/正式用户）

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| phone | string | 是 | 手机号 |
| code | string | 是 | 验证码 |
| password | string | 否 | 密码（可选） |

**请求示例**:
```json
{
  "phone": "13800138000",
  "code": "123456",
  "password": "xxxxxx"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "绑定成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "message": "绑定成功",
    "merged": false
  }
}
```

**合并响应示例**（手机号已被使用）:
```json
{
  "code": 0,
  "message": "绑定成功，已合并账号数据",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "message": "绑定成功，已合并账号数据",
    "merged": true
  }
}
```

---

### 4.6 关联微信
**接口地址**: `POST /api/user/bind-wechat`

**认证**: 必须认证

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| code | string | 是 | 微信授权code |

**响应示例**:
```json
{
  "code": 0,
  "message": "关联成功",
  "data": {
    "message": "关联成功",
    "merged": false
  }
}
```

---

### 4.7 提交偏好设置
**接口地址**: `POST /api/user/preference`

**认证**: 可选认证（匿名/正式用户都可使用）

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| fromRegion | int | 否 | 来源地区 (0日韩/1国内/2欧美/3本地) |
| preferenceTags | object | 否 | 偏好标签对象 |

**preferenceTags 对象结构**:
| 参数名 | 类型 | 说明 |
|--------|------|------|
| intensity | string[] | 活动强度标签列表 |
| interests | string[] | 兴趣标签列表 |

**请求示例**:
```json
{
  "fromRegion": 1,
  "preferenceTags": {
    "intensity": ["leisure"],
    "interests": ["historical", "nature", "food"]
  }
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

### 4.8 获取用户信息
**接口地址**: `GET /api/user/profile`

**认证**: 必须认证

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "tel": "13800138000",
    "nickname": "旅行者",
    "avatar": "https://example.com/avatar.jpg",
    "gender": 0,
    "locale": "zh-CN",
    "registerType": 3,
    "isAnonymous": false,
    "aiPlanRemaining": 5,
    "preference": {
      "fromRegion": 1,
      "preferenceTags": {
        "intensity": ["leisure"],
        "interests": ["historical", "food"]
      },
      "hasCompletedOnboarding": 1
    },
    "createdAt": "2026-03-26T00:00:00.000Z"
  }
}
```

**registerType 枚举**:
| 值 | 说明 |
|----|------|
| 0 | 匿名注册 |
| 1 | 微信注册 |
| 2 | 手机号注册 |
| 3 | 微信+手机绑定 |

---

### 4.9 更新用户信息
**接口地址**: `PUT /api/user/profile`

**认证**: 必须认证

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| nickname | string | 否 | 昵称 (1-20字符) |
| avatar | string | 否 | 头像URL |
| gender | int | 否 | 性别 (0未知/1男/2女) |
| locale | string | 否 | 语言 (zh-CN/en) |
| gender | number | 否 | 性别 (0:未知, 1:男, 2:女) |

**请求示例**:
```json
{
  "nickname": "新昵称",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "user-uuid-xxx",
    "nickname": "新昵称",
    "avatar": "https://example.com/new-avatar.jpg"
  }
}
```

---

## 五、景点模块 (POI)

### 5.1 获取推荐景点
**接口地址**: `GET /api/poi/recommend`

**认证**: 可选认证（登录时返回个性化推荐）

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "poi-1",
        "name": "外滩",
        "category": "scenery",
        "description": "上海最具代表性的历史建筑群",
        "images": ["https://example.com/photo1.jpg"],
        "latitude": 31.2397,
        "longitude": 121.4906,
        "address": "黄浦区中山东一路",
        "rating": 4.8,
        "commentCount": 32000,
        "distance": 800,
        "tags": ["历史建筑", "夜景", "打卡"],
        "heatScore": 95
      }
    ],
    "total": 50
  }
}
```

---

### 5.2 获取附近景点
**接口地址**: `GET /api/poi/nearby`

**认证**: 无需认证（公共接口）

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| latitude | number | 是 | 用户纬度 |
| longitude | number | 是 | 用户经度 |
| radius | number | 否 | 搜索半径(米)，默认5000 |
| category | string | 否 | 景点分类筛选 |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "poi-1",
        "name": "外滩",
        "category": "scenery",
        "latitude": 31.2397,
        "longitude": 121.4906,
        "distance": 800,
        "rating": 4.8
      }
    ],
    "total": 15
  }
}
```

---

### 5.3 获取热力图数据
**接口地址**: `GET /api/poi/heatmap`

**认证**: 无需认证（公共接口）

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| latitude | number | 是 | 中心点纬度 |
| longitude | number | 是 | 中心点经度 |
| radius | number | 否 | 半径(米)，默认5000 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": [
    {
      "latitude": 31.2397,
      "longitude": 121.4906,
      "weight": 95
    },
    {
      "latitude": 31.2274,
      "longitude": 121.4927,
      "weight": 80
    }
  ]
}
```

---

### 5.4 获取景点详情
**接口地址**: `GET /api/poi/:id`

**认证**: 无需认证（公共接口）

**路径参数**:
| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | string | 景点ID |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "poi-1",
    "name": "外滩",
    "category": "scenery",
    "description": "上海最具代表性的历史建筑群，万国建筑博览会",
    "images": [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg"
    ],
    "latitude": 31.2397,
    "longitude": 121.4906,
    "address": "黄浦区中山东一路",
    "openTime": "全天开放",
    "ticketPrice": 0,
    "phone": "",
    "rating": 4.8,
    "commentCount": 32000,
    "tags": ["历史建筑", "夜景", "打卡"],
    "heatScore": 95
  }
}
```

---

### 5.5 AI路线规划
**接口地址**: `POST /api/poi/ai-plan`

**认证**: 可选认证（匿名用户限制次数，正式用户不限）

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| prompt | string | 是 | 旅行需求描述 |
| days | number | 否 | 游玩天数，默认1天 |

**请求示例**:
```json
{
  "prompt": "我想带孩子去上海玩，3天时间，喜欢博物馆和自然风光",
  "days": 3
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "ai_1743000000000",
    "name": "AI推荐路线 - 3日游",
    "days": 3,
    "pois": [],
    "remainingCount": 2
  }
}
```

**AI规划次数限制**:
| 用户类型 | 剩余次数 | 说明 |
|---------|---------|------|
| 匿名用户 | 3次 | 自动创建，无需登录 |
| 正式用户 | 5次 | 微信登录或手机号登录 |
| 次数用完 | 0次 | 需绑定手机号升级获取更多次数 |

---

## 六、路线模块 (Route)

### 6.1 AI生成路线
**接口地址**: `POST /api/route/generate`

**认证**: 需要（必须认证）

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| prompt | string | 是 | 用户需求描述 (至少10字) |
| days | number | 否 | 旅游天数，默认2 |
| tags | string[] | 否 | 偏好标签 |
| startLatitude | number | 否 | 起点纬度 |
| startLongitude | number | 否 | 起点经度 |

**请求示例**:
```json
{
  "prompt": "我想在上海玩3天，喜欢历史建筑和美食",
  "days": 3,
  "tags": ["历史建筑", "美食探店"]
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "route-generated-xxx",
    "title": "AI规划：上海3日历史美食之旅",
    "days": 3,
    "totalPoi": 9,
    "schedule": [
      {
        "day": 1,
        "description": "外滩历史文化之旅",
        "pois": [
          {
            "id": "poi-1",
            "name": "外滩",
            "description": "推荐理由：从这里开始感受上海的百年变迁",
            "stayDuration": 120,
            "openTime": "全天开放"
          },
          {
            "id": "poi-3",
            "name": "上海博物馆",
            "description": "推荐理由：了解上海的历史文化",
            "stayDuration": 180,
            "openTime": "09:00-17:00"
          }
        ]
      }
    ],
    "tags": ["历史建筑", "美食"],
    "createdAt": "2024-03-18T10:30:00Z"
  }
}
```

---

### 6.2 获取路线详情
**接口地址**: `GET /api/route/:id`

**认证**: 需要

**路径参数**:
| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | string | 路线ID |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "route-1",
    "title": "上海经典两日游",
    "days": 2,
    "totalPoi": 6,
    "coverImage": "https://example.com/route-cover.jpg",
    "schedule": [
      {
        "day": 1,
        "description": "黄浦江畔历史文化之旅",
        "pois": [
          {
            "id": "poi-1",
            "name": "外滩",
            "images": ["https://example.com/photo.jpg"],
            "description": "推荐理由：...",
            "stayDuration": 120,
            "openTime": "全天开放",
            "ticketPrice": 0
          }
        ]
      }
    ],
    "tags": ["家族游", "文化"],
    "createdAt": "2024-03-15T10:00:00"
  }
}
```

---

### 6.3 获取我的路线
**接口地址**: `GET /api/route/my`

**认证**: 需要

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "route-1",
        "title": "上海经典两日游",
        "days": 2,
        "totalPoi": 6,
        "coverImage": "https://example.com/route-cover.jpg",
        "tags": ["家族游", "文化"],
        "createdAt": "2024-03-15T10:00:00"
      }
    ],
    "total": 4
  }
}
```

---

### 6.4 保存路线
**接口地址**: `POST /api/route/save`

**认证**: 需要

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| id | string | 否 | 路线ID（更新时传入） |
| title | string | 是 | 路线名称 |
| days | number | 是 | 总天数 |
| schedule | object[] | 是 | 每日行程 |
| tags | string[] | 否 | 标签 |

**请求示例**:
```json
{
  "title": "我的上海之旅",
  "days": 2,
  "schedule": [
    {
      "day": 1,
      "description": "第一天行程",
      "pois": [
        { "id": "poi-1", "stayDuration": 120 },
        { "id": "poi-2", "stayDuration": 90 }
      ]
    }
  ],
  "tags": ["休闲游"]
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "route-saved-xxx",
    "title": "我的上海之旅"
  }
}
```

---

### 6.5 删除路线
**接口地址**: `DELETE /api/route/:id`

**认证**: 需要

**路径参数**:
| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | string | 路线ID |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

## 七、打卡模块 (Check)

### 7.1 创建打卡
**接口地址**: `POST /api/check/create`

**认证**: 需要

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| poiId | string | 是 | 景点ID |
| latitude | number | 是 | 打卡纬度 |
| longitude | number | 是 | 打卡经度 |
| note | string | 否 | 打卡备注 |

**请求示例**:
```json
{
  "poiId": "poi-1",
  "latitude": 31.2397,
  "longitude": 121.4906,
  "note": "第一次来，风景超美！"
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "chk-xxx",
    "poiId": "poi-1",
    "poiName": "外滩",
    "poiImage": "https://example.com/photo.jpg",
    "latitude": 31.2397,
    "longitude": 121.4906,
    "checkedAt": "2024-03-18T10:30:00Z",
    "note": "第一次来，风景超美！"
  }
}
```

---

### 7.2 获取打卡记录
**接口地址**: `GET /api/check/my`

**认证**: 需要

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |
| startDate | string | 否 | 开始日期 (YYYY-MM-DD) |
| endDate | string | 否 | 结束日期 (YYYY-MM-DD) |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "chk-1",
        "poiId": "poi-1",
        "poiName": "外滩",
        "poiImage": "https://example.com/photo.jpg",
        "latitude": 30.9,
        "longitude": 103.57,
        "checkedAt": "2024-03-10T10:30:00Z",
        "note": "第一次来，风景超美！"
      }
    ],
    "total": 12
  }
}
```

---

## 八、评论模块 (Comment)

### 8.1 发表评论
**接口地址**: `POST /api/comment/create`

**认证**: 需要

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| poiId | string | 是 | 景点ID |
| rating | number | 是 | 评分 (1.0-5.0) |
| content | string | 是 | 评论内容 |
| images | string[] | 否 | 评论图片列表 |

**请求示例**:
```json
{
  "poiId": "poi-1",
  "rating": 5,
  "content": "青城山真的太美了！空气清新，道观古朴",
  "images": ["https://example.com/comment1.jpg"]
}
```

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "c-xxx",
    "userId": "user-xxx",
    "userNickname": "旅行者",
    "userAvatar": "https://example.com/avatar.jpg",
    "poiId": "poi-1",
    "rating": 5,
    "content": "青城山真的太美了！",
    "images": ["https://example.com/comment1.jpg"],
    "createdAt": "2024-03-18T10:30:00Z",
    "helpfulCount": 0
  }
}
```

---

### 8.2 获取评论列表
**接口地址**: `GET /api/comment/list`

**认证**: 需要

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| poiId | string | 是 | 景点ID |
| sort | string | 否 | 排序方式 (time/rating)，默认time |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认20 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "c-1",
        "userId": "u-1",
        "userNickname": "旅行达人小李",
        "userAvatar": "https://example.com/avatar1.jpg",
        "poiId": "poi-1",
        "rating": 5,
        "content": "青城山真的太美了！",
        "images": ["https://example.com/c1.jpg"],
        "createdAt": "2024-03-12T14:30:00Z",
        "helpfulCount": 28
      }
    ],
    "total": 50,
    "stats": {
      "avgRating": 4.5,
      "total": 50,
      "distribution": {
        "5": 30,
        "4": 15,
        "3": 3,
        "2": 1,
        "1": 1
      }
    }
  }
}
```

---

## 九、内容模块 (Content)

### 9.1 获取推荐内容
**接口地址**: `GET /api/content/recommend`

**认证**: 需要

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| category | string | 否 | 内容分类 |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "content-1",
        "title": "成都三日游完全攻略",
        "cover": "https://example.com/cover1.jpg",
        "summary": "带你玩转成都，从美食到景点一网打尽",
        "category": "culture",
        "tags": ["成都", "攻略", "美食"],
        "viewCount": 12800,
        "likeCount": 890,
        "createdAt": "2024-03-01"
      }
    ],
    "total": 20
  }
}
```

---

### 9.2 获取内容详情
**接口地址**: `GET /api/content/:id`

**认证**: 需要

**路径参数**:
| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | string | 内容ID |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "content-1",
    "title": "成都三日游完全攻略",
    "cover": "https://example.com/cover1.jpg",
    "summary": "带你玩转成都...",
    "body": "<p>成都，一座来了就不想走的城市...</p>",
    "category": "culture",
    "tags": ["成都", "攻略", "美食"],
    "viewCount": 12800,
    "likeCount": 890,
    "videoUrl": null,
    "relatedPoiIds": ["poi-3", "poi-4"],
    "createdAt": "2024-03-01"
  }
}
```

---

### 9.3 记录浏览
**接口地址**: `POST /api/content/:id/view`

**认证**: 需要

**路径参数**:
| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | string | 内容ID |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

## 十、搜索模块 (Search)

### 10.1 综合搜索
**接口地址**: `GET /api/search`

**认证**: 需要

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| keyword | string | 是 | 搜索关键词 |
| type | string | 否 | 搜索类型 (all/poi/route/content)，默认all |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "pois": [
      {
        "id": "poi-1",
        "name": "外滩",
        "category": "scenery",
        "rating": 4.8
      }
    ],
    "routes": [
      {
        "id": "route-1",
        "title": "上海经典两日游",
        "days": 2
      }
    ],
    "contents": [
      {
        "id": "content-1",
        "title": "成都三日游完全攻略",
        "summary": "..."
      }
    ],
    "total": 10
  }
}
```

---

### 10.2 搜索联想
**接口地址**: `GET /api/search/suggest`

**认证**: 需要

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| keyword | string | 是 | 搜索关键词 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": [
    { "keyword": "外滩", "type": "poi" },
    { "keyword": "外滩夜景", "type": "poi" }
  ]
}
```

---

## 十一、消息模块 (Message)

### 11.1 获取消息列表
**接口地址**: `GET /api/message/list`

**认证**: 需要

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页数量，默认10 |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "msg-1",
        "type": "system",
        "title": "欢迎使用文旅导览",
        "content": "感谢您使用文旅智慧导览小程序",
        "isRead": false,
        "createdAt": "2024-03-18T09:00:00Z"
      }
    ],
    "total": 10,
    "unread": 2
  }
}
```

---

### 11.2 标记消息已读
**接口地址**: `POST /api/message/:id/read`

**认证**: 需要

**路径参数**:
| 参数名 | 类型 | 说明 |
|--------|------|------|
| id | string | 消息ID |

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

### 11.3 全部已读
**接口地址**: `POST /api/message/read-all`

**认证**: 需要

**响应示例**:
```json
{
  "code": 0,
  "message": "success",
  "data": null
}
```

---

## 十二、接口总览

| 模块 | 接口数 | 认证 |
|------|--------|------|
| 用户 (User) | 4 | 部分需要 |
| 景点 (POI) | 4 | 需要 |
| 路线 (Route) | 5 | 需要 |
| 打卡 (Check) | 2 | 需要 |
| 评论 (Comment) | 2 | 需要 |
| 内容 (Content) | 3 | 需要 |
| 搜索 (Search) | 2 | 需要 |
| 消息 (Message) | 3 | 需要 |
| **总计** | **25** | |

---

## 十三、接口变更记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0.0 | 2024-03-18 | 初始版本 |
