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

// Split a single CSV line into fields, respecting double-quoted fields
// (quotes may wrap fields that contain the delimiter, e.g. "2,600,000.00").
function splitCSVLine(line, delimiter) {
  const cols = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cols.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols.map(c => c.trim());
}

function parseAmount(raw) {
  if (!raw) return 0;
  raw = String(raw).trim().replace(/^"|"$/g, '');
  if (raw === '') return 0;

  // Indonesian format: groups of 3 digits separated by dots, optional comma decimal
  // e.g. "16.000.000" / "57.294" / "2.500" / "1.234,50"
  if (/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(raw)) {
    return parseFloat(raw.replace(/\./g, '').replace(',', '.'));
  }
  // US format: groups of 3 digits separated by commas, optional dot decimal
  // e.g. "2,600,000.00" / "45,047.01" / "180,000"
  if (/^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(raw)) {
    return parseFloat(raw.replace(/,/g, ''));
  }
  // English decimal with up to 2 digits after dot = cents, e.g. "16000000.00"
  if (/^-?\d+\.\d{1,2}$/.test(raw)) {
    return parseFloat(raw);
  }
  // Plain integer
  if (/^-?\d+$/.test(raw)) {
    return parseFloat(raw);
  }
  // Fallback: decide decimal separator by which comes last
  const stripped = raw.includes('.') && raw.includes(',')
    ? (raw.lastIndexOf(',') > raw.lastIndexOf('.')
      ? raw.replace(/\./g, '').replace(/,/g, '.')
      : raw.replace(/,/g, ''))
    : raw.replace(/,/g, '.');
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

function detectDelimiter(csvText) {
  const firstLine = csvText.split(/\r?\n/).find(l => {
    const t = l.trim();
    return t && !/^;+$/.test(t);
  });
  if (!firstLine) return ';';
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  if (commas > semicolons) return ',';
  if (semicolons > 0) return ';';
  return commas > 0 ? ',' : ';';
}

function isDateLike(v) {
  if (!v) return false;
  const s = v.trim();
  return /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function isTypeLike(v) {
  return /^(CR|DB|DR)$/i.test((v || '').trim());
}

// Infer column roles from a headerless row (e.g. when user pastes a single
// mutation line). Assumes a BCA-like layout: date, description, [cbg], amount,
// [type], [balance].
function inferColumns(cols) {
  const col = { date: undefined, description: undefined, type: undefined, amount: undefined, balance: undefined };
  const numericIdx = [];

  cols.forEach((c, i) => {
    const v = (c || '').trim();
    if (col.date === undefined && isDateLike(v)) { col.date = i; return; }
    if (col.type === undefined && isTypeLike(v)) { col.type = i; return; }
    if (v !== '' && /[\d.,]/.test(v)) {
      const num = parseAmount(v);
      if (!isNaN(num)) {
        numericIdx.push(i);
        return;
      }
    }
    if (col.description === undefined) col.description = i;
  });

  if (numericIdx.length > 0) {
    col.balance = numericIdx[numericIdx.length - 1];
    if (col.type !== undefined) {
      const before = numericIdx.filter(i => i < col.type);
      col.amount = before.length ? before[before.length - 1] : numericIdx[0];
    } else {
      col.amount = numericIdx[0];
    }
  }

  if (col.description === undefined) {
    for (let i = 0; i < cols.length; i++) {
      if (i !== col.date && i !== col.type && i !== col.amount && i !== col.balance) {
        col.description = i;
        break;
      }
    }
  }

  return col;
}

function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/);
  const mutations = [];
  let colMap = null;
  const delimiter = detectDelimiter(csvText);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^;+$/.test(trimmed)) continue;

    const cols = splitCSVLine(trimmed, delimiter);

    if (!colMap) {
      const map = {};
      cols.forEach((c, i) => {
        const key = normalizeHeader(c);
        if (key && map[key] === undefined) map[key] = i;
      });
      if (map.date !== undefined && map.amount !== undefined) {
        colMap = map;
        continue;
      }
      const inferred = inferColumns(cols);
      if (inferred.date !== undefined && inferred.amount !== undefined) {
        colMap = inferred;
      } else {
        continue;
      }
    }

    const tanggal = cols[colMap.date];
    const keterangan = colMap.description !== undefined ? cols[colMap.description] : '';
    const mutasi = cols[colMap.amount];
    const jenis = colMap.type !== undefined ? cols[colMap.type] : '';
    const saldo = colMap.balance !== undefined ? cols[colMap.balance] : '';

    if (!tanggal || !mutasi) continue;

    const isNonOperational = /^(BIAYA ADM|BUNGA|PAJAK BUNGA|BYR VIA E-BANKING|GS\s+1|GS\s+2|PENERIMAAN NEGARA)/i.test(keterangan)
      || /BIF BIAYA TXN|FTFVA|ASURANSI/i.test(keterangan);

    const amount = parseAmount(mutasi);
    const date = parseDate(tanggal);
    if (!date) continue;
    const balance = parseBalance(saldo);
    const type = jenis ? (jenis.toUpperCase() === 'CR' ? 'credit' : 'debit') : (amount >= 0 ? 'credit' : 'debit');
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