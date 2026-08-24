function extractSenderName(description) {
  if (!description) return null;

  if (/^BI-FAST CR/i.test(description)) {
    const m = description.match(/DR\s+\d{3}\s+(.+?)(?:\s+MBB)?$/);
    return m ? m[1].trim() : null;
  }

  if (/^SWITCHING CR/i.test(description)) {
    const m = description.match(/DR\s+\d{3}\s+(.+?)\s*\/.+/);
    return m ? m[1].trim() : null;
  }

  if (/^TRSF E-BANKING CR/i.test(description)) {
    if (/NTRF@|GoPay|ESPAY|DOMPET ANAK/i.test(description)) {
      return null;
    }
    const parts = description.split(/;\s*/);
    const lastPart = parts[parts.length - 1];
    const words = lastPart.trim().split(/\s+/);
    const nameWords = [];
    for (let i = words.length - 1; i >= 0; i--) {
      const w = words[i];
      if (/^[A-Z]{2,}/.test(w) || /^[A-Z][a-z]/.test(w)) {
        nameWords.unshift(w);
      } else if (nameWords.length > 0) {
        break;
      }
    }
    if (nameWords.length >= 2) return nameWords.join(' ');
    if (nameWords.length === 1 && nameWords[0].length >= 5) return nameWords[0];
    return null;
  }

  if (/^TRSF E-BANKING DB/i.test(description)) {
    if (/GS\s+\d|redepo|kembali/i.test(description)) return null;
    const parts = description.split(/;\s*/);
    const lastPart = parts[parts.length - 1];
    const words = lastPart.trim().split(/\s+/);
    const nameWords = [];
    for (let i = words.length - 1; i >= 0; i--) {
      const w = words[i];
      if (/^[A-Z]{2,}/.test(w) || /^[A-Z][a-z]/.test(w)) {
        nameWords.unshift(w);
      } else if (nameWords.length > 0) {
        break;
      }
    }
    if (nameWords.length >= 2) return nameWords.join(' ');
    if (nameWords.length === 1 && nameWords[0].length >= 5) return nameWords[0];
    return null;
  }

  return null;
}

function parseAmount(raw) {
  if (!raw) return 0;
  raw = String(raw).trim();
  if (raw === '') return 0;

  // Indonesian format: groups of 3 digits separated by dots, optional comma decimal
  // e.g. "16.000.000" / "57.294" / "2.500" / "1.234,50"
  if (/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(raw)) {
    return parseFloat(raw.replace(/\./g, '').replace(',', '.'));
  }
  // English decimal with up to 2 digits after dot = cents, e.g. "16000000.00"
  if (/^-?\d+\.\d{1,2}$/.test(raw)) {
    return parseFloat(raw);
  }
  // Plain integer
  if (/^-?\d+$/.test(raw)) {
    return parseFloat(raw);
  }
  // Fallback: strip thousand dots, convert comma decimal
  const stripped = raw.replace(/\./g, '').replace(',', '.');
  return parseFloat(stripped);
}

function parseBalance(raw) {
  if (!raw) return null;
  return parseAmount(raw);
}

function parseDate(raw) {
  if (!raw) return null;
  const parts = raw.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  }
  return null;
}

function normalizeHeader(h) {
  if (!h) return null;
  const s = h.trim().toLowerCase();
  if (s === 'tanggal' || s.startsWith('tanggal')) return 'date';
  if (s === 'keterangan') return 'description';
  if (s === 'mutasi') return 'amount';
  if (s === 'jenis' || s === 'jenis transaksi' || s.startsWith('jenis')) return 'type';
  if (s === 'saldo') return 'balance';
  if (s === 'cabang' || s === 'cbg') return 'branch';
  if (s === 'no') return 'no';
  return null;
}

function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/);
  const mutations = [];
  let colMap = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^;+$/.test(trimmed)) continue;

    const cols = trimmed.split(';');

    if (!colMap) {
      const map = {};
      cols.forEach((c, i) => {
        const key = normalizeHeader(c);
        if (key && map[key] === undefined) map[key] = i;
      });
      if (map.date !== undefined && map.amount !== undefined) {
        colMap = map;
      }
      continue;
    }

    const tanggal = cols[colMap.date];
    const keterangan = colMap.description !== undefined ? cols[colMap.description] : '';
    const mutasi = cols[colMap.amount];
    const jenis = colMap.type !== undefined ? cols[colMap.type] : '';
    const saldo = colMap.balance !== undefined ? cols[colMap.balance] : '';

    if (!tanggal || !mutasi || !jenis) continue;

    const isNonOperational = /^(BIAYA ADM|BUNGA|PAJAK BUNGA|BIF BIAYA TXN|BYR VIA E-BANKING|GS\s+1|GS\s+2|PENERIMAAN NEGARA)/i.test(keterangan)
      || /FTFVA/i.test(keterangan)
      || /ASURANSI/i.test(keterangan);

    const amount = parseAmount(mutasi);
    const date = parseDate(tanggal);
    const balance = parseBalance(saldo);
    const type = jenis === 'CR' ? 'credit' : 'debit';
    const senderName = type === 'credit' ? extractSenderName(keterangan) : null;

    mutations.push({
      date,
      description: keterangan,
      amount,
      type,
      balance,
      sender_name: senderName,
      category: isNonOperational ? 'non_operational' : 'operational',
    });
  }

  return mutations;
}

module.exports = { parseCSV, extractSenderName, parseAmount, parseDate };