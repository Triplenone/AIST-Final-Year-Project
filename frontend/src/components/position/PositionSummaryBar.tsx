import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { PositionFreshnessLevel, PositionResidentViewModel, PositionTruthState } from '../../adapters/position-command-center';

type PositionSummaryBarProps = {
  resident: PositionResidentViewModel | null;
  fetchedAt: string | null;
  loading: boolean;
};

const truthLabelKey: Record<PositionTruthState, string> = {
  online: 'position.truth.online',
  stale: 'position.truth.stale',
  offline: 'position.truth.offline'
};

const truthDefaultLabel: Record<PositionTruthState, string> = {
  online: 'Online',
  stale: 'Stale',
  offline: 'Offline'
};

const freshnessLabelKey: Record<PositionFreshnessLevel, string> = {
  live: 'position.freshness.live',
  delayed: 'position.freshness.delayed',
  stale: 'position.freshness.stale'
};

const freshnessDefaultLabel: Record<PositionFreshnessLevel, string> = {
  live: 'Live',
  delayed: 'Delayed',
  stale: 'Stale'
};

function formatTimestamp(timestamp: string | null, locale: string): string {
  if (!timestamp) return 'Unknown';
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return 'Unknown';

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric'
  }).format(new Date(parsed));
}

function getZoneLabel(
  resident: PositionResidentViewModel | null,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (!resident) return t('position.noSelection', { defaultValue: 'No resident selected' });
  if (resident.currentZoneLabelKey) {
    return t(resident.currentZoneLabelKey, {
      defaultValue: resident.currentZoneName ?? 'Unknown zone'
    });
  }
  return resident.currentZoneName ?? t('position.zoneUnknown', { defaultValue: 'Unknown zone' });
}

export function PositionSummaryBar({ resident, fetchedAt, loading }: PositionSummaryBarProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';

  const items = useMemo(
    () => [
      {
        label: t('position.liveStatus', { defaultValue: 'Live status' }),
        value: resident
          ? t(truthLabelKey[resident.truthState], { defaultValue: truthDefaultLabel[resident.truthState] })
          : t('position.noSelection', { defaultValue: 'No resident selected' }),
        toneClass: resident ? `position-state-pill position-state-pill--${resident.truthState}` : 'position-state-pill position-state-pill--offline'
      },
      {
        label: t('position.currentLocation', { defaultValue: 'Current zone' }),
        value: getZoneLabel(resident, t),
        toneClass: 'position-summary-bar__text'
      },
      {
        label: t('position.freshness', { defaultValue: 'Freshness' }),
        value: resident
          ? t(freshnessLabelKey[resident.freshnessLevel], { defaultValue: freshnessDefaultLabel[resident.freshnessLevel] })
          : t('position.noDataShort', { defaultValue: 'No data' }),
        toneClass: resident
          ? `position-freshness-pill position-freshness-pill--${resident.freshnessLevel}`
          : 'position-freshness-pill position-freshness-pill--stale'
      },
      {
        label: t('position.lastUpdate', { defaultValue: 'Last update' }),
        value: resident ? formatTimestamp(resident.lastSeenAt, locale) : formatTimestamp(fetchedAt, locale),
        toneClass: 'position-summary-bar__text'
      }
    ],
    [fetchedAt, locale, resident, t]
  );

  return (
    <section className="position-command-center__surface position-summary-bar">
      <div className="position-summary-bar__identity">
        <p className="position-command-center__eyebrow">
          {t('position.summaryEyebrow', { defaultValue: 'Selected resident' })}
        </p>
        <h1>{resident?.displayName ?? t('position.noSelection', { defaultValue: 'No resident selected' })}</h1>
        <p className="position-command-center__muted">
          {loading
            ? t('common.loading', { defaultValue: 'Loading...' })
            : t('position.snapshotFetchedAt', {
                defaultValue: `Snapshot fetched ${formatTimestamp(fetchedAt, locale)}`
              })}
        </p>
      </div>

      <dl className="position-summary-bar__grid">
        {items.map((item) => (
          <div key={item.label} className="position-summary-bar__item">
            <dt>{item.label}</dt>
            <dd className={item.toneClass}>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
