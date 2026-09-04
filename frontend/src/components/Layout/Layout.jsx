import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <nav className="sidebar">
        <h2>🏠 Kost Management</h2>
        <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
          📋 Main Page
        </NavLink>
        <NavLink to="/room-types" className={({ isActive }) => isActive ? 'active' : ''}>
          🏷️ Room Types
        </NavLink>
        <NavLink to="/price-schemes" className={({ isActive }) => isActive ? 'active' : ''}>
          💰 Price Schemes
        </NavLink>
        <NavLink to="/rooms" className={({ isActive }) => isActive ? 'active' : ''}>
          🚪 Rooms
        </NavLink>
        <NavLink to="/tenants" className={({ isActive }) => isActive ? 'active' : ''}>
          👥 Tenants
        </NavLink>
        <NavLink to="/contracts" className={({ isActive }) => isActive ? 'active' : ''}>
          📝 Contracts
        </NavLink>
        <NavLink to="/bookings" className={({ isActive }) => isActive ? 'active' : ''}>
          📅 Booking
        </NavLink>
        <NavLink to="/payments" className={({ isActive }) => isActive ? 'active' : ''}>
          🧾 Nota
        </NavLink>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }} />
        <NavLink to="/monthly-billings" className={({ isActive }) => isActive ? 'active' : ''}>
          📊 Billing
        </NavLink>
        <NavLink to="/non-monthly-incomes" className={({ isActive }) => isActive ? 'active' : ''}>
          📋 Tagihan Lepas
        </NavLink>
        <NavLink to="/bank-reconciliation" className={({ isActive }) => isActive ? 'active' : ''}>
          🏦 Rekonsiliasi
        </NavLink>
        <NavLink to="/reports" className={({ isActive }) => isActive ? 'active' : ''}>
          📈 Laporan
        </NavLink>
        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }} />
        <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
          ⚙️ Settings
        </NavLink>
      </nav>
      <div className="main-content">
        <header className="header">
          <h1>Hello, {user?.username}</h1>
          <button onClick={handleLogout}>Logout</button>
        </header>
        {children}
      </div>
    </div>
  );
}