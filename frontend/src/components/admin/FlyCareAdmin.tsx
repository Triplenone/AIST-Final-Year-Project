import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  eventApi,
  flycareAdminApi,
  type FlyCareFlightPreset,
  type FlyCareHealthPublishPayload,
  type FlyCareReminderPublishPayload
} from '../../services/api';
import type { BackendEvent, EventStatus, EventType } from '../../types/backend';

type HealthFormState = {
  device_id: string;
  mysql_device_id: string;
  passengerName: string;
  heart_rate: string;
  spo2: string;
  battery: string;
  location_name: string;
  x: string;
  y: string;
  fall_confirmed: boolean;
  sos_active: boolean;
};

type ReminderFormState = {
  medicine_name: string;
  dosage: string;
  scheduled_time: string;
  priority: string;
  message: string;
};

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
const ELDERLY_PRIMARY_DEVICE_IDS = new Set(['ESP32_0000E03948D4DB1C', 'ESP32_1CDBD44839E0']);

const ELDERLY_LOCATION_PRESETS = [
  { label: 'Nurse Station', x: '1', y: '1' },
  { label: 'Activity Room', x: '5', y: '2' },
  { label: 'Rehabilitation Room', x: '9', y: '2' },
  { label: 'Central Common Area', x: '5', y: '7' },
  { label: 'Toilet', x: '10', y: '9' },
  { label: 'Bedroom', x: '8', y: '13' },
  { label: 'Door1', x: '0', y: '1' },
  { label: 'Door2', x: '0', y: '11' }
];

const emptyForm = (): HealthFormState => ({
  device_id: '',
  mysql_device_id: '',
  passengerName: '',
  heart_rate: '82',
  spo2: '98',
  battery: '92',
  location_name: 'Central Common Area',
  x: '5',
  y: '7',
  fall_confirmed: false,
  sos_active: false
});

const emptyReminderForm = (): ReminderFormState => ({
  medicine_name: 'Metformin',
  dosage: '500 mg',
  scheduled_time: '08:00',
  priority: 'normal',
  message: 'Please take Metformin 500 mg at 08:00.'
});

