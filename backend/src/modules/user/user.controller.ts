import { Request, Response, NextFunction } from 'express'
import { successResponse, errorResponse } from '../../shared/utils/response'
import { userService } from './user.service'

class UserController {
  /**
   * 匿名登录
   * POST /api/user/anonymous
   */
  async anonymousLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { openid } = req.body
      const result = await userService.anonymousLogin(openid)
      return successResponse(res, result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * 微信登录
   * POST /api/user/wechat-login
   */
  async wechatLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.body
      if (!code) {
        return errorResponse(res, '缺少code参数', 400)
      }

      const result = await userService.wechatLogin(code)
      return successResponse(res, result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * 手机号登录
   * POST /api/user/phone-login
   */
  async phoneLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const phone = String(req.body.phone ?? '').trim()
      const { password, code } = req.body
      if (!phone) {
        return errorResponse(res, '请输入手机号', 400)
      }
      if (!password) {
        return errorResponse(res, '请输入密码', 400)
      }

      const result = await userService.phoneLogin(phone, password, code)
      if (!result.success) {
        return errorResponse(res, result.message, 400)
      }
      return successResponse(res, {
        token: result.token,
        userId: result.userId,
        message: result.message,
        isNewUser: result.isNewUser ?? false,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 发送验证码
   * POST /api/user/send-code
   */
  async sendCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, type } = req.body
      if (!phone) {
        return errorResponse(res, '请输入手机号', 400)
      }
      if (!['bind', 'login', 'reset'].includes(type)) {
        return errorResponse(res, '无效的验证码类型', 400)
      }

      const result = await userService.sendCode(phone, type)
      if (!result.success) {
        return errorResponse(res, result.message, 400)
      }
      return successResponse(res, { message: result.message })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 绑定手机号（匿名用户升级）
   * POST /api/user/bind-phone
   */
  async bindPhone(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId
      const { phone, code, password } = req.body

      if (!phone) {
        return errorResponse(res, '请输入手机号', 400)
      }
      if (!code) {
        return errorResponse(res, '请输入验证码', 400)
      }

      const result = await userService.bindPhone(userId, phone, code, password)
      if (!result.success) {
        return errorResponse(res, result.message, 400)
      }

      return successResponse(res, {
        token: result.token,
        message: result.message,
        merged: result.merged || false,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 关联微信
   * POST /api/user/bind-wechat
   */
  async bindWechat(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId
      const { code } = req.body

      if (!code) {
        return errorResponse(res, '缺少code参数', 400)
      }

      const result = await userService.bindWechat(userId, code)
      if (!result.success) {
        return errorResponse(res, result.message, 400)
      }

      return successResponse(res, {
        message: result.message,
        merged: result.merged || false,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取用户信息
   * GET /api/user/profile
   */
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId
      const user = await userService.getProfile(userId)

      if (!user) {
        return errorResponse(res, '用户不存在', 404)
      }

      return successResponse(res, user)
    } catch (error) {
      next(error)
    }
  }

  /**
   * 更新用户信息
   * PUT /api/user/profile
   */
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId
      const { nickname, avatar, gender, locale } = req.body

      const user = await userService.updateProfile(userId, {
        nickname,
        avatar,
        gender,
        locale,
      })

      return successResponse(res, user)
    } catch (error) {
      next(error)
    }
  }

  /**
   * 设置/更新偏好
   * POST /api/user/preference
   */
  async setPreference(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId
      const { fromRegion, preferenceTags } = req.body

      const preference = await userService.setPreference(userId, {
        fromRegion,
        preferenceTags,
      })

      return successResponse(res, preference)
    } catch (error) {
      next(error)
    }
  }

  /**
   * 重置密码
   * POST /api/user/reset-password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, code, newPassword } = req.body

      if (!phone) {
        return errorResponse(res, '请输入手机号', 400)
      }
      if (!code) {
        return errorResponse(res, '请输入验证码', 400)
      }
      if (!newPassword) {
        return errorResponse(res, '请输入新密码', 400)
      }

      const result = await userService.resetPassword(phone, code, newPassword)
      if (!result.success) {
        return errorResponse(res, result.message, 400)
      }

      return successResponse(res, { message: result.message })
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取AI规划剩余次数
   * GET /api/user/ai-plan/count
   */
  async getAiPlanCount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId
      const user = await userService.getProfile(userId)

      if (!user) {
        return errorResponse(res, '用户不存在', 404)
      }

      return successResponse(res, {
        remaining: user.aiPlanRemaining,
        isAnonymous: user.isAnonymous,
      })
    } catch (error) {
      next(error)
    }
  }
}

export const userController = new UserController()
