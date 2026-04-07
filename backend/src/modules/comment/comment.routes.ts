import { Router } from 'express'
import { commentController } from './comment.controller'
import { requiredAuth } from '../../shared/middleware/auth'

const router = Router()

// =============================================
// 必须登录接口（需要认证）
// =============================================

// 发表之前先检查是否有权限（点击"评论"按钮时调用）
router.get('/can', requiredAuth, commentController.can.bind(commentController))

// 发表评论（需先打卡校验）
router.post('/create', requiredAuth, commentController.create.bind(commentController))

// =============================================
// 公共接口（无需认证）
// =============================================

// 获取评论列表
router.get('/list', commentController.list.bind(commentController))

export default router
