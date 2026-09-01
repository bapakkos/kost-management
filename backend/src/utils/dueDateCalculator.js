// Kebijakan due date:
// - Periode bulan check-in: due = tanggal check-in
// - Billing prorate (bulan penyelarasan): due = tanggal check-in
// - Semua bulan reguler: due = tanggal 5 (pembayaran tiap tgl 1, toleransi 5 hari)
function resolveDueDate(startDate, periodMonth, periodYear, isProrate) {
  const start = new Date(startDate);
  const checkInDay = start.getDate();
  const checkInMonth = start.getMonth() + 1;
  const checkInYear = start.getFullYear();

  const isCheckInMonth = periodMonth === checkInMonth && periodYear === checkInYear;

  if (isCheckInMonth || isProrate) {
    const daysInPeriod = new Date(periodYear, periodMonth, 0).getDate();
    return new Date(periodYear, periodMonth - 1, Math.min(checkInDay, daysInPeriod));
  }

  return new Date(periodYear, periodMonth - 1, 5);
}

// Format Date lokal ke YYYY-MM-DD tanpa pergeseran timezone
// (toISOString().slice(0,10) bergeser -1 hari pada timezone UTC+7).
function formatYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Legacy: dipertahankan untuk kompatibilitas, tidak dipakai lagi
function calculateDueDate(startDate) {
  const start = new Date(startDate);
  const dayOfMonth = start.getDate();

  if (dayOfMonth !== 1) {
    return new Date(start.getFullYear(), start.getMonth() + 1, dayOfMonth);
  }

  return new Date(start.getFullYear(), start.getMonth() + 1, 0);
}

module.exports = { resolveDueDate, formatYYYYMMDD, calculateDueDate };
