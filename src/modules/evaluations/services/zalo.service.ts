import { prisma } from '../../../config/database';
import { logger } from '../../../shared/services/logger.service';
import { NotFoundException } from '../../../shared/types/error.types';
import { EvaluationResponse } from '../types/evaluation.types';

export interface EvaluationZaloSharePayload {
  evaluationId: string;
  studentName: string;
  className: string;
  evaluationDate: string;
  message: string;
  shareLink: string;
  sharedAt: string;
  sharedBy?: string;
}

export interface EvaluationZaloShareResult {
  success: boolean;
  payload: EvaluationZaloSharePayload;
  messageTemplate: string;
  note: string;
}

/**
 * Zalo stub for parent evaluation reports (mirrors tuition invoice share).
 */
export class EvaluationZaloService {
  async shareEvaluation(
    evaluation: EvaluationResponse,
    sharedByUserId?: string
  ): Promise<EvaluationZaloShareResult> {
    const studentName = evaluation.student?.fullName || 'Học sinh';
    const className = evaluation.class?.name || 'Lớp học';
    const dateStr = new Date(evaluation.evaluationDate).toLocaleDateString('vi-VN');

    const speaking = evaluation.speakingScore != null ? `${evaluation.speakingScore}/10` : '—';
    const writing = evaluation.writingScore != null ? `${evaluation.writingScore}/10` : '—';

    const messageTemplate =
      `Kính gửi phụ huynh em ${studentName},\n` +
      `Trung tâm gửi nhận xét ${className} ngày ${dateStr}.\n` +
      `Điểm Nói: ${speaking} · Điểm Viết: ${writing}.\n` +
      `Vui lòng xem chi tiết qua liên kết bên dưới. Trân trọng!`;

    const shareLink = `https://zalo.me/share?ref=evaluation-${evaluation.id}`;

    const payload: EvaluationZaloSharePayload = {
      evaluationId: evaluation.id,
      studentName,
      className,
      evaluationDate: dateStr,
      message: messageTemplate,
      shareLink,
      sharedAt: new Date().toISOString(),
      sharedBy: sharedByUserId,
    };

    logger.info('Evaluation Zalo share stub invoked', {
      evaluationId: evaluation.id,
      shareLink,
    });

    if (sharedByUserId) {
      await prisma.notification.create({
        data: {
          userId: sharedByUserId,
          type: 'evaluation_zalo_share',
          title: 'Đã gửi nhận xét Zalo (stub)',
          message: `${studentName} - ${className} (${dateStr})`,
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

  async getShareHistory(evaluationId: string): Promise<EvaluationZaloSharePayload[]> {
    const evaluation = await prisma.evaluation.findUnique({ where: { id: evaluationId } });
    if (!evaluation) {
      throw new NotFoundException('Evaluation');
    }

    const notifications = await prisma.notification.findMany({
      where: { type: 'evaluation_zalo_share' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return notifications
      .filter(
        (n) =>
          (n.data as unknown as EvaluationZaloSharePayload | null)?.evaluationId === evaluationId
      )
      .map((n) => n.data as unknown as EvaluationZaloSharePayload);
  }
}

export const evaluationZaloService = new EvaluationZaloService();
