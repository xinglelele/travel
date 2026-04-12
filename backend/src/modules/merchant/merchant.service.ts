import prisma from '../../config/database';

export default class MerchantService {

  // 发送短信验证码（使用阿里云或其他短信服务）
  async sendSmsCode(phone: string, type: string) {
    // 生成6位验证码
    const code = Math.random().toString().slice(2, 8);
    const expiredAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟有效期

    // 写入数据库
    await prisma.smsCode.create({
      data: {
        phone,
        code,
        type,
        expiredAt,
        used: 0
      }
    });

    // TODO: 实际调用阿里云短信API发送验证码
    // await aliyunSms.send(phone, { code });

    console.log(`[SMS] 手机号 ${phone} 收到验证码: ${code} (类型: ${type})`);
    return code;
  }

  // 获取商户的主 POI ID
  async getMerchantPoiId(merchantId: number): Promise<number | null> {
    const rel = await prisma.merchantPoiRel.findFirst({
      where: { merchantId, isPrimary: 1 }
    });
    return rel?.poiId || null;
  }

  // 验证商户是否拥有指定 POI
  async validatePoiOwnership(merchantId: number, poiId: number): Promise<boolean> {
    const rel = await prisma.merchantPoiRel.findFirst({
      where: { merchantId, poiId, isPrimary: 1 }
    });
    return !!rel;
  }
}
