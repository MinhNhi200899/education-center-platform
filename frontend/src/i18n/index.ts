import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import 'dayjs/locale/en';

// English baseline (current strings)
import en from './locales/en.json';
// Vietnamese translations
import vi from './locales/vi.json';

export const supportedLngs = ['vi', 'en'] as const;
export type SupportedLng = (typeof supportedLngs)[number];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    fallbackLng: 'vi',
    lng: 'vi', // default; LanguageDetector will override if a saved preference exists
    supportedLngs: supportedLngs as unknown as string[],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'app.locale',
    },
    returnNull: false,
  });

// Keep dayjs locale in sync with the active i18n language
const applyDayjsLocale = (lng: string) => {
  if (lng === 'vi' || lng.startsWith('vi')) dayjs.locale('vi');
  else dayjs.locale('en');
};
applyDayjsLocale(i18n.language || 'vi');
i18n.on('languageChanged', applyDayjsLocale);

export default i18n;
