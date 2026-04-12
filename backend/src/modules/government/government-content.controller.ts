import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../shared/utils/response';
import prisma from '../../config/database';

export default class GovernmentContentController {

  // =============================================
  // 内容管理
  // =============================================

  // GET /api/gov/content/list
  async getContentList(req: Request, res: Response, next: NextFunction) {
    try {
      const { contentType, status, category, keyword, page = 1, pageSize = 20 } = req.query;

      const where: any = {};
      if (contentType !== undefined && contentType !== '') where.contentType = contentType;
      if (status !== undefined && status !== '') where.status = Number(status);
      if (category !== undefined && category !== '') where.category = category;
      if (keyword !== undefined && keyword !== '') {
        where.title = { contains: keyword as string };
      }

      const [list, total] = await Promise.all([
        prisma.officialContent.findMany({
          where,
          include: {
            gov: { select: { realName: true } }
          },
          orderBy: { publishedAt: 'desc' },
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize)
        }),
        prisma.officialContent.count({ where })
      ]);

      return successResponse(res, {
        list: list.map(c => ({
          id: c.id,
          title: (c.title as any)?.zh || '',
          contentType: c.contentType,
          category: c.category,
          govName: c.gov.realName || '未知',
          viewCount: c.viewCount,
          likeCount: c.likeCount,
          status: c.status,
          publishedAt: c.publishedAt,
          createdAt: c.createdAt
        })),
        pagination: { total, page: Number(page), pageSize: Number(pageSize) }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/content/:id
  async getContentDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      const content = await prisma.officialContent.findUnique({
        where: { id },
        include: {
          gov: { select: { realName: true, department: true } }
        }
      });

      if (!content) {
        return errorResponse(res, '内容不存在', 70009);
      }

      return successResponse(res, {
        id: content.id,
        title: content.title,
        summary: content.summary,
        content: content.content,
        contentType: content.contentType,
        coverImage: content.coverImage,
        videoUrl: content.videoUrl,
        category: content.category,
        tags: content.tags,
        relatedPoiIds: content.relatedPoiIds,
        viewCount: content.viewCount,
        likeCount: content.likeCount,
        status: content.status,
        govName: content.gov.realName || '未知',
        publishedAt: content.publishedAt,
        createdAt: content.createdAt
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/gov/content
  async createContent(req: Request, res: Response, next: NextFunction) {
    try {
      const govId = (req as any).user.id;
      const {
        title, summary, content, contentType,
        coverImage, videoUrl, category, tags, relatedPoiIds,
        status // 0=草稿，1=发布
      } = req.body;

      const contentData: any = {
        govId,
        title,
        summary,
        content,
        contentType,
        coverImage,
        videoUrl,
        category,
        tags,
        relatedPoiIds,
        status: Number(status || 0),
        publishedAt: Number(status) === 1 ? new Date() : null
      };

      const result = await prisma.officialContent.create({ data: contentData });

      return successResponse(res, {
        id: result.id,
        message: Number(status) === 1 ? '内容已发布' : '内容已保存为草稿'
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/gov/content/:id
  async updateContent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const {
        title, summary, content, contentType,
        coverImage, videoUrl, category, tags, relatedPoiIds
      } = req.body;

      const existing = await prisma.officialContent.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, '内容不存在', 70009);
      }

      await prisma.officialContent.update({
        where: { id },
        data: {
          title, summary, content, contentType,
          coverImage, videoUrl, category, tags, relatedPoiIds
        }
      });

      return successResponse(res, { message: '内容已更新' });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/gov/content/:id
  async deleteContent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      const existing = await prisma.officialContent.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, '内容不存在', 70009);
      }

      await prisma.officialContent.delete({ where: { id } });

      return successResponse(res, { message: '内容已删除' });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/gov/content/:id/publish
  async publishContent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      const existing = await prisma.officialContent.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, '内容不存在', 70009);
      }

      await prisma.officialContent.update({
        where: { id },
        data: { status: 1, publishedAt: new Date() }
      });

      return successResponse(res, { message: '内容已发布' });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/gov/content/:id/unpublish
  async unpublishContent(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      const existing = await prisma.officialContent.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, '内容不存在', 70009);
      }

      await prisma.officialContent.update({
        where: { id },
        data: { status: 0, publishedAt: null }
      });

      return successResponse(res, { message: '内容已下架' });
    } catch (err) {
      next(err);
    }
  }

