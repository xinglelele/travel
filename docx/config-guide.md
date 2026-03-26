# 项目配置指南

## 环境变量配置

### 1. 高德地图配置

**API Key**：`8929223e5d738fc0d2f2d875717fc56b`

#### 配置位置：
```
/utils/amap-config.js
```

#### 配置内容：
```javascript
export const AMAP_KEY = '8929223e5d738fc0d2f2d875717fc56b';
export const AMAP_SDK_VERSION = '1.2.0';
```

#### 使用方式：
```javascript
import { AMAP_KEY } from '../../utils/amap-config.js';
import amapFile from '../../libs/amap-wx.130.js';

const amapManager = new amapFile.AMapWX({
  key: AMAP_KEY
});
```

---

### 2. 微信小程序配置

#### 需要配置的信息：
- **AppID**：在微信公众平台获取
- **AppSecret**：在微信公众平台获取（后端使用）

#### 配置位置：
```
project.config.json
```

#### 配置示例：
```json
{
  "appid": "your_wechat_appid",
  "projectname": "smart-tourism-platform",
  "miniprogramRoot": "miniprogram/",
  "setting": {
    "urlCheck": true,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "minified": true
  }
}
```

---

### 3. 后端 API 配置

#### 配置位置：
```
/utils/api-config.js
```

#### 配置内容：
```javascript
// 开发环境
const DEV_API_BASE_URL = 'http://localhost:3000';

// 生产环境
const PROD_API_BASE_URL = 'https://api.your-domain.com';

export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? PROD_API_BASE_URL 
  : DEV_API_BASE_URL;

export const API_TIMEOUT = 10000; // 10秒超时
```

---

## 安全配置建议

### 1. API Key 安全

**当前配置**：
- 高德地图 Key：`8929223e5d738fc0d2f2d875717fc56b`
- 平台：微信小程序
- 限制：仅限绑定的小程序 AppID 使用

**安全措施**：
1. ✅ Key 已绑定微信小程序 AppID，防止其他应用盗用
2. ⚠️ 不要将 Key 提交到公开的 Git 仓库
3. ⚠️ 定期检查高德平台的调用量统计
4. ⚠️ 如发现异常调用，立即在高德平台重置 Key

### 2. 环境变量管理

**推荐方案**：
- 开发环境：使用 `.env.development` 文件
- 生产环境：使用 `.env.production` 文件
- 敏感信息：使用环境变量或密钥管理服务

**示例**：
```bash
# .env.development
AMAP_KEY=8929223e5d738fc0d2f2d875717fc56b
API_BASE_URL=http://localhost:3000

# .env.production
AMAP_KEY=8929223e5d738fc0d2f2d875717fc56b
API_BASE_URL=https://api.your-domain.com
```

### 3. Git 忽略配置

**创建 `.gitignore` 文件**：
```
# 环境变量文件
.env
.env.local
.env.development
.env.production

# 微信小程序配置
project.private.config.json

# 依赖
node_modules/

# 日志
*.log

# 临时文件
.DS_Store
```

---

## 配置检查清单

### 开发前检查

- [ ] 高德地图 Key 已配置：`8929223e5d738fc0d2f2d875717fc56b`
- [ ] 高德地图 SDK 已下载到 `/libs/amap-wx.130.js`
- [ ] 微信小程序 AppID 已配置到 `project.config.json`
- [ ] 后端 API 地址已配置到 `/utils/api-config.js`
- [ ] `.gitignore` 文件已创建，敏感信息已排除

### 部署前检查

- [ ] 生产环境 API 地址已更新
- [ ] 高德地图 Key 配额充足（查看高德平台控制台）
- [ ] 微信小程序已完成备案
- [ ] 服务器域名已添加到微信小程序后台的"服务器域名"白名单
- [ ] HTTPS 证书已配置

---

## 常见配置问题

### 1. 高德地图不显示

**问题**：地图组件空白

**排查步骤**：
1. 检查 Key 是否正确：`8929223e5d738fc0d2f2d875717fc56b`
2. 检查小程序 AppID 是否与高德平台绑定的一致
3. 检查 SDK 文件路径是否正确
4. 查看控制台是否有错误信息

### 2. API 请求失败

**问题**：调用后端接口返回错误

**排查步骤**：
1. 检查 API_BASE_URL 配置是否正确
2. 检查服务器域名是否在微信小程序后台白名单中
3. 检查后端服务是否正常运行
4. 查看网络请求日志

### 3. 定位失败

**问题**：无法获取用户位置

**排查步骤**：
1. 检查用户是否授权位置权限
2. 检查 `wx.getLocation()` 的 type 参数是否为 `gcj02`
3. 检查手机 GPS 是否开启
4. 查看微信开发者工具的调试信息

---

## 配置文件结构

```
smart-tourism-platform/
├── .env.example              # 环境变量示例文件
├── .gitignore               # Git 忽略配置
├── project.config.json      # 微信小程序配置
├── miniprogram/
│   ├── utils/
│   │   ├── amap-config.js   # 高德地图配置
│   │   └── api-config.js    # API 配置
│   └── libs/
│       └── amap-wx.130.js   # 高德地图 SDK
└── .kiro/
    └── specs/
        └── smart-tourism-platform/
            ├── config-guide.md      # 本配置指南
            └── amap-integration.md  # 高德地图集成文档
```

---

## 技术支持

### 高德地图
- 控制台：https://console.amap.com/
- 文档：https://lbs.amap.com/api/wx/summary
- 工单：https://lbs.amap.com/console/show/ticket

### 微信小程序
- 公众平台：https://mp.weixin.qq.com/
- 开发文档：https://developers.weixin.qq.com/miniprogram/dev/framework/
- 社区：https://developers.weixin.qq.com/community/minigame