function parseOptionalNumber(value: string): number | undefined {
  const text = value.trim();
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseRequiredNumber(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPayload(
  form: HealthFormState,
  options: { publish_mqtt: boolean; save_mongo: boolean }
): FlyCareHealthPublishPayload {
  const mysqlId = form.mysql_device_id.trim();
  const locationName = form.location_name.trim();
  return {
    device_id: form.device_id.trim(),
    mysql_device_id: mysqlId ? Number(mysqlId) : undefined,
    passengerName: form.passengerName.trim() || undefined,
    heart_rate: Number(form.heart_rate.trim()),
    spo2: Number(form.spo2.trim()),
    battery: parseOptionalNumber(form.battery),
    location_name: locationName || undefined,
    x: parseOptionalNumber(form.x),
    y: parseOptionalNumber(form.y),
    fall_confirmed: form.fall_confirmed,
    sos_active: form.sos_active,
    source: 'admin_simulated',
    publish_mqtt: options.publish_mqtt,
    save_mongo: options.save_mongo
  };
}

function toReminderPayload(
  form: HealthFormState,
  reminder: ReminderFormState,
  relatedUserId: number | null | undefined,
  options: { publish_mqtt: boolean; save_mongo: boolean }
): FlyCareReminderPublishPayload {
  const mysqlId = form.mysql_device_id.trim();
  return {
    device_id: form.device_id.trim(),
    mysql_device_id: mysqlId ? Number(mysqlId) : undefined,
    related_user_id: relatedUserId ?? undefined,
    passengerName: form.passengerName.trim() || undefined,
    medicine_name: reminder.medicine_name.trim(),
    dosage: reminder.dosage.trim(),
    scheduled_time: reminder.scheduled_time.trim(),
    priority: reminder.priority.trim() || 'normal',
    message: reminder.message.trim() || undefined,
    publish_mqtt: options.publish_mqtt,
    save_mongo: options.save_mongo
  };
}

export const FlyCareAdmin = () => {
  const { t } = useTranslation();
  const [presets, setPresets] = useState<FlyCareFlightPreset[]>([]);
  const [mqttTopic, setMqttTopic] = useState('smartwatch/{device_id}/vitals');
  const [mqttStatus, setMqttStatus] = useState<{
    connected?: boolean;
    broker?: string;
    port?: number;
  } | null>(null);
  const [form, setForm] = useState<HealthFormState>(emptyForm);
  const [reminderForm, setReminderForm] = useState<ReminderFormState>(emptyReminderForm);
  const [selectedPresetKey, setSelectedPresetKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [reminderPublishing, setReminderPublishing] = useState(false);
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
      setMqttTopic(presetRes.health_topic_template ?? 'smartwatch/{device_id}/vitals');
      setMqttStatus({
        connected: mqttRes.connected,
        broker: mqttRes.broker,
        port: mqttRes.port
      });
      if (!selectedPresetKey && items[0]) {
        const first = items.find((item) => ELDERLY_PRIMARY_DEVICE_IDS.has(item.device_id)) ?? items[0];
        setSelectedPresetKey(first.device_id);
        setMqttTopic(first.mqtt_topic ?? `smartwatch/${first.device_id}/vitals`);
        setForm((current) => ({
          ...current,
          device_id: first.device_id,
          mysql_device_id: first.mysql_device_id != null ? String(first.mysql_device_id) : '',
          passengerName: first.passengerName ?? current.passengerName
        }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load presets or MQTT status';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedPresetKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const presetOptions = useMemo(
    () =>
      presets.map((item) => ({
        key: item.device_id,
        label: item.passengerName
          ? `${item.passengerName} - ${item.device_id}`
          : item.device_id,
        item
      })),
    [presets]
  );

  const selectedPreset = useMemo(
    () => presets.find((item) => item.device_id === selectedPresetKey || item.device_id === form.device_id.trim()) ?? null,
    [form.device_id, presets, selectedPresetKey]
  );

  const selectedMqttTopic = form.device_id.trim()
    ? `smartwatch/${form.device_id.trim()}/vitals`
    : mqttTopic;
  const selectedReminderTopic = form.device_id.trim()
    ? `smartwatch/${form.device_id.trim()}/reminder`
    : 'smartwatch/{device_id}/reminder';
  const selectedAlertTopic = form.device_id.trim()
    ? `smartwatch/${form.device_id.trim()}/alert`
    : 'smartwatch/{device_id}/alert';

  const applyPreset = (deviceId: string) => {
    const preset = presets.find((item) => item.device_id === deviceId);
    if (!preset) return;
    setSelectedPresetKey(deviceId);
    setMqttTopic(preset.mqtt_topic ?? `smartwatch/${preset.device_id}/vitals`);
    setForm((current) => ({
      ...current,
      device_id: preset.device_id,
      mysql_device_id: preset.mysql_device_id != null ? String(preset.mysql_device_id) : '',
      passengerName: preset.passengerName ?? current.passengerName
    }));
  };

  const updateField = <K extends keyof HealthFormState>(key: K, value: HealthFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateReminderField = <K extends keyof ReminderFormState>(key: K, value: ReminderFormState[K]) => {
    setReminderForm((current) => ({ ...current, [key]: value }));
  };

  const applyLocationPreset = (label: string) => {
    const preset = ELDERLY_LOCATION_PRESETS.find((item) => item.label === label);
    if (!preset) return updateField('location_name', label);
    setForm((current) => ({
      ...current,
      location_name: preset.label,
      x: preset.x,
      y: preset.y
    }));
  };

  const validateDeviceFields = (): string | null => {
    if (!form.device_id.trim()) return 'Device ID is required.';
    if (!form.passengerName.trim()) return 'Resident name is required.';
    return null;
  };

  const validateHealthForm = (): string | null => {
    const deviceError = validateDeviceFields();
    if (deviceError) return deviceError;
    const heartRate = parseRequiredNumber(form.heart_rate);
    const spo2 = parseRequiredNumber(form.spo2);
    const battery = parseOptionalNumber(form.battery);
    const x = parseOptionalNumber(form.x);
    const y = parseOptionalNumber(form.y);
    if (heartRate == null || heartRate < 0 || heartRate > 240) return 'Heart rate must be 0-240.';
    if (spo2 == null || spo2 < 0 || spo2 > 100) return 'SpO2 must be 0-100.';
    if (battery != null && (battery < 0 || battery > 100)) return 'Battery must be 0-100.';
    if ((form.x.trim() && x == null) || (form.y.trim() && y == null)) return 'Coordinates must be numeric.';
    return null;
  };

  const validateReminderForm = (): string | null => {
    const deviceError = validateDeviceFields();
    if (deviceError) return deviceError;
    if (!reminderForm.medicine_name.trim()) return 'Medicine name is required.';
    if (!reminderForm.dosage.trim()) return 'Dosage is required.';
    if (!reminderForm.scheduled_time.trim()) return 'Scheduled time is required.';
    return null;
  };

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
    const validationError = validateHealthForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setPublishing(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await flycareAdminApi.publishHealth(toPayload(form, options));
      const parts: string[] = [];
      if (result.mqtt?.ok) {
        parts.push(`Published to MQTT (${result.mqtt.topic ?? selectedMqttTopic})`);
      } else if (result.mqtt && !result.mqtt.skipped && result.mqtt.error) {
        parts.push(`MQTT failed: ${result.mqtt.error}`);
      }
      if (result.mongo?.ok) {
        parts.push('Saved to Mongo');
      } else if (result.mongo && !result.mongo.skipped && result.mongo.error) {
        parts.push(`Mongo failed: ${result.mongo.error}`);
      }
      setSuccess(parts.join(' / ') || 'Done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Health publish failed';
      setError(msg);
    } finally {
      setPublishing(false);
    }
  };

  const runReminderPublish = async (options: { publish_mqtt: boolean; save_mongo: boolean }) => {
    const validationError = validateReminderForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setReminderPublishing(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await flycareAdminApi.publishReminder(
        toReminderPayload(form, reminderForm, selectedPreset?.elderly_user_id, options)
      );
      const topicCount = result.mqtt?.alias_results?.length ?? result.mqtt?.topics?.length ?? 0;
      const parts: string[] = [];
      if (result.mqtt?.ok) {
        parts.push(`Reminder published to ${topicCount || 1} MQTT topic(s)`);
      } else if (result.mqtt && !result.mqtt.skipped && result.mqtt.error) {
        parts.push(`MQTT failed: ${result.mqtt.error}`);
      }
      if (result.mongo?.ok) {
        parts.push('Saved to Mongo');
      } else if (result.mongo && !result.mongo.skipped && result.mongo.error) {
        parts.push(`Mongo failed: ${result.mongo.error}`);
      }
      setSuccess(parts.join(' / ') || 'Reminder sent');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Reminder publish failed';
      setError(msg);
    } finally {
      setReminderPublishing(false);
    }
  };

  const runAlertPublish = async (eventType: Extract<EventType, 'sos' | 'fall'>, action: 'activate' | 'clear') => {
    const validationError = validateDeviceFields();
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
      await eventApi.handle(event.event_id, status, undefined, `Elderly demo admin ${status}`);
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
          <h3>{t('admin.flycare.healthTitle', { defaultValue: 'Elderly health telemetry' })}</h3>
          <p className="muted">
            {t('admin.flycare.healthSubtitle', {
              defaultValue: 'Publish simulated health and location data through MQTT or Mongo.'
            })}
          </p>
        </div>
        <div className="flycare-admin-status">
          <span className={`flycare-admin-status__dot ${mqttConnected ? 'is-on' : 'is-off'}`} />
          <span>
            {mqttConnected ? 'MQTT connected' : 'MQTT disconnected'} - {mqttStatus?.broker ?? '?'}:
            {mqttStatus?.port ?? '?'} - {selectedMqttTopic}
          </span>
          <button type="button" className="ghost" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      {error ? <div className="admin-error">{error}</div> : null}
      {success ? <div className="admin-success">{success}</div> : null}
      {loading ? <div className="admin-loading">Loading...</div> : null}

      <div className="admin-form flycare-admin-form">
        <h4>Health data</h4>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void runPublish({ publish_mqtt: true, save_mongo: true });
          }}
        >
          <fieldset className="flycare-admin-form__section">
            <legend>Device</legend>
            <label>
              Device preset
              <select
                value={selectedPresetKey}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) applyPreset(value);
                }}
              >
                <option value="">Select mapped device</option>
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
              Device ID (Mongo/MQTT)
              <input
                value={form.device_id}
                onChange={(e) => updateField('device_id', e.target.value)}
                placeholder="ESP32_..."
                required
              />
            </label>
            <label>
              MySQL device ID
              <input
                value={form.mysql_device_id}
                onChange={(e) => updateField('mysql_device_id', e.target.value)}
                placeholder="8"
              />
            </label>
            <label>
              Resident name
              <input
                value={form.passengerName}
                onChange={(e) => updateField('passengerName', e.target.value)}
                required
              />
            </label>
            {selectedPreset ? (
              <div className="flycare-admin-form__device-meta">
                <span>Canonical: {selectedPreset.device_id}</span>
                <span>
                  Aliases:{' '}
                  {selectedPreset.alias_device_ids?.length ? selectedPreset.alias_device_ids.join(', ') : 'None'}
                </span>
                <span>Alert topic: {selectedAlertTopic}</span>
              </div>
            ) : null}
          </fieldset>

          <fieldset className="flycare-admin-form__section">
            <legend>Vitals</legend>
            <label>
              Heart rate
              <input
                type="number"
                min={0}
                max={240}
                value={form.heart_rate}
                onChange={(e) => updateField('heart_rate', e.target.value)}
                required
              />
            </label>
            <label>
              SpO2
              <input
                type="number"
                min={0}
                max={100}
                value={form.spo2}
                onChange={(e) => updateField('spo2', e.target.value)}
                required
              />
            </label>
            <label>
              Battery
              <input
                type="number"
                min={0}
                max={100}
                value={form.battery}
                onChange={(e) => updateField('battery', e.target.value)}
              />
            </label>
            <label className="flycare-admin-form__checkbox">
              <input
                type="checkbox"
                checked={form.sos_active}
                onChange={(e) => updateField('sos_active', e.target.checked)}
              />
              <span>SOS active</span>
            </label>
            <label className="flycare-admin-form__checkbox">
              <input
                type="checkbox"
                checked={form.fall_confirmed}
                onChange={(e) => updateField('fall_confirmed', e.target.checked)}
              />
              <span>Fall confirmed</span>
            </label>
          </fieldset>

          <fieldset className="flycare-admin-form__section">
            <legend>Indoor location</legend>
            <label>
              Location preset
              <select value={form.location_name} onChange={(e) => applyLocationPreset(e.target.value)}>
                {ELDERLY_LOCATION_PRESETS.map((item) => (
                  <option key={item.label} value={item.label}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Location name
              <input value={form.location_name} onChange={(e) => updateField('location_name', e.target.value)} />
            </label>
            <label>
              Grid X
              <input value={form.x} onChange={(e) => updateField('x', e.target.value)} />
            </label>
            <label>
              Grid Y
              <input value={form.y} onChange={(e) => updateField('y', e.target.value)} />
            </label>
          </fieldset>

          <div className="admin-form__actions">
            <button type="submit" disabled={publishing}>
              {publishing ? 'Publishing...' : 'Publish MQTT + Mongo'}
            </button>
            <button
              type="button"
              disabled={publishing}
              onClick={() => void runPublish({ publish_mqtt: true, save_mongo: false })}
            >
              Publish MQTT
            </button>
            <button
              type="button"
              className="ghost"
              disabled={publishing}
              onClick={() => void runPublish({ publish_mqtt: false, save_mongo: true })}
            >
              Save Mongo only
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
              Reset
            </button>
          </div>
        </form>

        <section className="flycare-admin-reminder" aria-label="Medication reminder controls">
          <div className="flycare-admin-emergency__header">
            <div>
              <h4>Medication reminder</h4>
              <p className="muted">Publish an ElderlyCare reminder downlink to canonical and alias topics.</p>
            </div>
            <span className="muted">{selectedReminderTopic}</span>
          </div>
          <div className="flycare-admin-form__section flycare-admin-form__section--inline">
            <label>
              Medicine
              <input
                value={reminderForm.medicine_name}
                onChange={(e) => updateReminderField('medicine_name', e.target.value)}
              />
            </label>
            <label>
              Dosage
              <input value={reminderForm.dosage} onChange={(e) => updateReminderField('dosage', e.target.value)} />
            </label>
            <label>
              Time
              <input
                value={reminderForm.scheduled_time}
                onChange={(e) => updateReminderField('scheduled_time', e.target.value)}
              />
            </label>
            <label>
              Priority
              <select value={reminderForm.priority} onChange={(e) => updateReminderField('priority', e.target.value)}>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className="flycare-admin-form__wide">
              Message
              <input value={reminderForm.message} onChange={(e) => updateReminderField('message', e.target.value)} />
            </label>
          </div>
          <div className="admin-form__actions">
            <button
              type="button"
              disabled={reminderPublishing}
              onClick={() => void runReminderPublish({ publish_mqtt: true, save_mongo: true })}
            >
              {reminderPublishing ? 'Publishing...' : 'Publish reminder'}
            </button>
            <button
              type="button"
              className="ghost"
              disabled={reminderPublishing}
              onClick={() => void runReminderPublish({ publish_mqtt: true, save_mongo: false })}
            >
              MQTT only
            </button>
            <button
              type="button"
              className="ghost"
              disabled={reminderPublishing}
              onClick={() => void runReminderPublish({ publish_mqtt: false, save_mongo: true })}
            >
              Save Mongo only
            </button>
          </div>
        </section>

        <section className="flycare-admin-emergency" aria-label="Emergency MQTT controls">
          <div className="flycare-admin-emergency__header">
            <div>
              <h4>Emergency MQTT</h4>
              <p className="muted">Publish SOS/Fall control to the selected device alert topic.</p>
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
        <p className="muted flycare-admin-hint">Selected telemetry topic: {selectedMqttTopic}</p>
      </div>
    </div>
  );
};
