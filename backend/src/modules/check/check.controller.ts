import { Request, Response, NextFunction } from 'express'
import { successResponse, errorResponse } from '../../shared/utils/response'
import { checkService } from './check.service'

class CheckController {
  /**
   * 创建打卡记录
   * POST /api/check/create
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId
      const { poiId, latitude, longitude, note } = req.body

      if (!poiId) {
        return errorResponse(res, '请选择景点', 400)
      }
      if (latitude === undefined || longitude === undefined) {
        return errorResponse(res, '请提供位置信息', 400)
      }

      const result = await checkService.createCheck({
        userId,
        poiId,
        latitude,
        longitude,
        note,
      })

      if (!result.success) {
        return errorResponse(res, result.message, 400)
      }

      return successResponse(res, result.data, '打卡成功')
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取我的打卡记录
   * GET /api/check/my
   */
  async myList(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId
      const page = parseInt(req.query.page as string) || 1
      const pageSize = parseInt(req.query.pageSize as string) || 20
      const startDate = req.query.startDate as string
      const endDate = req.query.endDate as string

      const result = await checkService.getMyChecks({
        userId,
        page,
        pageSize,
        startDate,
        endDate,
      })

      return successResponse(res, result)
    } catch (error) {
      next(error)
    }
  }

  /**
   * 校验用户是否已打卡某景点
   * GET /api/check/verify/:poiId
   */
  async verifyCheckIn(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId
      const poiId = parseInt(req.params.poiId)

      if (!poiId) {
        return errorResponse(res, '无效的景点ID', 400)
      }

      const result = await checkService.verifyUserCheckedIn(userId, poiId)
      return successResponse(res, result)
    } catch (error) {
      next(error)
    }
  }
}

export const checkController = new CheckController()
