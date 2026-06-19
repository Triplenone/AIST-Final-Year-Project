import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { eventApi, flycareAdminApi, type FlightPublishPayload, type FlyCareFlightPreset } from '../../services/api';
import type { BackendEvent, EventStatus, EventType } from '../../types/backend';

type FlightFormState = {
  device_id: string;
  mysql_device_id: string;
  passengerName: string;
  flightNumber: string;
  airline: string;
  departureAirport: string;
  destination: string;
  seatNumber: string;
  scheduled_departure: string;
  estimated_departure: string;
  boarding_time: string;
  boarding_gate: string;
  status: string;
  delay_minutes: string;
  delay_reason: string;
  gate_changed: boolean;
  terminal: string;
  checkin_counter: string;
};

const FLIGHT_STATUS_OPTIONS = ['scheduled', 'boarding', 'delayed', 'cancelled'] as const;
const FINAL_DEMO_DEVICE_IDS = new Set([
  'ESP32_000048CA43A42298',
  'ESP32_0000C8292A04A7AC',
  'ESP32_0000A022A443CA48',
  'ESP32_00008C292A04A7AC',
  'ESP32_00009022A443CA48',
  'ESP32_0000E03948D4DB1C'
]);
const FINAL_DEMO_DEVICE_ORDER = new Map(
  Array.from(FINAL_DEMO_DEVICE_IDS).map((deviceId, index) => [deviceId, index])
);

