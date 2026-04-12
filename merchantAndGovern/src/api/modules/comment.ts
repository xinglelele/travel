import request from '../request'

// 获取评论列表
export function getCommentList(params?: { rating?: number; sort?: string; order?: string; page?: number; pageSize?: number }) {
  return request.get('/merchant/comment/list', { params })
}

// 回复评论
export function replyComment(id: number, reply: string) {
  return request.post(`/merchant/comment/${id}/reply`, { reply })
}

// 编辑回复
export function editReply(id: number, reply: string) {
  return request.put(`/merchant/comment/${id}/reply`, { reply })
}

// 删除回复
export function deleteReply(id: number) {
  return request.delete(`/merchant/comment/${id}/reply`)
}

// 获取评分统计
export function getCommentStats() {
  return request.get('/merchant/comment/stats')
}
