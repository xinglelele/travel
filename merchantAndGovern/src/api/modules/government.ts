import request from '../request'

// 登录
export function govLogin(data: { username: string; password: string }) {
  return request.post('/gov/login', data)
}

// 获取个人信息
export function getGovProfile() {
  return request.get('/gov/profile')
}

// 更新个人信息
export function updateGovProfile(data: { realName: string; department: string }) {
  return request.put('/gov/profile', data)
}

// 修改密码
export function changeGovPassword(data: { oldPassword: string; newPassword: string }) {
  return request.put('/gov/password', data)
}

// 退出登录
export function govLogout() {
  return request.post('/gov/logout')
}

// =============================================
// 管理员账号管理（仅超管）
// =============================================

// 获取管理员列表
export function getAdminList(params?: { role?: number; status?: number; page?: number; pageSize?: number }) {
  return request.get('/gov/admin/list', { params })
}

// 获取单个管理员
export function getAdminById(id: number) {
  return request.get(`/gov/admin/${id}`)
}

// 创建管理员
export function createAdmin(data: {
  username: string
  tel: string
  realName?: string
  department?: string
  role: number
  password?: string
}) {
  return request.post('/gov/admin', data)
}

// 更新管理员
export function updateAdmin(id: number, data: {
  realName?: string
  department?: string
  role?: number
  status?: number
}) {
  return request.put(`/gov/admin/${id}`, data)
}

// 删除管理员
export function deleteAdmin(id: number) {
  return request.delete(`/gov/admin/${id}`)
}

// 重置管理员密码
export function resetAdminPassword(id: number) {
  return request.post(`/gov/admin/${id}/reset-password`)
}

// =============================================
// POI 审核
// =============================================

// 获取 POI 审核队列
export function getPoiAuditList(params?: { status?: number; submitterType?: string; page?: number; pageSize?: number }) {
  return request.get('/gov/poi/audit/list', { params })
}

// 获取 POI 审核详情
export function getPoiAuditDetail(id: number) {
  return request.get(`/gov/poi/${id}/audit`)
}

// 审核 POI
export function auditPoi(id: number, data: { action: string; remark?: string }) {
  return request.post(`/gov/poi/${id}/audit`, data)
}

// 获取 POI 审核历史
export function getPoiAuditHistory(params?: { page?: number; pageSize?: number }) {
  return request.get('/gov/poi/audit/history', { params })
}

// 分配 POI 审核任务
export function assignPoiAudit(id: number, data: { assignedTo?: number | null }) {
  return request.put(`/gov/poi/${id}/assign`, data)
}

// =============================================
// POI 管理
// =============================================

// 获取行政区列表（供下拉选择）
export function getDistrictList() {
  return request.get('/gov/districts')
}

// 获取 POI 列表
export function getPoiList(params?: { status?: number; districtId?: number; keyword?: string; page?: number; pageSize?: number }) {
  return request.get('/gov/poi/list', { params })
}

// 获取 POI 详情
export function getPoiDetail(id: number) {
  return request.get(`/gov/poi/${id}`)
}

// 创建 POI
export function createPoi(data: any) {
  return request.post('/gov/poi', data)
}

// 更新 POI
export function updatePoi(id: number, data: any) {
  return request.put(`/gov/poi/${id}`, data)
}

// 强制下架 POI
export function offlinePoi(id: number, data?: { reason?: string }) {
  return request.put(`/gov/poi/${id}/offline`, data || {})
}

// 删除 POI
export function deletePoi(id: number) {
  return request.delete(`/gov/poi/${id}`)
}

// =============================================
// 商户管理
// =============================================

// 获取商户列表
export function getMerchantList(params?: { status?: number; merchantCategory?: string; keyword?: string; page?: number; pageSize?: number }) {
  return request.get('/gov/merchant/list', { params })
}

// 获取商户详情
export function getMerchantDetail(id: number) {
  return request.get(`/gov/merchant/${id}`)
}

// 审核商户
export function auditMerchant(id: number, data: { action: string; remark?: string }) {
  return request.post(`/gov/merchant/${id}/audit`, data)
}

// 封禁商户
export function banMerchant(id: number, data?: { reason?: string }) {
  return request.put(`/gov/merchant/${id}/ban`, data || {})
}

// 解禁商户
export function unbanMerchant(id: number) {
  return request.put(`/gov/merchant/${id}/unban`)
}

// 重置商户密码
export function resetMerchantPassword(id: number) {
  return request.post(`/gov/merchant/${id}/reset-password`)
}

// 获取商户关联 POI
export function getMerchantPois(id: number) {
  return request.get(`/gov/merchant/${id}/pois`)
}

// 获取商户审核历史
export function getMerchantReviews(id: number, params?: { page?: number; pageSize?: number }) {
  return request.get(`/gov/merchant/${id}/reviews`, { params })
}

// =============================================
// 评论审核
// =============================================

