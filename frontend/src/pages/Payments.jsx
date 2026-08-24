import { useState, useEffect } from 'react';
import api from '../services/api';

const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

export default function Payments() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetch = async () => {
    try {
      const { data } = await api.get('/payments');
      setReceipts(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleReceiptPDF = (id) => {
    window.open(`${api.defaults.baseURL}/payments/receipt/${id}/pdf`, '_blank');
  };

  const handleDetail = async (id) => {
    try {
      const { data } = await api.get(`/payments/${id}`);
      const items = data.PaymentReceiptItems?.map(i => {
        if (i.item_type === 'monthly_billing' && i.MonthlyBilling) {
          const b = i.MonthlyBilling;
          return `Sewa ${String(b.period_month).padStart(2, '0')}/${b.period_year}: ${formatRp(i.amount)}`;
        }
        if (i.item_type === 'non_monthly_income' && i.NonMonthlyIncome) {
          const inc = i.NonMonthlyIncome;
          return `${inc.category}: ${formatRp(i.amount)}`;
        }
        return `Item: ${formatRp(i.amount)}`;
      }).join('\n');
      const info = `Nota: ${data.receipt_no}\nTanggal: ${new Date(data.payment_date).toLocaleDateString('id-ID')}\nTenant: ${data.Tenant?.nama_panggilan || data.Tenant?.name || '-'}\nKamar: ${data.Room?.room_number || '-'}\n\n${items}\n\nTotal: ${formatRp(data.total_amount)}\nDiskon: ${formatRp(data.discount_amount)}\nSelisih: ${formatRp(data.selisih_amount)}`;
      alert(info);
    } catch {
      alert('Failed to load detail');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page-container">
      <h2>Nota Pembayaran</h2>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}

      <table className="data-table">
        <thead>
          <tr>
            <th>No. Nota</th>
            <th>Tanggal</th>
            <th>Tenant</th>
            <th>Kamar</th>
            <th>Total</th>
            <th>Diskon</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map(r => (
            <tr key={r.id}>
              <td><strong>{r.receipt_no}</strong></td>
              <td>{new Date(r.payment_date).toLocaleDateString('id-ID')}</td>
              <td>{r.Tenant?.nama_panggilan || r.Tenant?.name || '-'}</td>
              <td>{r.Room?.room_number || '-'}</td>
              <td><strong>{formatRp(r.total_amount)}</strong></td>
              <td>{Number(r.discount_amount) > 0 ? formatRp(r.discount_amount) : '-'}</td>
              <td>
                <button className="btn btn-primary btn-sm" onClick={() => handleDetail(r.id)}>Detail</button>
                <button className="btn btn-sm" style={{ marginLeft: 4, background: '#4CAF50', color: '#fff' }} onClick={() => handleReceiptPDF(r.id)}>Nota PDF</button>
              </td>
            </tr>
          ))}
          {receipts.length === 0 && (
            <tr><td colSpan="7" style={{ color: '#bbb', fontStyle: 'italic', textAlign: 'center' }}>No receipts yet. Reconcile from Bank page.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}