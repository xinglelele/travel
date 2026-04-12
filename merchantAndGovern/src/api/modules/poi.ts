import request from '../request'

// 获取行政区列表（供下拉选择）
export function getDistrictList() {
  return request.get('/gov/districts')
}

// 获取商户 POI 详情
export function getMerchantPoi() {
  return request.get('/merchant/poi')
}

// 更新 POI（提交审核）
export function updatePoi(data: any) {
  return request.put('/merchant/poi', data)
}

// 下架 POI
export function offlinePoi() {
  return request.put('/merchant/poi/offline')
}

// 获取 POI 统计数据
export function getPoiStats() {
  return request.get('/merchant/poi/stats')
}

// 获取 POI 审核历史
export function getPoiReviewHistory() {
  return request.get('/merchant/poi/review-history')
}
