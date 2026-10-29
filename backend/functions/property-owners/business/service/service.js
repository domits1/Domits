import { Repository } from "../../data/repository.js";
import { NotFoundException } from "../../util/exception/notFoundException.js";
import { assertOwnerId, validateCreateOwner } from "../validation/ownerValidator.js";

const OWNER_NOT_FOUND_MESSAGE = "Owner not found.";
const DAY_MS = 86400000;

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
}
