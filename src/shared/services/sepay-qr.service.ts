/**
 * SePay dynamic QR — https://docs.sepay.vn/tao-qr-code-vietqr-dong.html
 */

export function normalizeSepayPaymentCode(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 19);
}

export function buildSepayQrImageUrl(params: {
  accountNo: string;
  bank: string;
  amount?: number;
  paymentCode?: string;
  holder?: string;
  store?: string;
}): string {
  const qs = new URLSearchParams();
  qs.set('acc', params.accountNo.trim());
  qs.set('bank', params.bank);
  if (params.amount != null && params.amount > 0) {
    qs.set('amount', String(Math.round(params.amount)));
  }
  if (params.paymentCode) {
    qs.set('des', normalizeSepayPaymentCode(params.paymentCode));
  }
  if (params.holder) {
    qs.set('holder', params.holder);
  }
  if (params.store) {
    qs.set('store', params.store);
  }
  qs.set('template', 'compact');
  return `https://qr.sepay.vn/img?${qs.toString()}`;
}
