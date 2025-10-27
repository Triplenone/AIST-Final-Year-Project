import { useId, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { LANGUAGE_OPTIONS } from '../i18n';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const selectId = useId();
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language;
  const fallback = LANGUAGE_OPTIONS[0].code;
  const currentValue = LANGUAGE_OPTIONS.some((option) => option.code === activeLanguage)
    ? activeLanguage
    : fallback;

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLanguage = event.target.value;
    void i18n.changeLanguage(nextLanguage);
  };

  return (
    <div className="language-switcher">
      <label htmlFor={selectId}>{t('common.language')}</label>
      <select
        id={selectId}
        value={currentValue}
        onChange={handleChange}
        aria-label={t('common.language')}
      >
        {LANGUAGE_OPTIONS.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
