import { Router, Request, Response, NextFunction } from 'express';
import MerchantController from './merchant.controller';
import MerchantPoiController from './merchant.poi.controller';
import MerchantTicketController from './merchant.ticket.controller';
import MerchantCommentController from './merchant.comment.controller';
import MerchantStatsController from './merchant.stats.controller';
import MerchantMessageRoutes from './merchant.message.routes';
import { MerchantAuth } from '../../middleware/merchant-auth';

const router = Router();
const auth = new MerchantAuth();
const controller = new MerchantController();
const poiController = new MerchantPoiController();
const ticketController = new MerchantTicketController();
const commentController = new MerchantCommentController();
const statsController = new MerchantStatsController();

// 辅助函数：简单的参数验证
function validate(body: any, fields: string[], res: Response, next: NextFunction): boolean {
  for (const field of fields) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      res.status(400).json({ code: 400, message: `缺少必填参数: ${field}`, data: null });
      return false;
    }
  }
  return true;
}

// =============================================
// 公共接口（无需认证）
// =============================================

// 登录
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['tel', 'password'], res, next)) return;
  controller.login(req, res, next);
});

// 注册
router.post('/register', (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['merchantName', 'tel', 'password', 'merchantCategory'], res, next)) return;
  controller.register(req, res, next);
});

// 发送验证码
router.post('/send-code', (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['phone', 'type'], res, next)) return;
  controller.sendCode(req, res, next);
});

// 重置密码
router.post('/reset-password', (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['phone', 'code', 'password'], res, next)) return;
  controller.resetPassword(req, res, next);
});

// =============================================
// 需要认证的接口
// =============================================

// 获取商户信息
router.get('/profile', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  controller.getProfile(req, res, next)
);

// 更新商户信息
router.put('/profile', auth.required(), (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['merchantName'], res, next)) return;
  controller.updateProfile(req, res, next);
});

// 修改密码
router.put('/password', auth.required(), (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['oldPassword', 'newPassword'], res, next)) return;
  controller.changePassword(req, res, next);
});

// 退出登录
router.post('/logout', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  controller.logout(req, res, next)
);

// =============================================
// POI 管理
// =============================================

router.get('/poi', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  poiController.getMerchantPoi(req, res, next)
);

router.put('/poi', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  poiController.updatePoi(req, res, next)
);

router.put('/poi/offline', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  poiController.offlinePoi(req, res, next)
);

router.get('/poi/stats', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  poiController.getPoiStats(req, res, next)
);

router.get('/poi/review-history', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  poiController.getPoiReviewHistory(req, res, next)
);

// =============================================
// 票务管理
// =============================================

router.get('/ticket/list', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  ticketController.getList(req, res, next)
);

router.post('/ticket', auth.required(), (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['ticketName', 'price'], res, next)) return;
  ticketController.create(req, res, next);
});

router.put('/ticket/:id', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  ticketController.update(req, res, next)
);

router.delete('/ticket/:id', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  ticketController.delete(req, res, next)
);

// =============================================
// 评论管理
// =============================================

router.get('/comment/list', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  commentController.getList(req, res, next)
);

router.post('/comment/:id/reply', auth.required(), (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['reply'], res, next)) return;
  commentController.reply(req, res, next);
});

router.put('/comment/:id/reply', auth.required(), (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['reply'], res, next)) return;
  commentController.editReply(req, res, next);
});

router.delete('/comment/:id/reply', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  commentController.deleteReply(req, res, next)
);

router.get('/comment/stats', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  commentController.getStats(req, res, next)
);

// =============================================
// 数据统计
// =============================================

router.get('/stats/overview', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  statsController.getOverview(req, res, next)
);

router.get('/stats/check-trend', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  statsController.getCheckTrend(req, res, next)
);

router.get('/stats/rating-trend', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  statsController.getRatingTrend(req, res, next)
);

router.post('/stats/report', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  statsController.generateAiReport(req, res, next)
);

// ===== 消息通知 =====
router.use('/message', MerchantMessageRoutes);

export default router;
