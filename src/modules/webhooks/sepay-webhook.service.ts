import { prisma } from '../../config/database';
import { paymentService } from '../payments/services/payment.service';
import { logger } from '../../shared/services/logger.service';
import {
  buildSepayQrImageUrl,
  normalizeSepayPaymentCode,
} from '../../shared/services/sepay-qr.service';

export interface SepayWebhookPayload {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount?: string;
  code?: string | null;
  content: string;
  transferType: 'in' | 'out';
  description?: string;
  transferAmount: number;
  accumulated?: number;
  referenceCode?: string;
}

function normalizeVietnameseText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}

function contentMatchesInvoice(
  rawContent: string,
  invoiceNumber: string,
  studentName: string,
  sepayCode?: string | null
): boolean {
  if (sepayCode) {
    const codeNorm = normalizeSepayPaymentCode(sepayCode).toUpperCase();
    const invNorm = normalizeSepayPaymentCode(invoiceNumber).toUpperCase();
    if (codeNorm && invNorm && codeNorm === invNorm) {
      return true;
    }
    if (rawContent.toUpperCase().includes(sepayCode.toUpperCase())) {
      return true;
    }
  }

  const invNorm = normalizeSepayPaymentCode(invoiceNumber);
  if (invNorm && rawContent.toUpperCase().includes(invNorm.toUpperCase())) {
    return true;
  }

  if (invoiceNumber && rawContent.toUpperCase().includes(invoiceNumber.toUpperCase())) {
    return true;
  }

  const content = normalizeVietnameseText(rawContent);
  const name = normalizeVietnameseText(studentName);

  if (name.length >= 3 && content.includes(name)) {
    return true;
  }

  const parts = name.split(/\s+/).filter((p) => p.length >= 2);
  if (parts.length > 0 && parts.every((p) => content.includes(p))) {
    return true;
  }

  return false;
}

async function notifyTeachersTuitionPaid(
  invoiceId: string,
  amount: number
): Promise<void> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      student: { select: { id: true, fullName: true } },
      tuitionPlan: {
        select: {
          classId: true,
          class: { select: { name: true } },
        },
      },
    },
  });

  if (!invoice?.tuitionPlan.classId) {
    return;
  }

  const classTeachers = await prisma.classTeacher.findMany({
    where: { classId: invoice.tuitionPlan.classId },
    include: { teacher: { select: { userId: true } } },
  });

  const className = invoice.tuitionPlan.class?.name ?? 'lớp';
  const amountLabel = amount.toLocaleString('vi-VN');

  for (const ct of classTeachers) {
    if (!ct.teacher.userId) continue;
    await prisma.notification.create({
      data: {
        userId: ct.teacher.userId,
        type: 'tuition_paid',
        title: 'Học sinh đã thanh toán học phí',
        message: `${invoice.student.fullName} đã chuyển ${amountLabel}đ (${className})`,
        data: {
          invoiceId,
          studentId: invoice.student.id,
          amount,
          source: 'sepay',
        },
      },
    });
  }
}

export class SepayWebhookService {
  verifyApiKey(authHeader: string | undefined): boolean {
    const expected = process.env.SEPAY_WEBHOOK_API_KEY?.trim();
    if (!expected) {
      return true;
    }
    if (!authHeader) {
      return false;
    }
    const match = /^Apikey\s+(.+)$/i.exec(authHeader.trim());
    return match?.[1] === expected;
  }

  async handleIncomingTransfer(payload: SepayWebhookPayload): Promise<{
    matched: boolean;
    invoiceId?: string;
    reason?: string;
  }> {
    if (payload.transferType !== 'in') {
      return { matched: false, reason: 'outgoing_transfer' };
    }

    const transactionId = `sepay:${payload.id}`;
    const existing = await prisma.payment.findFirst({
      where: { transactionId },
      select: { invoiceId: true },
    });
    if (existing) {
      return { matched: true, invoiceId: existing.invoiceId, reason: 'duplicate' };
    }

    const transferContent = [payload.content, payload.description, payload.code]
      .filter(Boolean)
      .join(' ');

    const candidates = await prisma.invoice.findMany({
      where: {
        status: { in: ['issued', 'overdue'] },
        totalAmount: payload.transferAmount,
      },
      include: {
        student: { select: { fullName: true } },
      },
      orderBy: { issueDate: 'desc' },
      take: 50,
    });

    const matched = candidates.filter((inv) =>
      contentMatchesInvoice(
        transferContent,
        inv.invoiceNumber,
        inv.student.fullName,
        payload.code
      )
    );

    if (matched.length === 0) {
      logger.info('SePay webhook: no invoice match', {
        sepayId: payload.id,
        amount: payload.transferAmount,
        content: payload.content,
      });
      return { matched: false, reason: 'no_invoice_match' };
    }

    if (matched.length > 1) {
      logger.warn('SePay webhook: ambiguous invoice match', {
        sepayId: payload.id,
        invoiceIds: matched.map((i) => i.id),
      });
      return { matched: false, reason: 'ambiguous_match' };
    }

    const invoice = matched[0];
    const transactionDate = payload.transactionDate
      ? new Date(payload.transactionDate.replace(' ', 'T') + '+07:00')
      : new Date();

    const result = await paymentService.completeExternalBankPayment({
      invoiceId: invoice.id,
      amount: payload.transferAmount,
      paymentMethod: 'bank_transfer',
      transactionId,
      transactionDate,
      bankCode: payload.gateway,
      confirmedBy: null,
    });

    if (!result.alreadyProcessed) {
      await notifyTeachersTuitionPaid(invoice.id, payload.transferAmount);
    }

    logger.info('SePay webhook: payment matched', {
      sepayId: payload.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
    });

    return { matched: true, invoiceId: invoice.id };
  }
}

export const sepayWebhookService = new SepayWebhookService();
