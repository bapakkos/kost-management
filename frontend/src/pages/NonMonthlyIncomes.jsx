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
  { value: 'booking', label: 'Booking' },
  { value: 'lainnya', label: 'Lainnya' },
];

const DEFAULT_PRICES = {
  sewa_harian: 180000,
  tv: 200000,
  parkir: 300000,
};

const isDepositCategory = (category) => category === 'deposit' || category === 'deposit_hangus';
const isActiveContract = (c) => c.status === 'booking' || c.status === 'sewa';

export default function NonMonthlyIncomes() {
  const [incomes, setIncomes] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    tenant_id: '', room_id: '', rental_contract_id: '', category: 'lainnya', description: '',
    transaction_date: new Date().toISOString().slice(0, 10), unit_price: '', quantity: 1,
  });
  const [editing, setEditing] = useState(null);

  const fetch = async () => {
    try {
      const [iRes, tRes, rRes, cRes] = await Promise.all([
        api.get('/non-monthly-incomes'),
        api.get('/tenants'),
        api.get('/rooms'),
        api.get('/contracts'),
      ]);
      setIncomes(iRes.data);
      setTenants(tRes.data);
      setRooms(rRes.data);
      setContracts(
        [...cRes.data].sort((a, b) => (isActiveContract(a) ? 0 : 1) - (isActiveContract(b) ? 0 : 1))
      );
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const resetForm = () => {
    setForm({
      tenant_id: '', room_id: '', rental_contract_id: '', category: 'lainnya', description: '',
      transaction_date: new Date().toISOString().slice(0, 10), unit_price: '', quantity: 1,
    });
    setEditing(null);
  };

  const findActiveContractByTenant = (tenantId) =>
    contracts.find((c) => String(c.tenant_id) === String(tenantId) && isActiveContract(c));

  const handleTenantChange = (tenantId) => {
    setForm((prev) => {
      const next = { ...prev, tenant_id: tenantId };
      const activeContract = findActiveContractByTenant(tenantId);
      next.room_id = activeContract ? String(activeContract.room_id) : '';
      if (next.rental_contract_id) {
        const linked = contracts.find((c) => String(c.id) === String(next.rental_contract_id));
        if (!linked || String(linked.tenant_id) !== String(tenantId)) {
          next.rental_contract_id = '';
        }
      }
      return next;
    });
  };

  const handleCategoryChange = (category) => {
    setForm((prev) => {
      const next = { ...prev, category };
      if (DEFAULT_PRICES[category] !== undefined) {
        next.unit_price = DEFAULT_PRICES[category];
      }
      if (isDepositCategory(category)) {
        if (!next.rental_contract_id && next.tenant_id) {
          const activeContract = findActiveContractByTenant(next.tenant_id);
          if (activeContract) {
            next.rental_contract_id = String(activeContract.id);
            next.unit_price = activeContract.deposit_amount ?? '';
          }
        }
      } else {
        next.rental_contract_id = '';
      }
      return next;
    });
  };

  const handleContractChange = (contractId) => {
    setForm((prev) => {
      const next = { ...prev, rental_contract_id: contractId };
      if (contractId) {
        const contract = contracts.find((c) => String(c.id) === String(contractId));
        if (contract) {
          next.tenant_id = String(contract.tenant_id);
          next.room_id = String(contract.room_id);
          if (isDepositCategory(prev.category)) {
            next.unit_price = contract.deposit_amount ?? '';
          }
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const payload = { ...form };
    if (!isDepositCategory(payload.category)) {
      payload.rental_contract_id = null;
    }
    payload.room_id = payload.room_id || null;
    payload.rental_contract_id = payload.rental_contract_id || null;
    try {
      if (editing) {
        await api.put(`/non-monthly-incomes/${editing}`, payload);
      } else {
        await api.post('/non-monthly-incomes', payload);
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
      tenant_id: inc.tenant_id || '', room_id: inc.room_id || '', rental_contract_id: inc.rental_contract_id || '',
      category: inc.category,
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
            <select value={form.tenant_id} onChange={e => handleTenantChange(e.target.value)} required>
              <option value="">-- Select --</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.nama_panggilan || t.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Room</label>
            <select value={form.room_id} onChange={e => setForm({ ...form, room_id: e.target.value })}>
              <option value="">-- Non kamar / tidak spesifik --</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.room_number}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Category</label>
            <select value={form.category} onChange={e => handleCategoryChange(e.target.value)}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        {(form.category === 'deposit' || form.category === 'deposit_hangus') && (
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Kontrak Terkait</label>
              <select value={form.rental_contract_id} onChange={e => handleContractChange(e.target.value)}>
                <option value="">-- Tidak ter-link --</option>
                {contracts.map(c => (
                  <option key={c.id} value={c.id}>
                    #{c.id} · {c.Tenant?.nama_panggilan || c.Tenant?.name || '-'} · {c.Room?.room_number || '-'} · {formatRp(c.deposit_amount)}{isActiveContract(c) ? '' : ' · keluar'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
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
            <th>Pendapatan</th>
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
              <td>
                {inc.category === 'deposit' || inc.category === 'booking'
                  ? <span style={{ color: '#1890ff', fontWeight: 600 }}>Non-Revenue</span>
                  : inc.is_revenue
                    ? <span style={{ color: '#52c41a' }}>Ya</span>
                    : <span style={{ color: '#999' }}>Tidak</span>}
              </td>
              <td><span style={{ color: inc.is_paid ? '#4CAF50' : '#ff4d4f', fontWeight: 600 }}>{inc.is_paid ? 'LUNAS' : 'UNPAID'}</span></td>
              <td>
                <button className="btn btn-primary btn-sm" onClick={() => handleEdit(inc)}>Edit</button>
                <button className="btn btn-danger btn-sm" style={{ marginLeft: 4 }} onClick={() => handleDelete(inc.id)}>Del</button>
                <button className="btn btn-sm" style={{ marginLeft: 4, background: '#1890ff', color: '#fff' }} onClick={() => handleInvoicePDF(inc.id)}>PDF</button>
              </td>
            </tr>
          ))}
          {incomes.length === 0 && (
            <tr><td colSpan="9" style={{ color: '#bbb', fontStyle: 'italic', textAlign: 'center' }}>No incomes yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}