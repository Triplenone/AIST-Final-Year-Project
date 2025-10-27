import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import enTranslation from './locales/en/translation.json';
import zhHKTranslation from './locales/zh-HK/translation.json';
import zhCNTranslation from './locales/zh-CN/translation.json';

export const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'zh-HK', label: '繁體中文' },
  { code: 'zh-CN', label: '简体中文' }
] as const;

const FALLBACK_LANG = 'en';
const supportedLngs = LANGUAGE_OPTIONS.map((item) => item.code);

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: FALLBACK_LANG,
    supportedLngs,
    resources: {
      en: { translation: enTranslation },
      'zh-HK': { translation: zhHKTranslation },
      'zh-CN': { translation: zhCNTranslation }
    },
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'htmlTag', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
