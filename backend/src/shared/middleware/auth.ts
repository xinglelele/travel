import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env'
import { prisma } from '../../config'

export interface AuthPayload {
  userId: number
  type: 'anonymous' | 'registered'
}

/**
 * 必须登录中间件 - 用户必须已登录才能访问
 * 如果未登录返回 401
 */
export function requiredAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ code: 401, message: '请先登录', data: null })
    return
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, env.jwt.secret) as AuthPayload
    ;(req as any).userId = decoded.userId
    ;(req as any).userType = decoded.type
    next()
  } catch {
    res.status(401).json({ code: 401, message: '登录已过期，请重新登录', data: null })
  }
}

/**
 * 可选认证中间件 - 登录可选，不影响匿名访问
 * 如果有Token则解析用户信息，没有则继续
 * 适用于：个性化推荐、AI规划（匿名用户限制次数）
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // 没有Token，设置为匿名状态
    ;(req as any).userId = null
    ;(req as any).userType = 'anonymous'
    next()
    return
  }

  const token = authHeader.substring(7)

  try {
    const decoded = jwt.verify(token, env.jwt.secret) as AuthPayload
    ;(req as any).userId = decoded.userId
    ;(req as any).userType = decoded.type
    next()
  } catch {
    // Token无效，设置为匿名状态
    ;(req as any).userId = null
    ;(req as any).userType = 'anonymous'
    next()
  }
}

/**
 * 生成用户Token
 * @param userId 用户ID
 * @param type 用户类型：anonymous | registered
 * @param expiresIn 过期时间，默认7天（正式用户）/ 30天（匿名用户）
 */
export function generateToken(userId: number, type: 'anonymous' | 'registered', expiresIn?: string): string {
  const defaultExpiresIn = type === 'anonymous' ? '30d' : '7d'
  return jwt.sign(
    { userId, type },
    env.jwt.secret,
    { expiresIn: expiresIn || defaultExpiresIn } as jwt.SignOptions
  )
}

/**
 * 验证Token并返回Payload
 */
export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, env.jwt.secret) as AuthPayload
  } catch {
    return null
  }
}
