import { Router } from 'express'
import { checkController } from './check.controller'
import { requiredAuth } from '../../shared/middleware/auth'

const router = Router()

// =============================================
// 必须登录接口（需要认证）
// =============================================

// 创建打卡记录
router.post('/create', requiredAuth, checkController.create.bind(checkController))

// 获取我的打卡记录
router.get('/my', requiredAuth, checkController.myList.bind(checkController))

// 校验用户是否已打卡某景点（用于评论前置校验）
router.get('/verify/:poiId', requiredAuth, checkController.verifyCheckIn.bind(checkController))

export default router
