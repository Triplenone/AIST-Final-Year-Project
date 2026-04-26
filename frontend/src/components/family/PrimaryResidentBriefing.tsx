import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { FamilySummaryTodayResponse } from '../../services/api';
import type { BackendResident } from '../../types/backend';

type PrimaryResidentBriefingProps = {
  resident: BackendResident;
  displayNameOverride?: string | null;
  summary: FamilySummaryTodayResponse | null;
  summaryLoading: boolean;
  summaryError: string | null;
  summaryUnavailable: boolean;
};

const getAvatarInitial = (name: string) => {
  const trimmedName = name.trim();
  return trimmedName ? trimmedName.charAt(0).toUpperCase() : '?';
};

const getRoleLabel = (roleType: BackendResident['role_type'], t: (key: string) => string) => {
  switch (roleType) {
    case 'caregiver':
      return t('auth.roles.caregiver');
    case 'administrator':
      return t('auth.roles.admin');
    default:
      return t('family.briefing.roleFallback');
  }
};

const formatBloodPressure = (resident: BackendResident, placeholder: string) => {
  const systolic = resident.vitals?.bp_systolic;
  const diastolic = resident.vitals?.bp_diastolic;
  return systolic && diastolic ? `${systolic}/${diastolic}` : placeholder;
};

export function PrimaryResidentBriefing({
  resident,
  displayNameOverride = null,
  summary,
  summaryLoading,
  summaryError,
  summaryUnavailable
}: PrimaryResidentBriefingProps) {
  const { t } = useTranslation();
  const [imageUnavailable, setImageUnavailable] = useState(false);
  const [careNotes, setCareNotes] = useState('');

  const displayName = displayNameOverride?.trim() ? displayNameOverride : resident.name;
  const avatarUrl = resident.avatar_url?.trim() ? resident.avatar_url.trim() : null;
  const showImage = Boolean(avatarUrl) && !imageUnavailable;
  const placeholder = '--';
  const moodNeedsAttention = resident.status === 'high' || resident.status === 'followUp';
  const roleLabel = getRoleLabel(resident.role_type, t);

  const vitals = useMemo(
    () => [
      {
        label: t('family.briefing.vitals.heartRate'),
        value: resident.vitals?.hr ?? resident.heart_rate ?? placeholder
      },
      {
        label: t('family.briefing.vitals.bloodPressure'),
        value: formatBloodPressure(resident, placeholder)
      },
      {
        label: t('family.briefing.vitals.respiration'),
        value: placeholder
      }
    ],
    [resident, t]
  );

  const activities = useMemo(
    () => [t('family.briefing.activities.breakfastCompleted'), t('family.briefing.activities.middayWalk')],
    [t]
  );

  return (
    <section className="family-primary-briefing family-panel" aria-live="polite">
      <div className="family-primary-briefing__hero">
        <span className="family-primary-briefing__avatar-wrap">
          {showImage ? (
            <img
              className="family-primary-briefing__avatar"
              src={avatarUrl ?? undefined}
              alt={t('family.avatarAlt', { name: displayName })}
              loading="lazy"
              onError={() => setImageUnavailable(true)}
            />
          ) : (
            <span className="family-primary-briefing__avatar-fallback" aria-hidden="true">
              {getAvatarInitial(displayName)}
            </span>
          )}
        </span>

        <div className="family-primary-briefing__hero-copy">
          <p className="family-panel__eyebrow">{t('family.briefing.heroEyebrow')}</p>
          <div className="family-primary-briefing__hero-heading">
            <div>
              <h3>{displayName}</h3>
              <p className="family-primary-briefing__room">
                {t('family.roomLabel')}: {resident.room?.trim() || t('family.roomUnknown')}
              </p>
            </div>
            <span className="family-primary-briefing__role">{roleLabel}</span>
          </div>

          <div className="family-primary-briefing__summary-block">
            <div className="family-primary-briefing__summary-header">
              <h4>{t('family.summary.title')}</h4>
            </div>

            {summaryLoading ? (
              <div className="family-panel__state family-panel__state--loading">
                <strong>{t('family.summary.loadingTitle')}</strong>
                <p>{t('family.summary.loadingBody')}</p>
              </div>
            ) : null}

            {!summaryLoading && summaryUnavailable ? (
              <div className="family-panel__state family-panel__state--warning">
                <strong>{t('family.summary.unavailableTitle')}</strong>
                <p>{t('family.summary.unavailableBody')}</p>
              </div>
            ) : null}

            {!summaryLoading && !summaryUnavailable && summaryError ? (
              <div className="family-panel__state family-panel__state--error" role="alert">
                <strong>{t('family.summary.errorTitle')}</strong>
                <p>{summaryError}</p>
              </div>
            ) : null}

            {!summaryLoading && !summaryUnavailable && !summaryError && !summary ? (
              <div className="family-panel__state family-panel__state--empty">
                <strong>{t('family.summary.emptyTitle')}</strong>
                <p>{t('family.summary.emptyBody')}</p>
              </div>
            ) : null}

            {summary ? (
              <div className="family-primary-briefing__summary-content">
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
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="family-primary-briefing__grid">
        <article className="family-primary-briefing__card">
          <div className="family-primary-briefing__card-header">
            <h4>{t('family.briefing.vitals.title')}</h4>
          </div>
          <dl className="family-primary-briefing__metrics">
            {vitals.map((item) => (
              <div key={item.label} className="family-primary-briefing__metric">
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </article>

        <article className="family-primary-briefing__card">
          <div className="family-primary-briefing__card-header">
            <h4>{t('family.briefing.activities.title')}</h4>
          </div>
          <ul className="family-primary-briefing__activity-list">
            {activities.map((activity) => (
              <li key={activity}>{activity}</li>
            ))}
          </ul>
        </article>

        <article className="family-primary-briefing__card">
          <div className="family-primary-briefing__card-header">
            <h4>{t('family.briefing.mood.title')}</h4>
          </div>
          <div
            className={`family-primary-briefing__mood${moodNeedsAttention ? ' family-primary-briefing__mood--attention' : ''}`}
          >
            <span className="family-primary-briefing__mood-icon" aria-hidden="true">
              {moodNeedsAttention ? ':-(' : ':-)'}
            </span>
            <span>{moodNeedsAttention ? t('family.briefing.mood.attention') : t('family.briefing.mood.stable')}</span>
          </div>
        </article>

        <article className="family-primary-briefing__card">
          <div className="family-primary-briefing__card-header">
            <h4>{t('family.briefing.notes.title')}</h4>
          </div>
          <label className="family-primary-briefing__notes-label">
            <span className="sr-only">{t('family.briefing.notes.title')}</span>
            <textarea
              className="family-primary-briefing__notes"
              value={careNotes}
              onChange={(event) => setCareNotes(event.target.value)}
              placeholder={t('family.briefing.notes.placeholder')}
              rows={5}
            />
          </label>
        </article>
      </div>
    </section>
  );
}
