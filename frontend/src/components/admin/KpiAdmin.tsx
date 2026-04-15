import { useCallback, useEffect, useState } from 'react';
import { kpiApi } from '../../services/api';
import type { BackendKpiMetric } from '../../types/backend';

type FormState = Partial<BackendKpiMetric>;

// KPI 管理 (KPI admin) – 對應 /api/v1/kpi
export const KpiAdmin = () => {
  const [items, setItems] = useState<BackendKpiMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BackendKpiMetric | null>(null);
  const [form, setForm] = useState<FormState>({
    name: '',
    calculation_cycle: 'daily',
    value: 0,
    target_threshold: 0,
    record_timestamp: new Date().toISOString(),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await kpiApi.list({ limit: 500 });
      setItems(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '無法取得 KPI (Failed to fetch KPI)';
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
      if (!form.name || !form.calculation_cycle) {
        setError('名稱與計算週期必填');
        return;
      }
      if (editing) {
        await kpiApi.update(editing.kpi_metric_id, form);
      } else {
        await kpiApi.create(form);
      }
      setEditing(null);
      setForm({
        name: '',
        calculation_cycle: 'daily',
        value: 0,
        target_threshold: 0,
        record_timestamp: new Date().toISOString(),
      });
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失敗 (Operation failed)';
      setError(msg);
    }
  };

  const handleEdit = (item: BackendKpiMetric) => {
    setEditing(item);
    setForm({
      name: item.name,
      calculation_cycle: item.calculation_cycle,
      value: Number(item.value),
      target_threshold: Number(item.target_threshold),
      record_timestamp: item.record_timestamp,
    });
  };

  const handleDelete = async (item: BackendKpiMetric) => {
    if (!window.confirm(`確認刪除 KPI ${item.name}?`)) return;
    try {
      await kpiApi.delete(item.kpi_metric_id);
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
          <h3>KPI 管理 (KPI)</h3>
          <p className="muted">對應 /api/v1/kpi</p>
        </div>
      </header>

      {error && <div className="admin-error">{error}</div>}
      {loading ? <div className="admin-loading">載入中 (Loading)...</div> : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>名稱</th>
            <th>週期</th>
            <th>值</th>
            <th>目標</th>
            <th>時間</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((kpi) => (
            <tr key={kpi.kpi_metric_id}>
              <td>{kpi.kpi_metric_id}</td>
              <td>{kpi.name}</td>
              <td>{kpi.calculation_cycle}</td>
              <td>{kpi.value}</td>
              <td>{kpi.target_threshold}</td>
              <td>{kpi.record_timestamp}</td>
              <td>
                <button onClick={() => handleEdit(kpi)}>編輯</button>
                <button className="danger" onClick={() => void handleDelete(kpi)}>
                  刪除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="admin-form">
        <h4>{editing ? '編輯 KPI (Edit KPI)' : '新增 KPI (Add KPI)'}</h4>
        <form onSubmit={handleSubmit}>
          <label>
            名稱 (Name)
            <input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            週期 (Cycle)
            <select
              value={form.calculation_cycle ?? 'daily'}
              onChange={(e) =>
                setForm({ ...form, calculation_cycle: e.target.value as BackendKpiMetric['calculation_cycle'] })
              }
              required
            >
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
            </select>
          </label>
          <label>
            值 (Value)
            <input
              type="number"
              step="0.01"
              value={form.value ?? 0}
              onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
              required
            />
          </label>
          <label>
            目標 (Target)
            <input
              type="number"
              step="0.01"
              value={form.target_threshold ?? 0}
              onChange={(e) => setForm({ ...form, target_threshold: Number(e.target.value) })}
              required
            />
          </label>
          <label>
            時間 (record_timestamp)
            <input
              type="datetime-local"
              value={form.record_timestamp ? form.record_timestamp.slice(0, 16) : ''}
              onChange={(e) => setForm({ ...form, record_timestamp: new Date(e.target.value).toISOString() })}
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
                    name: '',
                    calculation_cycle: 'daily',
                    value: 0,
                    target_threshold: 0,
                    record_timestamp: new Date().toISOString(),
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
