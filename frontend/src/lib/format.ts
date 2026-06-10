import { useTranslation } from 'react-i18next';

/**
 * Locale-aware date formatters for the two supported languages.
 * - vi → vi-VN (dd/mm/yyyy)
 * - en → en-US (mm/dd/yyyy)
 */
const LOCALE_MAP: Record<string, string> = {
  vi: 'vi-VN',
  en: 'en-US',
};

export const getBrowserLocale = (lng: string): string => {
  return LOCALE_MAP[lng] ?? (lng.startsWith('vi') ? 'vi-VN' : 'en-US');
};

/** Format a Date / ISO string for display (medium style). */
export const formatDate = (value: Date | string | null | undefined, lng: string): string => {
  if (!value) return '-';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(getBrowserLocale(lng), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/** Format a Date / ISO string with long month + weekday (e.g. "Thứ Hai, 06/06/2026"). */
export const formatDateLong = (value: Date | string | null | undefined, lng: string): string => {
  if (!value) return '-';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(getBrowserLocale(lng), {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

/** Format a number with thousands separators. */
export const formatNumber = (value: number | null | undefined, lng: string): string => {
  if (value == null) return '0';
  return value.toLocaleString(getBrowserLocale(lng));
};

/** Format a VND amount. */
export const formatVnd = (value: number | null | undefined, lng: string = 'vi'): string => {
  if (value == null) return formatNumber(0, lng);
  return new Intl.NumberFormat(getBrowserLocale(lng), {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Hook returning locale-aware formatters that auto-update on language change.
 * Use these in components instead of calling the free functions above.
 */
export function useLocaleFormatters() {
  const { i18n } = useTranslation();
  const lng = i18n.language || 'vi';
  return {
    formatDate: (v: Date | string | null | undefined) => formatDate(v, lng),
    formatDateLong: (v: Date | string | null | undefined) => formatDateLong(v, lng),
    formatNumber: (v: number | null | undefined) => formatNumber(v, lng),
    formatVnd: (v: number | null | undefined) => formatVnd(v, lng),
    locale: getBrowserLocale(lng),
    lng,
  };
}
