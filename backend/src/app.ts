import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { errorHandler } from './shared/middleware/errorHandler'

import userRoutes from './modules/user/user.routes'
import poiRoutes from './modules/poi/poi.routes'
import routeRoutes from './modules/route/route.routes'
import messageRoutes from './modules/message/message.routes'
import contentRoutes from './modules/content/content.routes'
import searchRoutes from './modules/search/search.routes'
import checkRoutes from './modules/check/check.routes'
import commentRoutes from './modules/comment/comment.routes'
import favoriteRoutes from './modules/favorite/favorite.routes'
import uploadRoutes from './modules/common/upload.routes'

// 确保 uploads 目录存在（供静态文件和上传共用）
const UPLOAD_DIR = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

export function createApp(): Express {
  const app = express()

  // 中间件
  app.use(cors())
  app.use(express.json())

  // 静态文件（图片直接访问）
  app.use('/uploads', express.static(UPLOAD_DIR))

  // 健康检查
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // API 路由
  app.use('/api/user', userRoutes)
  app.use('/api/poi', poiRoutes)
  app.use('/api/route', routeRoutes)
  app.use('/api/message', messageRoutes)
  app.use('/api/content', contentRoutes)
  app.use('/api/search', searchRoutes)
  app.use('/api/check', checkRoutes)
  app.use('/api/comment', commentRoutes)
  app.use('/api/favorite', favoriteRoutes)
  app.use('/api/common', uploadRoutes)

  // 错误处理
  app.use(errorHandler)

  return app
}