function formatHhmm(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function defaultScheduleTimes(): Pick<FlightFormState, 'scheduled_departure' | 'estimated_departure' | 'boarding_time'> {
  const scheduledDate = addMinutes(new Date(), 60);
  const scheduled = formatHhmm(scheduledDate);
  return {
    scheduled_departure: scheduled,
    estimated_departure: scheduled,
    boarding_time: formatHhmm(addMinutes(scheduledDate, -50))
  };
}

const defaultFlightFields = (): Omit<
  FlightFormState,
  'device_id' | 'mysql_device_id' | 'passengerName'
> => ({
  flightNumber: 'CX910',
  airline: 'Cathay Pacific',
  departureAirport: 'HKG',
  destination: 'Singapore',
  seatNumber: '21C',
  ...defaultScheduleTimes(),
  boarding_gate: '11',
  status: 'scheduled',
  delay_minutes: '0',
  delay_reason: '',
  gate_changed: false,
  terminal: 'T3',
  checkin_counter: 'C12-C18'
});

const emptyForm = (): FlightFormState => ({
  device_id: '',
  mysql_device_id: '',
  passengerName: '',
  ...defaultFlightFields(),
  delay_minutes: '0',
  delay_reason: '',
  gate_changed: false
});

function toPayload(
  form: FlightFormState,
  options: { publish_mqtt: boolean; save_mongo: boolean }
): FlightPublishPayload {
  const mysqlId = form.mysql_device_id.trim();
  const delayRaw = form.delay_minutes.trim();
  const scheduled = form.scheduled_departure.trim();
  const destination = form.destination.trim();
  const boardingGate = form.boarding_gate.trim();

  return {
    device_id: form.device_id.trim(),
    mysql_device_id: mysqlId ? Number(mysqlId) : undefined,
    passengerName: form.passengerName.trim(),
    flightNumber: form.flightNumber.trim(),
    airline: form.airline.trim() || undefined,
    departureAirport: form.departureAirport.trim() || undefined,
    arrivalAirport: destination || undefined,
    destination: destination || undefined,
    seatNumber: form.seatNumber.trim() || undefined,
    flightTime: scheduled || undefined,
    scheduled_departure: scheduled || undefined,
    estimated_departure: form.estimated_departure.trim() || undefined,
    boarding_time: form.boarding_time.trim() || undefined,
    gate: boardingGate || undefined,
    boarding_gate: boardingGate || undefined,
    status: form.status.trim() || undefined,
    delay_minutes: delayRaw ? Number(delayRaw) : undefined,
    delay_reason: form.delay_reason.trim() || undefined,
    gate_changed: form.gate_changed,
    terminal: form.terminal.trim() || undefined,
    checkin_counter: form.checkin_counter.trim() || undefined,
    publish_mqtt: options.publish_mqtt,
    save_mongo: options.save_mongo
  };
}

export const FlyCareAdmin = () => {
  const { t } = useTranslation();
  const [presets, setPresets] = useState<FlyCareFlightPreset[]>([]);
  const [mqttTopic, setMqttTopic] = useState('smartwatch/{device_id}/flight');
  const [mqttStatus, setMqttStatus] = useState<{
    connected?: boolean;
    broker?: string;
    port?: number;
  } | null>(null);
  const [form, setForm] = useState<FlightFormState>(emptyForm);
  const [selectedPresetKey, setSelectedPresetKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [alertPublishing, setAlertPublishing] = useState(false);
  const [eventHandling, setEventHandling] = useState<number | null>(null);
  const [activeEvents, setActiveEvents] = useState<BackendEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [presetRes, mqttRes] = await Promise.all([
        flycareAdminApi.getPresets(),
        flycareAdminApi.getMqttStatus()
      ]);
      const items = (presetRes.items ?? [])
        .filter((item) => FINAL_DEMO_DEVICE_IDS.has(item.device_id))
        .sort(
          (a, b) =>
            (a.demo_id ?? FINAL_DEMO_DEVICE_ORDER.get(a.device_id) ?? 999) -
            (b.demo_id ?? FINAL_DEMO_DEVICE_ORDER.get(b.device_id) ?? 999)
        );
      setPresets(items);
      setMqttTopic(presetRes.downlink_topic_template ?? 'smartwatch/{device_id}/flight');
      setMqttStatus({
        connected: mqttRes.connected,
        broker: mqttRes.broker,
        port: mqttRes.port
      });
      if (!selectedPresetKey && items[0]) {
        const first = items[0];
        setSelectedPresetKey(first.device_id);
        setMqttTopic(first.mqtt_topic ?? `smartwatch/${first.device_id}/flight`);
        setForm((current) => ({
          ...current,
          device_id: first.device_id,
          mysql_device_id: first.mysql_device_id != null ? String(first.mysql_device_id) : '',
          passengerName: first.passengerName ?? current.passengerName
        }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('admin.flycare.errorLoad');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedPresetKey, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const presetOptions = useMemo(
    () =>
      presets.map((item) => ({
        key: item.device_id,
        label: item.passengerName
          ? `${item.passengerName} · ${item.device_id}`
          : item.device_id,
        item
      })),
    [presets]
  );

  const applyPreset = (deviceId: string) => {
    const preset = presets.find((item) => item.device_id === deviceId);
    if (!preset) return;
    setSelectedPresetKey(deviceId);
    setMqttTopic(preset.mqtt_topic ?? `smartwatch/${preset.device_id}/flight`);
    setForm((current) => ({
      ...current,
      device_id: preset.device_id,
      mysql_device_id: preset.mysql_device_id != null ? String(preset.mysql_device_id) : '',
      passengerName: preset.passengerName ?? current.passengerName
    }));
  };

  const updateField = <K extends keyof FlightFormState>(key: K, value: FlightFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validateForm = (): string | null => {
    if (!form.device_id.trim()) return t('admin.flycare.validationDeviceId');
    if (!form.passengerName.trim()) return t('admin.flycare.validationPassenger');
    if (!form.flightNumber.trim()) return t('admin.flycare.validationFlightNumber');
    if (form.delay_minutes.trim() && Number.isNaN(Number(form.delay_minutes.trim()))) {
      return t('admin.flycare.validationDelayMinutes');
    }
    return null;
  };

  const selectedDownlinkTopic = form.device_id.trim()
    ? `smartwatch/${form.device_id.trim()}/flight`
    : mqttTopic;

  const selectedPreset = useMemo(
    () => presets.find((item) => item.device_id === selectedPresetKey || item.device_id === form.device_id.trim()) ?? null,
    [form.device_id, presets, selectedPresetKey]
  );

  const refreshActiveEvents = useCallback(async () => {
    const mysqlId = Number(form.mysql_device_id.trim());
    if (!mysqlId) {
      setActiveEvents([]);
      return;
    }
    try {
      const [sosEvents, fallEvents] = await Promise.all([
        eventApi.list({ event_type: 'sos', limit: 50 }),
        eventApi.list({ event_type: 'fall', limit: 50 })
      ]);
      const rows = [...sosEvents, ...fallEvents]
        .filter((event) => Number(event.trigger_device_id) === mysqlId)
        .filter((event) => event.event_status === 'unhandled' || event.event_status === 'confirmed')
        .sort((a, b) => Date.parse(b.event_timestamp) - Date.parse(a.event_timestamp));
      setActiveEvents(rows);
    } catch {
      setActiveEvents([]);
    }
  }, [form.mysql_device_id]);

  useEffect(() => {
    void refreshActiveEvents();
  }, [refreshActiveEvents]);

  const runPublish = async (options: { publish_mqtt: boolean; save_mongo: boolean }) => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setPublishing(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await flycareAdminApi.publishFlight(toPayload(form, options));
      const parts: string[] = [];
      if (result.mqtt?.ok) {
        parts.push(t('admin.flycare.successMqtt', { topic: result.mqtt.topic ?? selectedDownlinkTopic }));
      } else if (result.mqtt && !result.mqtt.skipped && result.mqtt.error) {
        parts.push(t('admin.flycare.mqttFailed', { error: result.mqtt.error }));
      }
      if (result.mongo?.ok) {
        parts.push(t('admin.flycare.successMongo'));
      } else if (result.mongo && !result.mongo.skipped && result.mongo.error) {
        parts.push(t('admin.flycare.mongoFailed', { error: result.mongo.error }));
      }
      setSuccess(parts.join(' · ') || t('admin.flycare.successGeneric'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('admin.flycare.errorPublish');
      setError(msg);
    } finally {
      setPublishing(false);
    }
  };

  const runAlertPublish = async (eventType: Extract<EventType, 'sos' | 'fall'>, action: 'activate' | 'clear') => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    const mysqlId = form.mysql_device_id.trim() ? Number(form.mysql_device_id.trim()) : selectedPreset?.mysql_device_id;
    const relatedUserId = selectedPreset?.elderly_user_id ?? undefined;
    setAlertPublishing(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await flycareAdminApi.publishAlert({
        device_id: form.device_id.trim(),
        mysql_device_id: mysqlId,
        related_user_id: relatedUserId,
        passengerName: form.passengerName.trim(),
        event_type: eventType,
        action,
        title: eventType === 'sos' ? 'SOS' : 'Fall',
        message: eventType === 'sos' ? 'SOS alert' : 'Fall alert',
        severity: action === 'activate' ? 'critical' : 'info',
        publish_mqtt: true,
        create_event: action === 'activate'
      });
      const topicCount = result.mqtt?.alias_results?.length ?? 0;
      const eventText = result.event?.event_id ? ` Event #${result.event.event_id}` : '';
      setSuccess(`${eventType.toUpperCase()} ${action} sent to ${topicCount || 1} MQTT topic(s).${eventText}`);
      await refreshActiveEvents();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Alert publish failed';
      setError(msg);
    } finally {
      setAlertPublishing(false);
    }
  };

  const handleEvent = async (event: BackendEvent, status: EventStatus) => {
    setEventHandling(event.event_id);
    setError(null);
    setSuccess(null);
    try {
      await eventApi.handle(event.event_id, status, undefined, `FlyCare admin ${status}`);
      setSuccess(`Event #${event.event_id} marked ${status}.`);
      await refreshActiveEvents();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Event handle failed';
      setError(msg);
    } finally {
      setEventHandling(null);
    }
  };

  const mqttConnected = mqttStatus?.connected === true;

  return (
    <div className="admin-card admin-card--flycare">
      <header className="admin-card__header">
        <div>
          <h3>{t('admin.flycare.title')}</h3>
          <p className="muted">{t('admin.flycare.subtitle')}</p>
        </div>
        <div className="flycare-admin-status">
          <span className={`flycare-admin-status__dot ${mqttConnected ? 'is-on' : 'is-off'}`} />
          <span>
            {t('admin.flycare.mqttStatus', {
              state: mqttConnected ? t('admin.flycare.mqttConnected') : t('admin.flycare.mqttDisconnected'),
              broker: mqttStatus?.broker ?? '—',
              port: mqttStatus?.port ?? '—',
              topic: selectedDownlinkTopic
            })}
          </span>
          <button type="button" className="ghost" onClick={() => void load()} disabled={loading}>
            {t('admin.flycare.refresh')}
          </button>
        </div>
      </header>

      {error ? <div className="admin-error">{error}</div> : null}
      {success ? <div className="admin-success">{success}</div> : null}
      {loading ? <div className="admin-loading">{t('admin.flycare.loading')}</div> : null}

      <div className="admin-form flycare-admin-form">
        <h4>{t('admin.flycare.formTitle')}</h4>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void runPublish({ publish_mqtt: true, save_mongo: true });
          }}
        >
          <fieldset className="flycare-admin-form__section">
            <legend>{t('admin.flycare.sectionDevice')}</legend>
            <label>
              {t('admin.flycare.presetLabel')}
              <select
                value={selectedPresetKey}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) applyPreset(value);
                }}
              >
                <option value="">{t('admin.flycare.presetPlaceholder')}</option>
                {presetOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.item.passengerName
                      ? `#${opt.item.demo_id ?? opt.item.mysql_device_id ?? '?'} ${opt.item.passengerName} - ${opt.item.device_id}`
                      : opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('admin.flycare.deviceId')}
              <input
                value={form.device_id}
                onChange={(e) => updateField('device_id', e.target.value)}
                placeholder="ESP32_..."
                required
              />
            </label>
            <label>
              {t('admin.flycare.mysqlDeviceId')}
              <input
                value={form.mysql_device_id}
                onChange={(e) => updateField('mysql_device_id', e.target.value)}
                placeholder="1"
              />
            </label>
            <label>
              {t('admin.flycare.passengerName')}
              <input
                value={form.passengerName}
                onChange={(e) => updateField('passengerName', e.target.value)}
                required
              />
            </label>
          </fieldset>

          <fieldset className="flycare-admin-form__section">
            <legend>{t('admin.flycare.sectionFlight')}</legend>
            <label>
              {t('admin.flycare.flightNumber')}
              <input
                value={form.flightNumber}
                onChange={(e) => updateField('flightNumber', e.target.value)}
                required
              />
            </label>
            <label>
              {t('admin.flycare.airline')}
              <input value={form.airline} onChange={(e) => updateField('airline', e.target.value)} />
            </label>
            <label>
              {t('admin.flycare.departureAirport')}
              <input
                value={form.departureAirport}
                onChange={(e) => updateField('departureAirport', e.target.value)}
              />
            </label>
            <label>
              {t('admin.flycare.destination')}
              <input value={form.destination} onChange={(e) => updateField('destination', e.target.value)} />
            </label>
            <label>
              {t('admin.flycare.seatNumber')}
              <input value={form.seatNumber} onChange={(e) => updateField('seatNumber', e.target.value)} />
            </label>
          </fieldset>

          <fieldset className="flycare-admin-form__section">
            <legend>{t('admin.flycare.sectionSchedule')}</legend>
            <label>
              {t('admin.flycare.scheduledDeparture')}
              <input
                value={form.scheduled_departure}
                onChange={(e) => updateField('scheduled_departure', e.target.value)}
                placeholder="14:30"
              />
            </label>
            <label>
              {t('admin.flycare.estimatedDeparture')}
              <input
                value={form.estimated_departure}
                onChange={(e) => updateField('estimated_departure', e.target.value)}
                placeholder="14:45"
              />
            </label>
            <label>
              {t('admin.flycare.boardingTime')}
              <input
                value={form.boarding_time}
                onChange={(e) => updateField('boarding_time', e.target.value)}
                placeholder="14:00"
              />
            </label>
          </fieldset>

          <fieldset className="flycare-admin-form__section">
            <legend>{t('admin.flycare.sectionGateStatus')}</legend>
            <label>
              {t('admin.flycare.boardingGate')}
              <input
                value={form.boarding_gate}
                onChange={(e) => updateField('boarding_gate', e.target.value)}
              />
            </label>
            <label>
              {t('admin.flycare.terminal')}
              <input value={form.terminal} onChange={(e) => updateField('terminal', e.target.value)} />
            </label>
            <label>
              {t('admin.flycare.checkinCounter')}
              <input
                value={form.checkin_counter}
                onChange={(e) => updateField('checkin_counter', e.target.value)}
              />
            </label>
            <label>
              {t('admin.flycare.status')}
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                {FLIGHT_STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`admin.flycare.statusOptions.${option}`)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t('admin.flycare.delayMinutes')}
              <input
                type="number"
                min={0}
                value={form.delay_minutes}
                onChange={(e) => updateField('delay_minutes', e.target.value)}
              />
            </label>
            <label>
              {t('admin.flycare.delayReason')}
              <input value={form.delay_reason} onChange={(e) => updateField('delay_reason', e.target.value)} />
            </label>
            <label className="flycare-admin-form__checkbox">
              <input
                type="checkbox"
                checked={form.gate_changed}
                onChange={(e) => updateField('gate_changed', e.target.checked)}
              />
              <span>{t('admin.flycare.gateChanged')}</span>
            </label>
          </fieldset>

          <div className="admin-form__actions">
            <button type="submit" disabled={publishing}>
              {publishing ? t('admin.flycare.publishing') : t('admin.flycare.publishMqtt')}
            </button>
            <button
              type="button"
              disabled={publishing}
              onClick={() => void runPublish({ publish_mqtt: true, save_mongo: true })}
            >
              {t('admin.flycare.publishBoth')}
            </button>
            <button
              type="button"
              className="ghost"
              disabled={publishing}
              onClick={() => void runPublish({ publish_mqtt: false, save_mongo: true })}
            >
              {t('admin.flycare.saveMongoOnly')}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setForm(emptyForm());
                setSelectedPresetKey('');
                setSuccess(null);
                setError(null);
              }}
            >
              {t('admin.flycare.reset')}
            </button>
          </div>
        </form>
        <section className="flycare-admin-emergency" aria-label="FlyCare emergency MQTT controls">
          <div className="flycare-admin-emergency__header">
            <div>
              <h4>Emergency MQTT</h4>
              <p className="muted">Publish SOS/Fall control to smartwatch alert downlink.</p>
            </div>
            <button type="button" className="ghost" onClick={() => void refreshActiveEvents()}>
              Refresh events
            </button>
          </div>
          <div className="admin-form__actions flycare-admin-emergency__actions">
            <button type="button" disabled={alertPublishing} onClick={() => void runAlertPublish('sos', 'activate')}>
              Trigger SOS
            </button>
            <button type="button" className="ghost" disabled={alertPublishing} onClick={() => void runAlertPublish('sos', 'clear')}>
              Clear SOS
            </button>
            <button type="button" disabled={alertPublishing} onClick={() => void runAlertPublish('fall', 'activate')}>
              Trigger Fall
            </button>
            <button type="button" className="ghost" disabled={alertPublishing} onClick={() => void runAlertPublish('fall', 'clear')}>
              Clear Fall
            </button>
          </div>
          <div className="flycare-admin-events">
            <h4>Active SOS/Fall events</h4>
            {activeEvents.length === 0 ? (
              <p className="muted">No active SOS/Fall events for the selected device.</p>
            ) : (
              <div className="admin-table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Time</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeEvents.map((event) => (
                      <tr key={event.event_id}>
                        <td>#{event.event_id}</td>
                        <td>{event.event_type}</td>
                        <td>{event.event_status}</td>
                        <td>{event.event_timestamp}</td>
                        <td>
                          <div className="admin-table__actions">
                            <button
                              type="button"
                              className="ghost"
                              disabled={eventHandling === event.event_id}
                              onClick={() => void handleEvent(event, 'confirmed')}
                            >
                              Acknowledge
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              disabled={eventHandling === event.event_id}
                              onClick={() => void handleEvent(event, 'resolved')}
                            >
                              Resolved
                            </button>
                            <button
                              type="button"
                              className="ghost"
                              disabled={eventHandling === event.event_id}
                              onClick={() => void handleEvent(event, 'false_alarm')}
                            >
                              False alarm
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
        <p className="muted flycare-admin-hint">{t('admin.flycare.hint', { topic: selectedDownlinkTopic })}</p>
      </div>
    </div>
  );
};
