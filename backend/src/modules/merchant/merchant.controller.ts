import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../shared/utils/response';
import MerchantService from './merchant.service';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../config/database';

const service = new MerchantService();

export default class MerchantController {

  // POST /api/merchant/login
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { tel, password } = req.body;

      const merchant = await prisma.merchant.findUnique({ where: { tel } });
      if (!merchant) {
        return errorResponse(res, '商户账号不存在', 60001);
      }

      if (merchant.status === 2) {
        return errorResponse(res, `账号已被封禁`, 60003);
      }
      if (merchant.status === 4) {
        return errorResponse(res, '账号已注销', 60004);
      }

      const valid = await bcrypt.compare(password, merchant.password);
      if (!valid) {
        return errorResponse(res, '密码错误', 60002);
      }

      // 生成 JWT Token
      const jwt = await import('jsonwebtoken');
      const { env } = await import('../../config/env');
      const token = jwt.default.sign(
        { id: merchant.id, type: 'merchant', tel: merchant.tel },
        env.jwt.secret,
        { expiresIn: '7d' }
      );

      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { lastLoginAt: new Date() }
      });

      return successResponse(res, {
        token,
        merchant: {
          id: merchant.id,
          merchantName: merchant.merchantName,
          tel: merchant.tel,
          status: merchant.status,
          logo: merchant.logo
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/merchant/register
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        merchantName, tel, password, contactPerson, email, merchantCategory, businessLicense,
        poiNameEn,
        poiDescriptionZh, poiDescriptionEn,
        addressZh, addressEn,
        districtId, longitude, latitude,
        isFree, needTickets, needBook, officialUrl, photos
      } = req.body;

      const existing = await prisma.merchant.findUnique({ where: { tel } });
      if (existing) {
        return errorResponse(res, '该手机号已注册', 60001);
      }

      // 景点名称
      const nameZh = String(merchantName ?? '').trim();
      if (!nameZh || nameZh.length < 2) {
        return errorResponse(res, '请填写商户/景点名称（至少2字）', 400);
      }
      const nameEnRaw = poiNameEn != null ? String(poiNameEn).trim() : '';
      if (nameEnRaw.length < 2) {
        return errorResponse(res, '请填写景点英文名称（至少2个字符）', 400);
      }
      const nameEn = nameEnRaw;

      // 景点描述（中文必填，英文必填）
      const descZh = String(poiDescriptionZh ?? '').trim();
      if (descZh.length < 5) {
        return errorResponse(res, '请填写景点描述（中文，至少5个字）', 400);
      }
      const descEnRaw = poiDescriptionEn != null ? String(poiDescriptionEn).trim() : '';
      if (descEnRaw.length < 2) {
        return errorResponse(res, '请填写景点描述（英文，至少2个字符）', 400);
      }
      const descEn = descEnRaw;

      // 详细地址（中文必填，英文必填）
      const addrZh = String(addressZh ?? '').trim();
      if (!addrZh) {
        return errorResponse(res, '请填写详细地址（中文）', 400);
      }
      const addrEnRaw = addressEn != null ? String(addressEn).trim() : '';
      if (addrEnRaw.length < 2) {
        return errorResponse(res, '请填写详细地址（英文，至少2个字符）', 400);
      }
      const addrEn = addrEnRaw;

      const dId = Number(districtId);
      if (!dId || dId < 1 || !Number.isInteger(dId)) {
        return errorResponse(res, '请选择所在行政区', 400);
      }
      const districtRow = await prisma.district.findUnique({ where: { id: dId } });
      if (!districtRow) {
        return errorResponse(res, '无效的行政区', 400);
      }

      const lng = Number(longitude);
      const lat = Number(latitude);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        return errorResponse(res, '请填写有效的经纬度', 400);
      }
      if (Math.abs(lng) < 1e-6 && Math.abs(lat) < 1e-6) {
        return errorResponse(res, '经纬度不能均为 0，请填写真实坐标', 400);
      }

      const MAX_REGISTER_PHOTOS = 20;
      let photosJson: string[] | null = null;
      if (photos != null) {
        if (Array.isArray(photos)) {
          photosJson = photos.map((p: unknown) => String(p).trim()).filter(Boolean);
        } else if (typeof photos === 'string') {
          // 仅按换行拆分，避免 URL 查询串中的英文逗号被误切
          photosJson = photos
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
        if (photosJson && photosJson.length === 0) photosJson = null;
        if (photosJson && photosJson.length > MAX_REGISTER_PHOTOS) {
          return errorResponse(res, `展示图片最多 ${MAX_REGISTER_PHOTOS} 张`, 400);
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const poiUuid = `MERCHANT_${uuidv4().replace(/-/g, '')}`;

      const merchant = await prisma.merchant.create({
        data: {
          merchantName,
          tel,
          password: hashedPassword,
          contactPerson,
          email,
          merchantCategory,
          businessLicense,
          status: 0
        }
      });

      const poi = await prisma.poiInfo.create({
        data: {
          poiUuid,
          poiName: { zh: nameZh, en: nameEn },
          description: { zh: descZh, en: descEn },
          address: { zh: addrZh, en: addrEn },
          tel,
          email,
          districtId: dId,
          longitude: lng,
          latitude: lat,
          isFree: Number(isFree) === 1 ? 1 : 0,
          needTickets: Number(needTickets) === 1 ? 1 : 0,
          needBook: Number(needBook) === 1 ? 1 : 0,
          officialUrl: officialUrl != null && String(officialUrl).trim() ? String(officialUrl).trim() : null,
          photos: photosJson as any,
          status: 0,
          auditStatus: 0,
          createdBy: merchant.id
        }
      });

      // 关联商户与 POI（主 POI）
      await prisma.merchantPoiRel.create({
        data: { merchantId: merchant.id, poiId: poi.id, isPrimary: 1 }
      });

      // 写入 POI 审核队列
      await prisma.poiAuditQueue.create({
        data: {
          poiId: poi.id,
          submitterType: 'merchant',
          submitterId: merchant.id,
          status: 0
        }
      });

      // 写入商户审核记录
      await prisma.merchantReview.create({
        data: {
          merchantId: merchant.id,
          action: 'submit',
          statusBefore: -1,
          statusAfter: 0,
          remark: '商户提交入驻申请'
        }
      });

      // 写入 POI 审核记录
      await prisma.merchantPoiReview.create({
        data: {
          poiId: poi.id,
          merchantId: merchant.id,
          action: 'create',
          content: {
            poiNameZh: nameZh,
            poiNameEn: nameEn,
            descriptionZh: descZh,
            descriptionEn: descEn,
            districtId: dId,
            longitude: lng,
            latitude: lat,
            addressZh: addrZh,
            addressEn: addrEn,
            photosCount: photosJson?.length ?? 0
          },
          statusBefore: -1,
          statusAfter: 0
        }
      });

      return successResponse(res, {
        merchantId: merchant.id,
        poiId: poi.id,
        status: 'pending_review',
        message: '注册成功，请等待政府端审核'
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/merchant/send-code
  async sendCode(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, type } = req.body;
      await service.sendSmsCode(phone, type);
      return successResponse(res, { message: '验证码已发送' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/merchant/reset-password
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, code, password } = req.body;

      const smsRecord = await prisma.smsCode.findFirst({
        where: { phone, code, type: 'reset', used: 0, expiredAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' }
      });

      if (!smsRecord) {
        return errorResponse(res, '验证码无效或已过期', 400);
      }

      await prisma.smsCode.update({
        where: { id: smsRecord.id },
        data: { used: 1 }
      });

      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.merchant.update({
        where: { tel: phone },
        data: { password: hashedPassword }
      });

      return successResponse(res, { message: '密码重置成功' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/merchant/profile
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        include: {
          poiRelations: {
            where: { isPrimary: 1 },
            include: { poi: true }
          }
        }
      });

      if (!merchant) {
        return errorResponse(res, '商户账号不存在', 60001);
      }

      return successResponse(res, {
        id: merchant.id,
        merchantName: merchant.merchantName,
        tel: merchant.tel,
        email: merchant.email,
        contactPerson: merchant.contactPerson,
        logo: merchant.logo,
        merchantCategory: merchant.merchantCategory,
        description: merchant.description,
        status: merchant.status,
        rejectReason: merchant.rejectReason,
        poiId: merchant.poiRelations[0]?.poiId || null
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/merchant/profile
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const { merchantName, contactPerson, email, description, logo } = req.body;

      await prisma.merchant.update({
        where: { id: merchantId },
        data: { merchantName, contactPerson, email, description, logo }
      });

      return successResponse(res, { message: '商户信息已更新' });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/merchant/password
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const { oldPassword, newPassword } = req.body;

      const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
      if (!merchant) {
        return errorResponse(res, '商户账号不存在', 60001);
      }

      const valid = await bcrypt.compare(oldPassword, merchant.password);
      if (!valid) {
        return errorResponse(res, '旧密码错误', 60002);
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.merchant.update({
        where: { id: merchantId },
        data: { password: hashedPassword }
      });

      return successResponse(res, { message: '密码修改成功' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/merchant/logout
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      return successResponse(res, { message: '已退出登录' });
    } catch (err) {
      next(err);
    }
  }
}
