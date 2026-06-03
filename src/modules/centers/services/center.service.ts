import { Prisma } from '@prisma/client';
import { prisma } from '../../../config/database';
import { logger } from '../../../shared/services/logger.service';
import { NotFoundException } from '../../../shared/types/error.types';
import { PaymentSettings, CenterPaymentSettingsResponse } from '../types/center.types';

type CenterSettingsJson = Record<string, unknown>;

function parseSettings(settings: unknown): CenterSettingsJson {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return {};
  }
  return settings as CenterSettingsJson;
}

function extractPaymentSettings(settings: CenterSettingsJson): PaymentSettings {
  return {
    vietqrBankId: String(
      settings.vietqrBankId ?? settings.vietqrBankCode ?? ''
    ),
    accountNo: String(
      settings.accountNo ?? settings.vietqrBankAccount ?? ''
    ),
    accountName: String(
      settings.accountName ?? settings.vietqrAccountName ?? ''
    ),
  };
}

function mergePaymentIntoSettings(
  existing: CenterSettingsJson,
  payment: PaymentSettings
): CenterSettingsJson {
  return {
    ...existing,
    vietqrBankId: payment.vietqrBankId,
    vietqrBankCode: payment.vietqrBankId,
    accountNo: payment.accountNo,
    vietqrBankAccount: payment.accountNo,
    accountName: payment.accountName,
    vietqrAccountName: payment.accountName,
  };
}

export class CenterService {
  async getPaymentSettings(centerId: string): Promise<CenterPaymentSettingsResponse> {
    const center = await prisma.center.findUnique({ where: { id: centerId } });
    if (!center) {
      throw new NotFoundException('Center');
    }

    const payment = extractPaymentSettings(parseSettings(center.settings));

    return {
      centerId: center.id,
      centerName: center.name,
      ...payment,
    };
  }

  async updatePaymentSettings(
    centerId: string,
    data: PaymentSettings
  ): Promise<CenterPaymentSettingsResponse> {
    const center = await prisma.center.findUnique({ where: { id: centerId } });
    if (!center) {
      throw new NotFoundException('Center');
    }

    const merged = mergePaymentIntoSettings(parseSettings(center.settings), data);

    await prisma.center.update({
      where: { id: centerId },
      data: { settings: merged as Prisma.InputJsonValue },
    });

    logger.info('Center payment settings updated', { centerId });

    return {
      centerId: center.id,
      centerName: center.name,
      ...data,
    };
  }
}

export const centerService = new CenterService();
