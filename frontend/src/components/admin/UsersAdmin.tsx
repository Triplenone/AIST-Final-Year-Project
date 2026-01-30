import { useCallback, useEffect, useMemo, useState } from 'react';
import { userApi } from '../../services/api';
import type { BackendUser } from '../../types/backend';

type FormState = Partial<BackendUser>;

// 用戶管理 (Users admin) – 對應 /api/v1/users
export const UsersAdmin = () => {
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BackendUser | null>(null);
  const [keyword, setKeyword] = useState('');
  const [form, setForm] = useState<FormState>({
    name: '',
    role_type: 'elderly',
    gender: 'male',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.list({ limit: 1000 });
      setUsers(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '無法取得用戶 (Failed to fetch users)';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!keyword) return users;
    return users.filter(
      (u) =>
        u.name?.toLowerCase().includes(keyword.toLowerCase()) ||
        u.contact_info?.toLowerCase().includes(keyword.toLowerCase())
    );
  }, [keyword, users]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (!form.name) {
        setError('姓名必填 (Name is required)');
        return;
      }
      if (editing) {
        await userApi.update(editing.user_id, form);
      } else {
        await userApi.create(form);
      }
      setForm({ name: '', role_type: 'elderly', gender: 'male' });
      setEditing(null);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失敗 (Operation failed)';
      setError(msg);
    }
  };

  const handleEdit = (u: BackendUser) => {
    setEditing(u);
    setForm({
      name: u.name,
      role_type: u.role_type,
      gender: u.gender,
      age: u.age,
      contact_info: u.contact_info,
      medical_conditions: u.medical_conditions,
    });
  };

  const handleDelete = async (u: BackendUser) => {
    if (!window.confirm(`確認刪除用戶 ${u.name}?`)) return;
    try {
      await userApi.delete(u.user_id);
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
          <h3>用戶管理 (Users)</h3>
          <p className="muted">對應 /api/v1/users</p>
        </div>
        <input
          placeholder="搜尋姓名或聯絡方式 (search name/contact)"
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
            <th>姓名 (Name)</th>
            <th>角色 (Role)</th>
            <th>性別 (Gender)</th>
            <th>年齡 (Age)</th>
            <th>聯絡 (Contact)</th>
            <th>操作 (Actions)</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.user_id}>
              <td>{u.user_id}</td>
              <td>{u.name}</td>
              <td>{u.role_type}</td>
              <td>{u.gender}</td>
              <td>{u.age ?? '-'}</td>
              <td>{u.contact_info ?? '-'}</td>
              <td>
                <button onClick={() => handleEdit(u)}>編輯 (Edit)</button>
                <button className="danger" onClick={() => void handleDelete(u)}>
                  刪除 (Delete)
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="admin-form">
        <h4>{editing ? '編輯用戶 (Edit User)' : '新增用戶 (Add User)'}</h4>
        <form onSubmit={handleSubmit}>
          <label>
            姓名 (Name)
            <input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            角色 (Role)
            <select
              value={form.role_type ?? 'elderly'}
              onChange={(e) => setForm({ ...form, role_type: e.target.value as BackendUser['role_type'] })}
            >
              <option value="elderly">elderly</option>
              <option value="caregiver">caregiver</option>
              <option value="administrator">administrator</option>
            </select>
          </label>
          <label>
            性別 (Gender)
            <select
              value={form.gender ?? 'male'}
              onChange={(e) => setForm({ ...form, gender: e.target.value as BackendUser['gender'] })}
            >
              <option value="male">male</option>
              <option value="female">female</option>
              <option value="other">other</option>
            </select>
          </label>
          <label>
            年齡 (Age)
            <input
              type="number"
              value={form.age ?? ''}
              onChange={(e) => setForm({ ...form, age: e.target.value ? Number(e.target.value) : undefined })}
            />
          </label>
          <label>
            聯絡方式 (Contact)
            <input
              value={form.contact_info ?? ''}
              onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
            />
          </label>
          <label>
            醫療狀況 (Medical)
            <textarea
              value={form.medical_conditions ?? ''}
              onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })}
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
                  setForm({ name: '', role_type: 'elderly', gender: 'male' });
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
