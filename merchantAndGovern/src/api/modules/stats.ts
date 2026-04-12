import request from '../request'

// 获取运营概览数据
export function getStatsOverview() {
  return request.get('/merchant/stats/overview')
}

// 获取打卡趋势
export function getCheckTrend() {
  return request.get('/merchant/stats/check-trend')
}

// 获取评分趋势
export function getRatingTrend() {
  return request.get('/merchant/stats/rating-trend')
}

// AI 生成经营分析报告
export function generateAiReport() {
  return request.post('/merchant/stats/report')
}
