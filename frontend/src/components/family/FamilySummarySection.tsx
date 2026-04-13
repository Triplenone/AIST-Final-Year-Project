import { useTranslation } from 'react-i18next';

import { useFamilySummary } from '../../hooks/useFamilySummary';

type FamilySummarySectionProps = {
  residentId: string | null;
  residentName: string | null;
};

const formatSummaryTime = (value: string | undefined, locale: string) => {
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

export function FamilySummarySection({ residentId, residentName }: FamilySummarySectionProps) {
  const { t, i18n } = useTranslation();
  const { summary, loading, error, isUnavailable } = useFamilySummary(residentId);

  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const generatedAt = formatSummaryTime(summary?.generated_at, locale);

  return (
    <section className="family-panel family-panel--summary" aria-live="polite">
      <div className="family-panel__header">
        <div>
          <p className="family-panel__eyebrow">{t('layout.nav.family')}</p>
          <h3>{t('family.summary.title')}</h3>
        </div>
        {residentName ? (
          <span className="family-panel__chip">
            {t('family.summary.residentLabel')}: {residentName}
          </span>
        ) : null}
      </div>

      {!residentId ? (
        <div className="family-panel__state family-panel__state--prompt">
          <strong>{t('family.summary.promptTitle')}</strong>
          <p>{t('family.summary.promptBody')}</p>
        </div>
      ) : null}

      {residentId && loading ? (
        <div className="family-panel__state family-panel__state--loading">
          <strong>{t('family.summary.loadingTitle')}</strong>
          <p>{t('family.summary.loadingBody')}</p>
        </div>
      ) : null}

      {residentId && isUnavailable ? (
        <div className="family-panel__state family-panel__state--warning">
          <strong>{t('family.summary.unavailableTitle')}</strong>
          <p>{t('family.summary.unavailableBody')}</p>
        </div>
      ) : null}

      {residentId && !loading && !isUnavailable && error ? (
        <div className="family-panel__state family-panel__state--error" role="alert">
          <strong>{t('family.summary.errorTitle')}</strong>
          <p>{error}</p>
        </div>
      ) : null}

      {residentId && !loading && !isUnavailable && !error && !summary ? (
        <div className="family-panel__state family-panel__state--empty">
          <strong>{t('family.summary.emptyTitle')}</strong>
          <p>{t('family.summary.emptyBody')}</p>
        </div>
      ) : null}

      {summary ? (
        <div className="family-summary">
          <p className="family-summary__body">{summary.summary_text}</p>

          <div className="family-summary__stats" role="list">
            <article className="family-summary__stat" role="listitem">
              <span>{t('family.summary.stats.total')}</span>
              <strong>{summary.stats?.total_events ?? 0}</strong>
            </article>
            <article className="family-summary__stat" role="listitem">
              <span>{t('family.summary.stats.critical')}</span>
              <strong>{summary.stats?.critical_events ?? 0}</strong>
            </article>
            <article className="family-summary__stat" role="listitem">
              <span>{t('family.summary.stats.unhandled')}</span>
              <strong>{summary.stats?.unhandled_events ?? 0}</strong>
            </article>
          </div>

          <div className="family-summary__meta">
            {generatedAt ? <span>{t('family.summary.generatedAt', { time: generatedAt })}</span> : null}
            {summary.source ? <span>{t('family.summary.source', { source: summary.source })}</span> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
