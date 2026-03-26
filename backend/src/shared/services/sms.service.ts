import { prisma } from '../../config'
import { env } from '../../config/env'
import crypto from 'crypto'

/**
 * 短信验证码类型
 */
export type SmsCodeType = 'bind' | 'login' | 'reset'

/**
 * 短信发送结果
 */
interface SendResult {
  success: boolean
  message: string
  requestId?: string
}

/**
 * 短信服务
 * 支持阿里云短信、模拟模式
 */
export class SmsService {
  /**
   * 验证码有效期（秒）
   */
  private readonly EXPIRY_SECONDS = 5 * 60 // 5分钟

  /**
   * 验证码长度
   */
  private readonly CODE_LENGTH = 6

  /**
   * 每分钟发送次数限制
   */
  private readonly MINUTE_LIMIT = 1

  /**
   * 每天发送次数限制
   */
  private readonly DAILY_LIMIT = 10

  /**
   * 发送验证码
   * @param phone 手机号
   * @param type 验证码类型
   */
  async sendCode(phone: string, type: SmsCodeType): Promise<SendResult> {
    // 验证手机号格式
    if (!this.validatePhone(phone)) {
      return { success: false, message: '手机号格式不正确' }
    }

    // 检查发送频率限制
    const minuteCheck = await this.checkRateLimit(phone, 'minute')
    if (!minuteCheck.allowed) {
      return { success: false, message: `发送过于频繁，请${minuteCheck.waitSeconds || 60}秒后重试` }
    }

    const dailyCount = await this.getDailyCount(phone)
    if (dailyCount >= this.DAILY_LIMIT) {
      return { success: false, message: '今日发送次数已用完，请明天再试' }
    }

    // 生成验证码
    const code = this.generateCode()

    // 计算过期时间
    const expiredAt = new Date(Date.now() + this.EXPIRY_SECONDS * 1000)

    // 保存验证码到数据库
    await prisma.smsCode.create({
      data: {
        phone,
        code,
        type,
        expiredAt,
      },
    })

    // 发送短信
    if (env.sms.provider === 'aliyun') {
      const templateCode = this.getTemplateCode(type)
      return await this.sendViaAliyun(phone, code, templateCode)
    } else {
      // 模拟模式
      console.log(`[SMS Mock] 发送给 ${phone} 的验证码: ${code} (类型: ${type})`)
      return { success: true, message: '验证码已发送（模拟模式）' }
    }
  }

