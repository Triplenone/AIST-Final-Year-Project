import { useCallback, useEffect, useMemo, useState } from 'react';
import { dataReceptionApi, deviceApi, deviceDataLogApi } from '../../services/api';
import type { BackendDevice, BackendDeviceDataLog } from '../../types/backend';

type FormState = Partial<BackendDeviceDataLog>;

// 設備日誌管理 (Device logs admin) – 對應 /api/v1/device-data-log
export const DeviceLogsAdmin = () => {
  const [logs, setLogs] = useState<BackendDeviceDataLog[]>([]);
  const [devices, setDevices] = useState<BackendDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BackendDeviceDataLog | null>(null);
  const [keyword, setKeyword] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [status, setStatus] = useState<{ total: number; last: string | null; errors: number }>({
    total: 0,
    last: null,
    errors: 0,
  });
  const [tcpRunning, setTcpRunning] = useState(false);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [tcpActionLoading, setTcpActionLoading] = useState(false);
  const [form, setForm] = useState<FormState>({
    device_id: undefined,
    timestamp: Math.floor(Date.now() / 1000),
    relative_time: Math.floor(Date.now() / 1000),
    accel_x: 0.123,
    accel_y: -0.046,
    accel_z: 1.023,
    gyro_x: 1.254,
    gyro_y: -0.754,
    gyro_z: 0.325,
    loc_x: 2.35,
    loc_y: 3.67,
    loc_z: 0,
    loc_accuracy: 1.25,
    position_quality: 'medium',
    fall_state: 0,
    fall_state_description: '正常',
    fall_confidence: 0.0,
    is_fall_confirmed: false,
    impact_force: 0.0,
    fall_direction: '',
    fall_time: Math.floor(Date.now() / 1000),
    wifi_connected: true,
    server_connected: true,
    battery_level: 85,
    server_receive_time: new Date().toISOString(),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, dev] = await Promise.all([
        deviceDataLogApi.list({ limit: 200 }),
        deviceApi.list({ limit: 1000 }),
      ]);
      setLogs(data);
      setDevices(dev);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '無法取得設備日誌 (Failed to fetch logs)';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStatus = useCallback(async () => {
    try {
      const res = await dataReceptionApi.getStatus();
      if (res) {
        const tcp = res.tcp_server;
        const running = Boolean(tcp?.is_running);
        setTcpRunning(running);

        // 後端在 TCP 運行時已將 tcp 統計合併進 stats，此處統一用 stats 顯示
        if (res.stats) {
          setStatus({
            total: res.stats.total_received ?? 0,
            last: res.stats.last_receive_time ?? null,
            errors: res.stats.errors ?? 0,
          });
        }
        // 「設備已連接」= 當前有 TCP 連接 或 近期有收到數據（參考 Python：ESP32 常發完即斷，用近期接收判斷）
        if (running && tcp) {
          const hasActiveClient = (tcp.active_client_count ?? 0) > 0;
          const lastTime = tcp.last_receive_time ?? res.stats?.last_receive_time;
          const recentSeconds = 45;
          const recentReceive =
            lastTime &&
            (Date.now() - new Date(lastTime).getTime()) / 1000 <= recentSeconds;
          setDeviceConnected(hasActiveClient || Boolean(recentReceive));
        } else {
          setDeviceConnected(false);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    void loadStatus();
  }, [load, loadStatus]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => {
      void load();
      void loadStatus();
    }, 1000);
    return () => window.clearInterval(id);
  }, [autoRefresh, load, loadStatus]);

  // 參考 Python 程式：TCP 運行時每 1.5 秒刷新狀態，使「系統狀態」與接收數即時更新
  useEffect(() => {
    if (!tcpRunning) return;
    const id = window.setInterval(() => void loadStatus(), 1500);
    return () => window.clearInterval(id);
  }, [tcpRunning, loadStatus]);

  const filtered = useMemo(() => {
    if (!keyword) return logs;
    return logs.filter(
      (l) =>
        l.device_name?.toLowerCase().includes(keyword.toLowerCase()) ||
        l.device_type?.toLowerCase().includes(keyword.toLowerCase()) ||
        l.fall_state_description?.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [keyword, logs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!form.device_id) {
        setError('device_id 必填');
        return;
      }
      const payload: Partial<BackendDeviceDataLog> = {
        ...form,
        device_id: Number(form.device_id),
        timestamp: Number(form.timestamp),
        relative_time: Number(form.relative_time),
        accel_x: Number(form.accel_x),
        accel_y: Number(form.accel_y),
        accel_z: Number(form.accel_z),
        gyro_x: Number(form.gyro_x),
        gyro_y: Number(form.gyro_y),
        gyro_z: Number(form.gyro_z),
        loc_x: Number(form.loc_x),
        loc_y: Number(form.loc_y),
        loc_z: Number(form.loc_z),
        loc_accuracy: Number(form.loc_accuracy),
        fall_state: Number(form.fall_state),
        fall_confidence: Number(form.fall_confidence),
        impact_force: Number(form.impact_force),
        fall_time: Number(form.fall_time),
        wifi_connected: Boolean(form.wifi_connected),
        server_connected: Boolean(form.server_connected),
        battery_level: Number(form.battery_level),
      };
      if (editing) {
        await deviceDataLogApi.update(editing.id, payload);
      } else {
        await deviceDataLogApi.create(payload);
      }
      setEditing(null);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失敗 (Operation failed)';
      setError(msg);
    }
  };

  const handleEdit = (log: BackendDeviceDataLog) => {
    setEditing(log);
    setForm({
      ...log,
      server_receive_time: log.server_receive_time,
    });
  };

  const handleDelete = async (log: BackendDeviceDataLog) => {
    if (!window.confirm(`確認刪除日誌 ID ${log.id}?`)) return;
    try {
      await deviceDataLogApi.delete(log.id);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '刪除失敗 (Delete failed)';
      setError(msg);
    }
  };

  const handleToggleReceive = useCallback(async () => {
    setTcpActionLoading(true);
    setError(null);
    try {
      if (tcpRunning) {
        await dataReceptionApi.tcpStop();
      } else {
        await dataReceptionApi.tcpStart({ host: '0.0.0.0', port: 8080 });
        setAutoRefresh(true);
      }
      await loadStatus();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : tcpRunning
            ? '停止接收失敗 (Stop receive failed)'
            : '啟動接收失敗 (Start receive failed)';
      setError(msg);
    } finally {
      setTcpActionLoading(false);
    }
  }, [loadStatus, tcpRunning]);

  const toggleFallConfirmed = (checked: boolean) => {
    setForm((prev) => {
      const now = Math.floor(Date.now() / 1000);
      return {
        ...prev,
        is_fall_confirmed: checked,
        fall_state: checked ? 4 : 0,
        fall_state_description: checked ? '確認跌倒' : '正常',
        fall_confidence: checked ? 0.95 : 0.0,
        impact_force: checked ? 6.8 : 0.0,
        fall_direction: checked ? '前' : '',
        fall_time: checked ? now : prev.fall_time,
        accel_x: checked ? 2.456 : prev.accel_x,
        accel_y: checked ? -1.234 : prev.accel_y,
        accel_z: checked ? 9.876 : prev.accel_z,
        gyro_x: checked ? 15.234 : prev.gyro_x,
        gyro_y: checked ? -8.765 : prev.gyro_y,
        gyro_z: checked ? 12.345 : prev.gyro_z,
      };
    });
  };

  return (
    <div className="admin-card">
      <header className="admin-card__header">
        <div>
          <h3>設備日誌 (Device Logs)</h3>
          <p className="muted">對應 /api/v1/device-data-log + /data-reception/status</p>
        </div>
        <div className="admin-actions">
          <input
            placeholder="搜尋名稱/類型/跌倒描述 (search)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <label className="inline">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            自動刷新 (Auto refresh)
          </label>
        </div>
      </header>

      {/* 系統狀態：僅展示連接狀態 */}
      <div className="admin-system-status">
        <div className="admin-system-status__title">系統狀態 (System Status)</div>
        <div
          className={`admin-system-status__connection ${tcpRunning && deviceConnected ? 'connected' : 'disconnected'}`}
          aria-label={tcpRunning && deviceConnected ? '設備已連接' : '設備未連接'}
        >
          <span className="admin-system-status__dot" />
          {tcpRunning && deviceConnected
            ? '設備已連接 - 數據接收中 (Device connected - Receiving)'
            : '設備未連接 (Device not connected)'}
        </div>
      </div>

      <div className="admin-stats">
        <div>TCP 接收服務: {tcpRunning ? '運行中 (Running)' : '已停止 (Stopped)'}</div>
      </div>

      <div className="admin-actions admin-actions--receive">
        <button
          type="button"
          className={tcpRunning ? 'secondary' : 'primary'}
          disabled={tcpActionLoading}
          onClick={() => void handleToggleReceive()}
        >
          {tcpActionLoading
            ? '處理中…'
            : tcpRunning
              ? '停止接收 (Stop receive)'
              : '啟動接收 (Start receive)'}
        </button>
      </div>

      {error && <div className="admin-error">{error}</div>}
      {loading ? <div className="admin-loading">載入中 (Loading)...</div> : null}

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>設備</th>
            <th>跌倒確認</th>
            <th>跌倒描述</th>
            <th>電量</th>
            <th>時間戳</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((log) => (
            <tr key={log.id}>
              <td>{log.id}</td>
              <td>{log.device_name ?? log.device_id}</td>
              <td>{log.is_fall_confirmed ? 'Yes' : 'No'}</td>
              <td>{log.fall_state_description}</td>
              <td>{log.battery_level}</td>
              <td>{log.timestamp ? new Date(log.timestamp * 1000).toLocaleString() : '-'}</td>
              <td>
                <button onClick={() => handleEdit(log)}>編輯</button>
                <button className="danger" onClick={() => void handleDelete(log)}>
                  刪除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="admin-form">
        <h4>{editing ? '編輯日誌 (Edit Log)' : '新增日誌 (Add Log)'}</h4>
        <form onSubmit={handleSubmit}>
          <label>
            設備 (Device) *
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
            時間戳 (timestamp)
            <input
              type="number"
              value={form.timestamp ?? Math.floor(Date.now() / 1000)}
              onChange={(e) =>
                setForm({
                  ...form,
                  timestamp: Number(e.target.value),
                  relative_time: Number(e.target.value),
                })
              }
            />
          </label>
          <label className="inline">
            <input
              type="checkbox"
              checked={form.is_fall_confirmed ?? false}
              onChange={(e) => toggleFallConfirmed(e.target.checked)}
            />
            確認跌倒 (is_fall_confirmed) – 勾選後會自動填入典型跌倒數據
          </label>
          <label>
            跌倒描述
            <input
              value={form.fall_state_description ?? ''}
              onChange={(e) => setForm({ ...form, fall_state_description: e.target.value })}
            />
          </label>
          <label>
            電量 (battery)
            <input
              type="number"
              value={form.battery_level ?? 85}
              onChange={(e) => setForm({ ...form, battery_level: Number(e.target.value) })}
            />
          </label>
          <label>
            接收時間 (server_receive_time)
            <input
              type="datetime-local"
              value={form.server_receive_time ? form.server_receive_time.slice(0, 16) : ''}
              onChange={(e) => setForm({ ...form, server_receive_time: new Date(e.target.value).toISOString() })}
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
