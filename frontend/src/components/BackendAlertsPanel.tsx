import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useBackendEvents } from '../hooks/useBackendEvents';
import { eventApi, locationApi } from '../services/api';
import { useResidentLiveStore } from '../shared/resident-live-store';
import type { BackendEvent, BackendLocation, EventStatus, EventType } from '../types/backend';

type AlertLevel = 'critical' | 'warning' | 'info';

const EVENT_PRIORITY: Record<EventType, number> = {
  fall: 0,
  sos: 0,
  vital_signs_abnormal: 1,
  geofence_breach: 1,
  bed_exit: 2,
  bathroom_retention: 2
};

const EVENT_LEVEL: Record<EventType, AlertLevel> = {
  fall: 'critical',
  sos: 'critical',
  vital_signs_abnormal: 'warning',
  geofence_breach: 'warning',
  bed_exit: 'info',
  bathroom_retention: 'info'
};

const ACTIVE_STATUSES: EventStatus[] = ['unhandled', 'confirmed'];

export const BackendAlertsPanel = () => {
  const { t, i18n } = useTranslation();
  const { residents } = useResidentLiveStore();
  const [locations, setLocations] = useState<BackendLocation[]>([]);
  const [handlingId, setHandlingId] = useState<number | null>(null);

  const { events, loading, error, refresh } = useBackendEvents({
    pollIntervalMs: 5000,
    limit: 200
  });

  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';

  useEffect(() => {
    void locationApi.list({ limit: 1000 }).then(setLocations).catch(() => setLocations([]));
  }, []);

  const locationsById = useMemo(() => {
    const map = new Map<number, BackendLocation>();
    locations.forEach((loc) => {
      map.set(loc.location_zone_id, loc);
    });
    return map;
  }, [locations]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aPriority = EVENT_PRIORITY[a.event_type] ?? 99;
      const bPriority = EVENT_PRIORITY[b.event_type] ?? 99;
      if (aPriority !== bPriority) return aPriority - bPriority;
      const aTime = Date.parse(String(a.event_timestamp ?? ''));
      const bTime = Date.parse(String(b.event_timestamp ?? ''));
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });
  }, [events]);

  const visibleEvents = useMemo(() => sortedEvents.slice(0, 6), [sortedEvents]);

  const formatEventTime = useCallback(
    (timestamp?: string | null) => {
      if (!timestamp) return t('common.unknown');
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return String(timestamp);
      return date.toLocaleString(locale, { hour: '2-digit', minute: '2-digit' });
    },
    [locale, t]
  );

  const resolveResidentName = useCallback(
    (event: BackendEvent) => {
      const resident = residents[String(event.related_user_id)];
      return resident?.name ?? `#${event.related_user_id}`;
    },
    [residents]
  );

  const resolveLocationLabel = useCallback(
    (event: BackendEvent) => {
      const fromZone = event.location_zone_id ? locationsById.get(event.location_zone_id)?.name : null;
      if (fromZone) return fromZone;
      const params = event.event_params as Record<string, unknown> | null | undefined;
      if (params && typeof params.zone_name === 'string') return params.zone_name;
      if (params && typeof params.location_name === 'string') return params.location_name;
      const resident = residents[String(event.related_user_id)];
      return resident?.lastSeenLocation ?? t('location.zones.unknown');
    },
    [locationsById, residents, t]
  );

  const resolveTypeLabel = useCallback(
    (eventType: EventType) => {
      return t(`location.events.types.${eventType}`, { defaultValue: eventType });
    },
    [t]
  );

  const resolveStatusLabel = useCallback(
    (status: EventStatus) => {
      return t(`events.status.${status}`, { defaultValue: status });
    },
    [t]
  );

  const handleStatusUpdate = async (eventId: number, status: EventStatus) => {
    setHandlingId(eventId);
    try {
      await eventApi.handle(eventId, status);
      await refresh();
    } finally {
      setHandlingId(null);
    }
  };

  return (
    <article className="panel">
      <header className="section-heading">
        <h2>{t('alerts.backend.title')}</h2>
        <span className="chip chip--quiet">{t('alerts.backend.subtitle')}</span>
      </header>

      {error ? <div className="admin-error">{error}</div> : null}
      {loading ? <div className="admin-loading">{t('alerts.backend.loading')}</div> : null}

      <ul className="alert-list">
        {visibleEvents.length === 0 ? (
          <li className="alert alert-info">
            <span className="alert-pill">{t('alertLevels.info')}</span>
            <span className="alert-text">{t('alerts.backend.empty')}</span>
            <span className="alert-time">{t('common.unknown')}</span>
          </li>
        ) : (
          visibleEvents.map((event) => {
            const level = EVENT_LEVEL[event.event_type] ?? 'info';
            const isActive = ACTIVE_STATUSES.includes(event.event_status);
            const isBusy = handlingId === event.event_id;
            return (
              <li key={event.event_id} className={`alert alert-${level} alert--backend`}>
                <span className="alert-pill">{resolveTypeLabel(event.event_type)}</span>
                <div className="alert-body">
                  <span className="alert-text">
                    {t('alerts.backend.item', {
                      resident: resolveResidentName(event),
                      location: resolveLocationLabel(event)
                    })}
                  </span>
                  <span className="alert-meta">
                    {resolveStatusLabel(event.event_status)} · {formatEventTime(event.event_timestamp)}
                  </span>
                </div>
                <div className="alert-actions">
                  <button
                    type="button"
                    className="alert-action alert-action--primary"
                    onClick={() => void handleStatusUpdate(event.event_id, 'confirmed')}
                    disabled={!isActive || isBusy}
                  >
                    {t('location.actions.ack')}
                  </button>
                  <button
                    type="button"
                    className="alert-action"
                    onClick={() => void handleStatusUpdate(event.event_id, 'resolved')}
                    disabled={!isActive || isBusy}
                  >
                    {t('location.actions.resolve')}
                  </button>
                  <button
                    type="button"
                    className="alert-action alert-action--ghost"
                    onClick={() => void handleStatusUpdate(event.event_id, 'false_alarm')}
                    disabled={!isActive || isBusy}
                  >
                    {t('location.actions.falseAlarm')}
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </article>
  );
};
