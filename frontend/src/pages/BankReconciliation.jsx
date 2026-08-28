import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const formatRp = (n) => 'Rp ' + Number(n).toLocaleString('id-ID');

const tenantRoom = (t) => {
  const rc = t.RentalContracts && t.RentalContracts[0];
  return rc && rc.Room ? rc.Room.room_number : null;
};

const tenantLabel = (t) => {
  const room = tenantRoom(t);
  let label = t.nama_panggilan;
  if (room) label += ` (${room})`;
  if (t.name && t.name !== t.nama_panggilan) label += ` — ${t.name}`;
  return label;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function BankReconciliation() {
  const [mutations, setMutations] = useState([]);
  const [monthlyBillings, setMonthlyBillings] = useState([]);
  const [nonMonthlyIncomes, setNonMonthlyIncomes] = useState([]);
  const [senderRegistry, setSenderRegistry] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [showReconciled, setShowReconciled] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [selectedMutations, setSelectedMutations] = useState([]);
  const [selectedBillings, setSelectedBillings] = useState([]);
  const [selectedIncomes, setSelectedIncomes] = useState([]);
  const [billTab, setBillTab] = useState('monthly');
  const [forceReconcile, setForceReconcile] = useState(false);
  const [forceNotes, setForceNotes] = useState('');
  const [reconciling, setReconciling] = useState(false);
  const [autoReconciling, setAutoReconciling] = useState(false);
  const [autoResult, setAutoResult] = useState(null);
  const [linking, setLinking] = useState(false);
  const [linkResult, setLinkResult] = useState(null);
  const [showSenders, setShowSenders] = useState(false);
  const [senderEdits, setSenderEdits] = useState({});
  const [importingMapping, setImportingMapping] = useState(false);
  const [mappingResult, setMappingResult] = useState(null);
  const fileInputRef = useRef(null);
  const mappingFileRef = useRef(null);
  const [newSenderName, setNewSenderName] = useState('');
  const [newSenderTenant, setNewSenderTenant] = useState('');
  const [addingSender, setAddingSender] = useState(false);

  const mutationTotal = selectedMutations.reduce((sum, id) => {
    const m = mutations.find(m => m.id === id);
    return sum + (m ? Number(m.amount) : 0);
  }, 0);

  const selectedBillingTotal = selectedBillings.reduce((sum, id) => {
    const b = monthlyBillings.find(b => b.id === id);
    return sum + (b ? Number(b.total_amount) : 0);
  }, 0);

  const selectedIncomeTotal = selectedIncomes.reduce((sum, id) => {
    const inc = nonMonthlyIncomes.find(i => i.id === id);
    return sum + (inc ? Number(inc.total_amount) : 0);
  }, 0);

  const billTotal = selectedBillingTotal + selectedIncomeTotal;
  const amountsMatch = mutationTotal === billTotal;
  const hasSelection = selectedMutations.length > 0 && (selectedBillings.length > 0 || selectedIncomes.length > 0);

  const fetch = async () => {
    setLoading(true);
    setError('');
    try {
      const mutationParams = { type: 'credit', category: 'operational' };
      if (showReconciled) {
        mutationParams.is_reconciled = 1;
      } else {
        mutationParams.is_reconciled = 0;
      }

      const [mRes, mbRes, nmiRes, srRes, tRes] = await Promise.all([
        api.get('/bank-mutations', { params: mutationParams }),
        api.get('/monthly-billings', { params: { is_paid: 0 } }),
        api.get('/non-monthly-incomes'),
        api.get('/sender-registry').catch(() => ({ data: [] })),
        api.get('/tenants'),
      ]);

      setMutations(mRes.data);
      setMonthlyBillings(mbRes.data);
      setNonMonthlyIncomes((nmiRes.data || []).filter(i => !i.is_paid));
      setSenderRegistry(srRes.data || []);
      setTenants(tRes.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, [showReconciled]);

  const runImport = async (text) => {
    setImporting(true);
    setError('');
    setImportResult(null);
    try {
      const { data } = await api.post('/bank-mutations/import-csv', { csv: text });
      setImportResult(data);
      setMsg(`Imported: ${data.created || 0} new, ${data.skipped || 0} skipped`);
      setCsvText('');
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleImportCsv = () => {
    if (!csvText.trim()) return;
    runImport(csvText);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (!text.trim()) {
        setError('File CSV kosong');
      } else {
        setCsvText(text);
        await runImport(text);
      }
    } catch {
      setError('Gagal membaca file CSV');
    } finally {
      e.target.value = '';
    }
  };

  const handleAutoReconcile = async () => {
    setAutoReconciling(true);
    setError('');
    setAutoResult(null);
    try {
      const { data } = await api.post('/bank-mutations/auto-reconcile');
      setAutoResult(data);
      setMsg(`Auto-reconciled: ${data.auto_reconciled || 0}, unmatched: ${data.unmatched || 0}, errors: ${data.errors || 0}`);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Auto-reconcile failed');
    } finally {
      setAutoReconciling(false);
    }
  };

  const toggleMutation = (id) => {
    setSelectedMutations(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleBilling = (id) => {
    setSelectedBillings(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleIncome = (id) => {
    setSelectedIncomes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllMutations = () => {
    if (selectedMutations.length === mutations.length) {
      setSelectedMutations([]);
    } else {
      setSelectedMutations(mutations.map(m => m.id));
    }
  };

  const detectPromo = () => {
    if (selectedBillings.length < 6) return null;

    const bills = monthlyBillings.filter(b => selectedBillings.includes(b.id));
    if (bills.length !== selectedBillings.length) return null;

    const contractId = bills[0].rental_contract_id;
    if (!contractId || !bills.every(b => b.rental_contract_id === contractId)) return null;

    const sorted = [...bills].sort((a, b) => {
      if (a.period_year !== b.period_year) return a.period_year - b.period_year;
      return a.period_month - b.period_month;
    });

    let consecutive = true;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const expectedMonth = prev.period_month === 12 ? 1 : prev.period_month + 1;
      const expectedYear = prev.period_month === 12 ? prev.period_year + 1 : prev.period_year;
      if (curr.period_month !== expectedMonth || curr.period_year !== expectedYear) {
        consecutive = false;
        break;
      }
    }

    if (!consecutive) return null;

    if (sorted.length === 12) {
      return { months: 12, discount: 1000000, label: '12 months consecutive — suggest discount Rp 1.000.000' };
    }
    if (sorted.length === 6) {
      return { months: 6, discount: 500000, label: '6 months consecutive — suggest discount Rp 500.000' };
    }

    return null;
  };

  const promo = detectPromo();

  const handleReconcile = async () => {
    if (!hasSelection) return;
    if (!forceReconcile && !amountsMatch) {
      setError('Amounts do not match. Enable force reconcile to proceed.');
      return;
    }
    if (forceReconcile && !forceNotes.trim()) {
      setError('Notes are mandatory for force reconciliation.');
      return;
    }

    setReconciling(true);
    setError('');
    setMsg('');
    try {
      const payload = {
        mutation_ids: selectedMutations,
        billing_ids: selectedBillings,
        income_ids: selectedIncomes,
        force: forceReconcile,
        notes: forceReconcile ? forceNotes : undefined,
      };
      if (promo) {
        payload.apply_promo = true;
      }
      await api.post('/reconcile', payload);
      setMsg(`Rekonsiliasi berhasil: ${selectedBillings.length + selectedIncomes.length} tagihan lunas, ${selectedMutations.length} mutasi ter-link`);
      setSelectedMutations([]);
      setSelectedBillings([]);
      setSelectedIncomes([]);
      setForceReconcile(false);
      setForceNotes('');
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Reconciliation failed');
    } finally {
      setReconciling(false);
    }
  };

  const isSenderKnown = (senderName) => {
    if (!senderName || senderRegistry.length === 0) return false;
    return senderRegistry.some(s =>
      s.tenant_id && s.sender_name && senderName.toLowerCase().includes(s.sender_name.toLowerCase())
    );
  };

  const handleUndo = async (id) => {
    if (!window.confirm('Batalkan rekonsiliasi untuk mutasi ini? Tagihan akan dikembalikan ke status belum lunas.')) return;
    setError('');
    setMsg('');
    try {
      const { data } = await api.post('/reconcile/undo', { mutation_ids: [id] });
      setMsg(`Rekonsiliasi dibatalkan: ${data.undone || 0} mutasi, ${data.receipts_deleted || 0} nota dihapus.`);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Undo reconciliation failed');
    }
  };

  const handleAutoLink = async () => {
    setLinking(true);
    setError('');
    setLinkResult(null);
    try {
      const { data } = await api.post('/sender-registry/auto-link');
      setLinkResult(data);
      setMsg(`Auto-link: ${data.linked || 0} nama terhubung ke tenant, ${data.skipped_count || 0} perlu review, dari ${data.total_unlinked || 0} nama belum ter-link.`);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Auto-link failed');
    } finally {
      setLinking(false);
    }
  };

  const handleSaveSenderLink = async (senderId) => {
    const tenantId = senderEdits[senderId];
    if (tenantId === undefined) return;
    try {
      await api.put(`/sender-registry/${senderId}`, { tenant_id: tenantId || null });
      setSenderEdits(prev => { const n = { ...prev }; delete n[senderId]; return n; });
      setMsg(`Nama rekening di-link.`);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal update');
    }
  };

  const handleImportMapping = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingMapping(true);
    setError('');
    setMappingResult(null);
    try {
      const text = await file.text();
      if (!text.trim()) {
        setError('File mapping kosong');
      } else {
        const { data } = await api.post('/sender-registry/import-mapping', { csv: text });
        setMappingResult(data);
        setMsg(`Mapping import: ${data.linked || 0} baru ter-link, ${data.already_linked || 0} sudah, ${data.no_mapping_row || 0} tidak ada di file, ${data.no_resolve || 0} tidak ter-resolve.`);
        fetch();
      }
    } catch {
      setError('Gagal import file mapping');
    } finally {
      setImportingMapping(false);
      e.target.value = '';
    }
  };

  const handleAddSender = async () => {
    const name = newSenderName.trim();
    if (!name) return;
    setAddingSender(true);
    setError('');
    setMsg('');
    try {
      const { data } = await api.post('/sender-registry', {
        sender_name: name,
        tenant_id: newSenderTenant ? Number(newSenderTenant) : null,
      });
      setMsg(`Nama pengirim "${data.sender_name}" ditambahkan${data.tenant_id ? ' dan ter-link ke tenant.' : ' (belum ter-link).'}`);
      setNewSenderName('');
      setNewSenderTenant('');
      setShowSenders(true);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Gagal menambah nama pengirim');
    } finally {
      setAddingSender(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page-container">
      <h2>Bank Reconciliation</h2>
      {error && <div style={{ color: '#ff4d4f', marginBottom: 12 }}>{error}</div>}
      {msg && <div style={{ color: '#52c41a', marginBottom: 12 }}>{msg}</div>}

      <div className="card">
        <h3>Import BCA Bank CSV</h3>
        <div className="form-group">
          <label>Pilih file CSV dari komputer</label>
          <input
            type="file"
            accept=".csv,text/csv"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
            <strong>Langkah 1:</strong> Import mutasi rekening BCA. Setelah ini, mutasi muncul di daftar Unreconciled Mutations di bawah.
          </div>
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? 'Importing...' : 'Pilih File CSV'}
          </button>
        </div>
        <div className="form-group">
          <label>Atau paste CSV mutations di bawah</label>
          <textarea
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
            rows={6}
            placeholder="Tanggal, Keterangan, CBG, Mutasi, ..."
          />
          <button
            className="btn btn-secondary"
            onClick={handleImportCsv}
            disabled={importing || !csvText.trim()}
            style={{ marginTop: 8 }}
          >
            Import dari Text
          </button>
        </div>
        {importResult && (
          <div style={{ marginTop: 8, fontSize: 13, color: '#52c41a' }}>
            Created: {importResult.created ?? importResult.inserted ?? 0}, Skipped: {importResult.skipped || 0}, Errors: {importResult.errors || 0}
          </div>
        )}
      </div>

      <div className="card">
        <h3>Kelola Sender Registry (Nama Pengirim)</h3>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
          <strong>Langkah 1.5:</strong> Hubungkan nama pengirim mutasi bank ke tenant. Klik <em>Auto-link</em> untuk
          mencocokkan otomatis (berdasarkan nama panggilan tenant). Yang tidak cocok otomatis bisa di-link manual
          di tabel bawah.
        </div>
        {(() => {
          const total = senderRegistry.length;
          const linked = senderRegistry.filter(s => s.tenant_id).length;
          const unlinked = total - linked;
          return (
            <div style={{ fontSize: 13, marginBottom: 8 }}>
              <strong>{linked}</strong> ter-link, <strong>{unlinked}</strong> belum ter-link
              {total > 0 && <span> (dari {total} nama)</span>}
            </div>
          );
        })()}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 12, padding: 10, background: '#fafafa', borderRadius: 6 }}>
          <strong style={{ fontSize: 13 }}>Tambah Nama Pengirim:</strong>
          <input
            type="text"
            value={newSenderName}
            onChange={e => setNewSenderName(e.target.value)}
            placeholder="Nama pengirim (mis. PINKAN NUANSA PUTR)"
            style={{ flex: '1 1 220px', padding: '6px 8px' }}
          />
          <select
            value={newSenderTenant}
            onChange={e => setNewSenderTenant(e.target.value)}
            style={{ flex: '1 1 200px', padding: '6px 8px' }}
          >
            <option value="">— tanpa tenant —</option>
            {tenants.map(t => (
              <option key={t.id} value={t.id}>{tenantLabel(t)}</option>
            ))}
          </select>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleAddSender}
            disabled={addingSender || !newSenderName.trim()}
          >
            {addingSender ? 'Menambah...' : 'Tambah'}
          </button>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleAutoLink}
          disabled={linking || senderRegistry.filter(s => !s.tenant_id).length === 0}
        >
          {linking ? 'Memproses...' : 'Auto-link (fuzzy match)'}
        </button>
        <input
          type="file"
          accept=".csv,text/csv"
          ref={mappingFileRef}
          style={{ display: 'none' }}
          onChange={handleImportMapping}
        />
        <button
          className="btn btn-success"
          style={{ marginLeft: 8 }}
          onClick={() => mappingFileRef.current?.click()}
          disabled={importingMapping}
        >
          {importingMapping ? 'Memproses...' : 'Import file mapping'}
        </button>
        <span style={{ fontSize: 12, color: '#999', marginLeft: 8 }}>
          (file CSV: nama1;nama2;no kamar)
        </span>
        {mappingResult && (
          <div style={{ marginTop: 8, fontSize: 13, color: '#52c41a' }}>
            Mapping: {mappingResult.linked || 0} baru ter-link
            {mappingResult.already_linked > 0 && `, ${mappingResult.already_linked} sudah`}
            {mappingResult.no_mapping_row > 0 && `, ${mappingResult.no_mapping_row} tidak ada di file`}
            {mappingResult.no_resolve > 0 && `, ${mappingResult.no_resolve} tidak ter-resolve`}.
            {mappingResult.details && mappingResult.details.length > 0 && (
              <details style={{ marginTop: 4 }}>
                <summary style={{ cursor: 'pointer' }}>Ter-link ({mappingResult.details.length})</summary>
                <ul style={{ maxHeight: 200, overflow: 'auto' }}>
                  {mappingResult.details.map((d, i) => (
                    <li key={i}>{d.sender_name} → {d.tenant_nama} (id {d.tenant_id}, via {d.via}{d.room ? ' room ' + d.room : ''})</li>
                  ))}
                </ul>
              </details>
            )}
            {mappingResult.unresolved && mappingResult.unresolved.length > 0 && (
              <details style={{ marginTop: 4 }}>
                <summary style={{ cursor: 'pointer' }}>Belum ter-link ({mappingResult.unresolved.length})</summary>
                <ul style={{ maxHeight: 200, overflow: 'auto' }}>
                  {mappingResult.unresolved.map((u, i) => (
                    <li key={i}>{u.sender_name} — {u.reason}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        {linkResult && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 14, color: '#52c41a' }}>
              {linkResult.linked || 0} nama baru ter-link ke tenant.
              {linkResult.skipped_count > 0 && ` ${linkResult.skipped_count} lainnya perlu review/manual.`}
            </div>
            {linkResult.details && linkResult.details.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer', fontSize: 13 }}>Ter-link ({linkResult.details.length})</summary>
                <ul style={{ fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
                  {linkResult.details.map((d, i) => (
                    <li key={i}>{d.sender_name} → {d.tenant_nama} (id {d.tenant_id})</li>
                  ))}
                </ul>
              </details>
            )}
            {linkResult.skipped && linkResult.skipped.length > 0 && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ cursor: 'pointer', fontSize: 13 }}>Saran medium-confidence untuk review ({linkResult.skipped.length})</summary>
                <ul style={{ fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
                  {linkResult.skipped.map((d, i) => (
                    <li key={i}>{d.sender_name} → {d.tenant_nama} (id {d.suggested_tenant_id}, {d.confidence})</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowSenders(s => !s)}
          >
            {showSenders ? 'Sembunyikan' : 'Tampilkan'} tabel nama ({senderRegistry.length})
          </button>
        </div>
        {showSenders && (
          <table className="data-table" style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Nama Pengirim</th>
                <th>Tenant</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {senderRegistry.map(s => {
                const current = senderEdits[s.id] !== undefined ? senderEdits[s.id] : (s.tenant_id || '');
                return (
                  <tr key={s.id}>
                    <td>{s.sender_name}</td>
                    <td>
                      <select
                        value={current}
                        onChange={e => setSenderEdits(prev => ({ ...prev, [s.id]: e.target.value ? Number(e.target.value) : null }))}
                        style={{ width: '100%' }}
                      >
                        <option value="">{current ? '— hapus link —' : '— belum ter-link —'}</option>
                        {tenants.map(t => (
                          <option key={t.id} value={t.id}>
                            {tenantLabel(t)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={senderEdits[s.id] === undefined || String(senderEdits[s.id]) === String(s.tenant_id || '')}
                        onClick={() => handleSaveSenderLink(s.id)}
                      >
                        Simpan
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3>Rekonsiliasi Otomatis</h3>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
          <strong>Langkah 2:</strong> Cocokkan mutasi dengan database nama rekening (sender registry).
          Mutasi yang <em>pasti cocok</em> (nama pengirim ada &amp; terhubung ke tenant + nominal cocok tagihan) otomatis direkonsiliasi.
          Sisanya tetap di list untuk rekonsiliasi manual.
        </div>
        <button
          className="btn btn-success"
          onClick={handleAutoReconcile}
          disabled={autoReconciling || loading || mutations.length === 0}
        >
          {autoReconciling ? 'Memproses...' : 'Rekonsiliasi Otomatis'}
        </button>
        {autoResult && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>
              <strong>Hasil:</strong> {autoResult.auto_reconciled || 0} otomatis terekonsiliasi,
              {' '}{autoResult.unmatched || 0} tidak cocok (perlu manual),
              {' '}{autoResult.errors || 0} error, dari {autoResult.total || 0} mutasi.
            </div>
            {autoResult.details && autoResult.details.length > 0 && (
              <details>
                <summary style={{ cursor: 'pointer', fontSize: 13 }}>Rincian per mutasi ({autoResult.details.length})</summary>
                <table className="data-table" style={{ marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Sender</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {autoResult.details.map(d => (
                      <tr key={d.mutation_id}>
                        <td>{d.date}</td>
                        <td>{d.sender_name || '-'}</td>
                        <td>{formatRp(d.amount)}</td>
                        <td style={{
                          color: d.status === 'reconciled' ? '#52c41a' : (d.status === 'error' ? '#ff4d4f' : '#faad14')
                        }}>
                          {d.status === 'reconciled' ? `Reconciled (${d.items} item, nota ${d.receipt_no})` :
                           d.status === 'no_sender' ? 'Tidak ada nama pengirim' :
                           d.status === 'no_tenant' ? 'Nama tidak ada di registry' :
                           d.status === 'no_billing_match' ? 'Tenant cocok, tagihan tidak cocok' :
                           d.status === 'error' ? `Error: ${d.error}` : d.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </div>
        )}
      </div>

      <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          className={`btn btn-sm ${showReconciled ? 'btn-primary' : 'btn-danger'}`}
          onClick={() => {
            setShowReconciled(!showReconciled);
            setSelectedMutations([]);
            setSelectedBillings([]);
            setSelectedIncomes([]);
          }}
        >
          {showReconciled ? 'Show Unreconciled' : 'Show Reconciled'}
        </button>
      </div>

      {!showReconciled && (
        <div className="card" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ width: '100%', fontSize: 13, color: '#666', marginBottom: 4 }}>
            <strong>Langkah 3 (manual):</strong> Centang mutasi di kiri &amp; tagihan/pemasukan di kanan, pastikan jumlahnya sama ( Amounts match ), lalu klik Reconcile.
          </div>
          <div style={{ flex: 1 }}>
            <strong>Selected Mutations:</strong> {selectedMutations.length} ({formatRp(mutationTotal)})
          </div>
          <div style={{ flex: 1 }}>
            <strong>Selected Bills:</strong> {selectedBillings.length + selectedIncomes.length} ({formatRp(billTotal)})
          </div>
          {hasSelection && !amountsMatch && !forceReconcile && (
            <div style={{ color: '#ff4d4f', fontWeight: 600 }}>
              Amounts differ by {formatRp(Math.abs(mutationTotal - billTotal))}
            </div>
          )}
          {hasSelection && amountsMatch && (
            <div style={{ color: '#52c41a', fontWeight: 600 }}>Amounts match</div>
          )}

          {promo && (
            <div style={{ width: '100%', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 4, padding: '8px 12px', marginTop: 4 }}>
              {promo.label}
            </div>
          )}

          <div style={{ width: '100%', display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={forceReconcile}
                  onChange={e => setForceReconcile(e.target.checked)}
                />
                Force reconcile (amounts may differ)
              </label>
            </div>
            {forceReconcile && (
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <input
                  type="text"
                  placeholder="Mandatory notes for force reconcile"
                  value={forceNotes}
                  onChange={e => setForceNotes(e.target.value)}
                />
              </div>
            )}
            <button
              className="btn btn-success"
              onClick={handleReconcile}
              disabled={!hasSelection || reconciling || (forceReconcile && !forceNotes.trim())}
            >
              {reconciling ? 'Reconciling...' : 'Reconcile'}
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 15, marginBottom: 8 }}>
            {showReconciled ? 'Reconciled' : 'Unreconciled'} Mutations
          </h3>
          <table className="data-table">
            <thead>
              <tr>
                {!showReconciled && (
                  <th>
                    <input
                      type="checkbox"
                      checked={mutations.length > 0 && selectedMutations.length === mutations.length}
                      onChange={selectAllMutations}
                    />
                  </th>
                )}
                <th>Date</th>
                <th>Sender</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Status</th>
                {showReconciled && <th>Nota</th>}
                {showReconciled && <th>Penghuni</th>}
                {showReconciled && <th></th>}
              </tr>
            </thead>
            <tbody>
              {mutations.map(m => {
                const known = isSenderKnown(m.sender_name);
                return (
                  <tr key={m.id} style={known ? { background: '#e6f7ff' } : undefined}>
                    {!showReconciled && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedMutations.includes(m.id)}
                          onChange={() => toggleMutation(m.id)}
                        />
                      </td>
                    )}
                    <td>{new Date(m.date).toLocaleDateString('id-ID')}</td>
                    <td>
                      {m.sender_name || '-'}
                      {known && <span style={{ marginLeft: 4, fontSize: 11, color: '#1890ff' }}>(registered)</span>}
                    </td>
                    <td><strong>{formatRp(m.amount)}</strong></td>
                    <td>{m.description || '-'}</td>
                    <td className={m.is_reconciled ? 'paid' : 'unpaid'}>
                      {m.is_reconciled ? 'Reconciled' : 'Unreconciled'}
                    </td>
                    {showReconciled && (
                      <td>
                        {m.reconciliation?.receipt_no
                          ? m.reconciliation.receipt_no
                          : m.reconciliation?.type === 'deposit_return'
                            ? '(deposit return)'
                            : '-'}
                      </td>
                    )}
                    {showReconciled && (
                      <td>
                        {m.reconciliation?.tenant
                          ? (() => {
                              const t = m.reconciliation.tenant;
                              return t.name && t.name !== t.nama_panggilan
                                ? `${t.nama_panggilan} — ${t.name}`
                                : t.nama_panggilan;
                            })()
                          : '-'}
                      </td>
                    )}
                    {showReconciled && (
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleUndo(m.id)}
                        >
                          Undo
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
              {mutations.length === 0 && (
                <tr><td colSpan={showReconciled ? 8 : 6} style={{ color: '#bbb', fontStyle: 'italic', textAlign: 'center' }}>No mutations</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {!showReconciled && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 0, marginBottom: 8 }}>
              <button
                className={`btn btn-sm ${billTab === 'monthly' ? 'btn-primary' : ''}`}
                style={{ borderRadius: '4px 0 0 4px' }}
                onClick={() => setBillTab('monthly')}
              >
                Monthly Billings
              </button>
              <button
                className={`btn btn-sm ${billTab === 'nonmonthly' ? 'btn-primary' : ''}`}
                style={{ borderRadius: '0 4px 4px 0' }}
                onClick={() => setBillTab('nonmonthly')}
              >
                Non-Monthly Incomes
              </button>
            </div>

            {billTab === 'monthly' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={monthlyBillings.length > 0 && selectedBillings.length === monthlyBillings.length}
                        onChange={() => {
                          if (selectedBillings.length === monthlyBillings.length) {
                            setSelectedBillings([]);
                          } else {
                            setSelectedBillings(monthlyBillings.map(b => b.id));
                          }
                        }}
                      />
                    </th>
                    <th>Period</th>
                    <th>Room</th>
                    <th>Tenant</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyBillings.map(b => (
                    <tr key={b.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedBillings.includes(b.id)}
                          onChange={() => toggleBilling(b.id)}
                        />
                      </td>
                      <td>{MONTHS[(b.period_month || 1) - 1]} {b.period_year}</td>
                      <td>{b.RentalContract?.Room?.room_number || '-'}</td>
                      <td>{b.RentalContract?.Tenant?.nama_panggilan || b.RentalContract?.Tenant?.name || '-'}</td>
                      <td><strong>{formatRp(b.total_amount)}</strong></td>
                    </tr>
                  ))}
                  {monthlyBillings.length === 0 && (
                    <tr><td colSpan="5" style={{ color: '#bbb', fontStyle: 'italic', textAlign: 'center' }}>No unpaid monthly billings</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {billTab === 'nonmonthly' && (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        checked={nonMonthlyIncomes.length > 0 && selectedIncomes.length === nonMonthlyIncomes.length}
                        onChange={() => {
                          if (selectedIncomes.length === nonMonthlyIncomes.length) {
                            setSelectedIncomes([]);
                          } else {
                            setSelectedIncomes(nonMonthlyIncomes.map(i => i.id));
                          }
                        }}
                      />
                    </th>
                    <th>Date</th>
                    <th>Tenant</th>
                    <th>Category</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {nonMonthlyIncomes.map(inc => (
                    <tr key={inc.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedIncomes.includes(inc.id)}
                          onChange={() => toggleIncome(inc.id)}
                        />
                      </td>
                      <td>{inc.transaction_date ? new Date(inc.transaction_date).toLocaleDateString('id-ID') : '-'}</td>
                      <td>{inc.Tenant?.nama_panggilan || inc.Tenant?.name || '-'}</td>
                      <td>{inc.category}</td>
                      <td><strong>{formatRp(inc.total_amount)}</strong></td>
                    </tr>
                  ))}
                  {nonMonthlyIncomes.length === 0 && (
                    <tr><td colSpan="5" style={{ color: '#bbb', fontStyle: 'italic', textAlign: 'center' }}>No unpaid non-monthly incomes</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}