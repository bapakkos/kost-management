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

  const handleMarkPaid = async (id) => {
    try {
      await api.post(`/monthly-billings/${id}/mark-paid`, {});
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

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
              <td>{b.RentalContract?.Tenant?.name || '-'}</td>
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
                {!b.is_paid && (
                  <button className="btn btn-success btn-sm" onClick={() => handleMarkPaid(b.id)}>Mark Paid</button>
                )}
              </td>
            </tr>
          ))}
          {billings.length === 0 && (
            <tr><td colSpan="12" style={{ color: '#bbb', fontStyle: 'italic', textAlign: 'center' }}>No billings found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}