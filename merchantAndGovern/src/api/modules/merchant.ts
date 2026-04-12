import request from '../request'

// 登录
export function merchantLogin(data: { tel: string; password: string }) {
  return request.post('/merchant/login', data)
}

// 注册（含完整 POI 信息，与编辑景点字段对齐，支持中英双语）
export function merchantRegister(data: {
  merchantName: string
  tel: string
  password: string
  merchantCategory: string
  contactPerson?: string
  email?: string
  businessLicense?: string
  poiNameEn: string
  poiDescriptionZh: string
  poiDescriptionEn: string
  addressZh: string
  addressEn: string
  districtId: number
  longitude: number
  latitude: number
  isFree: number
  needTickets: number
  needBook: number
  officialUrl?: string
  photos?: string[]
}) {
  return request.post('/merchant/register', data)
}

// 一键翻译（中 -> 英）
export function translateZhToEn(data: { text: string }) {
  return request.post('/common/translate-zh-en', data)
}

/** 注册页未登录上传展示图（multipart，字段名 file） */
export function uploadRegisterPhoto(data: FormData) {
  return request.post('/common/upload-register', data)
}

/** 地理编码：中文地址 → 经纬度（服务端高德 Web 服务，需后端配置 AMAP_KEY） */
export function geocodeByAddress(address: string) {
  return request.get('/common/geocode', { params: { address } })
}

// 发送验证码
export function sendSmsCode(data: { phone: string; type: string }) {
  return request.post('/merchant/send-code', data)
}

// 重置密码
export function resetPassword(data: { phone: string; code: string; password: string }) {
  return request.post('/merchant/reset-password', data)
}

// 获取商户信息
export function getMerchantProfile() {
  return request.get('/merchant/profile')
}

// 更新商户信息
export function updateMerchantProfile(data: {
  merchantName: string
  contactPerson?: string
  email?: string
  description?: string
  logo?: string
}) {
  return request.put('/merchant/profile', data)
}

// 修改密码
export function changePassword(data: { oldPassword: string; newPassword: string }) {
  return request.put('/merchant/password', data)
}

// 退出登录
export function merchantLogout() {
  return request.post('/merchant/logout')
}