import { useState, useEffect } from 'react';
import api from '../services/api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

export default function MonthlyBillings() {
  const [billings, setBillings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState({ is_paid: '', period_month: '', period_year: '' });
  const [showOutstanding, setShowOutstanding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bulkForm, setBulkForm] = useState({ contract_id: '', start_month: '', start_year: '', months: '' });
  const [contracts, setContracts] = useState([]);
  const [bulkMsg, setBulkMsg] = useState('');
  const [genPeriod, setGenPeriod] = useState({ month: '', year: '' });
  const [genForce, setGenForce] = useState(false);
  const [genMsg, setGenMsg] = useState('');

  const fetch = async () => {
    setLoading(true);
    try {
      const params = {};
      if (showOutstanding) {
        const { data } = await api.get('/monthly-billings/outstanding');
        setBillings(data);
      } else {
        if (filter.is_paid !== '') params.is_paid = filter.is_paid;
        if (filter.period_month) params.period_month = filter.period_month;
        if (filter.period_year) params.period_year = filter.period_year;
        const { data } = await api.get('/monthly-billings', { params });
        setBillings(data);
      }
      const { data: s } = await api.get('/monthly-billings/summary');
      setSummary(s);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [filter, showOutstanding]);

  useEffect(() => {
    api.get('/contracts/active').then(({ data }) => setContracts(data)).catch(() => {});
  }, []);

  const handleBulkGenerate = async () => {
    setBulkMsg('');
    try {
      const { data } = await api.post('/monthly-billings/generate-bulk', {
        contract_id: parseInt(bulkForm.contract_id),
        start_month: parseInt(bulkForm.start_month),
        start_year: parseInt(bulkForm.start_year),
        months: parseInt(bulkForm.months),
      });
      setBulkMsg(`Created ${data.created} billings, skipped ${data.skipped}`);
      fetch();
    } catch (err) {
      setBulkMsg(err.response?.data?.error || 'Failed');
    }
  };

  const handleGeneratePeriod = async () => {
    setGenMsg('');
    if (!genPeriod.month || !genPeriod.year) {
      setGenMsg('Pilih bulan & tahun terlebih dahulu');
      return;
    }
    try {
      const { data } = await api.post('/monthly-billings/generate', {
        month: parseInt(genPeriod.month),
        year: parseInt(genPeriod.year),
        force: genForce,
      });
      setGenMsg(`Buat baru: ${data.created}, Hitung ulang: ${data.updated} (${MONTHS[data.month - 1]} ${data.year})`);
      fetch();
    } catch (err) {
      setGenMsg(err.response?.data?.error || 'Failed');
    }
  };

  const handleInvoicePDF = (id) => {
    window.open(`${api.defaults.baseURL}/reports/invoice/monthly/${id}/pdf`, '_blank');
  };

  const handleMarkPaid = async (id) => {
    try {
      await api.post(`/monthly-billings/${id}/mark-paid`, {});
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

  const openEdit = (b) => {
    setEditing(b);
    setEditForm({
      addon_parkir: parseFloat(b.addon_parkir) || 0,
      addon_tv: parseFloat(b.addon_tv) || 0,
      addon_internet: parseFloat(b.addon_internet) || 0,
      discount: parseFloat(b.discount) || 0,
      notes: b.notes || '',
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/monthly-billings/${editing.id}`, editForm);
      closeEdit();
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const editTotal = editing && editForm
    ? (parseFloat(editing.base_rent) || 0) + (editForm.addon_parkir || 0) + (editForm.addon_tv || 0) + (editForm.addon_internet || 0) - (editForm.discount || 0)
    : 0;

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page-container">
      <h2>📊 Monthly Billings</h2>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}

      {summary && (
        <div className="card" style={{ display: 'flex', gap: 20 }}>
          <div><strong>Total Billings:</strong> {summary.count}</div>
          <div><strong>Paid:</strong> <span className="paid">{summary.paid_count}</span> ({formatRp(summary.paid)})</div>
          <div><strong>Unpaid:</strong> <span className="unpaid">{summary.unpaid_count}</span> ({formatRp(summary.unpaid)})</div>
        </div>
      )}

      <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Status</label>
          <select value={filter.is_paid} onChange={e => { setFilter({ ...filter, is_paid: e.target.value }); setShowOutstanding(false); }}>
            <option value="">All</option>
            <option value="1">Paid</option>
            <option value="0">Unpaid</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Month</label>
          <select value={filter.period_month} onChange={e => setFilter({ ...filter, period_month: e.target.value })}>
            <option value="">All</option>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Year</label>
          <input type="number" value={filter.period_year} onChange={e => setFilter({ ...filter, period_year: e.target.value })} placeholder="2026" style={{ width: 80 }} />
        </div>
        <button className={`btn btn-sm ${showOutstanding ? 'btn-danger' : 'btn-primary'}`} onClick={() => setShowOutstanding(!showOutstanding)}>
          {showOutstanding ? 'Show All' : 'Outstanding Only'}
        </button>
      </div>

      <div className="card">
        <h3>Generate Billing per Periode</h3>
        <p style={{ color: '#888', fontSize: 13, marginTop: 0 }}>
          Buat billing untuk <strong>semua penyewa aktif</strong> pada periode tertentu (cocok untuk penagihan akhir bulan).
          Centang "Timpa &amp; hitung ulang" untuk memperbaiki billing yang sudah ada dengan harga terbaru (addon, discount, &amp; status paid tetap dipertahankan).
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Month</label>
            <select value={genPeriod.month} onChange={e => setGenPeriod({ ...genPeriod, month: e.target.value })}>
              <option value="">--</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Year</label>
            <input type="number" value={genPeriod.year} onChange={e => setGenPeriod({ ...genPeriod, year: e.target.value })} placeholder="2026" style={{ width: 80 }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 8 }}>
            <input type="checkbox" checked={genForce} onChange={e => setGenForce(e.target.checked)} />
            Timpa &amp; hitung ulang yang sudah ada
          </label>
          <button className="btn btn-primary" onClick={handleGeneratePeriod}>Generate</button>
        </div>
        {genMsg && <div style={{ marginTop: 8, color: genMsg.includes('Failed') || genMsg.includes('Pilih') ? '#ff4d4f' : '#4CAF50' }}>{genMsg}</div>}
      </div>

      <div className="card">
        <h3>Generate per Kontrak</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
            <label>Contract</label>
            <select value={bulkForm.contract_id} onChange={e => setBulkForm({ ...bulkForm, contract_id: e.target.value })}>
              <option value="">-- Select --</option>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>{c.Room?.room_number} - {c.Tenant?.nama_panggilan || c.Tenant?.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 80 }}>
            <label>Start Month</label>
            <select value={bulkForm.start_month} onChange={e => setBulkForm({ ...bulkForm, start_month: e.target.value })}>
              <option value="">--</option>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ minWidth: 80 }}>
            <label>Year</label>
            <input type="number" value={bulkForm.start_year} onChange={e => setBulkForm({ ...bulkForm, start_year: e.target.value })} placeholder="2026" style={{ width: 80 }} />
          </div>
          <div className="form-group" style={{ minWidth: 80 }}>
            <label>Months</label>
            <select value={bulkForm.months} onChange={e => setBulkForm({ ...bulkForm, months: e.target.value })}>
              <option value="">--</option>
              <option value="6">6</option>
              <option value="12">12</option>
            </select>
          </div>
          <div className="form-group" style={{ alignSelf: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleBulkGenerate}>Generate</button>
          </div>
        </div>
        {bulkMsg && <div style={{ marginTop: 8, color: bulkMsg.includes('Failed') ? '#ff4d4f' : '#4CAF50' }}>{bulkMsg}</div>}
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Period</th>
            <th>Room</th>
            <th>Tenant</th>
            <th>Base Rent</th>
            <th>Parkir</th>
            <th>TV</th>
            <th>Internet</th>
            <th>Discount</th>
            <th>Total</th>
            <th>Due Date</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {billings.map(b => (
            <tr key={b.id}>
              <td>{MONTHS[b.period_month - 1]} {b.period_year}</td>
              <td>{b.RentalContract?.Room?.room_number || '-'}</td>
              <td>{b.RentalContract?.Tenant?.nama_panggilan || b.RentalContract?.Tenant?.name || '-'}</td>
              <td>{formatRp(b.base_rent)}</td>
              <td>{formatRp(b.addon_parkir)}</td>
              <td>{formatRp(b.addon_tv)}</td>
              <td>{formatRp(b.addon_internet)}</td>
              <td>{formatRp(b.discount)}</td>
              <td><strong>{formatRp(b.total_amount)}</strong></td>
              <td>{b.due_date ? new Date(b.due_date).toLocaleDateString('id-ID') : '-'}</td>
              <td className={b.is_paid ? 'paid' : 'unpaid'}>
                {b.is_paid ? '✅ Paid' : '❌ Unpaid'}
              </td>
              <td>
                <button className="btn btn-primary btn-sm" onClick={() => openEdit(b)}>Edit</button>
                <button className="btn btn-sm" style={{ marginLeft: 4, background: '#1890ff', color: '#fff' }} onClick={() => handleInvoicePDF(b.id)}>PDF</button>
                {!b.is_paid && (
                  <button className="btn btn-success btn-sm" style={{ marginLeft: 4 }} onClick={() => handleMarkPaid(b.id)}>Mark Paid</button>
                )}
              </td>
            </tr>
          ))}
          {billings.length === 0 && (
            <tr><td colSpan="12" style={{ color: '#bbb', fontStyle: 'italic', textAlign: 'center' }}>No billings found</td></tr>
          )}
        </tbody>
      </table>

      {editing && editForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={closeEdit}>
          <div className="card" style={{ width: 420, background: '#fff' }} onClick={e => e.stopPropagation()}>
            <h3>Edit Billing</h3>
            <div style={{ marginBottom: 8, color: '#888', fontSize: 13 }}>
              {editing.RentalContract?.Room?.room_number} — {editing.RentalContract?.Tenant?.nama_panggilan || editing.RentalContract?.Tenant?.name} | {MONTHS[editing.period_month - 1]} {editing.period_year}
            </div>
            <div className="form-group">
              <label>Base Rent</label>
              <input disabled value={formatRp(editing.base_rent)} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Addon Parkir</label>
                <input type="number" value={editForm.addon_parkir}
                  onChange={e => setEditForm({ ...editForm, addon_parkir: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Addon TV</label>
                <input type="number" value={editForm.addon_tv}
                  onChange={e => setEditForm({ ...editForm, addon_tv: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Addon Internet</label>
                <input type="number" value={editForm.addon_internet}
                  onChange={e => setEditForm({ ...editForm, addon_internet: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Discount</label>
                <input type="number" value={editForm.discount}
                  onChange={e => setEditForm({ ...editForm, discount: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea value={editForm.notes} rows={2}
                onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Total</label>
              <input disabled value={formatRp(editTotal)} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn" onClick={closeEdit}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}