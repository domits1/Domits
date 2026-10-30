import { Repository } from "../../data/repository.js";
import { ConflictException } from "../../util/exception/conflictException.js";
import { NotFoundException } from "../../util/exception/notFoundException.js";
import { ARCHIVED_OWNER_STATUS } from "../../util/ownerConstants.js";
import { assertOwnerId, validateCreateOwner } from "../validation/ownerValidator.js";
import { validateSetShares } from "../validation/shareValidator.js";

const OWNER_NOT_FOUND_MESSAGE = "Owner not found.";
const PROPERTY_NOT_FOUND_MESSAGE = "Property not found.";
const ARCHIVED_OWNER_SHARES_MESSAGE = "Archived owners cannot receive ownership shares.";
const OWNERSHIP_CHANGED_TODAY_MESSAGE =
  "The ownership of this property already changed today. Choose tomorrow or later.";
const DAY_MS = 86400000;

const toShare = ({ owner_id, ownership_basis_points, effective_from, effective_to }) => ({
  owner_id,
  ownership_basis_points,
  effective_from,
  effective_to,
});

const isCurrentOn = (today) => (row) =>
  row.effective_from <= today && (row.effective_to === null || row.effective_to > today);

const sharesWritableCheck = (ownerIds) => ({ property, owners, changedToday }) => {
  if (!property) {
    throw new NotFoundException(PROPERTY_NOT_FOUND_MESSAGE);
  }
  const foundOwnerIds = new Set(owners.map((owner) => owner.id));
  if (ownerIds.some((ownerId) => !foundOwnerIds.has(ownerId))) {
    throw new NotFoundException(OWNER_NOT_FOUND_MESSAGE);
  }
  if (owners.some((owner) => owner.status === ARCHIVED_OWNER_STATUS)) {
    throw new ConflictException(ARCHIVED_OWNER_SHARES_MESSAGE);
  }
  if (changedToday) {
    throw new ConflictException(OWNERSHIP_CHANGED_TODAY_MESSAGE);
  }
};

const toProperty = ({ property_id, ownership_basis_points, effective_from, effective_to }) => ({
  property_id,
  ownership_basis_points,
  effective_from,
  effective_to,
});

const groupPropertiesByOwner = (assignments) => {
  const propertiesByOwner = new Map();
  for (const assignment of assignments) {
    const properties = propertiesByOwner.get(assignment.owner_id);
    if (properties) {
      properties.push(toProperty(assignment));
    } else {
      propertiesByOwner.set(assignment.owner_id, [toProperty(assignment)]);
    }
  }
  return propertiesByOwner;
};

export class Service {
  constructor({ repository = new Repository(), clock = Date.now } = {}) {
    this.repository = repository;
    this.clock = clock;
  }

  today() {
    return Math.floor(this.clock() / DAY_MS) * DAY_MS;
  }

  async listOwners(hostId) {
    const [owners, assignments] = await Promise.all([
      this.repository.findOwnersByHost(hostId),
      this.repository.findAssignmentsByHost(hostId, this.today()),
    ]);
    const propertiesByOwner = groupPropertiesByOwner(assignments);
    return owners.map((owner) => ({ ...owner, properties: propertiesByOwner.get(owner.id) ?? [] }));
  }

  async getOwner(hostId, id) {
    const ownerId = assertOwnerId(id);
    const owner = await this.repository.findOwnerByIdAndHost(ownerId, hostId);
    if (!owner) {
      throw new NotFoundException(OWNER_NOT_FOUND_MESSAGE);
    }
    const assignments = await this.repository.findAssignmentsByOwnerAndHost(ownerId, hostId, this.today());
    return { ...owner, properties: assignments.map(toProperty) };
  }

  async createOwner(hostId, body) {
    const fields = validateCreateOwner(body);
    const now = this.clock();
    const saved = await this.repository.createOwner({
      ...fields,
      host_id: hostId,
      owner_user_id: null,
      created_at: now,
      updated_at: now,
    });
    return { ...saved, properties: [] };
  }

  async setShares(hostId, body) {
    const today = this.today();
    const { propertyId, effectiveFrom, shares } = validateSetShares(body, today);
    const now = this.clock();
    const ownerIds = shares.map((share) => share.owner_id);
    const rows = shares.map(({ owner_id, ownership_basis_points }) => ({
      owner_id,
      property_id: propertyId,
      host_id: hostId,
      ownership_basis_points,
      effective_from: effectiveFrom,
      effective_to: null,
      created_at: now,
      updated_at: now,
    }));
    const { property, rows: savedRows } = await this.repository.replacePropertyShares({
      hostId,
      propertyId,
      effectiveFrom,
      today,
      now,
      ownerIds,
      rows,
      assertWritable: sharesWritableCheck(ownerIds),
    });
    return {
      property_id: propertyId,
      property_title: property.title,
      as_of: today,
      current: savedRows.filter(isCurrentOn(today)).map(toShare),
      upcoming: savedRows.filter((row) => row.effective_from > today).map(toShare),
    };
  }
}
