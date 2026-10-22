import Database from "database";
import { Property } from "database/models/Property";
import { Property_Owner } from "database/models/Property_Owner";
import { Property_Owner_Property } from "database/models/Property_Owner_Property";
import { In, IsNull, LessThan, LessThanOrEqual, MoreThan, MoreThanOrEqual } from "typeorm";
import { isDsqlConflict, withDsqlRetry } from "../.shared/dsqlRetry.js";
import { ConflictException } from "../util/exception/conflictException.js";

const DAY_MS = 86400000;
const OWNER_ORDER = Object.freeze({ last_name: "ASC", first_name: "ASC" });
const ASSIGNMENT_ORDER = Object.freeze({ effective_from: "ASC", created_at: "ASC" });
const PESSIMISTIC_WRITE = Object.freeze({ mode: "pessimistic_write" });
const UNIQUE_VIOLATION_CODE = "23505";
const SHARES_CONFLICT_MESSAGE = "The ownership of this property changed at the same time. Reload and try again.";

const isNonEmptyString = (value) => typeof value === "string" && value !== "";

const requireHostId = (hostId) => {
  if (!isNonEmptyString(hostId)) {
    throw new Error("A host id is required to scope owner queries.");
  }
};

const requireOwnerId = (ownerId) => {
  if (!isNonEmptyString(ownerId)) {
    throw new Error("An owner id is required to read an owner.");
  }
};

const requireToday = (today) => {
  if (!Number.isSafeInteger(today) || today < 0 || today % DAY_MS !== 0) {
    throw new Error("today must be a UTC midnight in epoch milliseconds.");
  }
};

const isUtcMidnight = (value) => Number.isSafeInteger(value) && value >= 0 && value % DAY_MS === 0;

const requirePropertyId = (propertyId) => {
  if (!isNonEmptyString(propertyId)) {
    throw new Error("A property id is required to change ownership shares.");
  }
};

const requireEffectiveFrom = (effectiveFrom) => {
  if (!isUtcMidnight(effectiveFrom)) {
    throw new Error("effectiveFrom must be a UTC midnight in epoch milliseconds.");
  }
};

const requireShareRows = (rows, ownerIds, hostId, propertyId) => {
  if (!Array.isArray(ownerIds)) {
    throw new Error("owner ids must be an array.");
  }
  if (!Array.isArray(rows) || rows.some((row) => row?.host_id !== hostId || row?.property_id !== propertyId)) {
    throw new Error("Share rows must all belong to the caller's host and the requested property.");
  }
};

const isUniqueViolation = (error) =>
  error?.code === UNIQUE_VIOLATION_CODE || error?.driverError?.code === UNIQUE_VIOLATION_CODE;

const writeShares = async (manager, { hostId, propertyId, effectiveFrom, today, now, ownerIds, rows, assertWritable }) => {
  const property = await manager.getRepository(Property).findOne({
    select: { id: true, title: true },
    where: { id: propertyId, hostid: hostId },
    lock: PESSIMISTIC_WRITE,
  });
  const owners =
    ownerIds.length === 0
      ? []
      : await manager.getRepository(Property_Owner).find({
          select: { id: true, status: true },
          where: { id: In(ownerIds), host_id: hostId },
          lock: PESSIMISTIC_WRITE,
        });
  assertWritable({ property, owners });

  const shares = manager.getRepository(Property_Owner_Property);
  const scope = { property_id: propertyId, host_id: hostId };
  const closing = { effective_to: effectiveFrom, updated_at: now };
  await shares.delete({ ...scope, effective_from: MoreThanOrEqual(effectiveFrom) });
  await shares.update({ ...scope, effective_from: LessThan(effectiveFrom), effective_to: IsNull() }, closing);
  await shares.update({ ...scope, effective_from: LessThan(effectiveFrom), effective_to: MoreThan(effectiveFrom) }, closing);
  if (rows.length > 0) {
    await shares.insert(rows.map((row) => ({ ...row })));
  }
  const savedRows = await shares.find({
    where: [
      { ...scope, effective_to: IsNull() },
      { ...scope, effective_to: MoreThan(today) },
    ],
    order: ASSIGNMENT_ORDER,
  });
  return { property, rows: savedRows };
};

const currentAssignmentWhere = (scope, today) => [
  { ...scope, effective_from: LessThanOrEqual(today), effective_to: IsNull() },
  { ...scope, effective_from: LessThanOrEqual(today), effective_to: MoreThan(today) },
];

export class Repository {
  async findOwnersByHost(hostId) {
    requireHostId(hostId);
    const dataSource = await Database.getInstance();
    return await dataSource.getRepository(Property_Owner).find({
      where: { host_id: hostId },
      order: OWNER_ORDER,
    });
  }

  async findOwnerByIdAndHost(ownerId, hostId) {
    requireOwnerId(ownerId);
    requireHostId(hostId);
    const dataSource = await Database.getInstance();
    return await dataSource.getRepository(Property_Owner).findOne({
      where: { id: ownerId, host_id: hostId },
    });
  }

  async findAssignmentsByHost(hostId, today) {
    requireHostId(hostId);
    requireToday(today);
    const dataSource = await Database.getInstance();
    return await dataSource.getRepository(Property_Owner_Property).find({
      where: currentAssignmentWhere({ host_id: hostId }, today),
      order: ASSIGNMENT_ORDER,
    });
  }

  async findAssignmentsByOwnerAndHost(ownerId, hostId, today) {
    requireOwnerId(ownerId);
    requireHostId(hostId);
    requireToday(today);
    const dataSource = await Database.getInstance();
    return await dataSource.getRepository(Property_Owner_Property).find({
      where: currentAssignmentWhere({ owner_id: ownerId, host_id: hostId }, today),
      order: ASSIGNMENT_ORDER,
    });
  }

  async createOwner(record) {
    requireHostId(record.host_id);
    const dataSource = await Database.getInstance();
    return await dataSource.getRepository(Property_Owner).save(record);
  }

  async replacePropertyShares(request) {
    const { hostId, propertyId, effectiveFrom, today, ownerIds, rows } = request;
    requireHostId(hostId);
    requirePropertyId(propertyId);
    requireEffectiveFrom(effectiveFrom);
    requireToday(today);
    requireShareRows(rows, ownerIds, hostId, propertyId);
    const dataSource = await Database.getInstance();
    try {
      return await withDsqlRetry(() => dataSource.transaction((manager) => writeShares(manager, request)));
    } catch (error) {
      if (isUniqueViolation(error) || isDsqlConflict(error)) {
        throw new ConflictException(SHARES_CONFLICT_MESSAGE);
      }
      throw error;
    }
  }
}
