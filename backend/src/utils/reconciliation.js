const { Op } = require('sequelize');

/**
 * Match a bank mutation to a payment receipt based on amount and date proximity.
 * Returns the best matching payment receipt or null.
 */
function reconcileMutation(mutation, payments, bankAccounts) {
  if (!payments || payments.length === 0) return null;

  const mutationAmount = parseFloat(mutation.amount);
  const mutationDate = new Date(mutation.date);

  // Find payments with matching amount (±1000 tolerance)
  const matches = payments.filter(p => {
    const paymentAmount = parseFloat(p.total_amount);
    return Math.abs(paymentAmount - mutationAmount) <= 1000;
  });

  if (matches.length === 0) return null;

  // Score matches by date proximity
  let bestMatch = null;
  let bestScore = Infinity;

  for (const p of matches) {
    const paymentDate = new Date(p.payment_date);
    const daysDiff = Math.abs((mutationDate - paymentDate) / (1000 * 60 * 60 * 24));
    if (daysDiff < bestScore) {
      bestScore = daysDiff;
      bestMatch = p;
    }
  }

  // Only match if within 7 days
  return bestScore <= 7 ? bestMatch : null;
}

/**
 * Auto-reconcile all unreconciled mutations against available payments.
 * Returns array of { mutation_id, payment_receipt_id } pairs.
 */
function autoReconcile(mutations, payments) {
  const results = [];

  for (const mutation of mutations) {
    const match = reconcileMutation(mutation, payments, []);
    if (match) {
      results.push({
        mutation_id: mutation.id,
        payment_receipt_id: match.id,
        amount: mutation.amount,
        payment_amount: match.total_amount,
      });
    }
  }

  return results;
}

module.exports = { reconcileMutation, autoReconcile };