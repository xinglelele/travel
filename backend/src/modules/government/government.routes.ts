import { Router, Request, Response, NextFunction } from 'express';
import GovernmentController from './government.controller';
import GovernmentAuditController from './government-audit.controller';
import GovernmentMerchantController from './government-merchant.controller';
import GovernmentCommentController from './government-comment.controller';
import GovernmentContentController from './government-content.controller';
import GovernmentStatsController from './government-stats.controller';
import { GovernmentAuth } from './government-auth';

const router = Router();
const auth = new GovernmentAuth();
const controller = new GovernmentController();
const auditController = new GovernmentAuditController();
const merchantController = new GovernmentMerchantController();
const commentController = new GovernmentCommentController();
const contentController = new GovernmentContentController();
const statsController = new GovernmentStatsController();

// 辅助函数：参数验证
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

// 获取行政区列表
router.get('/districts', (req: Request, res: Response, next: NextFunction) => {
  const controller = new GovernmentController();
  controller.getDistricts(req, res, next);
});

// 登录
router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['username', 'password'], res, next)) return;
  controller.login(req, res, next);
});

// =============================================
// 认证接口（需要登录）
// =============================================

// 获取个人信息
router.get('/profile', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  controller.getProfile(req, res, next)
);

// 更新个人信息
router.put('/profile', auth.required(), (req: Request, res: Response, next: NextFunction) =>
  controller.updateProfile(req, res, next)
);

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
// 管理员账号管理（仅超级管理员 role=0）
// =============================================

// 获取管理员列表
router.get('/admin/list', auth.superAdmin(), (req: Request, res: Response, next: NextFunction) =>
  controller.getAdminList(req, res, next)
);

// 获取单个管理员
router.get('/admin/:id', auth.superAdmin(), (req: Request, res: Response, next: NextFunction) =>
  controller.getAdminById(req, res, next)
);

// 创建管理员
router.post('/admin', auth.superAdmin(), (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['username', 'tel', 'role'], res, next)) return;
  controller.createAdmin(req, res, next);
});

// 更新管理员
router.put('/admin/:id', auth.superAdmin(), (req: Request, res: Response, next: NextFunction) =>
  controller.updateAdmin(req, res, next)
);

// 删除管理员
router.delete('/admin/:id', auth.superAdmin(), (req: Request, res: Response, next: NextFunction) =>
  controller.deleteAdmin(req, res, next)
);

// 重置管理员密码
router.post('/admin/:id/reset-password', auth.superAdmin(), (req: Request, res: Response, next: NextFunction) =>
  controller.resetAdminPassword(req, res, next)
);

// =============================================
// POI 审核（管理员均可）
// =============================================

// 获取 POI 审核队列
router.get('/poi/audit/list', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  auditController.getPoiAuditList(req, res, next)
);

// 获取 POI 审核详情
router.get('/poi/:id/audit', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  auditController.getPoiAuditDetail(req, res, next)
);

// 审核 POI
router.post('/poi/:id/audit', auth.admin(), (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['action'], res, next)) return;
  auditController.auditPoi(req, res, next);
});

// 获取 POI 审核历史
router.get('/poi/audit/history', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  auditController.getPoiAuditHistory(req, res, next)
);

// 分配 POI 审核任务
router.put('/poi/:id/assign', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  auditController.assignPoiAudit(req, res, next)
);

// =============================================
// POI 管理（管理员均可）
// =============================================

// 获取 POI 列表
router.get('/poi/list', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  auditController.getPoiList(req, res, next)
);

// 获取 POI 详情
router.get('/poi/:id', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  auditController.getPoiDetail(req, res, next)
);

// 创建 POI（政府端可自主创建）
router.post('/poi', auth.admin(), (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['poiName'], res, next)) return;
  auditController.createPoi(req, res, next);
});

// 更新 POI
router.put('/poi/:id', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  auditController.updatePoi(req, res, next)
);

// 强制下架 POI
router.put('/poi/:id/offline', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  auditController.offlinePoi(req, res, next)
);

// 删除 POI
router.delete('/poi/:id', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  auditController.deletePoi(req, res, next)
);

// =============================================
// 商户管理（管理员均可）
// =============================================

// 获取商户列表
router.get('/merchant/list', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  merchantController.getMerchantList(req, res, next)
);

// 获取商户详情
router.get('/merchant/:id', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  merchantController.getMerchantDetail(req, res, next)
);

// 审核商户
router.post('/merchant/:id/audit', auth.admin(), (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['action'], res, next)) return;
  merchantController.auditMerchant(req, res, next);
});

// 封禁商户
router.put('/merchant/:id/ban', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  merchantController.banMerchant(req, res, next)
);

// 解禁商户
router.put('/merchant/:id/unban', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  merchantController.unbanMerchant(req, res, next)
);

// 重置商户密码
router.post('/merchant/:id/reset-password', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  merchantController.resetMerchantPassword(req, res, next)
);

