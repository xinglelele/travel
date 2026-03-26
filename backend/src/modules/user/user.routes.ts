import { Router } from 'express'
import { userController } from './user.controller'
import { requiredAuth, optionalAuth } from '../../shared/middleware/auth'

const router = Router()

// =============================================
// 公共接口（无需认证）
// =============================================

// 匿名登录（自动创建账号，获取Token）
router.post('/anonymous', userController.anonymousLogin.bind(userController))

// 微信登录
router.post('/wechat-login', userController.wechatLogin.bind(userController))

// 手机号登录
router.post('/phone-login', userController.phoneLogin.bind(userController))

// 发送验证码（公共接口，但需要频率限制）
router.post('/send-code', userController.sendCode.bind(userController))

// 重置密码
router.post('/reset-password', userController.resetPassword.bind(userController))

// =============================================
// 可选认证接口（登录可选，不影响匿名访问）
// 适用于：个性化推荐、AI规划（匿名用户限制次数）
// =============================================

// 设置偏好（匿名/正式用户都可使用）
router.post('/preference', optionalAuth, userController.setPreference.bind(userController))

// =============================================
// 必须登录接口（需要认证）
// =============================================

// 绑定手机号（匿名用户升级为正式用户）
router.post('/bind-phone', requiredAuth, userController.bindPhone.bind(userController))

// 关联微信（手机用户绑定微信）
router.post('/bind-wechat', requiredAuth, userController.bindWechat.bind(userController))

// 获取用户信息
router.get('/profile', requiredAuth, userController.getProfile.bind(userController))

// 更新用户信息
router.put('/profile', requiredAuth, userController.updateProfile.bind(userController))

// 获取AI规划剩余次数
router.get('/ai-plan/count', requiredAuth, userController.getAiPlanCount.bind(userController))

export default router
