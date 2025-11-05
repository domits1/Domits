export default function formatMoney (amount, currency, locale = navigator.language || "en-US") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "symbol",
    }).format(amount);
  } catch {
    return `${amount?.toFixed?.(2)} ${currency}`;
  }
};