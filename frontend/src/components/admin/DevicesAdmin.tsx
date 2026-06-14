import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { deviceApi, userApi } from '../../services/api';
import type { BackendDevice, BackendUser } from '../../types/backend';

type FormState = Partial<BackendDevice>;

const emptyDeviceForm: FormState = {
  device_type: '',
  model_desc: '',
  elderly_user_id: null,
  current_status: 'offline',
  battery_level: undefined,
  deploy_location: ''
};

// Device admin still writes the legacy backend field elderly_user_id.
export const DevicesAdmin = () => {
  const [devices, setDevices] = useState<BackendDevice[]>([]);
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BackendDevice | null>(null);
  const [keyword, setKeyword] = useState('');
  const [form, setForm] = useState<FormState>(emptyDeviceForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dev, usr] = await Promise.all([deviceApi.list({ limit: 1000 }), userApi.list({ limit: 1000 })]);
      setDevices(dev);
      setUsers(usr);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch devices';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!keyword) return devices;
    const needle = keyword.toLowerCase();
    return devices.filter(
      (d) =>
        d.model_desc?.toLowerCase().includes(needle) ||
        d.device_type?.toLowerCase().includes(needle) ||
        d.deploy_location?.toLowerCase().includes(needle)
    );
  }, [devices, keyword]);

  const usersById = useMemo(() => {
    return new Map(users.map((user) => [user.user_id, user]));
  }, [users]);

  const userBindingCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const device of devices) {
      const userId = device.elderly_user_id;
      if (userId != null) {
        counts.set(userId, (counts.get(userId) ?? 0) + 1);
      }
    }
    return counts;
  }, [devices]);

  const formatBoundUser = useCallback(
    (userId?: number | null) => {
      if (userId == null) return '-';
      const user = usersById.get(userId);
      return user ? `${userId} - ${user.name}` : `${userId} - unknown user`;
    },
    [usersById]
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (editing) {
        await deviceApi.update(editing.device_id, form);
      } else {
        await deviceApi.create(form);
      }
      setEditing(null);
      setForm(emptyDeviceForm);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
      setError(msg);
    }
  };

  const handleEdit = (d: BackendDevice) => {
    setEditing(d);
    setForm({
      device_type: d.device_type,
      model_desc: d.model_desc,
      elderly_user_id: d.elderly_user_id ?? null,
      current_status: d.current_status ?? 'offline',
      battery_level: d.battery_level ?? undefined,
      deploy_location: d.deploy_location ?? ''
    });
  };

  const handleDelete = async (d: BackendDevice) => {
    if (!window.confirm(`Delete device ${d.model_desc || d.device_type}?`)) return;
    try {
      await deviceApi.delete(d.device_id);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      setError(msg);
    }
  };

  return (
    <div className="admin-card">
      <header className="admin-card__header">
        <div>
          <h3>Devices</h3>
          <p className="muted">Mapped to /api/v1/devices</p>
        </div>
        <input
          placeholder="Search name, model, or location"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </header>

      {error && <div className="admin-error">{error}</div>}
      {loading ? <div className="admin-loading">Loading...</div> : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Model</th>
            <th>Status</th>
            <th>Passenger/User ID</th>
            <th>Battery</th>
            <th>Deploy location</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((d) => (
            <tr key={d.device_id}>
              <td>{d.device_id}</td>
              <td>{d.model_desc || d.device_type}</td>
              <td>{d.current_status}</td>
              <td>
                {formatBoundUser(d.elderly_user_id)}
                {d.elderly_user_id != null && (userBindingCounts.get(d.elderly_user_id) ?? 0) > 1 ? (
                  <span className="admin-inline-warning"> duplicate</span>
                ) : null}
              </td>
              <td>{d.battery_level ?? '-'}</td>
              <td>{d.deploy_location ?? '-'}</td>
              <td>
                <button onClick={() => handleEdit(d)}>Edit</button>
                <button className="danger" onClick={() => void handleDelete(d)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="admin-form">
        <h4>{editing ? 'Edit Device' : 'Add Device'}</h4>
        <form onSubmit={handleSubmit}>
          <label>
            Model
            <input
              value={form.model_desc ?? ''}
              onChange={(e) => setForm({ ...form, model_desc: e.target.value })}
              placeholder="ESP32-based IMU..."
            />
          </label>
          <label>
            Type
            <input
              value={form.device_type ?? ''}
              onChange={(e) => setForm({ ...form, device_type: e.target.value })}
              placeholder="IMU_Safety_Sensor"
            />
          </label>
          <label>
            Bound passenger (legacy user id)
            <select
              value={form.elderly_user_id ?? ''}
              onChange={(e) =>
                setForm({ ...form, elderly_user_id: e.target.value ? Number(e.target.value) : null })
              }
            >
              <option value="">None</option>
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
            Status
            <select
              value={form.current_status ?? 'offline'}
              onChange={(e) => setForm({ ...form, current_status: e.target.value as BackendDevice['current_status'] })}
            >
              <option value="online">online</option>
              <option value="offline">offline</option>
              <option value="abnormal">abnormal</option>
            </select>
          </label>
          <label>
            Battery
            <input
              type="number"
              value={form.battery_level ?? ''}
              onChange={(e) =>
                setForm({ ...form, battery_level: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </label>
          <label>
            Deploy location
            <input
              value={form.deploy_location ?? ''}
              onChange={(e) => setForm({ ...form, deploy_location: e.target.value })}
            />
          </label>
          <div className="admin-form__actions">
            <button type="submit">{editing ? 'Update' : 'Create'}</button>
            {editing && (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setEditing(null);
                  setForm(emptyDeviceForm);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
