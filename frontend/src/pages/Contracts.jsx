import { useState, useEffect } from 'react';
import api from '../services/api';

const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

const getSortValue = (c, field) => {
  switch (field) {
    case 'room': return parseInt(c.Room?.room_number) || 0;
    case 'tenant': return (c.Tenant?.nama_panggilan || c.Tenant?.name || '').toLowerCase();
    case 'scheme': return (c.PricingScheme?.name || '').toLowerCase();
    case 'start_date': return c.start_date || '';
    case 'end_date': return c.end_date || '';
    case 'deposit': return Number(c.deposit_amount) || 0;
    case 'deposit_status': return c.deposit_status || '';
    default: return '';
  }
};

const sortContracts = (contracts, sort) =>
  [...contracts].sort((a, b) => {
    const av = getSortValue(a, sort.field);
    const bv = getSortValue(b, sort.field);
    if (av < bv) return sort.dir === 'asc' ? -1 : 1;
    if (av > bv) return sort.dir === 'asc' ? 1 : -1;
    return 0;
  });

const COLUMNS = [
  { field: 'room', label: 'Room' },
  { field: 'tenant', label: 'Tenant' },
  { field: 'scheme', label: 'Scheme' },
  { field: 'start_date', label: 'Start' },
  { field: 'end_date', label: 'End' },
  { field: 'deposit', label: 'Deposit' },
  { field: 'deposit_status', label: 'Dep. Status' },
];

