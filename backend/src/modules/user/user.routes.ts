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

// 获取用户统计数据
router.get('/stats', requiredAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId

    // 并行查询各项统计数据
    const [checkCount, routeCount, commentCount, favoriteCount] = await Promise.all([
      // 打卡总次数
      prisma.checkInfo.count({ where: { userId } }),
      // 路线总数
      prisma.route.count({ where: { userId, status: 1 } }),
      // 评论总数
      prisma.commentInfo.count({ where: { userId } }),
      // 收藏总数
      prisma.userFavorite.count({ where: { userId } }),
    ])

    // 查询最近打卡记录（用于计算天数）
    const recentChecks = await prisma.checkInfo.findMany({
      where: { userId },
      orderBy: { checkTime: 'desc' },
      take: 30,
      select: {
        dayTag: true,
        createdAt: true
      }
    })

    // 计算去重打卡天数
    const uniqueDays = new Set(
      recentChecks.map(c => {
        const d = c.dayTag instanceof Date ? c.dayTag : new Date(c.dayTag as any)
        return d.toISOString().split('T')[0]
      })
    )

    // 计算活跃天数（过去30天内）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const activeDays30d = recentChecks.filter(c =>
      c.createdAt >= thirtyDaysAgo
    ).length

    res.json({
      code: 0,
      message: 'success',
      data: {
        checkCount,      // 打卡总次数
        routeCount,     // 路线总数
        commentCount,    // 评论总数
        favoriteCount,  // 收藏总数
        checkDays: uniqueDays.size,  // 打卡天数（去重）
        activeDays30d,   // 近30天活跃天数
      }
    })
  } catch (error) {
    next(error)
  }
})

export default router
