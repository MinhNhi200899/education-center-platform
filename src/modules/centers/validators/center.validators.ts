import { z } from 'zod';

export const centerIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid center ID'),
  }),
});

export const paymentSettingsBodySchema = z.object({
  body: z.object({
    vietqrBankId: z.string().min(2, 'Bank code is required').max(20),
    accountNo: z.string().min(4, 'Account number is required').max(30),
    accountName: z.string().min(2, 'Account name is required').max(100),
  }),
});