function ContractsTable({ title, icon, contracts, sort, setSort, onEdit, onCheckOut, showCheckOut, onDepositReturn, onDepositForfeit }) {
  const sorted = sortContracts(contracts, sort);

  const handleSort = (field) => {
    setSort(sort.field === field
      ? { field, dir: sort.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: 'asc' });
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginTop: 0, marginBottom: 4 }}>{icon} {title} ({sorted.length})</h3>
      {sorted.length === 0 ? (
        <p style={{ color: '#bbb', fontStyle: 'italic', marginTop: 8 }}>Tidak ada data</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th
                  key={col.field}
                  className="sortable-th"
                  onClick={() => handleSort(col.field)}
                >
                  {col.label} {sort.field === col.field ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(c => (
              <tr key={c.id}>
                <td><strong>{c.Room?.room_number}</strong> ({c.Room?.RoomType?.name})</td>
                <td>{c.Tenant?.nama_panggilan || c.Tenant?.name || '-'}</td>
                <td>{c.PricingScheme?.name}</td>
                <td>{new Date(c.start_date).toLocaleDateString('id-ID')}</td>
                <td>{c.end_date ? new Date(c.end_date).toLocaleDateString('id-ID') : '-'}</td>
                <td>{formatRp(c.deposit_amount)}</td>
                <td>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600,
                    background: c.deposit_status === 'active' ? '#e6f7ff' : c.deposit_status === 'forfeited' ? '#fff2e8' : '#f6ffed',
                    color: c.deposit_status === 'active' ? '#1890ff' : c.deposit_status === 'forfeited' ? '#fa8c16' : '#52c41a',
                  }}>{c.deposit_status}</span>
                </td>
                <td>
                  <button className="btn btn-primary btn-sm" onClick={() => onEdit(c)}>Edit</button>
                  {showCheckOut && (
                    <button className="btn btn-danger btn-sm" style={{ marginLeft: 4 }} onClick={() => onCheckOut(c.id)}>Check Out</button>
                  )}
                  {c.deposit_status === 'active' && onDepositForfeit && (
                    <button className="btn btn-sm" style={{ marginLeft: 4, background: '#fa8c16', color: '#fff' }} onClick={() => onDepositForfeit(c)}>Hangus</button>
                  )}
                  {c.deposit_status === 'active' && onDepositReturn && (
                    <button className="btn btn-sm" style={{ marginLeft: 4, background: '#52c41a', color: '#fff' }} onClick={() => onDepositReturn(c)}>Kembali</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ room_id: '', tenant_id: '', pricing_scheme_id: '', start_date: '', end_date: '', deposit_amount: 1000000, deposit_status: 'active', status: 'sewa' });
  const [sortSewa, setSortSewa] = useState({ field: 'start_date', dir: 'desc' });
  const [sortBooking, setSortBooking] = useState({ field: 'start_date', dir: 'asc' });
  const [sortKeluar, setSortKeluar] = useState({ field: 'end_date', dir: 'desc' });

  const fetch = async () => {
    try {
      const [cRes, tRes, rRes, sRes] = await Promise.all([
        api.get('/contracts'),
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

  useEffect(() => { fetch(); }, []);

  const resetForm = () => {
    setForm({ room_id: '', tenant_id: '', pricing_scheme_id: '', start_date: '', end_date: '', deposit_amount: 1000000, deposit_status: 'active', status: 'sewa' });
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/contracts/${editing}`, form);
      } else {
        await api.post('/contracts', form);
      }
      resetForm();
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

  const handleEdit = (c) => {
    setEditing(c.id);
    setForm({
      room_id: c.room_id,
      tenant_id: c.tenant_id,
      pricing_scheme_id: c.pricing_scheme_id,
      start_date: c.start_date || '',
      end_date: c.end_date || '',
      deposit_amount: c.deposit_amount || 1000000,
      deposit_status: c.deposit_status || 'active',
      status: c.status || 'sewa',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

const handleCheckOut = async (id) => {
    if (!confirm('Check out this tenant?')) return;
    try {
      await api.put(`/contracts/${id}`, { status: 'keluar', end_date: new Date().toISOString().slice(0, 10) });
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

  const handleDepositForfeit = async (c) => {
    if (!confirm(`Forfeit deposit Rp ${Number(c.deposit_amount).toLocaleString('id-ID')} for ${c.Tenant?.nama_panggilan || c.Tenant?.name}?`)) return;
    try {
      await api.post(`/contracts/${c.id}/deposit-forfeit`);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

  const handleDepositReturn = async (c) => {
    const returnDate = prompt('Return date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!returnDate) return;
    try {
      await api.post(`/contracts/${c.id}/deposit-return`, {
        amount: c.deposit_amount,
        return_date: returnDate,
      });
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const availableRooms = rooms.filter(r => r.status === 'available');
  const formRooms = editing ? rooms : availableRooms;

  const sewaContracts = contracts.filter(c => c.status === 'sewa');
  const bookingContracts = contracts.filter(c => c.status === 'booking');
  const keluarContracts = contracts.filter(c => c.status === 'keluar');

  return (
    <div className="page-container">
      <h2>📝 Rental Contracts</h2>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}

      <form onSubmit={handleSubmit} className="card">
        <h3>{editing ? 'Edit' : 'New'} Contract / Booking</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Room</label>
            <select value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })} required>
              <option value="">-- Select --</option>
              {formRooms.map(r => (
                <option key={r.id} value={r.id}>{r.room_number} ({r.RoomType?.name})</option>
              ))}
            </select>
          </div>
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
            <label>End Date</label>
            <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Deposit (Rp)</label>
            <input type="number" value={form.deposit_amount} onChange={e => setForm({ ...form, deposit_amount: parseInt(e.target.value) })} />
          </div>
        </div>
        {editing && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="booking">Booking</option>
                <option value="sewa">Active (Sewa)</option>
                <option value="keluar">Check Out</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Deposit Status</label>
              <select value={form.deposit_status} onChange={e => setForm({ ...form, deposit_status: e.target.value })}>
                <option value="active">Active</option>
                <option value="forfeited">Forfeited</option>
                <option value="returned">Returned</option>
              </select>
            </div>
          </div>
        )}
        <button className="btn btn-primary" type="submit">{editing ? 'Update' : 'Create'}</button>
        {editing && <button className="btn" style={{ marginLeft: 8 }} type="button" onClick={resetForm}>Cancel</button>}
      </form>

      <ContractsTable title="Sewa (Active)" icon="🟢" contracts={sewaContracts} sort={sortSewa} setSort={setSortSewa} onEdit={handleEdit} onCheckOut={handleCheckOut} showCheckOut onDepositReturn={handleDepositReturn} onDepositForfeit={handleDepositForfeit} />
      <ContractsTable title="Booking" icon="🟡" contracts={bookingContracts} sort={sortBooking} setSort={setSortBooking} onEdit={handleEdit} onCheckOut={handleCheckOut} showCheckOut />
      <ContractsTable title="Check Out" icon="🔴" contracts={keluarContracts} sort={sortKeluar} setSort={setSortKeluar} onEdit={handleEdit} onCheckOut={handleCheckOut} showCheckOut={false} />
    </div>
  );
}
