import { prisma } from '../../config'
import { generateToken } from '../../shared/middleware/auth'
import { smsService } from '../../shared/services/sms.service'
import bcrypt from 'bcryptjs'

/**
 * 注册类型枚举
 */
export enum RegisterType {
  Anonymous = 0,
  Wechat = 1,
  Phone = 2,
  WechatPhone = 3,
}

/**
 * AI规划次数配置
 */
const AI_PLAN_LIMITS = {
  [RegisterType.Anonymous]: 3,
  [RegisterType.Wechat]: 5,
  [RegisterType.Phone]: 5,
  [RegisterType.WechatPhone]: 5,
}

/**
 * 用户服务
 */
export class UserService {
  /**
   * 匿名登录/注册
   * @param openid 可选的openid，用于保持会话
   */
  async anonymousLogin(openid?: string): Promise<{
    token: string
    userId: number
    isAnonymous: boolean
    aiPlanRemaining: number
  }> {
    // 使用提供的openid或生成新的
    const aoi = openid || `anon_${Date.now()}_${Math.random().toString(36).substring(2)}`

    // 查询或创建用户
    let user = await prisma.user.findUnique({
      where: { openid: aoi },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          openid: aoi,
          locale: 'zh-CN',
          registerType: RegisterType.Anonymous,
          aiPlanCount: AI_PLAN_LIMITS[RegisterType.Anonymous],
        },
      })
    }

    // 生成Token
    const token = generateToken(user.id, 'anonymous')

    return {
      token,
      userId: user.id,
      isAnonymous: user.registerType === RegisterType.Anonymous,
      aiPlanRemaining: user.aiPlanCount,
    }
  }

  /**
   * 微信登录
   * @param code 微信授权code
   */
  async wechatLogin(code: string): Promise<{
    token: string
    userId: number
    isAnonymous: boolean
    isNewUser: boolean
    needPhoneBind: boolean
    aiPlanRemaining: number
  }> {
    // 模拟微信登录（实际需调用微信API）
    const openid = `wechat_${code}`

    // 查询用户
    let user = await prisma.user.findUnique({
      where: { openid },
    })

    const isNewUser = !user

    if (!user) {
      // 新用户，创建账号
      user = await prisma.user.create({
        data: {
          openid,
          locale: 'zh-CN',
          registerType: RegisterType.Wechat,
          aiPlanCount: AI_PLAN_LIMITS[RegisterType.Wechat],
        },
      })
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // 生成Token
    const token = generateToken(user.id, 'registered')

    // 判断是否需要绑定手机号
    const needPhoneBind = !user.tel

    return {
      token,
      userId: user.id,
      isAnonymous: false,
      isNewUser,
      needPhoneBind,
      aiPlanRemaining: user.aiPlanCount,
    }
  }

  /**
   * 手机号登录/注册
   * @param phone 手机号
   * @param password 密码
   * @param code 验证码（可选，用于注册）
   */
  async phoneLogin(
    phone: string,
    password: string,
    code?: string
  ): Promise<{
    success: boolean
    token?: string
    userId?: number
    message: string
    needPassword?: boolean
  }> {
    // 查询用户
    let user = await prisma.user.findUnique({
      where: { tel: phone },
    })

    if (user) {
      // 用户存在，验证密码
      if (!user.password) {
        return {
          success: false,
          message: '该手机号未设置密码，请先设置密码',
          needPassword: true,
        }
      }

      const isValid = await bcrypt.compare(password, user.password)
      if (!isValid) {
        return { success: false, message: '密码错误' }
      }

      // 更新登录时间
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })

      const token = generateToken(user.id, 'registered')
      return {
        success: true,
        token,
        userId: user.id,
        message: '登录成功',
      }
    } else {
      // 用户不存在，需要验证码注册
      if (!code) {
        return {
          success: false,
          message: '请输入验证码',
        }
      }

      // 验证验证码
      const verifyResult = await smsService.verifyCode(phone, code, 'login')
      if (!verifyResult.valid) {
        return { success: false, message: verifyResult.message }
      }

      // 创建新用户
      const hashedPassword = await bcrypt.hash(password, 10)
      user = await prisma.user.create({
        data: {
          tel: phone,
          openid: `phone_${phone}_${Date.now()}`,
          password: hashedPassword,
          registerType: RegisterType.Phone,
          aiPlanCount: AI_PLAN_LIMITS[RegisterType.Phone],
        },
      })

      const token = generateToken(user.id, 'registered')
      return {
        success: true,
        token,
        userId: user.id,
        message: '注册成功',
      }
    }
  }

  /**
   * 发送验证码
   */
  async sendCode(phone: string, type: 'bind' | 'login' | 'reset'): Promise<{
    success: boolean
    message: string
  }> {
    return await smsService.sendCode(phone, type)
  }

  /**
   * 绑定手机号（匿名用户升级）
   * @param userId 当前用户ID
   * @param phone 手机号
   * @param code 验证码
   * @param password 密码（可选）
   */
  async bindPhone(
    userId: number,
    phone: string,
    code: string,
    password?: string
  ): Promise<{
    success: boolean
    token?: string
    message: string
    merged?: boolean
  }> {
    // 验证验证码
    const verifyResult = await smsService.verifyCode(phone, code, 'bind')
    if (!verifyResult.valid) {
      return { success: false, message: verifyResult.message }
    }

    // 获取当前用户
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!currentUser) {
      return { success: false, message: '用户不存在' }
    }

    // 检查手机号是否已被其他账号使用
    const existingUser = await prisma.user.findUnique({
      where: { tel: phone },
    })

    if (existingUser && existingUser.id !== userId) {
      // 需要合并账号
      const mergeResult = await this.mergeAccounts(userId, existingUser.id, phone, password)
      if (mergeResult.success) {
        return {
          success: true,
          token: mergeResult.token,
          message: '绑定成功，已合并账号数据',
          merged: true,
        }
      }
      return { success: false, message: mergeResult.message }
    }

    // 更新用户信息
    const updateData: any = {
      tel: phone,
      registerType: currentUser.openid.startsWith('wechat_')
        ? RegisterType.WechatPhone
        : RegisterType.Phone,
      aiPlanCount: AI_PLAN_LIMITS[
        currentUser.openid.startsWith('wechat_')
          ? RegisterType.WechatPhone
          : RegisterType.Phone
      ],
    }

    // 如果提供了密码，添加密码
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    })

    // 生成新Token
    const token = generateToken(userId, 'registered')

    return {
      success: true,
      token,
      message: '绑定成功',
    }
  }

  /**
   * 关联微信（手机用户绑定微信）
   * @param userId 当前用户ID
   * @param wechatCode 微信授权code
   */
  async bindWechat(
    userId: number,
    wechatCode: string
  ): Promise<{
    success: boolean
    message: string
    merged?: boolean
  }> {
    // 获取当前用户
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!currentUser) {
      return { success: false, message: '用户不存在' }
    }

    // 模拟获取微信openid
    const wechatOpenid = `wechat_${wechatCode}`

    // 检查微信账号是否已被其他用户使用
    const wechatUser = await prisma.user.findUnique({
      where: { openid: wechatOpenid },
    })

    if (wechatUser && wechatUser.id !== userId) {
      // 需要合并账号
      const mergeResult = await this.mergeAccounts(userId, wechatUser.id, undefined, undefined, wechatOpenid)
      if (mergeResult.success) {
        return {
          success: true,
          message: '关联成功，已合并账号数据',
          merged: true,
        }
      }
      return { success: false, message: mergeResult.message }
    }

    // 更新用户openid
    await prisma.user.update({
      where: { id: userId },
      data: {
        openid: wechatOpenid,
        registerType: currentUser.tel
          ? RegisterType.WechatPhone
          : RegisterType.Wechat,
      },
    })

    return {
      success: true,
      message: '关联成功',
    }
  }

  /**
   * 合并账号
   * 将 sourceUserId 的数据合并到 targetUserId
   */
  private async mergeAccounts(
    mainUserId: number,
    secondaryUserId: number,
    phone?: string,
    password?: string,
    wechatOpenid?: string
  ): Promise<{
    success: boolean
    token?: string
    message: string
  }> {
    const mainUser = await prisma.user.findUnique({
      where: { id: mainUserId },
    })
    const secondaryUser = await prisma.user.findUnique({
      where: { id: secondaryUserId },
    })

    if (!mainUser || !secondaryUser) {
      return { success: false, message: '用户不存在' }
    }

    // 合并规则：保留主账号的基本信息，合并其他数据
    const mergedData: any = {
      // 优先使用主账号的信息
      nickname: mainUser.nickname || secondaryUser.nickname,
      avatar: mainUser.avatar || secondaryUser.avatar,
      gender: mainUser.gender || secondaryUser.gender,
      locale: mainUser.locale,
      // 如果主账号没有手机号，使用副账号的
      tel: mainUser.tel || phone || secondaryUser.tel,
      // 如果主账号没有密码，使用副账号的
      password: mainUser.password || password || secondaryUser.password,
      // 如果主账号是匿名账号，使用副账号的openid
      openid: mainUser.openid.startsWith('anon_')
        ? (wechatOpenid || secondaryUser.openid)
        : mainUser.openid,
      // 更新注册类型
      registerType: this.calculateRegisterType(mainUser, secondaryUser),
      // 保留较高的AI规划次数
      aiPlanCount: Math.max(mainUser.aiPlanCount, secondaryUser.aiPlanCount),
    }

    // 更新主账号
    await prisma.user.update({
      where: { id: mainUserId },
      data: mergedData,
    })

    // 迁移副账号的业务数据到主账号
    // 1. 迁移路线
    await prisma.route.updateMany({
      where: { userId: secondaryUserId },
      data: { userId: mainUserId },
    })

    // 2. 迁移打卡记录
    await prisma.checkInfo.updateMany({
      where: { userId: secondaryUserId },
      data: { userId: mainUserId },
    })

    // 3. 迁移评论
    await prisma.commentInfo.updateMany({
      where: { userId: secondaryUserId },
      data: { userId: mainUserId },
    })

    // 4. 迁移消息
    await prisma.messageInfo.updateMany({
      where: { userId: secondaryUserId },
      data: { userId: mainUserId },
    })

    // 5. 迁移用户偏好
    const secondaryPreference = await prisma.userPreference.findUnique({
      where: { userId: secondaryUserId },
    })
    if (secondaryPreference) {
      const mainPreference = await prisma.userPreference.findUnique({
        where: { userId: mainUserId },
      })
      if (mainPreference) {
        // 合并偏好标签
        await prisma.userPreference.update({
          where: { userId: mainUserId },
          data: {
            preferenceTags: (mainPreference.preferenceTags || secondaryPreference.preferenceTags) ?? undefined,
            fromRegion: mainPreference.fromRegion || secondaryPreference.fromRegion,
            hasCompletedOnboarding:
              mainPreference.hasCompletedOnboarding || secondaryPreference.hasCompletedOnboarding,
          },
        })
      } else {
        // 主账号没有偏好，直接迁移
        await prisma.userPreference.update({
          where: { userId: secondaryUserId },
          data: { userId: mainUserId },
        })
      }
    }

    // 删除副账号
    await prisma.user.delete({
      where: { id: secondaryUserId },
    })

    // 生成新Token
    const token = generateToken(mainUserId, 'registered')

    return {
      success: true,
      token,
      message: '账号合并成功',
    }
  }

  /**
   * 计算合并后的注册类型
   */
  private calculateRegisterType(user1: any, user2: any): number {
    const hasWechat1 = user1.openid?.startsWith('wechat_')
    const hasWechat2 = user2.openid?.startsWith('wechat_')
    const hasPhone1 = !!user1.tel
    const hasPhone2 = !!user2.tel

    if ((hasWechat1 || hasWechat2) && (hasPhone1 || hasPhone2)) {
      return RegisterType.WechatPhone
    } else if (hasWechat1 || hasWechat2) {
      return RegisterType.Wechat
    } else {
      return RegisterType.Phone
    }
  }

  /**
   * 获取用户信息
   */
  async getProfile(userId: number): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { preference: true },
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      tel: user.tel,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      locale: user.locale,
      registerType: user.registerType,
      isAnonymous: user.registerType === RegisterType.Anonymous,
      aiPlanRemaining: user.aiPlanCount,
      preference: user.preference
        ? {
            fromRegion: user.preference.fromRegion,
            preferenceTags: user.preference.preferenceTags,
            hasCompletedOnboarding: user.preference.hasCompletedOnboarding,
          }
        : null,
      createdAt: user.createdAt,
    }
  }

  /**
   * 更新用户信息
   */
  async updateProfile(
    userId: number,
    data: {
      nickname?: string
      avatar?: string
      gender?: number
      locale?: string
    }
  ): Promise<any> {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    })

    return {
      id: user.id,
      tel: user.tel,
      nickname: user.nickname,
      avatar: user.avatar,
      gender: user.gender,
      locale: user.locale,
    }
  }

  /**
   * 设置/更新偏好
   */
  async setPreference(
    userId: number,
    data: { fromRegion?: number; preferenceTags?: any }
  ): Promise<any> {
    const preference = await prisma.userPreference.upsert({
      where: { userId },
      update: {
        ...data,
        hasCompletedOnboarding: 1,
      },
      create: {
        userId,
        fromRegion: data.fromRegion || 1,
        preferenceTags: data.preferenceTags,
        hasCompletedOnboarding: 1,
      },
    })

    return preference
  }

  /**
   * 消耗AI规划次数
   */
  async consumeAiPlan(userId: number): Promise<{ success: boolean; remaining: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return { success: false, remaining: 0 }
    }

    if (user.aiPlanCount <= 0) {
      return { success: false, remaining: 0 }
    }

    await prisma.user.update({
      where: { id: userId },
      data: { aiPlanCount: user.aiPlanCount - 1 },
    })

    return { success: true, remaining: user.aiPlanCount - 1 }
  }

  /**
   * 重置密码
   */
  async resetPassword(phone: string, code: string, newPassword: string): Promise<{
    success: boolean
    message: string
  }> {
    // 验证验证码
    const verifyResult = await smsService.verifyCode(phone, code, 'reset')
    if (!verifyResult.valid) {
      return { success: false, message: verifyResult.message }
    }

    // 更新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { tel: phone },
      data: { password: hashedPassword },
    })

    return { success: true, message: '密码重置成功' }
  }
}

export const userService = new UserService()
