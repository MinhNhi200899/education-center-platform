// Payments module exports
export * from './payments.controller';
export * from './payments.routes';
export * from './types/payment.types';
export * from './validators/payment.validators';
export { paymentService } from './services/payment.service';

import paymentsRouter from './payments.routes';
export { paymentsRouter };