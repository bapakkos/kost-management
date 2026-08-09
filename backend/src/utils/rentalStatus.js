function getRentalStatus(contract) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (contract.end_date && new Date(contract.end_date) < today) {
    return 'keluar';
  }

  if (new Date(contract.start_date) > today) {
    return 'booking';
  }

  return 'sewa';
}

module.exports = { getRentalStatus };