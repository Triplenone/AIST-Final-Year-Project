import { useCallback, useEffect, useMemo, useState } from 'react';
import { deviceApi, userApi } from '../../services/api';
import type { BackendDevice, BackendUser } from '../../types/backend';

type FormState = Partial<BackendDevice>;

// 設備管理 (Devices admin) – 對應 /api/v1/devices
export const DevicesAdmin = () => {
  const [devices, setDevices] = useState<BackendDevice[]>([]);
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BackendDevice | null>(null);
  const [keyword, setKeyword] = useState('');
  const [form, setForm] = useState<FormState>({
    device_type: '',
    model_desc: '',
    elderly_user_id: undefined,
    current_status: 'offline',
    battery_level: undefined,
    deploy_location: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dev, usr] = await Promise.all([deviceApi.list({ limit: 1000 }), userApi.list({ limit: 1000 })]);
      setDevices(dev);
      setUsers(usr);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '無法取得設備 (Failed to fetch devices)';
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
    return devices.filter(
      (d) =>
        d.model_desc?.toLowerCase().includes(keyword.toLowerCase()) ||
        d.device_type?.toLowerCase().includes(keyword.toLowerCase()) ||
        d.deploy_location?.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [devices, keyword]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (editing) {
        await deviceApi.update(editing.device_id, form);
      } else {
        await deviceApi.create(form);
      }
      setEditing(null);
      setForm({
        device_type: '',
        model_desc: '',
        elderly_user_id: undefined,
        current_status: 'offline',
        battery_level: undefined,
        deploy_location: '',
      });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失敗 (Operation failed)';
      setError(msg);
    }
  };

  const handleEdit = (d: BackendDevice) => {
    setEditing(d);
    setForm({
      device_type: d.device_type,
      model_desc: d.model_desc,
      elderly_user_id: d.elderly_user_id ?? undefined,
      current_status: d.current_status ?? 'offline',
      battery_level: d.battery_level ?? undefined,
      deploy_location: d.deploy_location ?? '',
    });
  };

  const handleDelete = async (d: BackendDevice) => {
    if (!window.confirm(`確認刪除設備 ${d.model_desc || d.device_type}?`)) return;
    try {
      await deviceApi.delete(d.device_id);
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
          <h3>設備管理 (Devices)</h3>
          <p className="muted">對應 /api/v1/devices</p>
        </div>
        <input
          placeholder="搜尋名稱/型號/位置 (search device)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
      </header>

      {error && <div className="admin-error">{error}</div>}
      {loading ? <div className="admin-loading">載入中 (Loading)...</div> : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>型號/描述 (Model)</th>
            <th>狀態 (Status)</th>
            <th>老人 ID</th>
            <th>電量 (Battery)</th>
            <th>位置 (Deploy)</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((d) => (
            <tr key={d.device_id}>
              <td>{d.device_id}</td>
              <td>{d.model_desc || d.device_type}</td>
              <td>{d.current_status}</td>
              <td>{d.elderly_user_id ?? '-'}</td>
              <td>{d.battery_level ?? '-'}</td>
              <td>{d.deploy_location ?? '-'}</td>
              <td>
                <button onClick={() => handleEdit(d)}>編輯</button>
                <button className="danger" onClick={() => void handleDelete(d)}>
                  刪除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="admin-form">
        <h4>{editing ? '編輯設備 (Edit Device)' : '新增設備 (Add Device)'}</h4>
        <form onSubmit={handleSubmit}>
          <label>
            型號/描述 (Model)
            <input
              value={form.model_desc ?? ''}
              onChange={(e) => setForm({ ...form, model_desc: e.target.value })}
              placeholder="ESP32-based IMU..."
            />
          </label>
          <label>
            類型 (Type)
            <input
              value={form.device_type ?? ''}
              onChange={(e) => setForm({ ...form, device_type: e.target.value })}
              placeholder="IMU_Safety_Sensor"
            />
          </label>
          <label>
            綁定老人 (Elderly user id)
            <select
              value={form.elderly_user_id ?? ''}
              onChange={(e) =>
                setForm({ ...form, elderly_user_id: e.target.value ? Number(e.target.value) : undefined })
              }
            >
              <option value="">未綁定 (None)</option>
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
            狀態 (Status)
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
            電量 (Battery)
            <input
              type="number"
              value={form.battery_level ?? ''}
              onChange={(e) =>
                setForm({ ...form, battery_level: e.target.value ? Number(e.target.value) : undefined })
              }
            />
          </label>
          <label>
            佈署位置 (Deploy location)
            <input
              value={form.deploy_location ?? ''}
              onChange={(e) => setForm({ ...form, deploy_location: e.target.value })}
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
                    device_type: '',
                    model_desc: '',
                    elderly_user_id: undefined,
                    current_status: 'offline',
                    battery_level: undefined,
                    deploy_location: '',
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
