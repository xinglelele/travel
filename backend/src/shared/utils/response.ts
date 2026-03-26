import { Response } from 'express'

interface ApiResponse {
  code: number
  message: string
  data: unknown
}

export function successResponse(res: Response, data: unknown, message = '成功'): Response {
  const response: ApiResponse = { code: 0, message, data }
  return res.json(response)
}

export function errorResponse(res: Response, message: string, code = -1): Response {
  const response: ApiResponse = { code, message, data: null }
  return res.status(400).json(response)
}
