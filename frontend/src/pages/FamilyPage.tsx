import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { PrimaryResidentBriefing } from '../components/family/PrimaryResidentBriefing';
import { FamilySummarySection } from '../components/family/FamilySummarySection';
import { FamilyResidentCard } from '../components/family/FamilyResidentCard';
import { VitalsHistoryPanel } from '../components/family/VitalsHistoryPanel';
import { getPositionZoneFromCoords, getPositionZoneLabelKey } from '../adapters/position-command-center';
import { useFamilySummary } from '../hooks/useFamilySummary';
import { deviceApi, mongoUpstreamApi, residentApi } from '../services/api';
import '../styles/family-page.css';
import type { BackendResident } from '../types/backend';
import { slugify } from '../utils/resident-slug';

type FamilyPageProps = {
  primaryResidentSlug?: string | null;
  primaryResidentFallbackDisplayName?: string | null;
};

type ResolvedPrimary = { resident: BackendResident; matched: boolean } | null;

function isUnknownRoom(value: string | null | undefined): boolean {
  const text = String(value ?? '').trim();
  if (!text) return true;
  return text.toLowerCase() === 'unknown';
}

const resolvePrimaryResident = (
  residents: BackendResident[],
  primaryResidentSlug?: string | null
): ResolvedPrimary => {
  if (residents.length === 0) return null;
  if (!primaryResidentSlug) return { resident: residents[0], matched: false };
  const matchedResident = residents.find((resident) => slugify(resident.name) === primaryResidentSlug);
  if (matchedResident) return { resident: matchedResident, matched: true };
  return { resident: residents[0], matched: false };
};

export function FamilyPage({
  primaryResidentSlug = null,
  primaryResidentFallbackDisplayName = null
}: FamilyPageProps) {
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
      const devices = await deviceApi.list({ limit: 1000 });
      const deviceIdByUserId = new Map<string, number>();
      for (const device of devices) {
        const uid = device.elderly_user_id;
        if (uid == null || device.device_id == null) continue;
        deviceIdByUserId.set(String(uid), device.device_id);
      }

      const fallbackCandidates = nextResidents.filter(
        (resident) =>
          isUnknownRoom(resident.room) &&
          (resident.device_id != null || deviceIdByUserId.get(String(resident.id)) != null)
      );

      let mergedResidents = nextResidents;
      if (fallbackCandidates.length > 0) {
        const resolvedByResidentId = new Map<string, string>();
        const results = await Promise.allSettled(
          fallbackCandidates.map((resident) => {
            const queryDeviceId = resident.device_id ?? deviceIdByUserId.get(String(resident.id));
            return queryDeviceId != null
              ? mongoUpstreamApi.getLatestValidLocation(String(queryDeviceId), { scan_limit: 300 })
              : Promise.resolve({ found: false } as const);
          })
        );

        for (let i = 0; i < results.length; i += 1) {
          const result = results[i];
          const resident = fallbackCandidates[i];
          if (result.status !== 'fulfilled') continue;
          if (!result.value?.found) continue;

          const locationName = result.value.location_name?.trim();
          if (locationName) {
            resolvedByResidentId.set(resident.id, locationName);
            continue;
          }

          if (typeof result.value.x === 'number' && typeof result.value.y === 'number') {
            const zoneId = getPositionZoneFromCoords({ x: result.value.x, y: result.value.y });
            const labelKey = getPositionZoneLabelKey(zoneId);
            if (labelKey) {
              resolvedByResidentId.set(
                resident.id,
                t(labelKey, { defaultValue: zoneId ?? t('family.roomUnknown') })
              );
            }
          }
        }

        if (resolvedByResidentId.size > 0) {
          mergedResidents = nextResidents.map((resident) => {
            const nextRoom = resolvedByResidentId.get(resident.id);
            if (!nextRoom) return resident;
            return {
              ...resident,
              room: nextRoom,
              last_seen_location: resident.last_seen_location?.trim() ? resident.last_seen_location : nextRoom
            };
          });
        }
      }
      setResidents(mergedResidents);
      setSelectedResidentId((current) => {
        if (current && mergedResidents.some((resident) => resident.id === current)) {
          return current;
        }

        const resolved = resolvePrimaryResident(mergedResidents, primaryResidentSlug);
        return resolved?.resident.id ?? mergedResidents[0]?.id ?? null;
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

  const resolvedPrimary = useMemo(
    () => resolvePrimaryResident(residents, primaryResidentSlug),
    [primaryResidentSlug, residents]
  );
  const primaryResident = resolvedPrimary?.resident ?? null;
  const primaryDisplayNameOverride =
    resolvedPrimary && !resolvedPrimary.matched ? primaryResidentFallbackDisplayName : null;
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
          displayNameOverride={primaryDisplayNameOverride}
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
