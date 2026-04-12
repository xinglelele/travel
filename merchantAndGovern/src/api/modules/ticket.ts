import request from '../request'

// 获取票种列表
export function getTicketList(params?: { status?: number; sort?: string; order?: string; page?: number; pageSize?: number }) {
  return request.get('/merchant/ticket/list', { params })
}

// 新增票种
export function createTicket(data: {
  ticketName: string | { zh: string; en: string }
  description?: string | { zh: string; en: string }
  price: number
  stock?: number
  status?: number
}) {
  return request.post('/merchant/ticket', data)
}

// 编辑票种
export function updateTicket(id: number, data: {
  ticketName?: string | { zh: string; en: string }
  description?: string | { zh: string; en: string }
  price?: number
  stock?: number
  status?: number
}) {
  return request.put(`/merchant/ticket/${id}`, data)
}

// 删除票种（停售）
export function deleteTicket(id: number) {
  return request.delete(`/merchant/ticket/${id}`)
}
