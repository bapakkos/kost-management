function calculateDiscount(monthsPaid) {
  if (monthsPaid >= 12) {
    return 100000 * monthsPaid;
  }
  return 0;
}

function calculateTotalWithDiscount(baseTotal, monthsPaid) {
  const discount = calculateDiscount(monthsPaid);
  return baseTotal - discount;
}

module.exports = { calculateDiscount, calculateTotalWithDiscount };