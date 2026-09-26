export function deriveFinanceViewState({
  accountId,
  onboardingComplete,
  chargesEnabled = true,
  payoutsEnabled = true,
  listingState = {},
  demoMode = false,
  charges = [],
  payouts = [],
  balanceTotal = 0,
}) {
  const isConnected = Boolean(accountId && onboardingComplete);
  const stripeIssues =
    isConnected && (!chargesEnabled || !payoutsEnabled);
  const hasProperty = Boolean(listingState.hasProperty);
  const listingError = Boolean(listingState.error);
  const isLive =
    isConnected &&
    !stripeIssues &&
    Boolean(listingState.isLive);
  const hasActivity =
    charges.length > 0 ||
    payouts.length > 0 ||
    Number(balanceTotal) > 0;
  const showFinancialData =
    isConnected || (demoMode && hasActivity);

  return {
    isConnected,
    stripeIssues,
    hasProperty,
    listingError,
    isLive,
    hasActivity,
    showFinancialData,
  };
}

export function getTransactionType(charge = {}) {
  return charge.transactionType || "payments";
}

export function getArrivingSoonAmount(payouts = []) {
  return (Array.isArray(payouts) ? payouts : [])
    .filter(
      (payout) =>
        payout?.isProjected === true &&
        !(payout?.id === null && payout?.status !== "incoming charge - pending")
    )
    .reduce((total, payout) => total + Number(payout?.amount || 0), 0);
}

export function getLastPayout(payouts = []) {
  return (Array.isArray(payouts) ? payouts : []).find((payout) => payout?.isProjected === false) || null;
}
