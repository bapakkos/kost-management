import { useState, useEffect } from 'react';
import api from '../services/api';

export default function RoomTypes() {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', category: '', view_type: '', ac_type: '', description: '' });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const fetch = async () => {
    try {
      const { data } = await api.get('/room-types');
      setTypes(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const resetForm = () => {
    setForm({ name: '', category: '', view_type: '', ac_type: '', description: '' });
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/room-types/${editing}`, form);
      } else {
        await api.post('/room-types', form);
      }
      resetForm();
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  const handleEdit = (t) => {
    setEditing(t.id);
    setForm({ name: t.name, category: t.category, view_type: t.view_type, ac_type: t.ac_type, description: t.description || '' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this room type?')) return;
    try {
      await api.delete(`/room-types/${id}`);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page-container">
      <h2>🏷️ Room Types</h2>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <h3>{editing ? 'Edit' : 'Add'} Room Type</h3>
        <div className="form-group">
          <label>Name</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="form-group">
          <label>Category</label>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required>
            <option value="">-- Select --</option>
            <option value="superior">Superior</option>
            <option value="suite">Suite</option>
          </select>
        </div>
        <div className="form-group">
          <label>View Type</label>
          <select value={form.view_type} onChange={e => setForm({ ...form, view_type: e.target.value })} required>
            <option value="">-- Select --</option>
            <option value="view">View</option>
            <option value="non_view">Non View</option>
          </select>
        </div>
        <div className="form-group">
          <label>AC Type</label>
          <select value={form.ac_type} onChange={e => setForm({ ...form, ac_type: e.target.value })} required>
            <option value="">-- Select --</option>
            <option value="ac">AC</option>
            <option value="non_ac">Non AC</option>
          </select>
        </div>
        <div className="form-group">
          <label>Description</label>
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <button className="btn btn-primary" type="submit">{editing ? 'Update' : 'Create'}</button>
        {editing && <button className="btn" style={{ marginLeft: 8 }} onClick={resetForm}>Cancel</button>}
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>View</th>
            <th>AC</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {types.map(t => (
            <tr key={t.id}>
              <td><strong>{t.name}</strong></td>
              <td>{t.category}</td>
              <td>{t.view_type}</td>
              <td>{t.ac_type}</td>
              <td>{t.description || '-'}</td>
              <td>
                <button className="btn btn-primary btn-sm" onClick={() => handleEdit(t)}>Edit</button>
                <button className="btn btn-danger btn-sm" style={{ marginLeft: 4 }} onClick={() => handleDelete(t.id)}>Del</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}