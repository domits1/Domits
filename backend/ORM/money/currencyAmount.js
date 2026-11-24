const MAX_DECIMAL_DIGITS = 100;
const MAX_EXPONENT = 100;
const MIN_MINOR_UNITS = -(2n ** 63n);
const MAX_MINOR_UNITS = 2n ** 63n - 1n;

const toMinorUnitString = (amount) => {
  if (amount < MIN_MINOR_UNITS || amount > MAX_MINOR_UNITS) {
    throw new RangeError("The amount exceeds the supported BIGINT minor-unit range.");
  }
  return amount.toString();
};

export const getCurrencyFractionDigits = (currency) => {
  const code = typeof currency === "string" ? currency.trim().toUpperCase() : "";
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new TypeError("A valid ISO 4217 currency code is required.");
  }

  if (typeof Intl.supportedValuesOf === "function") {
    const supportedCurrencies = new Set(Intl.supportedValuesOf("currency"));
    if (!supportedCurrencies.has(code)) {
      throw new TypeError(`Unsupported currency code: ${code}.`);
    }
  }

  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code }).resolvedOptions()
      .maximumFractionDigits;
  } catch {
    throw new TypeError(`Unsupported currency code: ${code}.`);
  }
};

export const parseDecimalToMinorUnits = (amount, currency) => {
  const fractionDigits = getCurrencyFractionDigits(currency);
  const decimalText =
    typeof amount === "number"
      ? Number.isFinite(amount)
        ? String(amount)
        : ""
      : typeof amount === "string"
        ? amount.trim()
        : "";
  const match = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(decimalText);

  if (!match) {
    throw new TypeError("The amount must be a finite decimal string or number.");
  }

  const [, sign, integerPart = "0", fractionPart = "", leadingFraction = "", exponentPart = "0"] = match;
  const fraction = leadingFraction || fractionPart;
  const coefficientText = `${integerPart}${fraction}`;

  if (coefficientText.length > MAX_DECIMAL_DIGITS) {
    throw new TypeError("The amount exceeds the supported decimal range.");
  }

  const exponent = Number(exponentPart);
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > MAX_EXPONENT) {
    throw new TypeError("The amount exceeds the supported decimal range.");
  }

  const coefficient = BigInt(coefficientText || "0");
  const signedCoefficient = sign === "-" ? -coefficient : coefficient;
  const scaleDifference = fractionDigits - (fraction.length - exponent);

  if (Math.abs(scaleDifference) > MAX_EXPONENT) {
    throw new TypeError("The amount exceeds the supported decimal range.");
  }

  if (scaleDifference >= 0) {
    return toMinorUnitString(signedCoefficient * 10n ** BigInt(scaleDifference));
  }

  const divisor = 10n ** BigInt(-scaleDifference);
  const negative = signedCoefficient < 0n;
  const absolute = negative ? -signedCoefficient : signedCoefficient;
  const quotient = absolute / divisor;
  const remainder = absolute % divisor;
  const rounded = quotient + (remainder * 2n >= divisor ? 1n : 0n);
  return toMinorUnitString(negative ? -rounded : rounded);
};

export const formatMinorUnits = (amountMinorUnits, currency) => {
  const fractionDigits = getCurrencyFractionDigits(currency);
  if (!/^-?\d+$/.test(String(amountMinorUnits))) {
    throw new TypeError("The amount must be an integer number of minor currency units.");
  }
  const amount = BigInt(amountMinorUnits);
  if (amount < MIN_MINOR_UNITS || amount > MAX_MINOR_UNITS) {
    throw new RangeError("The amount exceeds the supported BIGINT minor-unit range.");
  }
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const divisor = 10n ** BigInt(fractionDigits);
  const whole = absolute / divisor;
  const fraction = absolute % divisor;
  const sign = negative ? "-" : "";
  if (fractionDigits === 0) return `${sign}${whole}`;
  return `${sign}${whole}.${fraction.toString().padStart(fractionDigits, "0")}`;
};
