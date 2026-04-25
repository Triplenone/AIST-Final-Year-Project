import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useVitalsHistory,
  type VitalsHistoryRange,
} from '../../hooks/useVitalsHistory';

type VitalsHistoryPanelProps = {
  residentId: string;
  residentName: string;
};

const RANGE_OPTIONS: VitalsHistoryRange[] = ['1h', '6h', '24h', '7d'];

const formatReadingTime = (value: string | null, locale: string) => {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  try {
    return parsed.toLocaleString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return parsed.toISOString();
  }
};

export function VitalsHistoryPanel({ residentId, residentName }: VitalsHistoryPanelProps) {
  const { t, i18n } = useTranslation();
  const [timeRange, setTimeRange] = useState<VitalsHistoryRange>('24h');
  const { data, loading, error, isUnavailable, invalidResidentId } = useVitalsHistory(residentId, timeRange);

  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const rows = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        label: formatReadingTime(item.recordedAt, locale),
      })),
    [data, locale]
  );

  return (
    <section className="family-panel family-panel--history" aria-live="polite">
      <div className="family-panel__header">
        <div>
          <p className="family-panel__eyebrow">{t('layout.nav.family')}</p>
          <h3>{t('family.vitalsHistory.title')}</h3>
        </div>
        <span className="family-panel__chip">
          {t('family.vitalsHistory.residentLabel')}: {residentName}
        </span>
      </div>

      <div className="family-vitals-history__toolbar">
        <span className="family-vitals-history__range-label">
          {t('family.vitalsHistory.rangeTitle')}
        </span>
        <div className="family-vitals-history__ranges" role="group" aria-label={t('family.vitalsHistory.rangeTitle')}>
          {RANGE_OPTIONS.map((range) => (
            <button
              key={range}
              type="button"
              className={`family-vitals-history__range${timeRange === range ? ' family-vitals-history__range--active' : ''}`}
              onClick={() => setTimeRange(range)}
              aria-pressed={timeRange === range}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="family-panel__state family-panel__state--loading">
          <strong>{t('family.vitalsHistory.loadingTitle')}</strong>
          <p>{t('family.vitalsHistory.loadingBody')}</p>
        </div>
      ) : null}

      {!loading && invalidResidentId ? (
        <div className="family-panel__state family-panel__state--warning" role="status">
          <strong>{t('family.vitalsHistory.invalidResidentIdTitle')}</strong>
          <p>{t('family.vitalsHistory.invalidResidentIdBody')}</p>
        </div>
      ) : null}

      {!loading && !invalidResidentId && isUnavailable ? (
        <div className="family-panel__state family-panel__state--warning">
          <strong>{t('family.vitalsHistory.unavailableTitle')}</strong>
          <p>{t('family.vitalsHistory.unavailableBody')}</p>
        </div>
      ) : null}

      {!loading && !invalidResidentId && !isUnavailable && error ? (
        <div className="family-panel__state family-panel__state--error" role="alert">
          <strong>{t('family.vitalsHistory.errorTitle')}</strong>
          <p>{error}</p>
        </div>
      ) : null}

      {!loading && !invalidResidentId && !isUnavailable && !error && rows.length === 0 ? (
        <div className="family-panel__state family-panel__state--empty">
          <strong>{t('family.vitalsHistory.emptyTitle')}</strong>
          <p>{t('family.vitalsHistory.emptyBody')}</p>
        </div>
      ) : null}

      {!loading && !invalidResidentId && !isUnavailable && !error && rows.length > 0 ? (
        <div className="family-vitals-history__list-scroll">
          <div className="family-vitals-history__list" role="list">
            {rows.map((item) => (
              <article key={item.id} className="family-vitals-history__row" role="listitem">
                <div className="family-vitals-history__timestamp">
                  <span>{t('family.vitalsHistory.columns.recordedAt')}</span>
                  <strong>{item.label ?? t('family.vitalsHistory.noReading')}</strong>
                </div>
                <dl className="family-vitals-history__readings">
                  <div className="family-vitals-history__reading">
                    <dt>{t('family.vitalsHistory.columns.heartRate')}</dt>
                    <dd>{item.heartRate ?? t('family.vitalsHistory.noReading')}</dd>
                  </div>
                  <div className="family-vitals-history__reading">
                    <dt>{t('family.vitalsHistory.columns.spo2')}</dt>
                    <dd>{item.spo2 ?? t('family.vitalsHistory.noReading')}</dd>
                  </div>
                  <div className="family-vitals-history__reading">
                    <dt>{t('family.vitalsHistory.columns.temperature')}</dt>
                    <dd>{item.temperature ?? t('family.vitalsHistory.noReading')}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
