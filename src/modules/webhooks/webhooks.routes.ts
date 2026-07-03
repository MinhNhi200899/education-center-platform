import { Router } from 'express';
import { handleSepayWebhook } from './webhooks.controller';

const router = Router();

router.post('/sepay', handleSepayWebhook);

export default router;
