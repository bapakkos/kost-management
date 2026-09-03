function calculateProrate(monthlyPrice, startDate, endDate) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const daysOccupied = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  return (monthlyPrice / daysInMonth) * daysOccupied;
}

// Prorate bulan penyelarasan: penghuni check-in tgl D (bukan tgl 1),
// bulan pertama yang ditagih bulanan hanya bayar (D+1) s/d akhir bulan.
// Contoh: check-in 3, bulan 31 hari -> 28 hari.
function calculateSecondMonthProrate(baseRent, checkInDay, periodMonth, periodYear) {
  const daysInMonth = new Date(periodYear, periodMonth, 0).getDate();
  const prorateDays = daysInMonth - checkInDay;
  if (prorateDays <= 0) return 0;
  return (baseRent / daysInMonth) * prorateDays;
}

// Menentukan apakah billing periode ini adalah bulan penyelarasan prorate.
// forceIsProrate: recalc billing yang sudah is_prorate (pending mungkin sudah mati).
function resolveSecondMonthProrate(contract, baseRent, periodMonth, periodYear, forceIsProrate = false) {
  const start = new Date(contract.start_date);
  const checkInDay = start.getDate();
  const checkInIndex = start.getFullYear() * 12 + start.getMonth();
  const periodIndex = periodYear * 12 + (periodMonth - 1);

  // Prorate biasanya di bulan ke-2, tapi ditunda jika penghuni bayar
  // beberapa bulan di awal (via generate-bulk). prepaid_months menyimpan
  // jumlah bulan yang dibayar di awal; prorate baru diterapkan di bulan
  // pertama setelah blok prepaid (bulan ke-N+1).
  const prepaidMonths = contract.prepaid_months || 1;
  const prorateTargetIndex = checkInIndex + prepaidMonths;

  const shouldProrate = forceIsProrate
    || (contract.prorate_pending && checkInDay !== 1 && periodIndex === prorateTargetIndex);

  if (!shouldProrate) return { rent: baseRent, isProrate: false, notes: null };

  const rent = calculateSecondMonthProrate(baseRent, checkInDay, periodMonth, periodYear);
  if (!(rent > 0)) return { rent: baseRent, isProrate: false, notes: null };

  const daysInMonth = new Date(periodYear, periodMonth, 0).getDate();
  const prorateDays = daysInMonth - checkInDay;
  const notes = `Prorate ${checkInDay + 1}-${daysInMonth}/${periodMonth}/${periodYear} (${prorateDays} hari)`;

  return { rent, isProrate: true, notes };
}

module.exports = { calculateProrate, calculateSecondMonthProrate, resolveSecondMonthProrate };
