const BASIS_POINTS_DENOMINATOR = 10000n;
const MAX_DECIMAL_DIGITS = 100;
const MAX_POWER = 100;
const ROUNDING_MODES = new Set(["half-up", "half-even", "down", "up", "floor", "ceiling"]);

const assertRoundingMode = (roundingMode) => {
  if (!ROUNDING_MODES.has(roundingMode)) {
    throw new TypeError("A supported rounding mode must be provided.");
  }
};

const powerOfTen = (power) => {
  if (!Number.isSafeInteger(power) || power < 0 || power > MAX_POWER) {
    throw new TypeError("The decimal precision is outside the supported range.");
  }
  return 10n ** BigInt(power);
};

const divideRounded = (numerator, denominator, roundingMode) => {
  assertRoundingMode(roundingMode);
  if (typeof numerator !== "bigint" || typeof denominator !== "bigint" || denominator <= 0n) {
    throw new TypeError("Rounded division requires integer values and a positive denominator.");
  }

  const negative = numerator < 0n;
  const absoluteNumerator = negative ? -numerator : numerator;
  const quotient = absoluteNumerator / denominator;
  const remainder = absoluteNumerator % denominator;
  let increment = false;

  if (remainder !== 0n) {
    switch (roundingMode) {
      case "half-up":
        increment = remainder * 2n >= denominator;
        break;
      case "half-even":
        increment =
          remainder * 2n > denominator ||
          (remainder * 2n === denominator && quotient % 2n === 1n);
        break;
      case "up":
        increment = true;
        break;
      case "floor":
        increment = negative;
        break;
      case "ceiling":
        increment = !negative;
        break;
      case "down":
        break;
      default:
        assertRoundingMode(roundingMode);
    }
  }

  const rounded = quotient + (increment ? 1n : 0n);
  return negative ? -rounded : rounded;
};

const parseIntegerMinorUnits = (value) => {
  if (typeof value === "bigint") {
    return value;
  }
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^-?(0|[1-9]\d*)$/.test(value)) {
    return BigInt(value);
  }
  throw new TypeError("The amount must be an integer number of minor currency units.");
};

export const parseDecimalToMinorUnits = (amount, { fractionDigits, roundingMode } = {}) => {
  if (!Number.isSafeInteger(fractionDigits) || fractionDigits < 0 || fractionDigits > 6) {
    throw new TypeError("fractionDigits must be an integer between 0 and 6.");
  }
  assertRoundingMode(roundingMode);

  const decimalText =
    typeof amount === "number"
      ? Number.isFinite(amount)
        ? String(amount)
        : ""
      : typeof amount === "string"
        ? amount.trim()
        : "";
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(decimalText);

  if (!match) {
    throw new TypeError("The amount must be a finite decimal string or number.");
  }

  const [, sign, integerPart, fractionPart = "", exponentPart = "0"] = match;
  const exponent = Number(exponentPart);
  const coefficientText = `${integerPart}${fractionPart}`;

  if (
    !Number.isSafeInteger(exponent) ||
    Math.abs(exponent) > MAX_POWER ||
    coefficientText.length > MAX_DECIMAL_DIGITS
  ) {
    throw new TypeError("The amount exceeds the supported decimal range.");
  }

  const coefficient = BigInt(coefficientText);
  const signedCoefficient = sign === "-" ? -coefficient : coefficient;
  const sourceScale = fractionPart.length - exponent;
  const scaleDifference = fractionDigits - sourceScale;

  if (Math.abs(scaleDifference) > MAX_POWER) {
    throw new TypeError("The amount exceeds the supported decimal range.");
  }
  if (scaleDifference >= 0) {
    return signedCoefficient * powerOfTen(scaleDifference);
  }
  return divideRounded(signedCoefficient, powerOfTen(-scaleDifference), roundingMode);
};

export const calculateBasisPointAmount = (amountMinorUnits, basisPoints, roundingMode) => {
  const amount = parseIntegerMinorUnits(amountMinorUnits);
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > 10000) {
    throw new TypeError("basisPoints must be an integer between 0 and 10000.");
  }

  return divideRounded(amount * BigInt(basisPoints), BASIS_POINTS_DENOMINATOR, roundingMode);
};

export const allocateByBasisPoints = (
  amountMinorUnits,
  shares,
  { allocationPolicy } = {}
) => {
  const amount = parseIntegerMinorUnits(amountMinorUnits);
  if (allocationPolicy !== "largest-remainder") {
    throw new TypeError("The largest-remainder allocation policy must be provided.");
  }
  if (!Array.isArray(shares) || shares.length === 0) {
    throw new TypeError("At least one ownership share is required.");
  }

  const ownerIds = new Set();
  let totalBasisPoints = 0;
  for (const share of shares) {
    if (
      !share ||
      typeof share.ownerId !== "string" ||
      share.ownerId.trim() === "" ||
      share.ownerId !== share.ownerId.trim()
    ) {
      throw new TypeError("Every ownership share must have a non-empty ownerId.");
    }
    if (ownerIds.has(share.ownerId)) {
      throw new TypeError("Ownership shares must contain each owner only once.");
    }
    if (
      !Number.isSafeInteger(share.ownershipBasisPoints) ||
      share.ownershipBasisPoints < 1 ||
      share.ownershipBasisPoints > 10000
    ) {
      throw new TypeError("Each ownership share must be between 1 and 10000 basis points.");
    }
    ownerIds.add(share.ownerId);
    totalBasisPoints += share.ownershipBasisPoints;
  }

  if (totalBasisPoints !== 10000) {
    throw new TypeError("Ownership shares must add up to exactly 10000 basis points.");
  }

  const negative = amount < 0n;
  const absoluteAmount = negative ? -amount : amount;
  const allocations = shares.map(({ ownerId, ownershipBasisPoints }) => {
    const numerator = absoluteAmount * BigInt(ownershipBasisPoints);
    return {
      ownerId,
      ownershipBasisPoints,
      amountMinorUnits: numerator / BASIS_POINTS_DENOMINATOR,
      remainder: numerator % BASIS_POINTS_DENOMINATOR,
    };
  });
  const allocatedAmount = allocations.reduce((total, allocation) => total + allocation.amountMinorUnits, 0n);
  const remainingUnits = absoluteAmount - allocatedAmount;
  const rankedAllocations = [...allocations].sort((left, right) => {
    if (left.remainder !== right.remainder) {
      return left.remainder > right.remainder ? -1 : 1;
    }
    if (left.ownerId === right.ownerId) {
      return 0;
    }
    return left.ownerId < right.ownerId ? -1 : 1;
  });

  for (let index = 0n; index < remainingUnits; index += 1n) {
    rankedAllocations[Number(index)].amountMinorUnits += 1n;
  }

  const sign = negative ? -1n : 1n;
  return allocations.map(({ ownerId, ownershipBasisPoints, amountMinorUnits }) => ({
    ownerId,
    ownershipBasisPoints,
    amountMinorUnits: (amountMinorUnits * sign).toString(),
  }));
};
