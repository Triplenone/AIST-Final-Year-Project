import i18next from './vendor/i18next.js';
import LanguageDetector from './vendor/i18nextBrowserLanguageDetector.js';

import { LANGUAGE_OPTIONS, resources } from './i18n-resources.js';

const supportedLngs = LANGUAGE_OPTIONS.map((item) => item.code);

const i18n = i18next.createInstance();
i18n.use(LanguageDetector);

const i18nReady = i18n.init({
  fallbackLng: 'en',
  supportedLngs,
  resources,
  interpolation: {
    escapeValue: false
  },
  detection: {
    order: ['localStorage', 'htmlTag', 'navigator'],
    caches: ['localStorage']
  }
});

export { LANGUAGE_OPTIONS, i18nReady };
export default i18n;
