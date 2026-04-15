import { useCallback, useEffect, useState } from 'react';
import { locationApi } from '../../services/api';
import type { BackendLocation } from '../../types/backend';

type FormState = Partial<BackendLocation>;

// 位置管理 (Locations admin) – 對應 /api/v1/locations
export const LocationsAdmin = () => {
  const [locations, setLocations] = useState<BackendLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BackendLocation | null>(null);
  const [form, setForm] = useState<FormState>({
    name: '',
    category: 'room',
    is_safe_zone: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await locationApi.list({ limit: 1000 });
      setLocations(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '無法取得位置 (Failed to fetch locations)';
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
      if (!form.category) {
        setError('category 必填');
        return;
      }
      if (editing) {
        await locationApi.update(editing.location_zone_id, form);
      } else {
        await locationApi.create(form);
      }
      setEditing(null);
      setForm({ name: '', category: 'room', is_safe_zone: true });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失敗 (Operation failed)';
      setError(msg);
    }
  };

  const handleEdit = (loc: BackendLocation) => {
    setEditing(loc);
    setForm({
      name: loc.name ?? '',
      category: loc.category,
      related_beacon_ids: loc.related_beacon_ids ?? '',
      geofence_coordinates: loc.geofence_coordinates ?? '',
      is_safe_zone: loc.is_safe_zone,
    });
  };

  const handleDelete = async (loc: BackendLocation) => {
    if (!window.confirm(`確認刪除位置 ${loc.name ?? loc.location_zone_id}?`)) return;
    try {
      await locationApi.delete(loc.location_zone_id);
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
          <h3>位置管理 (Locations)</h3>
          <p className="muted">對應 /api/v1/locations</p>
        </div>
      </header>

      {error && <div className="admin-error">{error}</div>}
      {loading ? <div className="admin-loading">載入中 (Loading)...</div> : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>名稱 (Name)</th>
            <th>類別 (Category)</th>
            <th>安全區 (Safe)</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((loc) => (
            <tr key={loc.location_zone_id}>
              <td>{loc.location_zone_id}</td>
              <td>{loc.name ?? '-'}</td>
              <td>{loc.category}</td>
              <td>{loc.is_safe_zone ? 'Yes' : 'No'}</td>
              <td>
                <button onClick={() => handleEdit(loc)}>編輯</button>
                <button className="danger" onClick={() => void handleDelete(loc)}>
                  刪除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="admin-form">
        <h4>{editing ? '編輯位置 (Edit Location)' : '新增位置 (Add Location)'}</h4>
        <form onSubmit={handleSubmit}>
          <label>
            名稱 (Name)
            <input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label>
            類別 (Category)
            <select
              value={form.category ?? 'room'}
              onChange={(e) => setForm({ ...form, category: e.target.value as BackendLocation['category'] })}
            >
              <option value="room">room</option>
              <option value="corridor">corridor</option>
              <option value="bathroom">bathroom</option>
              <option value="common_area">common_area</option>
              <option value="outdoor_area">outdoor_area</option>
            </select>
          </label>
          <label>
            安全區 (Safe zone)
            <input
              type="checkbox"
              checked={form.is_safe_zone ?? true}
              onChange={(e) => setForm({ ...form, is_safe_zone: e.target.checked })}
            />
          </label>
          <label>
            Beacon IDs
            <input
              value={form.related_beacon_ids ?? ''}
              onChange={(e) => setForm({ ...form, related_beacon_ids: e.target.value })}
            />
          </label>
          <label>
            圍欄座標 (Geofence)
            <input
              value={form.geofence_coordinates ?? ''}
              onChange={(e) => setForm({ ...form, geofence_coordinates: e.target.value })}
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
                  setForm({ name: '', category: 'room', is_safe_zone: true });
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
