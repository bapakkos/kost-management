import { useState, useEffect } from 'react';
import api from '../services/api';

const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    tenant_id: '', room_id: '', payment_date: new Date().toISOString().slice(0, 10),
    deposit_amount: '', payment_method: 'transfer_bca', notes: '',
  });

  const fetch = async () => {
    try {
      const [pRes, tRes, rRes] = await Promise.all([
        api.get('/payments'),
        api.get('/tenants'),
        api.get('/rooms'),
      ]);
      setPayments(pRes.data);
      setTenants(tRes.data);
      setRooms(rRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/payments', {
        ...form,
        deposit_amount: form.deposit_amount ? parseFloat(form.deposit_amount) : null,
      });
      setForm({
        tenant_id: '', room_id: '', payment_date: new Date().toISOString().slice(0, 10),
        deposit_amount: '', payment_method: 'transfer_bca', notes: '',
      });
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page-container">
      <h2>💵 Payments</h2>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}

      <form onSubmit={handleCreate} className="card">
        <h3>Record Payment</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Tenant</label>
            <select value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value })} required>
              <option value="">-- Select --</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.nama_panggilan || t.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Room</label>
            <select value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })} required>
              <option value="">-- Select --</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.room_number}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Date</label>
            <input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} required />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Deposit Amount</label>
            <input type="number" value={form.deposit_amount} onChange={e => setForm({ ...form, deposit_amount: e.target.value })} placeholder="0" />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Method</label>
            <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
              <option value="transfer_bca">Transfer BCA</option>
              <option value="transfer_bni">Transfer BNI</option>
              <option value="transfer_bri">Transfer BRI</option>
              <option value="transfer_mandiri">Transfer Mandiri</option>
              <option value="gopay">GoPay</option>
              <option value="ovo">OVO</option>
              <option value="dana">DANA</option>
              <option value="cash">Cash</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
        </div>
        <button className="btn btn-primary" type="submit">Record Payment</button>
      </form>

      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Tenant</th>
            <th>Room</th>
            <th>Total</th>
            <th>Method</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id}>
              <td>{new Date(p.payment_date).toLocaleDateString('id-ID')}</td>
              <td>{p.Tenant?.nama_panggilan || p.Tenant?.name || '-'}</td>
              <td>{p.Room?.room_number || '-'}</td>
              <td><strong>{formatRp(p.total_amount)}</strong></td>
              <td>{p.payment_method}</td>
              <td>{p.notes || '-'}</td>
            </tr>
          ))}
          {payments.length === 0 && (
            <tr><td colSpan="6" style={{ color: '#bbb', fontStyle: 'italic', textAlign: 'center' }}>No payments yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}