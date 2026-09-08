const CATEGORY_LABELS = {
  listrik: 'Listrik',
  air: 'Air',
  parkir: 'Parkir',
  tv: 'TV',
  internet: 'Internet',
  denda: 'Denda',
  sewa_harian: 'Sewa harian',
  deposit: 'Deposit',
  deposit_hangus: 'Deposit hangus',
  booking: 'Booking',
  lainnya: 'Lainnya',
};

function tenantDisplayName(tenant) {
  if (!tenant) return null;
  return tenant.nama_panggilan || tenant.name || null;
}

function formatPeriod(month, year) {
  return `${String(month).padStart(2, '0')}/${year}`;
}

function buildNotaKeterangan({ billings = [], incomes = [], tenant = null, roomNumber = null }) {
  const parts = [];

  const sortedBillings = [...billings].sort((a, b) => {
    if (a.period_year !== b.period_year) return a.period_year - b.period_year;
    return a.period_month - b.period_month;
  });
  if (sortedBillings.length > 0) {
    const room = roomNumber || sortedBillings[0].RentalContract?.Room?.room_number || null;
    const roomLabel = room ? ` kamar ${room}` : '';
    const periods = sortedBillings.map(b => formatPeriod(b.period_month, b.period_year));
    if (periods.length === 1) {
      parts.push(`Sewa${roomLabel} periode ${periods[0]}`);
    } else {
      parts.push(`Sewa${roomLabel} periode ${periods[0]}-${periods[periods.length - 1]} (${periods.length} bulan)`);
    }
  }

  if (incomes.length > 0) {
    parts.push(incomes.map(i => CATEGORY_LABELS[i.category] || i.category).join(' + '));
  }

  const body = parts.join(' + ') || (roomNumber ? `Pembayaran kamar ${roomNumber}` : 'Pembayaran');
  const name = tenantDisplayName(tenant);
  return name ? `${body} - ${name}` : body;
}

function buildDepositReturnKeterangan(tenant = null, roomNumber = null) {
  const roomLabel = roomNumber ? ` kamar ${roomNumber}` : '';
  const body = `Pengembalian deposit${roomLabel}`;
  const name = tenantDisplayName(tenant);
  return name ? `${body} - ${name}` : body;
}

function buildBookingRefundKeterangan(tenant = null) {
  const body = 'Refund booking';
  const name = tenantDisplayName(tenant);
  return name ? `${body} - ${name}` : body;
}

module.exports = { buildNotaKeterangan, buildDepositReturnKeterangan, buildBookingRefundKeterangan };