  // =============================================
  // 系统公告
  // =============================================

  // GET /api/gov/announcement/list
  async getAnnouncementList(req: Request, res: Response, next: NextFunction) {
    try {
      const { type, targetScope, status, page = 1, pageSize = 20 } = req.query;

      const where: any = {};
      if (type !== undefined && type !== '') where.type = type;
      if (targetScope !== undefined && targetScope !== '') where.targetScope = targetScope;
      if (status !== undefined && status !== '') where.status = Number(status);

      const [list, total] = await Promise.all([
        prisma.announcement.findMany({
          where,
          include: {
            // publisher: { select: { realName: true } } // announcement 表没有 publisher 关联
          },
          orderBy: { publishedAt: 'desc' },
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize)
        }),
        prisma.announcement.count({ where })
      ]);

      // 获取发布人名称
      const govIds = list.map(l => l.publisherId);
      const govs = await prisma.government.findMany({
        where: { id: { in: govIds } },
        select: { id: true, realName: true }
      });
      const govMap = new Map(govs.map(g => [g.id, g.realName || '未知']));

      return successResponse(res, {
        list: list.map(a => ({
          id: a.id,
          title: a.title,
          type: a.type,
          targetScope: a.targetScope,
          publisherName: govMap.get(a.publisherId) || '未知',
          status: a.status,
          publishedAt: a.publishedAt,
          createdAt: a.createdAt
        })),
        pagination: { total, page: Number(page), pageSize: Number(pageSize) }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/gov/announcement/:id
  async getAnnouncementDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      const announcement = await prisma.announcement.findUnique({ where: { id } });

      if (!announcement) {
        return errorResponse(res, '公告不存在', 70010);
      }

      return successResponse(res, announcement);
    } catch (err) {
      next(err);
    }
  }

  // POST /api/gov/announcement
  async createAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const govId = (req as any).user.id;
      const gov = (req as any).user;
      const { title, content, type, targetScope, status } = req.body;

      const result = await prisma.announcement.create({
        data: {
          title,
          content,
          type,
          targetScope: targetScope || 'all',
          publisherId: govId,
          publisherType: 'government',
          status: Number(status || 1),
          publishedAt: Number(status) === 1 ? new Date() : null
        }
      });

      return successResponse(res, {
        id: result.id,
        message: Number(status) === 1 ? '公告已发布' : '公告已保存为草稿'
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/gov/announcement/:id
  async updateAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const { title, content, type, targetScope } = req.body;

      const existing = await prisma.announcement.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, '公告不存在', 70010);
      }

      await prisma.announcement.update({
        where: { id },
        data: { title, content, type, targetScope }
      });

      return successResponse(res, { message: '公告已更新' });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/gov/announcement/:id
  async deleteAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      const existing = await prisma.announcement.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, '公告不存在', 70010);
      }

      await prisma.announcement.delete({ where: { id } });

      return successResponse(res, { message: '公告已删除' });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/gov/announcement/:id/recall
  async recallAnnouncement(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);

      const existing = await prisma.announcement.findUnique({ where: { id } });
      if (!existing) {
        return errorResponse(res, '公告不存在', 70010);
      }

      await prisma.announcement.update({
        where: { id },
        data: { status: 2 } // 已撤回
      });

      return successResponse(res, { message: '公告已撤回' });
    } catch (err) {
      next(err);
    }
  }
}
