import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useBackendEvents } from '../hooks/useBackendEvents';
import { deviceApi, eventApi, locationApi, residentApi } from '../services/api';
import type { BackendEvent } from '../types/backend';

type EmergencyDetails = {
  residentLabel: string;
  locationLabel: string;
  deviceLocation: string | null;
};

const EVENT_PRIORITY: Record<BackendEvent['event_type'], number> = {
  fall: 0,
  sos: 0,
  vital_signs_abnormal: 1,
  geofence_breach: 1,
  bed_exit: 2,
  bathroom_retention: 2
};

const sortByTimestampDesc = (events: BackendEvent[]) => {
  return [...events].sort((a, b) => {
    const aTime = Date.parse(String(a.event_timestamp ?? ''));
    const bTime = Date.parse(String(b.event_timestamp ?? ''));
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;
    return bTime - aTime;
  });
};

export const EmergencyAlertModal = () => {
  const { t } = useTranslation();
  const unknownLabel = t('common.unknown');

  const { activeEvents, refresh } = useBackendEvents({
    includeTypes: ['fall', 'sos', 'vital_signs_abnormal', 'geofence_breach'],
    activeStatuses: ['unhandled', 'confirmed'],
    pollIntervalMs: 1500
  });

  const event = useMemo(() => {
    if (!activeEvents.length) return null;
    const sorted = sortByTimestampDesc(activeEvents).sort((a, b) => {
      const priorityA = EVENT_PRIORITY[a.event_type] ?? 99;
      const priorityB = EVENT_PRIORITY[b.event_type] ?? 99;
      return priorityA - priorityB;
    });
    return sorted[0] ?? null;
  }, [activeEvents]);

  const [details, setDetails] = useState<EmergencyDetails>({
    residentLabel: unknownLabel,
    locationLabel: unknownLabel,
    deviceLocation: null
  });
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [handling, setHandling] = useState<'confirmed' | 'resolved' | 'false_alarm' | null>(null);

  useEffect(() => {
    if (!event) {
      setDetails({
        residentLabel: unknownLabel,
        locationLabel: unknownLabel,
        deviceLocation: null
      });
      setDetailsError(null);
      setDetailsLoading(false);
      return;
    }

    let cancelled = false;
    const loadDetails = async () => {
      setDetailsLoading(true);
      setDetailsError(null);
      try {
        const [resident, location, device] = await Promise.all([
          event.related_user_id ? residentApi.get(event.related_user_id) : Promise.resolve(null),
          event.location_zone_id ? locationApi.get(event.location_zone_id) : Promise.resolve(null),
          event.trigger_device_id ? deviceApi.get(event.trigger_device_id) : Promise.resolve(null)
        ]);

        if (cancelled) return;

        const residentLabel = resident?.name ? resident.name : `Resident #${event.related_user_id}`;
        const deviceLocation = device?.deploy_location ?? null;
        const locationLabel = location?.name ?? deviceLocation ?? unknownLabel;

        setDetails({ residentLabel, locationLabel, deviceLocation });
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : t('emergency.errors.details');
          setDetailsError(msg);
        }
      } finally {
        if (!cancelled) {
          setDetailsLoading(false);
        }
      }
    };

    void loadDetails();
    return () => {
      cancelled = true;
    };
  }, [event?.event_id, event?.related_user_id, event?.location_zone_id, event?.trigger_device_id, t, unknownLabel]);

  const eventTimeLabel = useMemo(() => {
    if (!event?.event_timestamp) return unknownLabel;
    const timestamp = new Date(event.event_timestamp);
    if (Number.isNaN(timestamp.getTime())) return String(event.event_timestamp);
    return timestamp.toLocaleString();
  }, [event?.event_timestamp, unknownLabel]);

  const eventTypeLabel = useMemo(() => {
    if (!event) return unknownLabel;
    return t(`location.events.types.${event.event_type}`, { defaultValue: event.event_type });
  }, [event, t, unknownLabel]);

  const eventStatusLabel = useMemo(() => {
    if (!event) return unknownLabel;
    return t(`events.status.${event.event_status}`, { defaultValue: event.event_status });
  }, [event, t, unknownLabel]);

  const badgeLabel = useMemo(() => {
    if (!event) return t('emergency.badge.default');
    return t(`emergency.badge.${event.event_type}`, { defaultValue: t('emergency.badge.default') });
  }, [event, t]);

  const handleEvent = async (status: 'confirmed' | 'resolved' | 'false_alarm') => {
    if (!event) return;
    setHandling(status);
    setDetailsError(null);
    try {
      await eventApi.handle(event.event_id, status);
      const statusLabel =
        status === 'false_alarm' ? 'False alarm' : `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
      console.info(`Action logged to DB: ${statusLabel}`);
      await refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('emergency.errors.update');
      setDetailsError(msg);
    } finally {
      setHandling(null);
    }
  };

  if (!event) return null;

  const isBusy = handling !== null;

  return (
    <div className="emergency-overlay" role="dialog" aria-modal="true" aria-labelledby="emergency-title">
      <div className="emergency-overlay__panel">
        <div className="emergency-overlay__badge">{badgeLabel}</div>
        <h2 id="emergency-title" className="emergency-overlay__title">
          {t('emergency.title')}
        </h2>
        <p className="emergency-overlay__subtitle">{t('emergency.subtitle')}</p>

        <div className="emergency-overlay__details">
          <div>
            <span className="emergency-overlay__label">{t('emergency.labels.resident')}</span>
            <span className="emergency-overlay__value">{details.residentLabel}</span>
          </div>
          <div>
            <span className="emergency-overlay__label">{t('emergency.labels.location')}</span>
            <span className="emergency-overlay__value">{details.locationLabel}</span>
          </div>
          <div>
            <span className="emergency-overlay__label">{t('emergency.labels.time')}</span>
            <span className="emergency-overlay__value">{eventTimeLabel}</span>
          </div>
          <div>
            <span className="emergency-overlay__label">{t('emergency.labels.status')}</span>
            <span className="emergency-overlay__value">{eventStatusLabel}</span>
          </div>
          <div>
            <span className="emergency-overlay__label">{t('emergency.labels.type')}</span>
            <span className="emergency-overlay__value">{eventTypeLabel}</span>
          </div>
        </div>

        {detailsLoading ? <p className="emergency-overlay__note">{t('emergency.loading')}</p> : null}
        {detailsError ? <p className="emergency-overlay__error">{detailsError}</p> : null}

        <div className="emergency-overlay__actions">
          <button type="button" className="emergency-button emergency-button--primary" onClick={() => void handleEvent('confirmed')} disabled={isBusy}>
            {t('location.actions.ack')}
          </button>
          <button type="button" className="emergency-button" onClick={() => void handleEvent('resolved')} disabled={isBusy}>
            {t('location.actions.resolve')}
          </button>
          <button type="button" className="emergency-button emergency-button--ghost" onClick={() => void handleEvent('false_alarm')} disabled={isBusy}>
            {t('location.actions.falseAlarm')}
          </button>
        </div>
      </div>
    </div>
  );
};
