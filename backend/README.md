# 智慧旅游平台后端项目创建指南

## 一、项目初始化

### 1.1 创建后端项目目录

```bash
# 进入项目根目录
cd c:\Users\zheng\Desktop\school\gradDesign\code_second

# 创建后端目录
mkdir backend

# 进入后端目录
cd backend
```

### 1.2 初始化 Node.js 项目

```bash
# 初始化项目
npm init -y

# 安装生产依赖
npm install express cors helmet dotenv jsonwebtoken bcryptjs winston uuid @prisma/client

# 安装开发依赖
npm install -D typescript ts-node @types/node @types/express @types/cors @types/jsonwebtoken @types/bcryptjs @types/uuid prisma

# 全局安装 ts-node-dev（方便开发）
npm install -g ts-node-dev
```

### 1.3 初始化 TypeScript

```bash
npx tsc --init
```

创建 `tsconfig.json` 配置：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 二、Prisma 配置

### 2.1 初始化 Prisma

```bash
npx prisma init
```

### 2.2 配置 .env 文件

创建 `.env` 文件：

```env
# 应用配置
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000

# 数据库配置（MySQL 8.0.30）
DB_HOST=localhost
DB_PORT=3306
DB_NAME=shanghai_tourism_db
DB_USER=root
DB_PASSWORD=your_password

# JWT配置
JWT_SECRET=your_jwt_secret_min_32_chars_here
JWT_EXPIRES_IN=7d

# 微信配置
WECHAT_APPID=wx_your_appid
WECHAT_SECRET=your_app_secret

# AI服务配置
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4

# 高德地图配置
AMAP_KEY=your_amap_key
```

### 2.3 创建 Prisma Schema

创建 `prisma/schema.prisma`（从数据库设计文档复制）

### 2.4 生成 Prisma Client

```bash
# 生成客户端
npx prisma generate

# 推送数据库结构（首次）
npx prisma db push
```

---

## 三、项目目录结构

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts       # Prisma 客户端
│   │   ├── env.ts           # 环境变量
│   │   └── index.ts
│   │
│   ├── modules/              # 业务模块
│   │   ├── user/
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   └── user.routes.ts
│   │   │
│   │   ├── poi/
│   │   │   ├── poi.controller.ts
│   │   │   ├── poi.service.ts
│   │   │   └── poi.routes.ts
│   │   │
│   │   ├── route/
│   │   ├── check/
│   │   ├── comment/
│   │   ├── content/
│   │   ├── search/
│   │   └── message/
│   │
│   ├── shared/
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── logger.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── response.ts
│   │   │   ├── i18n.ts
│   │   │   └── validation.ts
│   │   │
│   │   └── types/
│   │       └── index.ts
│   │
│   ├── ai/
│   │   └── openai.ts
│   │
│   ├── external/
│   │   ├── wechat.ts
│   │   └── amap.ts
│   │
│   ├── app.ts               # 应用入口
│   └── server.ts            # 服务启动
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── .env
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 四、核心代码示例

### 4.1 配置文件

```typescript
// src/config/env.ts
import dotenv from 'dotenv'

dotenv.config()

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME || 'shanghai_tourism_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXIRES_IN || '7d',
  },

  wechat: {
    appid: process.env.WECHAT_APPID || '',
    secret: process.env.WECHAT_SECRET || '',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
  },

  amap: {
    key: process.env.AMAP_KEY || '',
  },
}
```

```typescript
// src/config/database.ts
import { PrismaClient } from '@prisma/client'
import { env } from './env'

const prisma = new PrismaClient({
  log: env.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

export default prisma
```

### 4.2 应用入口

```typescript
// src/app.ts
import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env'
import { errorHandler } from './shared/middleware/errorHandler'
import { logger } from './shared/middleware/logger'

// 路由导入
import userRoutes from './modules/user/user.routes'
import poiRoutes from './modules/poi/poi.routes'
import routeRoutes from './modules/route/route.routes'
import checkRoutes from './modules/check/check.routes'
import commentRoutes from './modules/comment/comment.routes'
import contentRoutes from './modules/content/content.routes'
import searchRoutes from './modules/search/search.routes'
import messageRoutes from './modules/message/message.routes'

export function createApp(): Express {
  const app = express()

  // 中间件
  app.use(helmet())
  app.use(cors())
  app.use(express.json())
  app.use(logger)

  // 健康检查
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // API 路由
  app.use('/api/user', userRoutes)
  app.use('/api/poi', poiRoutes)
  app.use('/api/route', routeRoutes)
  app.use('/api/check', checkRoutes)
  app.use('/api/comment', commentRoutes)
  app.use('/api/content', contentRoutes)
  app.use('/api/search', searchRoutes)
  app.use('/api/message', messageRoutes)

  // 错误处理
  app.use(errorHandler)

  return app
}
```

```typescript
// src/server.ts
import { createApp } from './app'
import { env } from './config/env'
import prisma from './config/database'

async function main() {
  const app = createApp()

  // 测试数据库连接
  try {
    await prisma.$connect()
    console.log('✅ Database connected')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }

  app.listen(env.port, () => {
    console.log(`🚀 Server running at http://localhost:${env.port}`)
  })
}

main().catch((error) => {
  console.error('Server error:', error)
  process.exit(1)
})
```

### 4.3 用户控制器示例

```typescript
// src/modules/user/user.controller.ts
import { Request, Response, NextFunction } from 'express'
import { userService } from './user.service'
import { successResponse, errorResponse } from '../../shared/utils/response'

export class UserController {
  // 微信登录
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.body
      if (!code) {
        return errorResponse(res, '缺少code参数', 400)
      }

