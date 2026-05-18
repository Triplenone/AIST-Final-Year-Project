import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { flycareAdminApi, type FlightPublishPayload, type FlyCareFlightPreset } from '../../services/api';

type FlightFormState = {
  device_id: string;
  mysql_device_id: string;
  passengerName: string;
  flightNumber: string;
  gate: string;
  flightTime: string;
  departureAirport: string;
  arrivalAirport: string;
  seatNumber: string;
};

const emptyForm = (): FlightFormState => ({
  device_id: '',
  mysql_device_id: '',
  passengerName: '',
  flightNumber: '',
  gate: '',
  flightTime: '',
  departureAirport: 'HKG',
  arrivalAirport: '',
  seatNumber: ''
});

function toPayload(
  form: FlightFormState,
  options: { publish_mqtt: boolean; save_mongo: boolean }
): FlightPublishPayload {
  const mysqlId = form.mysql_device_id.trim();
  return {
    device_id: form.device_id.trim(),
    mysql_device_id: mysqlId ? Number(mysqlId) : undefined,
    passengerName: form.passengerName.trim(),
    flightNumber: form.flightNumber.trim(),
    gate: form.gate.trim() || undefined,
    flightTime: form.flightTime.trim() || undefined,
    departureAirport: form.departureAirport.trim() || undefined,
    arrivalAirport: form.arrivalAirport.trim() || undefined,
    seatNumber: form.seatNumber.trim() || undefined,
    publish_mqtt: options.publish_mqtt,
    save_mongo: options.save_mongo
  };
}

export const FlyCareAdmin = () => {
  const { t } = useTranslation();
  const [presets, setPresets] = useState<FlyCareFlightPreset[]>([]);
  const [mqttTopic, setMqttTopic] = useState('flycare/flight');
  const [mqttStatus, setMqttStatus] = useState<{
    connected?: boolean;
    broker?: string;
    port?: number;
  } | null>(null);
  const [form, setForm] = useState<FlightFormState>(emptyForm);
  const [selectedPresetKey, setSelectedPresetKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
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
      setPresets(presetRes.items ?? []);
      setMqttTopic(presetRes.mqtt_topic ?? 'flycare/flight');
      setMqttStatus({
        connected: mqttRes.connected,
        broker: mqttRes.broker,
        port: mqttRes.port
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('admin.flycare.errorLoad');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [t]);

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
    setForm((current) => ({
      device_id: preset.device_id,
      mysql_device_id: preset.mysql_device_id != null ? String(preset.mysql_device_id) : '',
      passengerName: preset.passengerName ?? '',
      flightNumber: current.flightNumber || 'CX888',
      gate: current.gate || '12',
      flightTime: current.flightTime || new Date().toISOString().slice(0, 16).replace('T', ' '),
      departureAirport: current.departureAirport || 'HKG',
      arrivalAirport: current.arrivalAirport || 'TPE',
      seatNumber: current.seatNumber || '32A'
    }));
  };

  const updateField = (key: keyof FlightFormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const validateForm = (): string | null => {
    if (!form.device_id.trim()) return t('admin.flycare.validationDeviceId');
    if (!form.passengerName.trim()) return t('admin.flycare.validationPassenger');
    if (!form.flightNumber.trim()) return t('admin.flycare.validationFlightNumber');
    return null;
  };

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
        parts.push(t('admin.flycare.successMqtt', { topic: result.mqtt.topic ?? mqttTopic }));
      }
      if (result.mongo?.ok) {
        parts.push(t('admin.flycare.successMongo'));
      }
      setSuccess(parts.join(' · ') || t('admin.flycare.successGeneric'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('admin.flycare.errorPublish');
      setError(msg);
    } finally {
      setPublishing(false);
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
              topic: mqttTopic
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
            void runPublish({ publish_mqtt: true, save_mongo: false });
          }}
        >
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
                  {opt.label}
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
          <label>
            {t('admin.flycare.flightNumber')}
            <input
              value={form.flightNumber}
              onChange={(e) => updateField('flightNumber', e.target.value)}
              required
            />
          </label>
          <label>
            {t('admin.flycare.gate')}
            <input value={form.gate} onChange={(e) => updateField('gate', e.target.value)} />
          </label>
          <label>
            {t('admin.flycare.flightTime')}
            <input
              value={form.flightTime}
              onChange={(e) => updateField('flightTime', e.target.value)}
              placeholder="2026-05-18 14:30"
            />
          </label>
          <label>
            {t('admin.flycare.departureAirport')}
            <input
              value={form.departureAirport}
              onChange={(e) => updateField('departureAirport', e.target.value)}
            />
          </label>
          <label>
            {t('admin.flycare.arrivalAirport')}
            <input
              value={form.arrivalAirport}
              onChange={(e) => updateField('arrivalAirport', e.target.value)}
            />
          </label>
          <label>
            {t('admin.flycare.seatNumber')}
            <input value={form.seatNumber} onChange={(e) => updateField('seatNumber', e.target.value)} />
          </label>
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
        <p className="muted flycare-admin-hint">{t('admin.flycare.hint', { topic: mqttTopic })}</p>
      </div>
    </div>
  );
};

