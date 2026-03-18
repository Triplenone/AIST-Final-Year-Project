import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

import { deviceApi, eventApi, locationApi, userApi } from '../../services/api';
import type {
  BackendDevice,
  BackendEvent,
  BackendLocation,
  BackendUser,
  EventStatus,
  EventType
} from '../../types/backend';

type FormState = {
  event_type: EventType;
  related_user_id?: number;
  trigger_device_id?: number;
  location_zone_id?: number;
  event_status: EventStatus;
  remark: string;
};

const DEFAULT_FORM: FormState = {
  event_type: 'fall',
  related_user_id: undefined,
  trigger_device_id: undefined,
  location_zone_id: undefined,
  event_status: 'unhandled',
  remark: ''
};

const EVENT_TYPES: EventType[] = [
  'fall',
  'sos',
  'vital_signs_abnormal',
  'bed_exit',
  'bathroom_retention',
  'geofence_breach'
];

const EVENT_STATUSES: EventStatus[] = ['unhandled', 'confirmed', 'false_alarm', 'resolved'];

export const EventsAdmin = () => {
  const [events, setEvents] = useState<BackendEvent[]>([]);
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [devices, setDevices] = useState<BackendDevice[]>([]);
  const [locations, setLocations] = useState<BackendLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BackendEvent | null>(null);
  const [handling, setHandling] = useState<BackendEvent | null>(null);
  const [keyword, setKeyword] = useState('');
  const [handleStatus, setHandleStatus] = useState<EventStatus>('resolved');
  const [handleRemark, setHandleRemark] = useState('');
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);

  const resetForm = useCallback(() => {
    setEditing(null);
    setForm(DEFAULT_FORM);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventRows, userRows, deviceRows, locationRows] = await Promise.all([
        eventApi.list({ limit: 1000 }),
        userApi.list({ limit: 1000 }),
        deviceApi.list({ limit: 1000 }),
        locationApi.list({ limit: 1000 })
      ]);
      setEvents(eventRows);
      setUsers(userRows);
      setDevices(deviceRows);
      setLocations(locationRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredEvents = useMemo(() => {
    const value = keyword.trim().toLowerCase();
    if (!value) return events;
    return events.filter((event) => {
      return [
        event.event_type,
        event.event_status,
        event.remark ?? '',
        String(event.related_user_id),
        String(event.trigger_device_id)
      ].some((field) => field.toLowerCase().includes(value));
    });
  }, [events, keyword]);

  const elderlyUsers = useMemo(() => users.filter((user) => user.role_type === 'elderly'), [users]);

  const handleEdit = useCallback((event: BackendEvent) => {
    setEditing(event);
    setForm({
      event_type: event.event_type,
      related_user_id: event.related_user_id,
      trigger_device_id: event.trigger_device_id,
      location_zone_id: event.location_zone_id ?? undefined,
      event_status: event.event_status,
      remark: event.remark ?? ''
    });
  }, []);

  const handleDelete = useCallback(
    async (event: BackendEvent) => {
      if (!window.confirm(`Delete event #${event.event_id}?`)) {
        return;
      }
      try {
        await eventApi.delete(event.event_id);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed');
      }
    },
    [load]
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);

      if (!form.related_user_id) {
        setError('Please select a resident user.');
        return;
      }
      if (!form.trigger_device_id) {
        setError('Please select a trigger device.');
        return;
      }

      const payload: Partial<BackendEvent> = {
        event_type: form.event_type,
        related_user_id: form.related_user_id,
        trigger_device_id: form.trigger_device_id,
        location_zone_id: form.location_zone_id,
        event_status: form.event_status,
        remark: form.remark
      };

      try {
        if (editing) {
          await eventApi.update(editing.event_id, payload);
        } else {
          await eventApi.create(payload);
        }
        resetForm();
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
      }
    },
    [editing, form, load, resetForm]
  );

  const submitHandle = useCallback(async () => {
    if (!handling) return;
    try {
      await eventApi.handle(handling.event_id, handleStatus, undefined, handleRemark);
      setHandling(null);
      setHandleRemark('');
      setHandleStatus('resolved');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Handle failed');
    }
  }, [handleRemark, handleStatus, handling, load]);

  return (
    <div className="admin-card">
      <header className="admin-card__header">
        <div>
          <h3>Events</h3>
          <p className="muted">Manage records from /api/v1/events</p>
        </div>
        <input
          placeholder="Search type, status, user, device, or remark"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
      </header>

      {error ? <div className="admin-error">{error}</div> : null}
      {loading ? <div className="admin-loading">Loading...</div> : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Status</th>
            <th>User</th>
            <th>Device</th>
            <th>Timestamp</th>
            <th>Remark</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredEvents.map((event) => (
            <tr key={event.event_id}>
              <td>{event.event_id}</td>
              <td>{event.event_type}</td>
              <td>{event.event_status}</td>
              <td>{event.related_user_id}</td>
              <td>{event.trigger_device_id}</td>
              <td>{new Date(event.event_timestamp).toLocaleString()}</td>
              <td>{event.remark ?? '-'}</td>
              <td>
                <button type="button" onClick={() => handleEdit(event)}>
                  Edit
                </button>
                <button type="button" onClick={() => setHandling(event)}>
                  Handle
                </button>
                <button type="button" className="danger" onClick={() => void handleDelete(event)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="admin-form">
        <h4>{editing ? 'Edit event' : 'Create event'}</h4>
        <form onSubmit={handleSubmit}>
          <label>
            Type
            <select
              value={form.event_type}
              onChange={(event) => setForm((current) => ({ ...current, event_type: event.target.value as EventType }))}
            >
              {EVENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label>
            User
            <select
              value={form.related_user_id ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  related_user_id: event.target.value ? Number(event.target.value) : undefined
                }))
              }
            >
              <option value="">Select a resident</option>
              {elderlyUsers.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.name} (ID {user.user_id})
                </option>
              ))}
            </select>
          </label>

          <label>
            Trigger device
            <select
              value={form.trigger_device_id ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  trigger_device_id: event.target.value ? Number(event.target.value) : undefined
                }))
              }
            >
              <option value="">Select a device</option>
              {devices.map((device) => (
                <option key={device.device_id} value={device.device_id}>
                  {(device.model_desc || device.device_type || 'Device')} (ID {device.device_id})
                </option>
              ))}
            </select>
          </label>

          <label>
            Location
            <select
              value={form.location_zone_id ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  location_zone_id: event.target.value ? Number(event.target.value) : undefined
                }))
              }
            >
              <option value="">No location</option>
              {locations.map((location) => (
                <option key={location.location_zone_id} value={location.location_zone_id}>
                  {location.name ?? location.location_zone_id}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select
              value={form.event_status}
              onChange={(event) =>
                setForm((current) => ({ ...current, event_status: event.target.value as EventStatus }))
              }
            >
              {EVENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label>
            Remark
            <textarea
              value={form.remark}
              onChange={(event) => setForm((current) => ({ ...current, remark: event.target.value }))}
            />
          </label>

          <div className="admin-form__actions">
            <button type="submit">{editing ? 'Update' : 'Create'}</button>
            {editing ? (
              <button type="button" className="ghost" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </div>

      {handling ? (
        <div className="admin-modal">
          <div className="admin-modal__content">
            <h4>Handle event #{handling.event_id}</h4>
            <label>
              Status
              <select value={handleStatus} onChange={(event) => setHandleStatus(event.target.value as EventStatus)}>
                {EVENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Remark
              <textarea value={handleRemark} onChange={(event) => setHandleRemark(event.target.value)} />
            </label>
            <div className="admin-form__actions">
              <button type="button" onClick={() => void submitHandle()}>
                Submit
              </button>
              <button type="button" className="ghost" onClick={() => setHandling(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
