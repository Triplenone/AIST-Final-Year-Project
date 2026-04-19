import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { FallAlertDetailRow, FallAlertKind } from '../types/fall-alert';

type FallAlertModalProps = {
  items: FallAlertDetailRow[];
  onGoToEvents: () => void | Promise<void>;
  onClose: () => void;
};

function formatKinds(kinds: FallAlertKind[], translate: (key: string) => string): string {
  if (!kinds.length) return '—';
  return kinds
    .map((k) => (k === 'sos' ? translate('fallAlert.kindSos') : translate('fallAlert.kindFall')))
    .join(' · ');
}

export function FallAlertModal({ items, onGoToEvents, onClose }: FallAlertModalProps) {
  const { t, i18n } = useTranslation();

  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
    [locale]
  );

  const formatTime = (iso: string) => {
    const ms = Date.parse(iso);
    if (Number.isNaN(ms)) return iso;
    try {
      return timeFormatter.format(new Date(ms));
    } catch {
      return iso;
    }
  };

  return (
    <div className="fall-alert-modal" role="alertdialog" aria-modal="true" aria-labelledby="fall-alert-title">
      <div className="fall-alert-modal__backdrop" aria-hidden="true" onClick={onClose} />
      <div className="fall-alert-modal__dialog">
        <header className="fall-alert-modal__header">
          <h2 id="fall-alert-title" className="fall-alert-modal__title">
            {t('fallAlert.message')}
          </h2>
          <button type="button" className="fall-alert-modal__icon-close" onClick={onClose} aria-label={t('fallAlert.close')}>
            ×
          </button>
        </header>

        <p className="fall-alert-modal__lede">{t('fallAlert.detailIntro')}</p>

        <div className="fall-alert-modal__body">
          <table className="fall-alert-modal__table">
            <thead>
              <tr>
                <th scope="col">{t('fallAlert.colDevice')}</th>
                <th scope="col">{t('fallAlert.colUser')}</th>
                <th scope="col">{t('fallAlert.colLocation')}</th>
                <th scope="col">{t('fallAlert.colTime')}</th>
                <th scope="col">{t('fallAlert.colType')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>{row.deviceId}</td>
                  <td>{row.boundUser}</td>
                  <td>{row.location}</td>
                  <td>{formatTime(row.triggeredAtIso)}</td>
                  <td>{formatKinds(row.kinds, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="fall-alert-modal__actions">
          <button type="button" className="secondary fall-alert-modal__button" onClick={onClose}>
            {t('fallAlert.close')}
          </button>
          <button
            type="button"
            className="primary fall-alert-modal__button"
            onClick={() => {
              void onGoToEvents();
            }}
          >
            {t('fallAlert.goToEvents')}
          </button>
        </div>
      </div>
    </div>
  );
}
