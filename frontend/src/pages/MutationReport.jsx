import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';

const formatRp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

const formatDate = (d) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${dt.getFullYear()}`;
};

const badgeStyle = (bg, color) => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: 10,
  fontSize: 11,
  fontWeight: 600,
  background: bg,
  color,
  whiteSpace: 'nowrap',
});

export default function MutationReport() {
  const [mutations, setMutations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ start_date: '', end_date: '', type: 'all', status: 'all' });
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const statusRank = (m) => (m.keterangan ? 3 : m.keterangan_auto ? 2 : 1);

  const sortedMutations = useMemo(() => {
    const arr = [...mutations];
    const { key, dir } = sort;
    const mult = dir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      let av, bv;
      switch (key) {
        case 'date':
          av = new Date(a.date).getTime();
          bv = new Date(b.date).getTime();
          break;
        case 'description':
          av = (a.description || '').toLowerCase();
          bv = (b.description || '').toLowerCase();
          break;
        case 'keterangan':
          av = ((a.keterangan || a.keterangan_auto) || '').toLowerCase();
          bv = ((b.keterangan || b.keterangan_auto) || '').toLowerCase();
          break;
        case 'credit':
          av = a.type === 'credit' ? Number(a.amount) : 0;
          bv = b.type === 'credit' ? Number(b.amount) : 0;
          break;
        case 'debit':
          av = a.type === 'debit' ? Number(a.amount) : 0;
          bv = b.type === 'debit' ? Number(b.amount) : 0;
          break;
        case 'balance':
          av = a.balance != null ? Number(a.balance) : 0;
          bv = b.balance != null ? Number(b.balance) : 0;
          break;
        case 'status':
          av = statusRank(a);
          bv = statusRank(b);
          break;
        default:
          av = a.id;
          bv = b.id;
      }
      if (av < bv) return -1 * mult;
      if (av > bv) return 1 * mult;
      return 0;
    });
    return arr;
  }, [mutations, sort]);

  const handleSort = (key) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      const defaultDir = key === 'date' || key === 'credit' || key === 'debit' || key === 'balance' ? 'desc' : 'asc';
      return { key, dir: defaultDir };
    });
  };

  const renderSortHeader = (label, sortKey, extraStyle = {}) => {
    const active = sort.key === sortKey;
    const arrow = active ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
    return (
      <th
        onClick={() => handleSort(sortKey)}
        style={{ cursor: 'pointer', userSelect: 'none', ...extraStyle }}
        title={`Urutkan berdasarkan ${label}`}
      >
        {label}{arrow}
      </th>
    );
  };

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filter.start_date) params.start_date = filter.start_date;
      if (filter.end_date) params.end_date = filter.end_date;
      if (filter.type !== 'all') params.type = filter.type;
      if (filter.status !== 'all') params.status = filter.status;
      const { data } = await api.get('/bank-mutations/report', { params });
      setMutations(data.mutations);
      setSummary(data.summary);
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditValue(m.keterangan || m.keterangan_auto || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (id) => {
    const val = editValue.trim();
    if (!val) {
      alert('Keterangan wajib diisi');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/bank-mutations/${id}/keterangan`, { keterangan: val });
      setEditingId(null);
      setEditValue('');
      await fetchReport();
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menyimpan keterangan');
    } finally {
      setSaving(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="page-container">
      <h2>Laporan Mutasi Rekening</h2>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}

      <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Dari Tanggal</label>
          <input
            type="date"
            value={filter.start_date}
            onChange={(e) => handleFilterChange('start_date', e.target.value)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Sampai Tanggal</label>
          <input
            type="date"
            value={filter.end_date}
            onChange={(e) => handleFilterChange('end_date', e.target.value)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Tipe</label>
          <select value={filter.type} onChange={(e) => handleFilterChange('type', e.target.value)}>
            <option value="all">Semua</option>
            <option value="credit">Masuk</option>
            <option value="debit">Keluar</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Status Keterangan</label>
          <select value={filter.status} onChange={(e) => handleFilterChange('status', e.target.value)}>
            <option value="all">Semua</option>
            <option value="perlu_dicek">Perlu Dicek</option>
            <option value="sudah">Sudah Ada</option>
          </select>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => setFilter({ start_date: '', end_date: '', type: 'all', status: 'all' })}
        >
          Reset
        </button>
      </div>

      {summary && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4 }}>
          <div className="card" style={{ marginBottom: 0, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: '#888' }}>Total Masuk</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}>{formatRp(summary.total_masuk)}</div>
          </div>
          <div className="card" style={{ marginBottom: 0, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: '#888' }}>Total Keluar</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#ff4d4f' }}>{formatRp(summary.total_keluar)}</div>
          </div>
          <div className="card" style={{ marginBottom: 0, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: '#888' }}>Net</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: summary.net >= 0 ? '#1890ff' : '#ff4d4f' }}>
              {formatRp(summary.net)}
            </div>
          </div>
          <div className="card" style={{ marginBottom: 0, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: '#888' }}>Jumlah Mutasi</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{summary.count}</div>
          </div>
          <div className="card" style={{ marginBottom: 0, minWidth: 160 }}>
            <div style={{ fontSize: 12, color: '#888' }}>Perlu Dicek</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: summary.perlu_dicek > 0 ? '#fa8c16' : '#52c41a' }}>
              {summary.perlu_dicek}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#999' }}>Loading...</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              {renderSortHeader('Tanggal', 'date')}
              {renderSortHeader('Keterangan Bank', 'description')}
              {renderSortHeader('Keterangan', 'keterangan')}
              {renderSortHeader('Masuk', 'credit')}
              {renderSortHeader('Keluar', 'debit')}
              {renderSortHeader('Saldo', 'balance')}
              {renderSortHeader('Status', 'status')}
            </tr>
          </thead>
          <tbody>
            {sortedMutations.map((m) => (
              <tr key={m.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(m.date)}</td>
                <td style={{ maxWidth: 260, fontSize: 12, color: '#666', wordBreak: 'break-word' }}>
                  {m.description || '-'}
                </td>
                <td style={{ minWidth: 240 }}>
                  {editingId === m.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(m.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        style={{ flex: 1, padding: '4px 8px', border: '1px solid #1890ff', borderRadius: 4 }}
                        placeholder="Masukkan keterangan..."
                        disabled={saving}
                      />
                      <button className="btn btn-primary btn-sm" onClick={() => saveEdit(m.id)} disabled={saving}>
                        Simpan
                      </button>
                      <button className="btn btn-sm" onClick={cancelEdit} disabled={saving}>
                        Batal
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => startEdit(m)}
                      style={{ cursor: 'pointer', minHeight: 20 }}
                      title="Klik untuk edit keterangan"
                    >
                      {m.keterangan ? (
                        m.keterangan
                      ) : m.keterangan_auto ? (
                        <em style={{ color: '#888' }}>{m.keterangan_auto} (auto)</em>
                      ) : (
                        <em style={{ color: '#bbb' }}>Klik untuk isi keterangan...</em>
                      )}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: '#52c41a', fontWeight: 600 }}>
                  {m.type === 'credit' ? formatRp(m.amount) : ''}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', color: '#ff4d4f', fontWeight: 600 }}>
                  {m.type === 'debit' ? formatRp(m.amount) : ''}
                </td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {m.balance != null ? formatRp(m.balance) : '-'}
                </td>
                <td>
                  {m.keterangan ? (
                    <span style={badgeStyle('#f6ffed', '#52c41a')}>Sudah</span>
                  ) : m.keterangan_auto ? (
                    <span style={badgeStyle('#fff7e6', '#fa8c16')}>Auto</span>
                  ) : (
                    <span style={badgeStyle('#fff1f0', '#ff4d4f')}>Perlu Dicek</span>
                  )}
                </td>
              </tr>
            ))}
            {mutations.length === 0 && (
              <tr>
                <td colSpan="7" style={{ color: '#bbb', fontStyle: 'italic', textAlign: 'center', padding: 24 }}>
                  Tidak ada mutasi pada filter ini.
                </td>
              </tr>
            )}
          </tbody>
          {mutations.length > 0 && (
            <tfoot>
              <tr style={{ background: '#fafafa', fontWeight: 700 }}>
                <td colSpan="3" style={{ textAlign: 'right' }}>TOTAL</td>
                <td style={{ textAlign: 'right', color: '#52c41a' }}>
                  {formatRp(mutations.filter(m => m.type === 'credit').reduce((s, m) => s + Number(m.amount), 0))}
                </td>
                <td style={{ textAlign: 'right', color: '#ff4d4f' }}>
                  {formatRp(mutations.filter(m => m.type === 'debit').reduce((s, m) => s + Number(m.amount), 0))}
                </td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </div>
  );
}
