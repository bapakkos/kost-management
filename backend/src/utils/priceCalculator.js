function calculateBillingTotal(billing) {
  const addons = (billing.addon_parkir || 0) + (billing.addon_tv || 0) + (billing.addon_internet || 0);
  return (billing.base_rent || 0) + addons - (billing.discount || 0);
}

module.exports = { calculateBillingTotal };