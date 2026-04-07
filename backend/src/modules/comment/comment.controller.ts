import { Request, Response, NextFunction } from 'express'
import { successResponse, errorResponse } from '../../shared/utils/response'
import { commentService } from './comment.service'

class CommentController {
  /**
   * 发表评论
   * POST /api/comment/create
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId
      const { poiId, rating, content, images } = req.body

      if (!poiId) {
        return errorResponse(res, '请选择景点', 400)
      }
      if (!rating || rating < 1 || rating > 5) {
        return errorResponse(res, '请选择评分（1-5星）', 400)
      }
      if (!content || content.trim().length === 0) {
        return errorResponse(res, '请输入评论内容', 400)
      }
      if (content.trim().length > 500) {
        return errorResponse(res, '评论内容不能超过500字', 400)
      }

      const result = await commentService.createComment({
        userId,
        poiId,
        rating,
        content: content.trim(),
        images,
      })

      if (!result.success) {
        return errorResponse(res, result.message, 400)
      }

      return successResponse(res, result.data, '评论发布成功')
    } catch (error) {
      next(error)
    }
  }

  /**
   * 检查用户是否有权评论（点击"评论"按钮时调用）
   * GET /api/comment/can
   */
  async can(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId
      const poiId = req.query.poiId as string

      if (!poiId) {
        return errorResponse(res, '请指定景点ID', 400)
      }

      const result = await commentService.canComment(userId, poiId)

      if (!result.allowed) {
        return errorResponse(res, result.message, 403)
      }

      return successResponse(res, { allowed: true }, result.message)
    } catch (error) {
      next(error)
    }
  }

  /**
   * 获取评论列表
   * GET /api/comment/list
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const poiId = req.query.poiId as string
      const sort = (req.query.sort as string) || 'time'
      const page = parseInt(req.query.page as string) || 1
      const pageSize = parseInt(req.query.pageSize as string) || 20

      if (!poiId) {
        return errorResponse(res, '请指定景点ID', 400)
      }

      const result = await commentService.getCommentList({
        poiId,
        sort,
        page,
        pageSize,
      })

      return successResponse(res, result)
    } catch (error) {
      next(error)
    }
  }
}

export const commentController = new CommentController()
