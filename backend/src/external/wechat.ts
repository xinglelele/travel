import { env } from '../config/env'

interface WechatSession {
  openid: string
  session_key: string
  unionid?: string
}

export async function getSessionKey(code: string): Promise<WechatSession> {
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${env.wechat.appid}&secret=${env.wechat.secret}&js_code=${code}&grant_type=authorization_code`

  const response = await fetch(url)
  const data = await response.json() as WechatSession & { errcode?: number; errmsg?: string }

  if (data.errcode) {
    throw new Error(`微信登录失败: ${data.errmsg}`)
  }

  return data
}
