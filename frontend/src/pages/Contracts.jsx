import { useState, useEffect } from 'react';
import api from '../services/api';

const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ room_id: '', tenant_id: '', pricing_scheme_id: '', start_date: '', deposit_amount: 1000000 });
  const [filterStatus, setFilterStatus] = useState('');

  const fetch = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;

      const [cRes, tRes, rRes, sRes] = await Promise.all([
        api.get('/contracts', { params }),
        api.get('/tenants'),
        api.get('/rooms'),
        api.get('/price-schemes'),
      ]);
      setContracts(cRes.data);
      setTenants(tRes.data);
      setRooms(rRes.data);
      setSchemes(sRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [filterStatus]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/contracts', form);
      setForm({ room_id: '', tenant_id: '', pricing_scheme_id: '', start_date: '', deposit_amount: 1000000 });
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

  const handleCheckOut = async (id) => {
    if (!confirm('Check out this tenant? Room will become available.')) return;
    try {
      await api.delete(`/contracts/${id}`);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const availableRooms = rooms.filter(r => r.status === 'available');

  return (
    <div className="page-container">
      <h2>📝 Rental Contracts</h2>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}

      <form onSubmit={handleCreate} className="card">
        <h3>New Contract / Booking</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Room</label>
            <select value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })} required>
              <option value="">-- Select --</option>
              {availableRooms.map(r => (
                <option key={r.id} value={r.id}>{r.room_number} ({r.RoomType?.name})</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Tenant</label>
            <select value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value })} required>
              <option value="">-- Select --</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Pricing Scheme</label>
            <select value={form.pricing_scheme_id} onChange={e => setForm({ ...form, pricing_scheme_id: e.target.value })} required>
              <option value="">-- Select --</option>
              {schemes.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Start Date</label>
            <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} required />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Deposit (Rp)</label>
            <input type="number" value={form.deposit_amount} onChange={e => setForm({ ...form, deposit_amount: parseInt(e.target.value) })} />
          </div>
        </div>
        <button className="btn btn-primary" type="submit">Create</button>
      </form>

      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>Filter Status:</label>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All</option>
          <option value="booking">Booking</option>
          <option value="sewa">Active (Sewa)</option>
          <option value="keluar">Check Out</option>
        </select>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Tenant</th>
            <th>Scheme</th>
            <th>Start</th>
            <th>End</th>
            <th>Deposit</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map(c => (
            <tr key={c.id}>
              <td><strong>{c.Room?.room_number}</strong> ({c.Room?.RoomType?.name})</td>
              <td>{c.Tenant?.name}</td>
              <td>{c.PricingScheme?.name}</td>
              <td>{new Date(c.start_date).toLocaleDateString('id-ID')}</td>
              <td>{c.end_date ? new Date(c.end_date).toLocaleDateString('id-ID') : '-'}</td>
              <td>{formatRp(c.deposit_amount)}</td>
              <td><span className={c.status === 'sewa' ? 'paid' : c.status === 'keluar' ? 'unpaid' : ''}>{c.status}</span></td>
              <td>
                {c.status !== 'keluar' && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleCheckOut(c.id)}>Check Out</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}