import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout/Layout.jsx';
import Login from './pages/Login.jsx';
import MainPage from './pages/MainPage.jsx';
import RoomTypes from './pages/RoomTypes.jsx';
import PriceSchemes from './pages/PriceSchemes.jsx';
import Rooms from './pages/Rooms.jsx';
import Tenants from './pages/Tenants.jsx';
import Contracts from './pages/Contracts.jsx';
import Payments from './pages/Payments.jsx';
import MonthlyBillings from './pages/MonthlyBillings.jsx';
import NonMonthlyIncomes from './pages/NonMonthlyIncomes.jsx';
import BankReconciliation from './pages/BankReconciliation.jsx';
import Settings from './pages/Settings.jsx';
import './App.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><MainPage /></ProtectedRoute>} />
      <Route path="/room-types" element={<ProtectedRoute><RoomTypes /></ProtectedRoute>} />
      <Route path="/price-schemes" element={<ProtectedRoute><PriceSchemes /></ProtectedRoute>} />
      <Route path="/rooms" element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
      <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
      <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
      <Route path="/monthly-billings" element={<ProtectedRoute><MonthlyBillings /></ProtectedRoute>} />
      <Route path="/non-monthly-incomes" element={<ProtectedRoute><NonMonthlyIncomes /></ProtectedRoute>} />
      <Route path="/bank-reconciliation" element={<ProtectedRoute><BankReconciliation /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}