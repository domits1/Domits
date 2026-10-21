import Database from "database";
import { Property_Owner } from "database/models/Property_Owner";
import { Property_Owner_Property } from "database/models/Property_Owner_Property";
import { IsNull, LessThanOrEqual, MoreThan } from "typeorm";

const DAY_MS = 86400000;
const OWNER_ORDER = Object.freeze({ last_name: "ASC", first_name: "ASC" });
const ASSIGNMENT_ORDER = Object.freeze({ effective_from: "ASC", created_at: "ASC" });

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
}