// 获取商户关联 POI
router.get('/merchant/:id/pois', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  merchantController.getMerchantPois(req, res, next)
);

// 获取商户审核历史
router.get('/merchant/:id/reviews', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  merchantController.getMerchantReviews(req, res, next)
);

// =============================================
// 评论审核（审核员 + 管理员均可）
// =============================================

// 获取待审核评论列表
router.get('/comment/audit/list', auth.auditor(), (req: Request, res: Response, next: NextFunction) =>
  commentController.getCommentAuditList(req, res, next)
);

// 获取评论详情
router.get('/comment/:id', auth.auditor(), (req: Request, res: Response, next: NextFunction) =>
  commentController.getCommentDetail(req, res, next)
);

// 审核评论
router.post('/comment/:id/audit', auth.auditor(), (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['action'], res, next)) return;
  commentController.auditComment(req, res, next);
});

// 获取评论审核历史
router.get('/comment/audit/history', auth.auditor(), (req: Request, res: Response, next: NextFunction) =>
  commentController.getCommentAuditHistory(req, res, next)
);

// =============================================
// 举报管理（审核员 + 管理员均可）
// =============================================

// 获取举报列表
router.get('/report/list', auth.auditor(), (req: Request, res: Response, next: NextFunction) =>
  commentController.getReportList(req, res, next)
);

// 获取举报详情
router.get('/report/:id', auth.auditor(), (req: Request, res: Response, next: NextFunction) =>
  commentController.getReportDetail(req, res, next)
);

// 处理举报
router.post('/report/:id/handle', auth.auditor(), (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['action'], res, next)) return;
  commentController.handleReport(req, res, next);
});

// 获取举报处理历史
router.get('/report/history', auth.auditor(), (req: Request, res: Response, next: NextFunction) =>
  commentController.getReportHistory(req, res, next)
);

// =============================================
// 内容管理（管理员均可）
// =============================================

// 获取内容列表
router.get('/content/list', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  contentController.getContentList(req, res, next)
);

// 获取内容详情
router.get('/content/:id', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  contentController.getContentDetail(req, res, next)
);

// 创建内容
router.post('/content', auth.admin(), (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['title', 'content'], res, next)) return;
  contentController.createContent(req, res, next);
});

// 更新内容
router.put('/content/:id', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  contentController.updateContent(req, res, next)
);

// 删除内容
router.delete('/content/:id', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  contentController.deleteContent(req, res, next)
);

// 发布内容
router.put('/content/:id/publish', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  contentController.publishContent(req, res, next)
);

// 下架内容
router.put('/content/:id/unpublish', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  contentController.unpublishContent(req, res, next)
);

// =============================================
// 系统公告（管理员均可）
// =============================================

// 获取公告列表
router.get('/announcement/list', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  contentController.getAnnouncementList(req, res, next)
);

// 获取公告详情
router.get('/announcement/:id', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  contentController.getAnnouncementDetail(req, res, next)
);

// 创建公告
router.post('/announcement', auth.admin(), (req: Request, res: Response, next: NextFunction) => {
  if (!validate(req.body, ['title', 'content'], res, next)) return;
  contentController.createAnnouncement(req, res, next);
});

// 更新公告
router.put('/announcement/:id', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  contentController.updateAnnouncement(req, res, next)
);

// 删除公告
router.delete('/announcement/:id', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  contentController.deleteAnnouncement(req, res, next)
);

// 撤回公告
router.put('/announcement/:id/recall', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  contentController.recallAnnouncement(req, res, next)
);

// =============================================
// 数据统计（管理员均可）
// =============================================

// 获取总览数据
router.get('/stats/overview', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  statsController.getOverview(req, res, next)
);

// 打卡热力数据
router.get('/stats/check-heatmap', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  statsController.getCheckHeatmap(req, res, next)
);

// 打卡趋势
router.get('/stats/check-trend', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  statsController.getCheckTrend(req, res, next)
);

// 评分分布
router.get('/stats/rating-distribution', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  statsController.getRatingDistribution(req, res, next)
);

// POI 排行
router.get('/stats/poi-ranking', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  statsController.getPoiRanking(req, res, next)
);

// 每日统计
router.get('/stats/daily-stats', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  statsController.getDailyStats(req, res, next)
);

// 导出数据
router.get('/stats/export', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  statsController.exportStats(req, res, next)
);

// =============================================
// 打卡热力图
// =============================================

// 获取打卡热力数据
router.get('/stats/check-heatmap', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  statsController.getCheckHeatmap(req, res, next)
);

// 获取热力图维度分布
router.get('/stats/check-heatmap/dimensions', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  statsController.getCheckHeatmapDimensions(req, res, next)
);

// 获取行政区打卡分布
router.get('/stats/check-heatmap/district', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  statsController.getCheckHeatmapDistrict(req, res, next)
);

// 对比热力数据
router.get('/stats/check-heatmap/compare', auth.admin(), (req: Request, res: Response, next: NextFunction) =>
  statsController.getCheckHeatmapCompare(req, res, next)
);

export default router;