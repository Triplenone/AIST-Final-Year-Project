import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { userApi } from '../../services/api';
import type { BackendUser } from '../../types/backend';

type FormState = Partial<BackendUser>;

const emptyUserForm: FormState = {
  name: '',
  role_type: 'elderly',
  gender: 'male'
};

const roleLabels: Record<string, string> = {
  elderly: 'passenger',
  caregiver: 'assistant',
  administrator: 'administrator'
};

export const UsersAdmin = () => {
  const [users, setUsers] = useState<BackendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BackendUser | null>(null);
  const [keyword, setKeyword] = useState('');
  const [form, setForm] = useState<FormState>(emptyUserForm);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.list({ limit: 1000 });
      setUsers(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch users';
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
    const needle = keyword.toLowerCase();
    return users.filter(
      (u) => u.name?.toLowerCase().includes(needle) || u.contact_info?.toLowerCase().includes(needle)
    );
  }, [keyword, users]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (!form.name) {
        setError('Name is required');
        return;
      }
      if (editing) {
        await userApi.update(editing.user_id, form);
      } else {
        await userApi.create(form);
      }
      setForm(emptyUserForm);
      setEditing(null);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Operation failed';
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
      medical_conditions: u.medical_conditions
    });
  };

  const handleDelete = async (u: BackendUser) => {
    if (!window.confirm(`Delete user ${u.name}?`)) return;
    try {
      await userApi.delete(u.user_id);
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
          <h3>Users</h3>
          <p className="muted">Mapped to /api/v1/users</p>
        </div>
        <input
          placeholder="Search name or contact"
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
            <th>Name</th>
            <th>Role</th>
            <th>Gender</th>
            <th>Age</th>
            <th>Contact</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.user_id}>
              <td>{u.user_id}</td>
              <td>{u.name}</td>
              <td>{roleLabels[u.role_type] ?? u.role_type}</td>
              <td>{u.gender}</td>
              <td>{u.age ?? '-'}</td>
              <td>{u.contact_info ?? '-'}</td>
              <td>
                <button onClick={() => handleEdit(u)}>Edit</button>
                <button className="danger" onClick={() => void handleDelete(u)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="admin-form">
        <h4>{editing ? 'Edit User' : 'Add User'}</h4>
        <form onSubmit={handleSubmit}>
          <label>
            Name
            <input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </label>
          <label>
            Role
            <select
              value={form.role_type ?? 'elderly'}
              onChange={(e) => setForm({ ...form, role_type: e.target.value as BackendUser['role_type'] })}
            >
              <option value="elderly">passenger</option>
              <option value="caregiver">assistant</option>
              <option value="administrator">administrator</option>
            </select>
          </label>
          <label>
            Gender
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
            Age
            <input
              type="number"
              value={form.age ?? ''}
              onChange={(e) => setForm({ ...form, age: e.target.value ? Number(e.target.value) : undefined })}
            />
          </label>
          <label>
            Contact
            <input
              value={form.contact_info ?? ''}
              onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
            />
          </label>
          <label>
            Notes
            <textarea
              value={form.medical_conditions ?? ''}
              onChange={(e) => setForm({ ...form, medical_conditions: e.target.value })}
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
                  setForm(emptyUserForm);
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
