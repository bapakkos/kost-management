import { useState, useEffect } from 'react';
import api from '../services/api';

const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

export default function PriceSchemes() {
  const [schemes, setSchemes] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [rateForm, setRateForm] = useState({ schemeId: null, room_type_id: '', monthly_price: '' });

  const fetch = async () => {
    try {
      const [sRes, rtRes] = await Promise.all([
        api.get('/price-schemes'),
        api.get('/room-types'),
      ]);
      setSchemes(sRes.data);
      setRoomTypes(rtRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreateScheme = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/price-schemes', { name });
      setName('');
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

  const handleDeleteScheme = async (id) => {
    if (!confirm('Delete this scheme?')) return;
    try {
      await api.delete(`/price-schemes/${id}`);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleAddRate = async (schemeId) => {
    if (!rateForm.room_type_id || !rateForm.monthly_price) return;
    try {
      await api.post(`/price-schemes/${schemeId}/rates`, {
        room_type_id: rateForm.room_type_id,
        monthly_price: parseFloat(rateForm.monthly_price),
      });
      setRateForm({ schemeId: null, room_type_id: '', monthly_price: '' });
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page-container">
      <h2>💰 Price Schemes</h2>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}

      <form onSubmit={handleCreateScheme} className="card" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label>Scheme Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 2026" required />
        </div>
        <button className="btn btn-primary" type="submit">Create</button>
      </form>

      {schemes.map(s => (
        <div className="card" key={s.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>{s.name}</h3>
            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteScheme(s.id)}>Delete</button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Room Type</th>
                <th>Monthly Price</th>
              </tr>
            </thead>
            <tbody>
              {s.PricingSchemeRates?.map(r => (
                <tr key={r.id}>
                  <td>{r.RoomType?.name || r.room_type_id}</td>
                  <td>{formatRp(r.monthly_price)}</td>
                </tr>
              ))}
              {(!s.PricingSchemeRates || s.PricingSchemeRates.length === 0) && (
                <tr><td colSpan="2" style={{ color: '#bbb', fontStyle: 'italic' }}>No rates yet</td></tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Room Type</label>
              <select
                value={rateForm.schemeId === s.id ? rateForm.room_type_id : ''}
                onChange={e => setRateForm({ schemeId: s.id, room_type_id: e.target.value, monthly_price: rateForm.schemeId === s.id ? rateForm.monthly_price : '' })}
              >
                <option value="">-- Select --</option>
                {roomTypes.map(rt => (
                  <option key={rt.id} value={rt.id}>{rt.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Monthly Price</label>
              <input
                type="number"
                placeholder="0"
                value={rateForm.schemeId === s.id ? rateForm.monthly_price : ''}
                onChange={e => setRateForm({ schemeId: s.id, room_type_id: rateForm.schemeId === s.id ? rateForm.room_type_id : '', monthly_price: e.target.value })}
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => handleAddRate(s.id)}>Add Rate</button>
          </div>
        </div>
      ))}
    </div>
  );
}