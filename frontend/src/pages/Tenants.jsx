import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', nama_panggilan: '', phone: '', email: '', id_card_number: '', emergency_contact: '', address: '', notes: '' });
  const [editing, setEditing] = useState(null);

  const fetch = async () => {
    try {
      const { data } = await api.get('/tenants');
      setTenants(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const resetForm = () => {
    setForm({ name: '', nama_panggilan: '', phone: '', email: '', id_card_number: '', emergency_contact: '', address: '', notes: '' });
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/tenants/${editing}`, form);
      } else {
        await api.post('/tenants', form);
      }
      resetForm();
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  const handleEdit = (t) => {
    setEditing(t.id);
    setForm({
      name: t.name || '',
      nama_panggilan: t.nama_panggilan || '',
      phone: t.phone || '',
      email: t.email || '',
      id_card_number: t.id_card_number || '',
      emergency_contact: t.emergency_contact || '',
      address: t.address || '',
      notes: t.notes || '',
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this tenant?')) return;
    try {
      await api.delete(`/tenants/${id}`);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page-container">
      <h2>👥 Tenants</h2>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <h3>{editing ? 'Edit' : 'Add'} Tenant</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Nama Panggilan *</label>
            <input value={form.nama_panggilan} onChange={e => setForm({ ...form, nama_panggilan: e.target.value })} required />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Phone *</label>
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Email</label>
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>ID Number (KTP)</label>
            <input value={form.id_card_number} onChange={e => setForm({ ...form, id_card_number: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Emergency Contact</label>
            <input value={form.emergency_contact} onChange={e => setForm({ ...form, emergency_contact: e.target.value })} />
          </div>
        </div>
        <div className="form-group">
          <label>Address</label>
          <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
        </div>
        <button className="btn btn-primary" type="submit">{editing ? 'Update' : 'Create'}</button>
        {editing && <button className="btn" style={{ marginLeft: 8 }} onClick={resetForm}>Cancel</button>}
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>Nama Panggilan</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th>ID Number</th>
            <th>Address</th>
            <th>Bank Accounts</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map(t => (
            <tr key={t.id}>
              <td><strong>{t.nama_panggilan || '-'}</strong></td>
              <td>{t.name}</td>
              <td>{t.phone || '-'}</td>
              <td>{t.email || '-'}</td>
              <td>{t.id_card_number || '-'}</td>
              <td>{t.address || '-'}</td>
              <td>{t.TenantBankAccounts?.length || 0}</td>
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