// 获取待审核评论列表
export function getCommentAuditList(params?: { auditStatus?: number; rating?: number; keyword?: string; page?: number; pageSize?: number }) {
  return request.get('/gov/comment/audit/list', { params })
}

// 获取评论详情
export function getCommentDetail(id: number) {
  return request.get(`/gov/comment/${id}`)
}

// 审核评论
export function auditComment(id: number, data: { action: string; remark?: string }) {
  return request.post(`/gov/comment/${id}/audit`, data)
}

// 获取评论审核历史
export function getCommentAuditHistory(params?: { page?: number; pageSize?: number }) {
  return request.get('/gov/comment/audit/history', { params })
}

// =============================================
// 举报管理
// =============================================

// 获取举报列表
export function getReportList(params?: { targetType?: string; status?: number; page?: number; pageSize?: number }) {
  return request.get('/gov/report/list', { params })
}

// 获取举报详情
export function getReportDetail(id: number) {
  return request.get(`/gov/report/${id}`)
}

// 处理举报
export function handleReport(id: number, data: { action: string; handleResult?: string }) {
  return request.post(`/gov/report/${id}/handle`, data)
}

// 获取举报处理历史
export function getReportHistory(params?: { page?: number; pageSize?: number }) {
  return request.get('/gov/report/history', { params })
}

// =============================================
// 内容管理
// =============================================

// 获取内容列表
export function getContentList(params?: { contentType?: string; status?: number; category?: string; keyword?: string; page?: number; pageSize?: number }) {
  return request.get('/gov/content/list', { params })
}

// 获取内容详情
export function getContentDetail(id: number) {
  return request.get(`/gov/content/${id}`)
}

// 创建内容
export function createContent(data: any) {
  return request.post('/gov/content', data)
}

// 更新内容
export function updateContent(id: number, data: any) {
  return request.put(`/gov/content/${id}`, data)
}

// 删除内容
export function deleteContent(id: number) {
  return request.delete(`/gov/content/${id}`)
}

// 发布内容
export function publishContent(id: number) {
  return request.put(`/gov/content/${id}/publish`)
}

// 下架内容
export function unpublishContent(id: number) {
  return request.put(`/gov/content/${id}/unpublish`)
}

// =============================================
// 系统公告
// =============================================

// 获取公告列表
export function getAnnouncementList(params?: { type?: string; targetScope?: string; status?: number; page?: number; pageSize?: number }) {
  return request.get('/gov/announcement/list', { params })
}

// 获取公告详情
export function getAnnouncementDetail(id: number) {
  return request.get(`/gov/announcement/${id}`)
}

// 创建公告
export function createAnnouncement(data: any) {
  return request.post('/gov/announcement', data)
}

// 更新公告
export function updateAnnouncement(id: number, data: any) {
  return request.put(`/gov/announcement/${id}`, data)
}

// 删除公告
export function deleteAnnouncement(id: number) {
  return request.delete(`/gov/announcement/${id}`)
}

// 撤回公告
export function recallAnnouncement(id: number) {
  return request.put(`/gov/announcement/${id}/recall`)
}

// =============================================
// 数据统计
// =============================================

// 获取总览数据
export function getGovStatsOverview() {
  return request.get('/gov/stats/overview')
}

// 获取打卡趋势
export function getGovCheckTrend(params?: { period?: string }) {
  return request.get('/gov/stats/check-trend', { params })
}

// 获取评分分布
export function getGovRatingDistribution() {
  return request.get('/gov/stats/rating-distribution')
}

// 获取 POI 排行
export function getGovPoiRanking(params?: { type?: string; period?: string; limit?: number }) {
  return request.get('/gov/stats/poi-ranking', { params })
}

// 获取每日统计
export function getGovDailyStats() {
  return request.get('/gov/stats/daily-stats')
}

// 导出数据
export function exportStats(params: { type: string; startDate?: string; endDate?: string }) {
  return request.get('/gov/stats/export', { params })
}

// =============================================
// 打卡热力图
// =============================================

// 获取打卡热力数据
export function getCheckHeatmap(params?: {
  period?: string
  dimension?: string
  dimensionValue?: string | number
  startDate?: string
  endDate?: string
}) {
  return request.get('/gov/stats/check-heatmap', { params })
}

// 获取热力图维度分布
export function getCheckHeatmapDimensions(params?: {
  period?: string
  dimension?: string
  startDate?: string
  endDate?: string
}) {
  return request.get('/gov/stats/check-heatmap/dimensions', { params })
}

// 获取行政区打卡分布
export function getCheckHeatmapDistrict(params?: {
  period?: string
  dimension?: string
  dimensionValue?: string | number
  startDate?: string
  endDate?: string
}) {
  return request.get('/gov/stats/check-heatmap/district', { params })
}

// 对比热力数据
export function getCheckHeatmapCompare(params?: {
  dimension?: string
  valueA?: string | number
  valueB?: string | number
  period?: string
  startDate?: string
  endDate?: string
}) {
  return request.get('/gov/stats/check-heatmap/compare', { params })
}