      const result = await userService.wechatLogin(code)
      successResponse(res, result)
    } catch (error) {
      next(error)
    }
  }

  // 获取用户信息
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId
      const result = await userService.getUserProfile(userId)
      successResponse(res, result)
    } catch (error) {
      next(error)
    }
  }

  // 更新偏好设置
  async updatePreference(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId
      const { fromRegion, preferenceTags } = req.body
      const result = await userService.updatePreference(userId, fromRegion, preferenceTags)
      successResponse(res, result)
    } catch (error) {
      next(error)
    }
  }
}

export const userController = new UserController()
```

### 4.4 用户服务示例

```typescript
// src/modules/user/user.service.ts
import prisma from '../../config/database'
import { env } from '../../config/env'
import { wechatService } from '../../external/wechat'
import jwt from 'jsonwebtoken'

export class UserService {
  // 微信登录
  async wechatLogin(code: string) {
    // 1. 通过 code 换取 openid
    const wechatUser = await wechatService.getSessionKey(code)
    const { openid } = wechatUser

    // 2. 查询或创建用户
    let user = await prisma.user.findUnique({
      where: { openid },
      include: { preference: true }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          openid,
          locale: 'zh-CN'
        },
        include: { preference: true }
      })
    }

    // 3. 生成 JWT Token
    const token = jwt.sign(
      { userId: user.id, type: 'user' },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn }
    )

    return {
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        locale: user.locale,
        hasCompletedOnboarding: user.preference?.hasCompletedOnboarding ?? false
      }
    }
  }

  // 获取用户资料
  async getUserProfile(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        preference: {
          include: { }
        }
      }
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    return {
      id: user.id,
      tel: user.tel,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      locale: user.locale,
      preference: user.preference ? {
        fromRegion: user.preference.fromRegion,
        preferenceTags: user.preference.preferenceTags,
        hasCompletedOnboarding: user.preference.hasCompletedOnboarding
      } : null
    }
  }

  // 更新偏好设置
  async updatePreference(userId: number, fromRegion: number, preferenceTags: object) {
    const preference = await prisma.userPreference.upsert({
      where: { userId },
      update: { fromRegion, preferenceTags },
      create: {
        userId,
        fromRegion,
        preferenceTags,
        hasCompletedOnboarding: 1
      }
    })

    return preference
  }
}

export const userService = new UserService()
```

### 4.5 路由配置

```typescript
// src/modules/user/user.routes.ts
import { Router } from 'express'
import { userController } from './user.controller'
import { authMiddleware } from '../../shared/middleware/auth'

const router = Router()

// 登录
router.post('/login', userController.login.bind(userController))

// 需要认证的接口
router.get('/profile', authMiddleware, userController.getProfile.bind(userController))
router.put('/profile', authMiddleware, userController.updateProfile.bind(userController))
router.post('/preference', authMiddleware, userController.updatePreference.bind(userController))

export default router
```

### 4.6 认证中间件

```typescript
// src/shared/middleware/auth.ts
import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录', data: null })
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, env.jwt.secret) as { userId: number; type: string }
    ;(req as any).userId = decoded.userId
    ;(req as any).userType = decoded.type
    next()
  } catch (error) {
    return res.status(401).json({ code: 401, message: '登录已过期', data: null })
  }
}
```

### 4.7 统一响应

```typescript
// src/shared/utils/response.ts
import { Response } from 'express'

interface ApiResponse {
  code: number
  message: string
  data: unknown
}

export function successResponse(res: Response, data: unknown, message = '成功') {
  const response: ApiResponse = { code: 0, message, data }
  return res.json(response)
}

export function errorResponse(res: Response, message: string, code = -1) {
  const response: ApiResponse = { code, message, data: null }
  return res.status(400).json(response)
}
```

---

## 五、前端联调配置

### 5.1 修改前端请求配置

修改 `user/src/api/request.ts`：

```typescript
import { mockRequest } from '../../mock/index'

/** true = mock 模式，false = 请求真实接口 */
const USE_MOCK = false  // 改为 false 启用真实接口

const BASE_URL = 'http://localhost:3000'  // 后端地址
```

### 5.2 本地开发联调

**方式一：H5 开发**
```bash
# 后端启动
cd backend
npx ts-node-dev --respawn --transpile-only src/server.ts

# 前端启动（H5）
cd user
npm run dev:h5
```

**方式二：微信小程序开发**
```bash
# 后端启动
cd backend
npx ts-node-dev --respawn --transpile-only src/server.ts

# 前端启动（微信小程序）
cd user
npm run dev:mp-weixin
```

### 5.3 跨域问题处理

开发环境下，后端已配置 CORS：
```typescript
app.use(cors({
  origin: '*',  // 生产环境应改为具体域名
  credentials: true
}))
```

---

## 六、启动命令

### 6.1 开发环境

```bash
# 方式一：使用 ts-node-dev（推荐）
npx ts-node-dev --respawn --transpile-only src/server.ts

# 方式二：使用 nodemon
npx nodemon --exec ts-node src/server.ts

# 方式三：先编译再运行
npx tsc
node dist/server.js
```

### 6.2 生产环境

```bash
# 编译
npm run build

# 启动
npm start
```

---

## 七、常用命令

```bash
# Prisma 命令
npx prisma generate      # 生成客户端
npx prisma db push       # 推送结构到数据库
npx prisma migrate dev   # 创建迁移
npx prisma studio        # 可视化数据库

# TypeScript 编译
npx tsc                  # 编译
npx tsc --watch          # 监听模式
```

---

## 八、注意事项

1. **数据库连接**：确保 MySQL 服务已启动，`shanghai_tourism_db` 数据库已创建
2. **环境变量**：复制 `.env.example` 为 `.env` 并配置
3. **微信登录**：开发阶段可先注释微信登录逻辑，使用测试 openid
4. **CORS**：生产环境需要配置允许的域名
