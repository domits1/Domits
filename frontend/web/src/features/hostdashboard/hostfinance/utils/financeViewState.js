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
