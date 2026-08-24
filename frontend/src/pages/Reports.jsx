import { useState, useEffect } from 'react';
import api from '../services/api';

const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function Reports() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [monthly, setMonthly] = useState(null);
  const [yearly, setYearly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMonthly = async () => {
    try {
      const res = await api.get('/reports/monthly-revenue', { params: { month, year } });
      setMonthly(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load monthly report');
    }
  };

  const fetchYearly = async () => {
    try {
      const res = await api.get('/reports/yearly-revenue', { params: { year } });
      setYearly(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load yearly report');
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    await Promise.all([fetchMonthly(), fetchYearly()]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [month, year]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else { setMonth(month - 1); }
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else { setMonth(month + 1); }
  };

  const totalRevenue = monthly
    ? (Number(monthly.billing_total) || 0) + (Number(monthly.income_total) || 0)
    : 0;

  const reconciledAmount = monthly ? Number(monthly.reconciled_amount) || 0 : 0;
  const paymentReceiptsTotal = monthly ? Number(monthly.payment_receipts_total) || 0 : 0;
  const gap = paymentReceiptsTotal - reconciledAmount;

  const yearlyMax = Math.max(...yearly.map((m) => (Number(m.billing_total) || 0) + (Number(m.income_total) || 0)), 0);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page-container">
      <h2>📈 Monthly Revenue Report</h2>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}

      <div className="month-selector" style={{ marginBottom: 20 }}>
        <button onClick={prevMonth}>&lt; Prev</button>
        <h2>{MONTHS[month - 1]} {year}</h2>
        <button onClick={nextMonth}>Next &gt;</button>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <div className="card" style={{ flex: '1 1 180px', textAlign: 'center' }}>
          <h4 style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Total Revenue</h4>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1890ff' }}>{formatRp(totalRevenue)}</div>
        </div>
        <div className="card" style={{ flex: '1 1 180px', textAlign: 'center' }}>
          <h4 style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Monthly Billing Revenue</h4>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#52c41a' }}>{formatRp(monthly?.billing_total || 0)}</div>
        </div>
        <div className="card" style={{ flex: '1 1 180px', textAlign: 'center' }}>
          <h4 style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Non-Monthly Income Revenue</h4>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#722ed1' }}>{formatRp(monthly?.income_total || 0)}</div>
        </div>
        <div className="card" style={{ flex: '1 1 180px', textAlign: 'center' }}>
          <h4 style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Payment Receipts Total</h4>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fa8c16' }}>{formatRp(paymentReceiptsTotal)}</div>
        </div>
        <div className="card" style={{ flex: '1 1 180px', textAlign: 'center' }}>
          <h4 style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Reconciliation Status</h4>
          <div style={{ fontSize: 22, fontWeight: 700, color: gap === 0 ? '#52c41a' : '#ff4d4f' }}>
            {gap === 0 ? '✅ Balanced' : `⚠️ Gap ${formatRp(gap)}`}
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            Reconciled: {formatRp(reconciledAmount)} | Pending: {formatRp(gap)}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 16 }}>Yearly Revenue Chart — {year}</h3>
        {yearly.length === 0 ? (
          <div style={{ color: '#bbb', fontStyle: 'italic', textAlign: 'center', padding: 20 }}>No yearly data available</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 220, padding: '0 8px' }}>
            {yearly.map((m) => {
              const val = (Number(m.billing_total) || 0) + (Number(m.income_total) || 0);
              const height = yearlyMax > 0 ? (val / yearlyMax) * 100 : 0;
              return (
                <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ fontSize: 11, marginBottom: 4, fontWeight: 600 }}>{formatRp(val)}</div>
                  <div style={{ width: '100%', maxWidth: 60, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: 180 }}>
                    <div style={{ height: `${height}%`, background: '#1890ff', borderRadius: '4px 4px 0 0', minHeight: val > 0 ? 4 : 0, transition: 'height 0.3s' }} />
                  </div>
                  <div style={{ fontSize: 11, marginTop: 6, color: '#666' }}>{MONTHS[m.month - 1]?.slice(0, 3)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card" style={{ background: '#fffbe6', border: '1px solid #ffe58f' }}>
        <h4 style={{ marginBottom: 8 }}>📝 Notes</h4>
        <ul style={{ fontSize: 13, color: '#666', paddingLeft: 20 }}>
          <li>Deposit bills (<code>is_revenue=false</code>) are excluded from revenue calculations.</li>
          <li>Deposit hangus (<code>deposit_hangus</code>) is included in non-monthly income revenue.</li>
        </ul>
      </div>
    </div>
  );
}