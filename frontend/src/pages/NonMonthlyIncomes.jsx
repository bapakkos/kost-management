import { useState, useEffect } from 'react';
import api from '../services/api';

const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

const CATEGORIES = [
  { value: 'listrik', label: 'Listrik' },
  { value: 'air', label: 'Air' },
  { value: 'parkir', label: 'Parkir' },
  { value: 'tv', label: 'TV' },
  { value: 'internet', label: 'Internet' },
  { value: 'denda', label: 'Denda' },
  { value: 'sewa_harian', label: 'Sewa Harian' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'deposit_hangus', label: 'Deposit Hangus' },
  { value: 'lainnya', label: 'Lainnya' },
];

export default function NonMonthlyIncomes() {
  const [incomes, setIncomes] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    tenant_id: '', room_id: '', category: 'lainnya', description: '',
    transaction_date: new Date().toISOString().slice(0, 10), unit_price: '', quantity: 1,
  });
  const [editing, setEditing] = useState(null);

  const fetch = async () => {
    try {
      const [iRes, tRes, rRes] = await Promise.all([
        api.get('/non-monthly-incomes'),
        api.get('/tenants'),
        api.get('/rooms'),
      ]);
      setIncomes(iRes.data);
      setTenants(tRes.data);
      setRooms(rRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const resetForm = () => {
    setForm({
      tenant_id: '', room_id: '', category: 'lainnya', description: '',
      transaction_date: new Date().toISOString().slice(0, 10), unit_price: '', quantity: 1,
    });
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/non-monthly-incomes/${editing}`, form);
      } else {
        await api.post('/non-monthly-incomes', form);
      }
      resetForm();
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  const handleEdit = (inc) => {
    setEditing(inc.id);
    setForm({
      tenant_id: inc.tenant_id || '', room_id: inc.room_id || '', category: inc.category,
      description: inc.description || '', transaction_date: inc.transaction_date?.slice(0, 10) || '',
      unit_price: inc.unit_price, quantity: inc.quantity,
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this income?')) return;
    try {
      await api.delete(`/non-monthly-incomes/${id}`);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleInvoicePDF = (id) => {
    window.open(`${api.defaults.baseURL}/reports/invoice/non-monthly/${id}/pdf`, '_blank');
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page-container">
      <h2>Tagihan Lepas</h2>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <h3>{editing ? 'Edit' : 'Add'} Tagihan</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Tenant</label>
            <select value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value })} required>
              <option value="">-- Select --</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.nama_panggilan || t.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Room</label>
            <select value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })} required>
              <option value="">-- Select --</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.room_number}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Description</label>
            <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Date</label>
            <input type="date" value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} required />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Unit Price</label>
            <input type="number" value={form.unit_price} onChange={e => setForm({ ...form, unit_price: e.target.value })} required />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Quantity</label>
            <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} min="1" />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Total</label>
            <input disabled value={formatRp((form.unit_price || 0) * (form.quantity || 0))} />
          </div>
        </div>
        <button className="btn btn-primary" type="submit">{editing ? 'Update' : 'Create'}</button>
        {editing && <button className="btn" style={{ marginLeft: 8 }} onClick={resetForm}>Cancel</button>}
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Tenant</th>
            <th>Room</th>
            <th>Category</th>
            <th>Description</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {incomes.map(inc => (
            <tr key={inc.id}>
              <td>{new Date(inc.transaction_date).toLocaleDateString('id-ID')}</td>
              <td>{inc.Tenant?.nama_panggilan || inc.Tenant?.name || '-'}</td>
              <td>{inc.Room?.room_number || '-'}</td>
              <td>{inc.category}</td>
              <td>{inc.description || '-'}</td>
              <td><strong>{formatRp(inc.total_amount)}</strong></td>
              <td><span style={{ color: inc.is_paid ? '#4CAF50' : '#ff4d4f', fontWeight: 600 }}>{inc.is_paid ? 'LUNAS' : 'UNPAID'}</span></td>
              <td>
                <button className="btn btn-primary btn-sm" onClick={() => handleEdit(inc)}>Edit</button>
                <button className="btn btn-danger btn-sm" style={{ marginLeft: 4 }} onClick={() => handleDelete(inc.id)}>Del</button>
                <button className="btn btn-sm" style={{ marginLeft: 4, background: '#1890ff', color: '#fff' }} onClick={() => handleInvoicePDF(inc.id)}>PDF</button>
              </td>
            </tr>
          ))}
          {incomes.length === 0 && (
            <tr><td colSpan="8" style={{ color: '#bbb', fontStyle: 'italic', textAlign: 'center' }}>No incomes yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}