import { useState, useEffect } from 'react';
import api from '../services/api';

const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

export default function BankReconciliation() {
  const [mutations, setMutations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showReconciled, setShowReconciled] = useState(false);
  const [msg, setMsg] = useState('');
  const [importForm, setImportForm] = useState({ date: '', amount: '', description: '', source_account: '' });

  const fetch = async () => {
    setLoading(true);
    try {
      const [mRes, pRes] = await Promise.all([
        api.get(showReconciled ? '/bank-mutations/reconciled' : '/bank-mutations/unreconciled'),
        api.get('/payments'),
      ]);
      setMutations(mRes.data);
      setPayments(pRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [showReconciled]);

  const handleReconcile = async (mutationId) => {
    const paymentId = prompt('Payment Receipt ID to link?');
    if (!paymentId) return;
    try {
      await api.put(`/bank-mutations/${mutationId}/reconcile`, { payment_receipt_id: parseInt(paymentId) });
      setMsg('Reconciled successfully');
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    try {
      await api.post('/bank-mutations/import-csv', {
        mutations: [{ ...importForm, amount: parseFloat(importForm.amount) }],
      });
      setMsg('Imported 1 mutation');
      setImportForm({ date: '', amount: '', description: '', source_account: '' });
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page-container">
      <h2>🏦 Bank Reconciliation</h2>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}
      {msg && <div style={{ color: '#52c41a', marginBottom: 12 }}>{msg}</div>}

      <form onSubmit={handleImport} className="card">
        <h3>Import Bank Mutation</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Date</label>
            <input type="date" value={importForm.date} onChange={e => setImportForm({ ...importForm, date: e.target.value })} required />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Amount</label>
            <input type="number" value={importForm.amount} onChange={e => setImportForm({ ...importForm, amount: e.target.value })} required />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Description</label>
            <input value={importForm.description} onChange={e => setImportForm({ ...importForm, description: e.target.value })} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Source Account</label>
            <input value={importForm.source_account} onChange={e => setImportForm({ ...importForm, source_account: e.target.value })} />
          </div>
        </div>
        <button className="btn btn-primary" type="submit">Import</button>
      </form>

      <div style={{ marginBottom: 12 }}>
        <button className={`btn btn-sm ${showReconciled ? 'btn-primary' : 'btn-danger'}`} onClick={() => setShowReconciled(!showReconciled)}>
          {showReconciled ? 'Show Unreconciled' : 'Show Reconciled'}
        </button>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Description</th>
            <th>Source</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {mutations.map(m => (
            <tr key={m.id}>
              <td>{new Date(m.date).toLocaleDateString('id-ID')}</td>
              <td><strong>{formatRp(m.amount)}</strong></td>
              <td>{m.description || '-'}</td>
              <td>{m.source_account || '-'}</td>
              <td className={m.is_reconciled ? 'paid' : 'unpaid'}>
                {m.is_reconciled ? '✅ Reconciled' : '❌ Unreconciled'}
              </td>
              <td>
                {!m.is_reconciled && (
                  <button className="btn btn-success btn-sm" onClick={() => handleReconcile(m.id)}>Reconcile</button>
                )}
              </td>
            </tr>
          ))}
          {mutations.length === 0 && (
            <tr><td colSpan="6" style={{ color: '#bbb', fontStyle: 'italic', textAlign: 'center' }}>No mutations</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}