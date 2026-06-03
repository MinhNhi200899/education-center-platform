export interface PaymentSettings {
  vietqrBankId: string;
  accountNo: string;
  accountName: string;
}

export interface CenterPaymentSettingsResponse extends PaymentSettings {
  centerId: string;
  centerName: string;
}
