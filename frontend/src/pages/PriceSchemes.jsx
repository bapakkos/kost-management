import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const formatRp = (n) => Number(n).toLocaleString('id-ID');

export default function PriceSchemes() {
  const [schemes, setSchemes] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [editingPrices, setEditingPrices] = useState({});

  const fetch = useCallback(async () => {
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
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    const initial = {};
    schemes.forEach(s => {
      roomTypes.forEach(rt => {
        const rate = s.PricingSchemeRates?.find(r => r.room_type_id === rt.id);
        initial[`${s.id}-${rt.id}`] = rate ? String(rate.monthly_price) : '';
      });
    });
    setEditingPrices(initial);
  }, [schemes, roomTypes]);

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

  const handlePriceChange = (schemeId, roomTypeId, value) => {
    setEditingPrices(prev => ({ ...prev, [`${schemeId}-${roomTypeId}`]: value }));
  };

  const handlePriceSave = async (schemeId, roomTypeId) => {
    const key = `${schemeId}-${roomTypeId}`;
    const value = editingPrices[key];
    if (value === '' || isNaN(parseFloat(value))) return;
    try {
      await api.post(`/price-schemes/${schemeId}/rates`, {
        room_type_id: roomTypeId,
        monthly_price: parseFloat(value),
      });
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save price');
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

          {roomTypes.length === 0 ? (
            <p style={{ color: '#bbb', fontStyle: 'italic' }}>No room types available</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Room Type</th>
                  <th>Monthly Price</th>
                </tr>
              </thead>
              <tbody>
                {roomTypes.map(rt => {
                  const key = `${s.id}-${rt.id}`;
                  const price = editingPrices[key] ?? '';
                  return (
                    <tr key={rt.id}>
                      <td>{rt.name}</td>
                      <td style={{ padding: '4px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ minWidth: 24 }}>Rp</span>
                          <input
                            type="number"
                            value={price}
                            onChange={e => handlePriceChange(s.id, rt.id, e.target.value)}
                            onBlur={() => handlePriceSave(s.id, rt.id)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); } }}
                            placeholder="0"
                            style={{ width: '100%' }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}