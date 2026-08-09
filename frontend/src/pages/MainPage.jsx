import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function MainPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [monthRes, bookingsRes] = await Promise.all([
        api.get(`/main-page/${month}/${year}`),
        api.get('/main-page/bookings'),
      ]);
      setData(monthRes.data);
      setBookings(bookingsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(year - 1); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post(`/main-page/${month}/${year}/generate-billings`);
      await fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Generate failed');
    } finally {
      setGenerating(false);
    }
  };

  const formatRp = (n) => {
    if (n == null) return '-';
    return 'Rp ' + Number(n).toLocaleString('id-ID');
  };

  const roomsByFloor = (floor) => {
    if (!data) return [];
    return data.rooms.filter(r => r.floor === floor);
  };

  return (
    <div className="main-page">
      <div className="month-selector">
        <button onClick={prevMonth}>◀</button>
        <h2>{MONTHS[month - 1]} {year}</h2>
        <button onClick={nextMonth}>▶</button>
        <button onClick={() => { setMonth(now.getMonth() + 1); setYear(now.getFullYear()); }}>
          Today
        </button>
        <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Billings'}
        </button>
        <button className="btn btn-sm" onClick={fetchData}>🔄 Refresh</button>
      </div>

      {error && <div style={{ padding: '12px 20px', color: '#ff4d4f', background: '#fff1f0' }}>{error}</div>}

      {loading ? (
        <div className="loading" style={{ height: 200 }}>Loading...</div>
      ) : data && (
        <>
          {[1, 2, 3].map(floor => (
            <div key={floor}>
              <h3 style={{ padding: '12px 20px', background: '#fafafa', borderBottom: '1px solid #f0f0f0', fontSize: 14 }}>
                Floor {floor}
              </h3>
              <table className="room-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Type</th>
                    <th>Tenant</th>
                    <th>Status</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Base Rent</th>
                    <th>Addons</th>
                    <th>Discount</th>
                    <th>Total</th>
                    <th>Paid</th>
                  </tr>
                </thead>
                <tbody>
                  {roomsByFloor(floor).map(room => {
                    const isCheckout = room.check_out_this_month;
                    const b = room.billing;
                    const addons = b ? ((b.addon_parkir || 0) + (b.addon_tv || 0) + (b.addon_internet || 0)) : 0;
                    return (
                      <tr key={room.room_id} className={isCheckout ? 'checkout-row' : ''}>
                        <td><strong>{room.room_number}</strong></td>
                        <td>{room.room_type || <span className="empty">-</span>}</td>
                        <td>{room.tenant || <span className="empty">Kosong</span>}</td>
                        <td>{room.check_out_this_month ? '🔴 Keluar' : room.tenant ? '🟢 Sewa' : '⚪ Available'}</td>
                        <td>{room.check_in ? new Date(room.check_in).toLocaleDateString('id-ID') : '-'}</td>
                        <td>{room.check_out ? new Date(room.check_out).toLocaleDateString('id-ID') : '-'}</td>
                        <td>{b ? formatRp(b.base_rent) : '-'}</td>
                        <td>{b ? formatRp(addons) : '-'}</td>
                        <td>{b ? formatRp(b.discount) : '-'}</td>
                        <td>{b ? formatRp(b.total_amount) : '-'}</td>
                        <td className={b ? (b.is_paid ? 'paid' : 'unpaid') : ''}>
                          {b ? (b.is_paid ? '✅ Paid' : '❌ Unpaid') : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

          {bookings.length > 0 && (
            <div className="booking-section">
              <h3>📅 Bookings</h3>
              <table className="room-table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Room Type</th>
                    <th>Room</th>
                    <th>Start Date</th>
                    <th>Deposit</th>
                    <th>Deposit Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.contract_id}>
                      <td>{b.tenant_name}</td>
                      <td>{b.room_type}</td>
                      <td>{b.room_number || '-'}</td>
                      <td>{new Date(b.start_date).toLocaleDateString('id-ID')}</td>
                      <td>{formatRp(b.deposit_amount)}</td>
                      <td>{b.deposit_status === 'paid' ? '✅' : b.deposit_status === 'unpaid' ? '❌' : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}