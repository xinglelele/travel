import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { errorHandler } from './shared/middleware/errorHandler'

import userRoutes from './modules/user/user.routes'
import poiRoutes from './modules/poi/poi.routes'
import routeRoutes from './modules/route/route.routes'
import messageRoutes from './modules/message/message.routes'
import contentRoutes from './modules/content/content.routes'
import searchRoutes from './modules/search/search.routes'

export function createApp(): Express {
  const app = express()

  // 中间件
  app.use(helmet())
  app.use(cors())
  app.use(express.json())

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

  // 错误处理
  app.use(errorHandler)

  return app
}
