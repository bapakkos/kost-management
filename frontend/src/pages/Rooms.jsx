import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ room_number: '', floor: 1, room_type_id: '', status: 'available' });
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ floor: '', status: '', room_type_id: '' });

  const fetch = async () => {
    try {
      const params = {};
      if (filters.floor) params.floor = filters.floor;
      if (filters.status) params.status = filters.status;
      if (filters.room_type_id) params.room_type_id = filters.room_type_id;

      const [rRes, rtRes, sRes] = await Promise.all([
        api.get('/rooms', { params }),
        api.get('/room-types'),
        api.get('/rooms/stats'),
      ]);
      setRooms(rRes.data);
      setRoomTypes(rtRes.data);
      setStats(sRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [filters]);

  const resetForm = () => {
    setForm({ room_number: '', floor: 1, room_type_id: '', status: 'available' });
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.put(`/rooms/${editing}`, form);
      } else {
        await api.post('/rooms', form);
      }
      resetForm();
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  };

  const handleEdit = (r) => {
    setEditing(r.id);
    setForm({ room_number: r.room_number, floor: r.floor, room_type_id: r.room_type_id || '', status: r.status });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this room?')) return;
    try {
      await api.delete(`/rooms/${id}`);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  const getRoomTypeName = (id) => {
    const rt = roomTypes.find(t => t.id === id);
    return rt ? rt.name : '-';
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page-container">
      <h2>🚪 Rooms</h2>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}

      {stats && (
        <div className="card" style={{ display: 'flex', gap: 20 }}>
          <div><strong>Total:</strong> {stats.total}</div>
          <div><strong>Available:</strong> {stats.available}</div>
          <div><strong>Occupied:</strong> {stats.occupied}</div>
          <div><strong>Booking:</strong> {stats.booking}</div>
          <div><strong>Maintenance:</strong> {stats.maintenance}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <h3>{editing ? 'Edit' : 'Add'} Room</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Room Number</label>
            <input value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} required />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Floor</label>
            <select value={form.floor} onChange={e => setForm({ ...form, floor: parseInt(e.target.value) })}>
              <option value={1}>Floor 1</option>
              <option value={2}>Floor 2</option>
              <option value={3}>Floor 3</option>
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Room Type</label>
            <select value={form.room_type_id} onChange={e => setForm({ ...form, room_type_id: e.target.value })} required>
              <option value="">-- Select --</option>
              {roomTypes.map(rt => (
                <option key={rt.id} value={rt.id}>{rt.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Status</label>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="available">Available</option>
              <option value="occupied">Occupied</option>
              <option value="booking">Booking</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary" type="submit">{editing ? 'Update' : 'Create'}</button>
        {editing && <button className="btn" style={{ marginLeft: 8 }} onClick={resetForm}>Cancel</button>}
      </form>

      <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Filter Floor</label>
          <select value={filters.floor} onChange={e => setFilters({ ...filters, floor: e.target.value })}>
            <option value="">All</option>
            <option value="1">Floor 1</option>
            <option value="2">Floor 2</option>
            <option value="3">Floor 3</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Filter Status</label>
          <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
            <option value="booking">Booking</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Filter Type</label>
          <select value={filters.room_type_id} onChange={e => setFilters({ ...filters, room_type_id: e.target.value })}>
            <option value="">All</option>
            {roomTypes.map(rt => (
              <option key={rt.id} value={rt.id}>{rt.name}</option>
            ))}
          </select>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Floor</th>
            <th>Type</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rooms.map(r => (
            <tr key={r.id}>
              <td><strong>{r.room_number}</strong></td>
              <td>{r.floor}</td>
              <td>{getRoomTypeName(r.room_type_id)}</td>
              <td>{r.status}</td>
              <td>
                <button className="btn btn-primary btn-sm" onClick={() => handleEdit(r)}>Edit</button>
                <button className="btn btn-danger btn-sm" style={{ marginLeft: 4 }} onClick={() => handleDelete(r.id)}>Del</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}