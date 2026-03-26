import dotenv from 'dotenv'

dotenv.config()

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    name: process.env.DB_NAME || 'shanghai_tourism_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    anonymousExpiresIn: process.env.JWT_ANONYMOUS_EXPIRES_IN || '30d',
  },

  wechat: {
    appid: process.env.WECHAT_APPID || '',
    secret: process.env.WECHAT_SECRET || '',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'qwen-turbo',
  },

  amap: {
    key: process.env.AMAP_KEY || '',
  },

  sms: {
    provider: process.env.SMS_PROVIDER || 'mock',
    accessKey: process.env.SMS_ACCESS_KEY || '',
    accessSecret: process.env.SMS_ACCESS_SECRET || '',
    signName: process.env.SMS_SIGN_NAME || '智慧旅游平台',
    templateBind: process.env.SMS_TEMPLATE_BIND || '',
    templateLogin: process.env.SMS_TEMPLATE_LOGIN || '',
    templateReset: process.env.SMS_TEMPLATE_RESET || '',
  },
}
