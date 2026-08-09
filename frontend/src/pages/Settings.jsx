import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Settings() {
  const { user } = useAuth();
  const [msg, setMsg] = useState('');

  const handleReset = () => {
    if (!confirm('Reset all data? This cannot be undone.')) return;
    setMsg('Data reset not implemented yet. Please reset via backend.');
  };

  return (
    <div className="page-container">
      <h2>⚙️ Settings</h2>
      {msg && <div style={{ color: '#52c41a', marginBottom: 12 }}>{msg}</div>}

      <div className="card">
        <h3>User Info</h3>
        <p><strong>Username:</strong> {user?.username}</p>
        <p><strong>Role:</strong> {user?.role || 'admin'}</p>
      </div>

      <div className="card">
        <h3>Database</h3>
        <p>SQLite database at <code>kost-management/database/kost.db</code></p>
        <button className="btn btn-danger" onClick={handleReset}>Reset All Data</button>
      </div>

      <div className="card">
        <h3>About</h3>
        <p><strong>Kost Management</strong> v1.0.0</p>
        <p>57 rooms, 3 floors, 4 room types</p>
        <p>Built with React + Vite + Express + Sequelize + SQLite</p>
      </div>
    </div>
  );
}