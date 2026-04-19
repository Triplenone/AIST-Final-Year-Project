import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PrimaryResidentBriefing } from '../components/family/PrimaryResidentBriefing';
import { FamilySummarySection } from '../components/family/FamilySummarySection';
import { FamilyResidentCard } from '../components/family/FamilyResidentCard';
import { VitalsHistoryPanel } from '../components/family/VitalsHistoryPanel';
import { useFamilySummary } from '../hooks/useFamilySummary';
import { residentApi } from '../services/api';
import '../styles/family-page.css';
import type { BackendResident } from '../types/backend';
import { slugify } from '../utils/resident-slug';

type FamilyPageProps = {
  primaryResidentSlug?: string | null;
};

const resolvePrimaryResident = (residents: BackendResident[], primaryResidentSlug?: string | null) => {
  if (residents.length === 0) return null;
  if (!primaryResidentSlug) return residents[0];
  return residents.find((resident) => slugify(resident.name) === primaryResidentSlug) ?? residents[0];
};

export function FamilyPage({ primaryResidentSlug = null }: FamilyPageProps) {
  const { t } = useTranslation();
  const [residents, setResidents] = useState<BackendResident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);

  const loadResidents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextResidents = await residentApi.list({ limit: 500 });
      setResidents(nextResidents);
      setSelectedResidentId((current) => {
        if (current && nextResidents.some((resident) => resident.id === current)) {
          return current;
        }

        const primaryResident = resolvePrimaryResident(nextResidents, primaryResidentSlug);
        return primaryResident?.id ?? nextResidents[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('family.errorFallback'));
    } finally {
      setLoading(false);
    }
  }, [primaryResidentSlug, t]);

  useEffect(() => {
    void loadResidents();
  }, [loadResidents]);

  const primaryResident = useMemo(
    () => resolvePrimaryResident(residents, primaryResidentSlug),
    [primaryResidentSlug, residents]
  );
  const secondaryResidents = useMemo(
    () => residents.filter((resident) => resident.id !== primaryResident?.id),
    [primaryResident?.id, residents]
  );
  const selectedResident = residents.find((resident) => resident.id === selectedResidentId) ?? primaryResident ?? null;
  const {
    summary: primarySummary,
    loading: primarySummaryLoading,
    error: primarySummaryError,
    isUnavailable: primarySummaryUnavailable
  } = useFamilySummary(primaryResident?.id ?? null);

  return (
    <section className="family-page route-surface route-surface--family">
      <header className="family-page__header">
        <div>
          <p className="route-surface__eyebrow">{t('layout.nav.family')}</p>
          <h2>{t('family.title')}</h2>
          <p className="route-surface__note">{t('family.note')}</p>
        </div>

        <button type="button" className="secondary family-page__refresh" onClick={() => void loadResidents()}>
          {loading ? t('common.loading') : t('family.refresh')}
        </button>
      </header>

      {error ? (
        <div className="family-page__banner family-page__banner--error" role="alert">
          <strong>{t('family.errorTitle')}</strong>
          <p>{error}</p>
        </div>
      ) : null}

      {loading && residents.length === 0 ? (
        <div className="family-page__banner family-page__banner--loading" aria-live="polite">
          <strong>{t('family.loadingTitle')}</strong>
          <p>{t('family.loadingBody')}</p>
        </div>
      ) : null}

      {!loading && !error && residents.length === 0 ? (
        <div className="family-page__banner family-page__banner--empty" aria-live="polite">
          <strong>{t('family.emptyTitle')}</strong>
          <p>{t('family.emptyBody')}</p>
        </div>
      ) : null}

      {primaryResident ? (
        <PrimaryResidentBriefing
          resident={primaryResident}
          summary={primarySummary}
          summaryLoading={primarySummaryLoading}
          summaryError={primarySummaryError}
          summaryUnavailable={primarySummaryUnavailable}
        />
      ) : null}

      {secondaryResidents.length > 0 ? (
        <div className="family-page__grid" role="list" aria-label={t('family.gridAria')}>
          {secondaryResidents.map((resident) => (
            <div key={resident.id} role="listitem">
              <FamilyResidentCard
                resident={resident}
                isSelected={resident.id === selectedResidentId}
                onSelect={setSelectedResidentId}
              />
            </div>
          ))}
        </div>
      ) : null}

      {selectedResident ? (
        <VitalsHistoryPanel
          residentId={selectedResident.id}
          residentName={selectedResident.name}
        />
      ) : null}

      <FamilySummarySection
        residentId={selectedResident?.id ?? null}
        residentName={selectedResident?.name ?? null}
      />
    </section>
  );
}
