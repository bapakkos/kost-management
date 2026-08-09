function calculateProrate(monthlyPrice, startDate, endDate) {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const daysOccupied = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  return (monthlyPrice / daysInMonth) * daysOccupied;
}

module.exports = { calculateProrate };