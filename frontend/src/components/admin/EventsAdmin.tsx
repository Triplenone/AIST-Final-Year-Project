import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { deviceApi, eventApi, locationApi, userApi } from '../../services/api';
import type { BackendDevice, BackendEvent, BackendLocation, BackendUser } from '../../types/backend';

type FormState = Partial<BackendEvent>;

const emptyEventForm: FormState = {
  event_type: 'fall',
  related_user_id: undefined,
  trigger_device_id: undefined,
  location_zone_id: undefined,
  event_status: 'unhandled',
  remark: ''
};

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
  const [handleStatus, setHandleStatus] = useState<string>('resolved');
  const [handleRemark, setHandleRemark] = useState('');
  const [form, setForm] = useState<FormState>(emptyEventForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ev, usr, dev, loc] = await Promise.all([
        eventApi.list({ limit: 1000 }),
        userApi.list({ limit: 1000 }),
        deviceApi.list({ limit: 1000 }),
        locationApi.list({ limit: 1000 })
      ]);
      setEvents(ev);
      setUsers(usr);
      setDevices(dev);
      setLocations(loc);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!keyword) return events;
    const needle = keyword.toLowerCase();
    return events.filter(
      (e) => e.event_type?.toLowerCase().includes(needle) || e.remark?.toLowerCase().includes(needle)
    );
  }, [events, keyword]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (!form.related_user_id || !form.trigger_device_id) {
        setError('Missing related user or trigger device');
        return;
      }
      if (editing) {
        await eventApi.update(editing.event_id, form);
      } else {
        await eventApi.create(form);
      }
      setEditing(null);
      setForm(emptyEventForm);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setError(msg);
    }
  };

  const handleEdit = (ev: BackendEvent) => {
    setEditing(ev);
    setForm({
      event_type: ev.event_type,
      related_user_id: ev.related_user_id,
      trigger_device_id: ev.trigger_device_id,
      location_zone_id: ev.location_zone_id ?? undefined,
      event_status: ev.event_status,
      remark: ev.remark ?? ''
    });
  };

  const handleDelete = async (ev: BackendEvent) => {
    if (!window.confirm(`Delete event #${ev.event_id}?`)) return;
    try {
      await eventApi.delete(ev.event_id);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      setError(msg);
    }
  };

  const submitHandle = async () => {
    if (!handling) return;
    try {
      await eventApi.handle(handling.event_id, handleStatus, undefined, handleRemark);
      setHandling(null);
      setHandleRemark('');
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Handle failed';
      setError(msg);
    }
  };

  return (
    <div className="admin-card">
      <header className="admin-card__header">
        <div>
          <h3>Events</h3>
          <p className="muted">Mapped to /api/v1/events</p>
        </div>
        <input
          placeholder="Search type or remark"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </header>

      {error && <div className="admin-error">{error}</div>}
      {loading ? <div className="admin-loading">Loading...</div> : null}

      <div className="events-admin__table-scroll" role="region" aria-label="Events list">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Status</th>
              <th>Passenger/User</th>
              <th>Device</th>
              <th>Time</th>
              <th>Remark</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ev) => (
              <tr key={ev.event_id}>
                <td>{ev.event_id}</td>
                <td>{ev.event_type}</td>
                <td>{ev.event_status}</td>
                <td>{ev.related_user_id}</td>
                <td>{ev.trigger_device_id}</td>
                <td>{new Date(ev.event_timestamp).toLocaleString()}</td>
                <td>{ev.remark ?? '-'}</td>
                <td>
                  <button onClick={() => handleEdit(ev)}>Edit</button>
                  <button onClick={() => setHandling(ev)}>Handle</button>
                  <button className="danger" onClick={() => void handleDelete(ev)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-form">
        <h4>{editing ? 'Edit Event' : 'Add Event'}</h4>
        <form onSubmit={handleSubmit}>
          <label>
            Type
            <select
              value={form.event_type ?? 'fall'}
              onChange={(e) => setForm({ ...form, event_type: e.target.value as BackendEvent['event_type'] })}
            >
              <option value="fall">fall</option>
              <option value="sos">sos</option>
              <option value="vital_signs_abnormal">vital_signs_abnormal</option>
              <option value="bed_exit">bed_exit</option>
              <option value="bathroom_retention">bathroom_retention</option>
              <option value="geofence_breach">geofence_breach</option>
            </select>
          </label>
          <label>
            Passenger/User
            <select
              value={form.related_user_id ?? ''}
              onChange={(e) =>
                setForm({ ...form, related_user_id: e.target.value ? Number(e.target.value) : undefined })
              }
            >
              <option value="">Select passenger/user</option>
              {users
                .filter((u) => u.role_type === 'elderly')
                .map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.name} (ID {u.user_id})
                  </option>
                ))}
            </select>
          </label>
          <label>
            Trigger device
            <select
              value={form.trigger_device_id ?? ''}
              onChange={(e) =>
                setForm({ ...form, trigger_device_id: e.target.value ? Number(e.target.value) : undefined })
              }
            >
              <option value="">Select device</option>
              {devices.map((d) => (
                <option key={d.device_id} value={d.device_id}>
                  {d.model_desc || d.device_type} (ID {d.device_id})
                </option>
              ))}
            </select>
          </label>
          <label>
            Location
            <select
              value={form.location_zone_id ?? ''}
              onChange={(e) =>
                setForm({ ...form, location_zone_id: e.target.value ? Number(e.target.value) : undefined })
              }
            >
              <option value="">None</option>
              {locations.map((l) => (
                <option key={l.location_zone_id} value={l.location_zone_id}>
                  {l.name ?? l.location_zone_id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={form.event_status ?? 'unhandled'}
              onChange={(e) =>
                setForm({ ...form, event_status: e.target.value as BackendEvent['event_status'] })
              }
            >
              <option value="unhandled">unhandled</option>
              <option value="resolved">resolved</option>
              <option value="confirmed">confirmed</option>
              <option value="false_alarm">false_alarm</option>
            </select>
          </label>
          <label>
            Remark
            <textarea value={form.remark ?? ''} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
          </label>
          <div className="admin-form__actions">
            <button type="submit">{editing ? 'Update' : 'Create'}</button>
            {editing && (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setEditing(null);
                  setForm(emptyEventForm);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {handling ? (
        <div className="admin-modal">
          <div className="admin-modal__content">
            <h4>Handle Event #{handling.event_id}</h4>
            <label>
              Status
              <select value={handleStatus} onChange={(e) => setHandleStatus(e.target.value)}>
                <option value="resolved">resolved</option>
                <option value="confirmed">confirmed</option>
                <option value="false_alarm">false_alarm</option>
                <option value="unhandled">unhandled</option>
              </select>
            </label>
            <label>
              Remark
              <textarea value={handleRemark} onChange={(e) => setHandleRemark(e.target.value)} />
            </label>
            <div className="admin-form__actions">
              <button onClick={() => void submitHandle()}>Submit</button>
              <button className="ghost" onClick={() => setHandling(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
