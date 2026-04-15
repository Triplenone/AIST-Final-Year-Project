import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { FamilySummarySection } from '../components/family/FamilySummarySection';
import { FamilyResidentCard } from '../components/family/FamilyResidentCard';
import { VitalsHistoryPanel } from '../components/family/VitalsHistoryPanel';
import { residentApi } from '../services/api';
import '../styles/family-page.css';
import type { BackendResident } from '../types/backend';

export function FamilyPage() {
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
      setSelectedResidentId((current) =>
        current && nextResidents.some((resident) => resident.id === current) ? current : null
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t('family.errorFallback'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadResidents();
  }, [loadResidents]);

  const selectedResident =
    residents.find((resident) => resident.id === selectedResidentId) ?? null;

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

      {residents.length > 0 ? (
        <div className="family-page__grid" role="list" aria-label={t('family.gridAria')}>
          {residents.map((resident) => (
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
        residentId={selectedResidentId}
        residentName={selectedResident?.name ?? null}
      />
    </section>
  );
}
