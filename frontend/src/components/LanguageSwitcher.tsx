import { useId, type ChangeEvent, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { LANGUAGE_OPTIONS } from '../i18n';

export type LanguageSwitcherProps = {
  /** 为 true 时使用自定义下拉，向上展开（适用于页面右下角等位置） */
  openUpward?: boolean;
};

export function LanguageSwitcher({ openUpward = false }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();
  const selectId = useId();
  const [customOpen, setCustomOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeLanguage = i18n.resolvedLanguage ?? i18n.language;
  const fallback = LANGUAGE_OPTIONS[0].code;
  const currentValue = LANGUAGE_OPTIONS.some((option) => option.code === activeLanguage)
    ? activeLanguage
    : fallback;
  const currentLabel = LANGUAGE_OPTIONS.find((o) => o.code === currentValue)?.label ?? currentValue;

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLanguage = event.target.value;
    void i18n.changeLanguage(nextLanguage);
  };

  const handleSelectOption = (code: string) => {
    void i18n.changeLanguage(code);
    setCustomOpen(false);
  };

  useEffect(() => {
    if (!openUpward || !customOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setCustomOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openUpward, customOpen]);

  if (openUpward) {
    return (
      <div className="language-switcher language-switcher--open-upward" ref={containerRef}>
        <label id={`${selectId}-label`}>{t('common.language')}</label>
        <div className="language-switcher__trigger-wrap">
          <button
            type="button"
            className="language-switcher__trigger"
            onClick={() => setCustomOpen((v) => !v)}
            aria-expanded={customOpen}
            aria-haspopup="listbox"
            aria-labelledby={`${selectId}-label`}
            aria-label={t('common.language')}
          >
            {currentLabel}
            <span className="language-switcher__chevron" aria-hidden>▼</span>
          </button>
          {customOpen && (
            <ul
              className="language-switcher__list"
              role="listbox"
              aria-labelledby={`${selectId}-label`}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <li key={option.code} role="option" aria-selected={option.code === currentValue}>
                  <button
                    type="button"
                    className="language-switcher__option"
                    onClick={() => handleSelectOption(option.code)}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

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
