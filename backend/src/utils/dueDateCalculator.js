function calculateDueDate(startDate) {
  const start = new Date(startDate);
  const dayOfMonth = start.getDate();

  if (dayOfMonth !== 1) {
    return new Date(start.getFullYear(), start.getMonth() + 1, dayOfMonth);
  }

  return new Date(start.getFullYear(), start.getMonth() + 1, 0);
}

module.exports = { calculateDueDate };