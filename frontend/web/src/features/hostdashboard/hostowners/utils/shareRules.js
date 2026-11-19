import { TOTAL_BASIS_POINTS, basisPointsToPercent, percentToBasisPoints } from "./basisPoints";
import { ARCHIVED_OWNER_STATUS } from "./ownerFormRules";
import { dateInputToUtcMidnight, isEffectiveFromInRange, todayUtc } from "./utcDate";

export const SHARE_ERROR_KEYS = Object.freeze([
  "propertyRequired",
  "dateRequired",
  "dateInvalid",
  "dateBeforeToday",
  "dateTooLate",
  "sharesRequired",
  "totalMismatch",
  "ownerRequired",
  "ownerDuplicate",
  "percentRequired",
  "percentInvalid",
  "percentZero",
]);

const isBlank = (value) => typeof value !== "string" || value.trim() === "";

const ownerList = (owners) => (Array.isArray(owners) ? owners : []);

const propertyList = (owner) => (Array.isArray(owner?.properties) ? owner.properties : []);

const percentText = (basisPoints) => {
  const percent = basisPointsToPercent(basisPoints);
  return percent === null ? "" : String(percent);
};

const ownerKey = (ownerId) => (typeof ownerId === "string" ? ownerId.trim().toLowerCase() : "");

export const currentSplitForProperty = (owners, propertyId) =>
  ownerList(owners).flatMap((owner) =>
    propertyList(owner)
      .filter((property) => property?.property_id === propertyId)
      .map((property) => ({
        ownerId: owner.id,
        percent: percentText(property.ownership_basis_points),
        effectiveTo: property.effective_to ?? null,
      }))
  );

export const selectableOwners = (owners) =>
  ownerList(owners).filter((owner) => owner?.status !== ARCHIVED_OWNER_STATUS);

export const plannedChangeFrom = (owners, propertyId) => {
  const plannedDates = currentSplitForProperty(owners, propertyId)
    .map((row) => row.effectiveTo)
    .filter((effectiveTo) => effectiveTo !== null);
  return plannedDates.length === 0 ? null : Math.min(...plannedDates);
};

export const hasPlannedChange = (owners, propertyId) => plannedChangeFrom(owners, propertyId) !== null;

const DECIMAL_COMMA = ",";

const withDecimalPoint = (percent) =>
  percent.split(DECIMAL_COMMA).length === 2 ? percent.replace(DECIMAL_COMMA, ".") : percent;

const percentInputToBasisPoints = (percent) =>
  isBlank(percent) ? null : percentToBasisPoints(withDecimalPoint(percent));

const rowBasisPoints = (row) => percentInputToBasisPoints(row?.percent);

export const shareTotalBasisPoints = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map(rowBasisPoints)
    .filter((basisPoints) => basisPoints !== null)
    .reduce((sum, basisPoints) => sum + basisPoints, 0);

const percentError = (row) => {
  if (isBlank(row?.percent)) {
    return "percentRequired";
  }
  const basisPoints = rowBasisPoints(row);
  if (basisPoints === null) {
    return "percentInvalid";
  }
  return basisPoints === 0 ? "percentZero" : null;
};

const ownerError = (row, seenOwners) => {
  const key = ownerKey(row?.ownerId);
  if (key === "") {
    return "ownerRequired";
  }
  if (seenOwners.has(key)) {
    return "ownerDuplicate";
  }
  seenOwners.add(key);
  return null;
};

const rowErrors = (rows) => {
  const seenOwners = new Set();
  const errors = {};
  rows.forEach((row, index) => {
    const entry = Object.fromEntries(
      [
        ["owner", ownerError(row, seenOwners)],
        ["percent", percentError(row)],
      ].filter(([, error]) => error !== null)
    );
    if (Object.keys(entry).length > 0) {
      errors[index] = entry;
    }
  });
  return errors;
};

const dateError = (dateInput, now) => {
  if (isBlank(dateInput)) {
    return "dateRequired";
  }
  const effectiveFrom = dateInputToUtcMidnight(dateInput);
  if (effectiveFrom === null) {
    return "dateInvalid";
  }
  if (isEffectiveFromInRange(effectiveFrom, now)) {
    return null;
  }
  return effectiveFrom < todayUtc(now) ? "dateBeforeToday" : "dateTooLate";
};

const sharesError = (rows) => {
  if (rows.length === 0) {
    return "sharesRequired";
  }
  const allPercentsValid = rows.every((row) => percentError(row) === null);
  return allPercentsValid && shareTotalBasisPoints(rows) !== TOTAL_BASIS_POINTS ? "totalMismatch" : null;
};

export const validateShares = ({ propertyId, dateInput, rows }, now = Date.now()) => {
  const shareRows = Array.isArray(rows) ? rows : [];
  const errors = {
    property: isBlank(propertyId) ? "propertyRequired" : null,
    date: dateError(dateInput, now),
    shares: sharesError(shareRows),
  };
  const perRow = rowErrors(shareRows);
  const result = Object.fromEntries(Object.entries(errors).filter(([, error]) => error !== null));
  return Object.keys(perRow).length > 0 ? { ...result, rows: perRow } : result;
};

export const buildSetSharesPayload = ({ propertyId, dateInput, rows }) => ({
  property_id: propertyId.trim(),
  effective_from: dateInputToUtcMidnight(dateInput),
  shares: rows.map((row) => ({
    owner_id: row.ownerId.trim(),
    ownership_basis_points: percentInputToBasisPoints(row.percent),
  })),
});

export const propertyChoices = (propertyOptions, unknownLabel) =>
  (Array.isArray(propertyOptions) ? propertyOptions : [])
    .filter((option) => !isBlank(option?.value))
    .map((option) => ({
      value: option.value.trim(),
      label: isBlank(option.title) ? unknownLabel : option.title.trim(),
    }));
