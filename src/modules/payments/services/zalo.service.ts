import { prisma } from '../../../config/database';
import { logger } from '../../../shared/services/logger.service';
import { NotFoundException } from '../../../shared/types/error.types';
import { InvoiceResponse } from '../types/payment.types';

export interface ZaloSharePayload {
  invoiceId: string;
  invoiceNumber: string;
  studentName: string;
  amount: number;
  dueDate: string;
  message: string;
  shareLink: string;
  sharedAt: string;
  sharedBy?: string;
}

export interface ZaloShareResult {
  success: boolean;
  payload: ZaloSharePayload;
  messageTemplate: string;
  note: string;
}

/**
 * Pragmatic Zalo stub: logs share payload and stores audit record via Notification.
 * Production would call Zalo OA API / webhook.
 */
export class ZaloService {
  async shareInvoice(
    invoice: InvoiceResponse,
    sharedByUserId?: string
  ): Promise<ZaloShareResult> {
    const studentName = invoice.student?.fullName || 'Học sinh';
    const amountFormatted = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(invoice.totalAmount);

    const dueDate = new Date(invoice.dueDate).toLocaleDateString('vi-VN');
    const messageTemplate =
      `Kính gửi phụ huynh em ${studentName},\n` +
      `Trung tâm gửi phiếu thu ${invoice.invoiceNumber} với số tiền ${amountFormatted}, hạn thanh toán ${dueDate}.\n` +
      `Vui lòng thanh toán đúng hạn. Trân trọng!`;

    const shareLink = `https://zalo.me/share?ref=invoice-${invoice.id}`;

    const payload: ZaloSharePayload = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      studentName,
      amount: invoice.totalAmount,
      dueDate,
      message: messageTemplate,
      shareLink,
      sharedAt: new Date().toISOString(),
      sharedBy: sharedByUserId,
    };

    logger.info('Zalo share stub invoked', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      shareLink,
    });

    if (sharedByUserId) {
      await prisma.notification.create({
        data: {
          userId: sharedByUserId,
          type: 'tuition_zalo_share',
          title: 'Đã gửi Zalo (stub)',
          message: `Phiếu ${invoice.invoiceNumber} - ${studentName}`,
          data: payload as object,
        },
      });
    }

    return {
      success: true,
      payload,
      messageTemplate,
      note: 'Zalo OA chưa kết nối — payload đã lưu log. Webhook placeholder: POST /api/v1/webhooks/zalo',
    };
  }

  async getShareHistory(invoiceId: string): Promise<ZaloSharePayload[]> {
    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw new NotFoundException('Invoice');
    }

    const notifications = await prisma.notification.findMany({
      where: { type: 'tuition_zalo_share' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return notifications
      .filter((n) => (n.data as unknown as ZaloSharePayload | null)?.invoiceId === invoiceId)
      .map((n) => n.data as unknown as ZaloSharePayload);
  }
}

export const zaloService = new ZaloService();
