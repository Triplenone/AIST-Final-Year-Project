import { useCallback, useEffect, useState } from 'react';
import { deviceApi, locationApi, userApi, userStatusApi } from '../../services/api';
import type { BackendDevice, BackendLocation, BackendUser, BackendUserStatus } from '../../types/backend';

type FormState = Partial<BackendUserStatus>;

// 用戶狀態管理 (User status admin) – 對應 /api/v1/user-status
export const UserStatusAdmin = () => {
  const [records, setRecords] = useState<BackendUserStatus[]>([]);
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [devices, setDevices] = useState<BackendDevice[]>([]);
  const [locations, setLocations] = useState<BackendLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BackendUserStatus | null>(null);
  const [form, setForm] = useState<FormState>({
    user_id: undefined,
    device_id: undefined,
    location_zone_id: undefined,
    heart_rate: 70,
    blood_oxygen: 98,
    body_temperature: 36.6,
    is_normal: true,
    status_timestamp: new Date().toISOString(),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [status, usr, dev, loc] = await Promise.all([
        userStatusApi.list({ limit: 1000 }),
        userApi.list({ limit: 1000 }),
        deviceApi.list({ limit: 1000 }),
        locationApi.list({ limit: 1000 }),
      ]);
      setRecords(status);
      setUsers(usr);
      setDevices(dev);
      setLocations(loc);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '無法取得用戶狀態 (Failed to fetch user status)';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!form.user_id || !form.device_id) {
        setError('user_id 與 device_id 必填');
        return;
      }
      if (editing) {
        await userStatusApi.update(editing.user_status_id, form);
      } else {
        await userStatusApi.create(form);
      }
      setEditing(null);
      setForm({
        user_id: undefined,
        device_id: undefined,
        location_zone_id: undefined,
        heart_rate: 70,
        blood_oxygen: 98,
        body_temperature: 36.6,
        is_normal: true,
        status_timestamp: new Date().toISOString(),
      });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失敗 (Operation failed)';
      setError(msg);
    }
  };

  const handleEdit = (rec: BackendUserStatus) => {
    setEditing(rec);
    setForm({
      user_id: rec.user_id,
      device_id: rec.device_id,
      location_zone_id: rec.location_zone_id ?? undefined,
      heart_rate: rec.heart_rate,
      blood_oxygen: rec.blood_oxygen,
      body_temperature: rec.body_temperature,
      is_normal: rec.is_normal,
      status_timestamp: rec.status_timestamp,
    });
  };

  const handleDelete = async (rec: BackendUserStatus) => {
    if (!window.confirm(`確認刪除用戶狀態 #${rec.user_status_id}?`)) return;
    try {
      await userStatusApi.delete(rec.user_status_id);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '刪除失敗 (Delete failed)';
      setError(msg);
    }
  };

  return (
    <div className="admin-card">
      <header className="admin-card__header">
        <div>
          <h3>用戶狀態 (User Status)</h3>
          <p className="muted">對應 /api/v1/user-status</p>
        </div>
      </header>

      {error && <div className="admin-error">{error}</div>}
      {loading ? <div className="admin-loading">載入中 (Loading)...</div> : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>用戶</th>
            <th>設備</th>
            <th>HR</th>
            <th>SpO2</th>
            <th>Temp</th>
            <th>正常</th>
            <th>時間</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {records.map((rec) => (
            <tr key={rec.user_status_id}>
              <td>{rec.user_status_id}</td>
              <td>{rec.user_name ?? rec.user_id}</td>
              <td>{rec.device_name ?? rec.device_id}</td>
              <td>{rec.heart_rate}</td>
              <td>{rec.blood_oxygen}</td>
              <td>{rec.body_temperature}</td>
              <td>{rec.is_normal ? 'Yes' : 'No'}</td>
              <td>{new Date(rec.status_timestamp).toLocaleString()}</td>
              <td>
                <button onClick={() => handleEdit(rec)}>編輯</button>
                <button className="danger" onClick={() => void handleDelete(rec)}>
                  刪除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="admin-form">
        <h4>{editing ? '編輯用戶狀態 (Edit)' : '新增用戶狀態 (Add)'}</h4>
        <form onSubmit={handleSubmit}>
          <label>
            用戶 (User)
            <select
              value={form.user_id ?? ''}
              onChange={(e) => setForm({ ...form, user_id: e.target.value ? Number(e.target.value) : undefined })}
              required
            >
              <option value="">選擇用戶</option>
              {users.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.name} (ID {u.user_id})
                </option>
              ))}
            </select>
          </label>
          <label>
            設備 (Device)
            <select
              value={form.device_id ?? ''}
              onChange={(e) => setForm({ ...form, device_id: e.target.value ? Number(e.target.value) : undefined })}
              required
            >
              <option value="">選擇設備</option>
              {devices.map((d) => (
                <option key={d.device_id} value={d.device_id}>
                  {d.model_desc || d.device_type} (ID {d.device_id})
                </option>
              ))}
            </select>
          </label>
          <label>
            位置 (Location)
            <select
              value={form.location_zone_id ?? ''}
              onChange={(e) =>
                setForm({ ...form, location_zone_id: e.target.value ? Number(e.target.value) : undefined })
              }
            >
              <option value="">未指定</option>
              {locations.map((l) => (
                <option key={l.location_zone_id} value={l.location_zone_id}>
                  {l.name ?? l.location_zone_id}
                </option>
              ))}
            </select>
          </label>
          <label>
            HR
            <input
              type="number"
              value={form.heart_rate ?? 0}
              onChange={(e) => setForm({ ...form, heart_rate: Number(e.target.value) })}
              required
            />
          </label>
          <label>
            SpO2
            <input
              type="number"
              value={form.blood_oxygen ?? 0}
              onChange={(e) => setForm({ ...form, blood_oxygen: Number(e.target.value) })}
              required
            />
          </label>
          <label>
            Temp (°C)
            <input
              type="number"
              step="0.01"
              value={form.body_temperature ?? 0}
              onChange={(e) => setForm({ ...form, body_temperature: Number(e.target.value) })}
              required
            />
          </label>
          <label>
            正常 (is_normal)
            <input
              type="checkbox"
              checked={form.is_normal ?? true}
              onChange={(e) => setForm({ ...form, is_normal: e.target.checked })}
            />
          </label>
          <label>
            時間 (timestamp)
            <input
              type="datetime-local"
              value={form.status_timestamp ? form.status_timestamp.slice(0, 16) : ''}
              onChange={(e) => setForm({ ...form, status_timestamp: new Date(e.target.value).toISOString() })}
              required
            />
          </label>
          <div className="admin-form__actions">
            <button type="submit">{editing ? '更新 (Update)' : '新增 (Create)'}</button>
            {editing && (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setEditing(null);
                  setForm({
                    user_id: undefined,
                    device_id: undefined,
                    location_zone_id: undefined,
                    heart_rate: 70,
                    blood_oxygen: 98,
                    body_temperature: 36.6,
                    is_normal: true,
                    status_timestamp: new Date().toISOString(),
                  });
                }}
              >
                取消 (Cancel)
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
