import { useState, useEffect } from 'react';
import api from '../services/api';

const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

const STATUS_STYLE = {
  pending: { background: '#fffbe6', color: '#d48806' },
  received: { background: '#e6f7ff', color: '#1890ff' },
  converted: { background: '#f6ffed', color: '#52c41a' },
  refunded: { background: '#fff1f0', color: '#cf1322' },
};

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ tenant_id: '', amount: 1000000, notes: '' });
  const [convertTarget, setConvertTarget] = useState(null);
  const [convertForm, setConvertForm] = useState({ room_id: '', pricing_scheme_id: '', start_date: '' });

  const fetch = async () => {
    try {
      const [bRes, tRes, rRes, sRes] = await Promise.all([
        api.get('/bookings'),
        api.get('/tenants'),
        api.get('/rooms'),
        api.get('/price-schemes'),
      ]);
      setBookings(bRes.data);
      setTenants(tRes.data);
      setRooms(rRes.data);
      setSchemes(sRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api.post('/bookings', form);
      setForm({ tenant_id: '', amount: 1000000, notes: '' });
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  const handleConvert = (b) => {
    setConvertTarget(b);
    setConvertForm({ room_id: '', pricing_scheme_id: '', start_date: '' });
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api.post(`/bookings/${convertTarget.id}/convert`, convertForm);
      setMsg(`Booking #${convertTarget.id} dikonversi menjadi kontrak (deposit lunas).`);
      setConvertTarget(null);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Convert failed');
    }
  };

  const handleRefund = async (b) => {
    const returnDate = prompt('Tanggal pengembalian (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!returnDate) return;
    if (!confirm(`Refund booking ${formatRp(b.amount)} untuk ${b.Tenant?.nama_panggilan || b.Tenant?.name || '-'}?`)) return;
    setError('');
    setMsg('');
    try {
      await api.post(`/bookings/${b.id}/refund`, { return_date: returnDate });
      setMsg(`Booking #${b.id} di-refund.`);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Refund failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus booking ini?')) return;
    setError('');
    try {
      await api.delete(`/bookings/${id}`);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const availableRooms = rooms.filter(r => r.status !== 'occupied');

  return (
    <div className="page-container">
      <h2>📅 Booking (Reservasi Tanpa Kamar)</h2>
      <p style={{ color: '#888', fontSize: 13, marginTop: -8 }}>
        Booking dicatat per penghuni tanpa kamar. Setelah dibayar &amp; direkonsiliasi, bisa dikonversi menjadi kontrak (deposit kamar) atau di-refund.
      </p>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}
      {msg && <div style={{ color: '#52c41a', marginBottom: 12 }}>{msg}</div>}

      <form onSubmit={handleSubmit} className="card">
        <h3>Buat Booking</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 2 }}>
            <label>Tenant</label>
            <select value={form.tenant_id} onChange={e => setForm({ ...form, tenant_id: e.target.value })} required>
              <option value="">-- Select --</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.nama_panggilan || t.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Amount</label>
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: parseInt(e.target.value) || 0 })} required />
          </div>
          <div className="form-group" style={{ flex: 2 }}>
            <label>Notes</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="mis. booking kamar untuk Desember" />
          </div>
        </div>
        <button className="btn btn-primary" type="submit">Create</button>
      </form>

      {convertTarget && (
        <form onSubmit={handleConvertSubmit} className="card" style={{ border: '1px solid #1890ff' }}>
          <h3>Jadikan Kontrak — Booking #{convertTarget.id} ({convertTarget.Tenant?.nama_panggilan || convertTarget.Tenant?.name || '-'}, {formatRp(convertTarget.amount)})</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Room</label>
              <select value={convertForm.room_id} onChange={e => setConvertForm({ ...convertForm, room_id: e.target.value })} required>
                <option value="">-- Select --</option>
                {availableRooms.map(r => <option key={r.id} value={r.id}>{r.room_number} ({r.RoomType?.name})</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Pricing Scheme</label>
              <select value={convertForm.pricing_scheme_id} onChange={e => setConvertForm({ ...convertForm, pricing_scheme_id: e.target.value })} required>
                <option value="">-- Select --</option>
                {schemes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Start Date</label>
              <input type="date" value={convertForm.start_date} onChange={e => setConvertForm({ ...convertForm, start_date: e.target.value })} required />
            </div>
          </div>
          <p style={{ color: '#888', fontSize: 13 }}>
            Nilai booking {formatRp(convertTarget.amount)} otomatis menjadi deposit kontrak{convertTarget.NonMonthlyIncome?.is_paid ? ' dengan status lunas' : ' (belum lunas)'}.
          </p>
          <button className="btn btn-primary" type="submit">Convert</button>
          <button className="btn" style={{ marginLeft: 8 }} type="button" onClick={() => setConvertTarget(null)}>Cancel</button>
        </form>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Tenant</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Pembayaran</th>
            <th>Kontrak</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(b => (
            <tr key={b.id}>
              <td>#{b.id}</td>
              <td>{b.Tenant?.nama_panggilan || b.Tenant?.name || '-'}</td>
              <td><strong>{formatRp(b.amount)}</strong></td>
              <td>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, ...STATUS_STYLE[b.status] }}>{b.status}</span>
              </td>
              <td>
                {b.NonMonthlyIncome
                  ? (b.NonMonthlyIncome.is_paid
                    ? <span style={{ color: '#4CAF50', fontWeight: 600 }}>LUNAS</span>
                    : <span style={{ color: '#ff4d4f', fontWeight: 600 }}>UNPAID</span>)
                  : '-'}
              </td>
              <td>{b.contract_id ? `#${b.contract_id}` : '-'}</td>
              <td>{b.notes || '-'}</td>
              <td>
                {(b.status === 'pending' || b.status === 'received') && (
                  <button className="btn btn-primary btn-sm" onClick={() => handleConvert(b)}>Jadikan Kontrak</button>
                )}
                {b.status === 'received' && (
                  <button className="btn btn-sm" style={{ marginLeft: 4, background: '#fa8c16', color: '#fff' }} onClick={() => handleRefund(b)}>Refund</button>
                )}
                {b.status === 'pending' && (
                  <button className="btn btn-danger btn-sm" style={{ marginLeft: 4 }} onClick={() => handleDelete(b.id)}>Del</button>
                )}
              </td>
            </tr>
          ))}
          {bookings.length === 0 && (
            <tr><td colSpan="8" style={{ color: '#bbb', fontStyle: 'italic', textAlign: 'center' }}>No bookings yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
