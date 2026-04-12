import { Router, Request, Response, NextFunction } from 'express';
import { MerchantAuth } from '../../middleware/merchant-auth';
import prisma from '../../config/database';

const router = Router();
const auth = new MerchantAuth();

// 获取商户消息列表
router.get('/list', auth.required(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const merchantId = (req as any).user?.id;
    const { type, page = 1, pageSize = 20 } = req.query;

    // 通过商户关联的POI查找消息
    const rel = await prisma.merchantPoiRel.findFirst({
      where: { merchantId, isPrimary: 1 }
    });

    if (!rel) {
      return res.status(200).json({ code: 0, message: '成功', data: { list: [], total: 0 } });
    }

    // 获取该商户POI下的评论，构造为消息
    const commentWhere: any = { poiId: rel.poiId, status: 1 };
    if (type && type !== '') commentWhere.auditStatus = 0;

    const [comments, total] = await Promise.all([
      prisma.commentInfo.findMany({
        where: commentWhere,
        include: { user: { select: { nickname: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize)
      }),
      prisma.commentInfo.count({ where: commentWhere })
    ]);

    const list = comments.map(c => ({
      id: `comment_${c.id}`,
      title: `用户 ${c.user.nickname || '匿名'} 评论了您的景点`,
      content: c.content,
      type: 'user',
      isRead: c.status === 1 ? 1 : 0,
      relatedId: c.poiId,
      createdAt: c.createdAt
    }));

    return res.status(200).json({ code: 0, message: '成功', data: { list, total } });
  } catch (err) {
    next(err);
  }
});

// 标记单条已读
router.put('/read/:id', auth.required(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).json({ code: 0, message: '成功', data: null });
  } catch (err) {
    next(err);
  }
});

// 全部已读
router.put('/read-all', auth.required(), async (req: Request, res: Response, next: NextFunction) => {
  try {
    return res.status(200).json({ code: 0, message: '成功', data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
