function calculateDiscount(monthsPaid) {
  if (monthsPaid === 12) {
    return 1000000;
  }
  if (monthsPaid === 6) {
    return 500000;
  }
  return 0;
}

function calculateTotalWithDiscount(baseTotal, monthsPaid) {
  const discount = calculateDiscount(monthsPaid);
  return baseTotal - discount;
}

module.exports = { calculateDiscount, calculateTotalWithDiscount };