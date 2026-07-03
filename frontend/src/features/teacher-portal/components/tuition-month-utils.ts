import dayjs from 'dayjs';

export function currentMonthKey(): string {
  return dayjs().format('YYYY-MM');
}

/** Default month for setting fees: next calendar month */
export function defaultFeeSettingMonthDate(): Date {
  return dayjs().startOf('month').add(1, 'month').toDate();
}

export function toMonthKey(date: Date): string {
  return dayjs(date).format('YYYY-MM');
}

export function isPastMonth(month: string): boolean {
  return month < currentMonthKey();
}

export function isFeeMonthEditable(month: string): boolean {
  return !isPastMonth(month);
}

export function isStudentFeeEditable(
  month: string,
  invoiceStatus: string | null | undefined
): boolean {
  if (!isFeeMonthEditable(month)) return false;
  if (invoiceStatus === 'paid' || invoiceStatus === 'issued') return false;
  return true;
}

export const FEE_MONTH_MIN_DATE = dayjs().subtract(6, 'month').startOf('month').toDate();
export const FEE_MONTH_MAX_DATE = dayjs().add(12, 'month').endOf('month').toDate();