  /**
   * 验证验证码
   */
  async verifyCode(
    phone: string,
    code: string,
    type: SmsCodeType
  ): Promise<{ valid: boolean; message: string; userId?: number }> {
    // 验证手机号格式
    if (!this.validatePhone(phone)) {
      return { valid: false, message: '手机号格式不正确' }
    }

    // 验证验证码格式
    if (!/^\d{6}$/.test(code)) {
      return { valid: false, message: '验证码格式不正确' }
    }

    // 查询最新的未使用验证码
    const smsRecord = await prisma.smsCode.findFirst({
      where: {
        phone,
        code,
        type,
        used: 0,
        expiredAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!smsRecord) {
      return { valid: false, message: '验证码已过期或不存在' }
    }

    // 标记验证码已使用
    await prisma.smsCode.update({
      where: { id: smsRecord.id },
      data: { used: 1 },
    })

    // 如果是绑定类型，检查手机号是否已被占用
    if (type === 'bind') {
      const existingUser = await prisma.user.findUnique({ where: { tel: phone } })
      if (existingUser) {
        return {
          valid: false,
          message: '该手机号已被其他账号绑定',
          userId: existingUser.id,
        }
      }
    }

    // 查询手机号对应的用户
    const user = await prisma.user.findUnique({ where: { tel: phone } })

    return {
      valid: true,
      message: '验证成功',
      userId: user?.id,
    }
  }

  /**
   * 通过阿里云发送短信
   */
  private async sendViaAliyun(phone: string, code: string, templateCode: string): Promise<SendResult> {
    const { accessKey, accessSecret, signName } = env.sms

    if (!accessKey || !accessSecret) {
      console.warn('[SMS] 阿里云配置不完整，切换到模拟模式')
      console.log(`[SMS Mock] 发送给 ${phone} 的验证码: ${code}`)
      return { success: true, message: '验证码已发送' }
    }

    try {
      // 生成时间戳和随机数
      const timestamp = this.getTimestamp()
      const nonce = this.getNonce()

      // 业务参数
      const businessParams = {
        PhoneNumbers: phone,
        SignName: signName,
        TemplateCode: templateCode,
        TemplateParam: JSON.stringify({ code }),
      }

      // 公共参数（这些也要参与签名）
      const commonParams = {
        Format: 'JSON',
        Version: '2017-05-25',
        SignatureMethod: 'HMAC-SHA1',
        SignatureVersion: '1.0',
        SignatureNonce: nonce,
        AccessKeyId: accessKey,
        Timestamp: timestamp,
        Action: 'SendSms',
      }

      // 合并所有参数
      const allParams: Record<string, string> = { ...commonParams, ...businessParams }

      // 对所有参数进行签名
      const signature = await this.signRequest(allParams, accessSecret)

      // 构建 URL（签名单独作为 Signature 参数）
      const queryParams = new URLSearchParams()
      queryParams.set('Signature', signature)
      for (const [key, value] of Object.entries(allParams)) {
        queryParams.set(key, value)
      }
      const requestUrl = `https://dysmsapi.aliyuncs.com/?${queryParams.toString()}`

      const response = await fetch(requestUrl)
      const result = await response.json() as { Code?: string; Message?: string; RequestId?: string }

      if (result.Code === 'OK') {
        return {
          success: true,
          message: '验证码已发送',
          requestId: result.RequestId,
        }
      } else {
        console.error(`[SMS] 阿里云发送失败: ${result.Code} - ${result.Message}`)
        return {
          success: false,
          message: `短信发送失败: ${result.Message}`,
        }
      }
    } catch (error) {
      console.error('[SMS] 阿里云请求异常:', error)
      return {
        success: false,
        message: '短信服务异常，请稍后重试',
      }
    }
  }

  /**
   * 获取 UTC 时间戳
   */
  private getTimestamp(): string {
    const now = new Date()
    const year = now.getUTCFullYear()
    const month = String(now.getUTCMonth() + 1).padStart(2, '0')
    const day = String(now.getUTCDate()).padStart(2, '0')
    const hours = String(now.getUTCHours()).padStart(2, '0')
    const minutes = String(now.getUTCMinutes()).padStart(2, '0')
    const seconds = String(now.getUTCSeconds()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`
  }

  /**
   * 获取随机数
   */
  private getNonce(): string {
    return crypto.randomUUID().replace(/-/g, '')
  }

  /**
   * 签名请求 - 阿里云签名规范
   * https://help.aliyun.com/document_detail/300658.html
   */
  private async signRequest(params: Record<string, string>, secret: string): Promise<string> {
    // 1. 按字典顺序排序参数
    const sortedKeys = Object.keys(params).sort()

    // 2. 构造规范化查询字符串（每个 key-value 都要单独编码）
    const canonicalizedQueryString = sortedKeys
      .map(key => {
        const encodedKey = this.percentEncode(key)
        const encodedValue = this.percentEncode(params[key])
        return `${encodedKey}=${encodedValue}`
      })
      .join('&')

    // 3. 构造待签名字符串
    const stringToSign =
      'GET&' +
      this.percentEncode('/') +
      '&' +
      this.percentEncode(canonicalizedQueryString)

    // 4. 计算签名
    const signature = crypto
      .createHmac('sha1', `${secret}&`)
      .update(stringToSign)
      .digest('base64')

    return signature
  }

  /**
   * 阿里云专用 URL 编码
   * ! ' ( ) * 保持原样，其他字符用 encodeURIComponent
   */
  private percentEncode(str: string): string {
    return encodeURIComponent(str)
      .replace(/\'/g, '%27')
      .replace(/\!/g, '%21')
      .replace(/\*/g, '%2A')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
  }

  /**
   * 获取模板代码
   */
  private getTemplateCode(type: SmsCodeType): string {
    switch (type) {
      case 'bind':
        return env.sms.templateBind
      case 'login':
        return env.sms.templateLogin
      case 'reset':
        return env.sms.templateReset
      default:
        return env.sms.templateBind
    }
  }

  /**
   * 验证手机号格式
   */
  private validatePhone(phone: string): boolean {
    return /^1[3-9]\d{9}$/.test(phone)
  }

  /**
   * 生成验证码
   */
  private generateCode(): string {
    let code = ''
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      code += Math.floor(Math.random() * 10)
    }
    return code
  }

  /**
   * 检查发送频率限制
   */
  private async checkRateLimit(
    phone: string,
    type: 'minute' | 'daily'
  ): Promise<{ allowed: boolean; waitSeconds?: number; message?: string }> {
    const now = new Date()
    let startTime: Date

    if (type === 'minute') {
      startTime = new Date(now.getTime() - 60 * 1000)
    } else {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
    }

    const count = await prisma.smsCode.count({
      where: {
        phone,
        type: { in: ['bind', 'login', 'reset'] },
        createdAt: { gte: startTime },
      },
    })

    if (type === 'minute') {
      if (count >= this.MINUTE_LIMIT) {
        return { allowed: false, message: '发送过于频繁' }
      }
    } else {
      if (count >= this.DAILY_LIMIT) {
        return { allowed: false, message: '今日发送次数已用完' }
      }
    }

    return { allowed: true }
  }

  /**
   * 获取当日发送次数
   */
  private async getDailyCount(phone: string): Promise<number> {
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    return await prisma.smsCode.count({
      where: {
        phone,
        type: { in: ['bind', 'login', 'reset'] },
        createdAt: { gte: startOfDay },
      },
    })
  }

  /**
   * 清理过期验证码（建议定时任务执行）
   */
  async cleanupExpiredCodes(): Promise<number> {
    const result = await prisma.smsCode.deleteMany({
      where: {
        expiredAt: { lt: new Date() },
      },
    })
    return result.count
  }
}

export const smsService = new SmsService()
