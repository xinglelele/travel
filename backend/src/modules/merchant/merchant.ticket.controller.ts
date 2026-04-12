import { Request, Response, NextFunction } from 'express';
import { successResponse, errorResponse } from '../../shared/utils/response';
import prisma from '../../config/database';
import MerchantService from './merchant.service';

const service = new MerchantService();

export default class MerchantTicketController {

  // GET /api/merchant/ticket/list
  async getList(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const poiId = await service.getMerchantPoiId(merchantId);

      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const { status, sort = 'createdAt', order = 'desc', page = 1, pageSize = 20 } = req.query;

      const where: any = { poiId };
      if (status !== undefined && status !== '') {
        where.status = Number(status);
      }

      const [tickets, total] = await Promise.all([
        prisma.ticketInfo.findMany({
          where,
          orderBy: { [sort]: order },
          skip: (Number(page) - 1) * Number(pageSize),
          take: Number(pageSize)
        }),
        prisma.ticketInfo.count({ where })
      ]);

      const [totalCount, onSaleCount, offSaleCount] = await Promise.all([
        prisma.ticketInfo.count({ where: { poiId } }),
        prisma.ticketInfo.count({ where: { poiId, status: 1 } }),
        prisma.ticketInfo.count({ where: { poiId, status: 0 } })
      ]);

      return successResponse(res, {
        list: tickets.map(t => ({
          id: t.id,
          poiId: t.poiId,
          ticketName: t.ticketName,
          description: t.description,
          price: Number(t.price),
          stock: t.stock,
          status: t.status,
          createdAt: t.createdAt
        })),
        pagination: { total, page: Number(page), pageSize: Number(pageSize) },
        stats: { total: totalCount, onSale: onSaleCount, offSale: offSaleCount }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/merchant/ticket
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const poiId = await service.getMerchantPoiId(merchantId);

      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const { ticketName, description, price, stock = 0, status = 1 } = req.body;

      const ticket = await prisma.ticketInfo.create({
        data: {
          poiId,
          ticketName: typeof ticketName === 'string' ? { zh: ticketName, en: ticketName } : ticketName,
          description: description
            ? (typeof description === 'string' ? { zh: description, en: description } : description)
            : null,
          price,
          stock,
          status
        }
      });

      return successResponse(res, { id: ticket.id, message: '票种创建成功' });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/merchant/ticket/:id
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const ticketId = Number(req.params.id);
      const poiId = await service.getMerchantPoiId(merchantId);

      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const ticket = await prisma.ticketInfo.findFirst({ where: { id: ticketId, poiId } });
      if (!ticket) {
        return errorResponse(res, '票种不存在或不属于本商户', 60014);
      }

      const { ticketName, description, price, stock, status } = req.body;

      await prisma.ticketInfo.update({
        where: { id: ticketId },
        data: {
          ticketName: ticketName
            ? (typeof ticketName === 'string' ? { zh: ticketName, en: ticketName } : ticketName)
            : undefined,
          description: description !== undefined
            ? (typeof description === 'string' ? { zh: description, en: description } : description)
            : undefined,
          price: price !== undefined ? price : undefined,
          stock: stock !== undefined ? stock : undefined,
          status: status !== undefined ? status : undefined
        }
      });

      return successResponse(res, { message: '票种已更新' });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/merchant/ticket/:id
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const merchantId = (req as any).user?.id;
      const ticketId = Number(req.params.id);
      const poiId = await service.getMerchantPoiId(merchantId);

      if (!poiId) {
        return errorResponse(res, '该商户尚未关联景点', 60014);
      }

      const ticket = await prisma.ticketInfo.findFirst({ where: { id: ticketId, poiId } });
      if (!ticket) {
        return errorResponse(res, '票种不存在或不属于本商户', 60014);
      }

      await prisma.ticketInfo.update({
        where: { id: ticketId },
        data: { status: 0 }
      });

      return successResponse(res, { message: '票种已停售' });
    } catch (err) {
      next(err);
    }
  }
}
