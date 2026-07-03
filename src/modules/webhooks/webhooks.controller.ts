import { Request, Response } from 'express';
import { asyncHandler } from '../../shared/utils/async-handler';
import { sepayWebhookService, type SepayWebhookPayload } from './sepay-webhook.service';
import { logger } from '../../shared/services/logger.service';

export const handleSepayWebhook = asyncHandler(async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!sepayWebhookService.verifyApiKey(authHeader)) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const payload = req.body as SepayWebhookPayload;

  try {
    await sepayWebhookService.handleIncomingTransfer(payload);
  } catch (error) {
    logger.error('SePay webhook processing error', { error, sepayId: payload?.id });
  }

  res.status(200).json({ success: true });
});
