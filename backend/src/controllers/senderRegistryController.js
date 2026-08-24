const { Op } = require('sequelize');
const { SenderRegistry, Tenant, Room, RentalContract } = require('../models');

function normalize(s) {
  return String(s || '').toUpperCase().trim();
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseMappingCsv(text) {
  const lines = String(text || '').split(/\r?\n/);
  const rows = [];
  let headerSkipped = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || /^;+$/.test(trimmed)) continue;
    const cols = trimmed.split(';').map(c => c.trim());
    if (!headerSkipped && cols[0].toLowerCase() === 'nama1') { headerSkipped = true; continue; }
    if (!cols[0]) continue;
    rows.push({ nama1: cols[0], nama2: cols[1] || '', room: cols[2] || '' });
  }
  return rows;
}

function nicknameFromNama2(nama2) {
  if (!nama2) return null;
  const stripped = nama2.replace(/\s*\d+\s*$/, '').trim();
  return stripped || null;
}

async function resolveByRoom(roomNum) {
  if (!roomNum || roomNum === '-' || roomNum === '') return null;
  const rm = await Room.findOne({ where: { room_number: String(roomNum) } });
  if (!rm) return null;
  const c = await RentalContract.findOne({
    where: { room_id: rm.id, status: 'sewa' },
    include: [Tenant],
  });
  if (!c) return null;
  return { tenant_id: c.tenant_id, tenant_nama: c.Tenant && (c.Tenant.nama_panggilan || c.Tenant.name), via: 'room' };
}

async function resolveByNickname(nick) {
  if (!nick) return null;
  const t = await Tenant.findOne({ where: { nama_panggilan: { [Op.like]: nick + '%' } } });
  if (!t) return null;
  return { tenant_id: t.id, tenant_nama: t.nama_panggilan || t.name, via: 'nickname' };
}

function findMappingRow(mapping, senderName) {
  const sn = normalize(senderName);
  let row = mapping.find(m => normalize(m.nama1) === sn);
  if (!row) {
    row = mapping.find(m => normalize(m.nama1).length >= 8 && (sn.startsWith(normalize(m.nama1)) || normalize(m.nama1).startsWith(sn)));
  }
  if (!row) {
    row = mapping.find(m => normalize(m.nama1).length >= 10 && sn.includes(normalize(m.nama1)));
  }
  return row;
}

function suggestTenant(senderName, tenants) {
  const sn = normalize(senderName);
  if (!sn) return null;
  let best = null;
  let bestScore = 0;
  for (const t of tenants) {
    const pp = normalize(t.nama_panggilan);
    const nm = normalize(t.name);
    let score = 0;
    let matchedOn = '';
    if (pp.length >= 4) {
      const re = new RegExp('\\b' + escapeRe(pp) + '\\b');
      if (re.test(sn)) {
        score = pp.length + 100;
        matchedOn = 'nama_panggilan';
      }
    }
    if (score === 0 && nm.length >= 5 && nm !== pp) {
      const re = new RegExp('\\b' + escapeRe(nm) + '\\b');
      if (re.test(sn)) {
        score = nm.length;
        matchedOn = 'name';
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = { tenant_id: t.id, tenant_nama: t.nama_panggilan || t.name, confidence: matchedOn === 'nama_panggilan' ? 'high' : 'medium', matchedOn };
    }
  }
  return best;
}

exports.getAll = async (req, res) => {
  try {
    const records = await SenderRegistry.findAll({
      include: [Tenant],
      order: [['sender_name', 'ASC']],
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.suggest = async (req, res) => {
  try {
    const [senders, tenants] = await Promise.all([
      SenderRegistry.findAll({ where: { tenant_id: null }, order: [['sender_name', 'ASC']] }),
      Tenant.findAll(),
    ]);
    const suggestions = [];
    for (const s of senders) {
      const m = suggestTenant(s.sender_name, tenants);
      if (m) suggestions.push({ sender_registry_id: s.id, sender_name: s.sender_name, ...m });
    }
    res.json({ total_unlinked: senders.length, matched: suggestions.length, suggestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.autoLink = async (req, res) => {
  try {
    const [senders, tenants] = await Promise.all([
      SenderRegistry.findAll({ where: { tenant_id: null }, order: [['sender_name', 'ASC']] }),
      Tenant.findAll(),
    ]);
    let linked = 0;
    const details = [];
    const skipped = [];
    for (const s of senders) {
      const m = suggestTenant(s.sender_name, tenants);
      if (m && m.confidence === 'high') {
        await s.update({ tenant_id: m.tenant_id });
        linked++;
        details.push({ sender_name: s.sender_name, tenant_id: m.tenant_id, tenant_nama: m.tenant_nama });
      } else if (m) {
        skipped.push({ sender_name: s.sender_name, suggested_tenant_id: m.tenant_id, tenant_nama: m.tenant_nama, confidence: m.confidence });
      }
    }
    res.json({ linked, skipped_count: skipped.length, total_unlinked: senders.length, details, skipped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.importMapping = async (req, res) => {
  try {
    const csv = req.body?.csv ?? req.body?.csvText;
    if (!csv) return res.status(400).json({ error: 'csv is required' });

    const mapping = parseMappingCsv(csv);
    if (mapping.length === 0) return res.status(400).json({ error: 'No mapping rows found (expected: nama1;nama2;no kamar)' });

    const senders = await SenderRegistry.findAll();
    let linked = 0, alreadyLinked = 0, noMappingRow = 0, noResolve = 0;
    const details = [];
    const unresolved = [];

    for (const sr of senders) {
      if (sr.tenant_id) { alreadyLinked++; continue; }
      const row = findMappingRow(mapping, sr.sender_name);
      if (!row) { noMappingRow++; unresolved.push({ sender_name: sr.sender_name, reason: 'no mapping row' }); continue; }

      let resolved = null;
      if (row.room && row.room !== '-') {
        resolved = await resolveByRoom(row.room);
      }
      if (!resolved) {
        const nick = nicknameFromNama2(row.nama2);
        resolved = await resolveByNickname(nick);
      }
      if (!resolved) {
        noResolve++;
        unresolved.push({ sender_name: sr.sender_name, mapping_nama2: row.nama2, room: row.room, reason: 'cannot resolve tenant' });
        continue;
      }

      await sr.update({ tenant_id: resolved.tenant_id });
      linked++;
      details.push({ sender_name: sr.sender_name, tenant_id: resolved.tenant_id, tenant_nama: resolved.tenant_nama, via: resolved.via, room: row.room });
    }

    res.json({
      linked,
      already_linked: alreadyLinked,
      no_mapping_row: noMappingRow,
      no_resolve: noResolve,
      total: senders.length,
      details,
      unresolved,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const record = await SenderRegistry.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: 'Not found' });
    await record.update(req.body);
    const updated = await SenderRegistry.findByPk(req.params.id, { include: [Tenant] });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.bulkMap = async (req, res) => {
  try {
    const { mappings } = req.body;
    const updated = [];
    for (const m of mappings) {
      const record = await SenderRegistry.findOne({ where: { sender_name: m.sender_name } });
      if (record) {
        await record.update({ tenant_id: m.tenant_id, label: m.label });
        updated.push(record);
      }
    }
    res.json({ updated: updated.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};