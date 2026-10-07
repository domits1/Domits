const LOCALE_BY_LANGUAGE = {
  en: "en-US",
  nl: "nl-NL",
  de: "de-DE",
  es: "es-ES",
};

export const getLanguageLocale = (language) =>
  LOCALE_BY_LANGUAGE[language] || LOCALE_BY_LANGUAGE.en;

export const formatCurrency = (amount, currency = "EUR", language = "en") =>
  new Intl.NumberFormat(getLanguageLocale(language), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

export const formatPercentage = (rate, language = "en") => {
  if (rate == null) {
    return "—";
  }

  const numericRate = Number(rate);
  if (!Number.isFinite(numericRate)) {
    return "—";
  }

  return new Intl.NumberFormat(getLanguageLocale(language), {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(numericRate);
};
