import Database from "../ORM/index.js";
import { randomUUID } from "node:crypto";

import { ChannelIntegrationAccount } from "database/models/unified/integrations/ChannelIntegrationAccount";
import { ChannelIntegrationProperty } from "database/models/unified/integrations/ChannelIntegrationProperty";

// Same statuses as the partial unique index on (integrationAccountId, domitsPropertyId);
// one legacy row is stored as lowercase "active" (design note D2, #506).
export const IN_USE_STATUSES = ["PROVISIONING", "ACTIVE", "active"];

// Thrown when a listing already has an in-use mapping to another external property.
// The caller decides the answer (409); the data layer knows nothing about HTTP.
export class MappingConflictError extends Error {
  constructor(existingExternalPropertyId) {
    super("This listing is already connected to another external property.");
    this.name = "MappingConflictError";
    this.existingExternalPropertyId = existingExternalPropertyId;
  }
}

class IntegrationPropertyRepository {
  async upsert({ integrationAccountId, domitsPropertyId, externalPropertyId, externalPropertyName, status }) {
    const client = await Database.getInstance();

    const existing = await client
      .getRepository(ChannelIntegrationProperty)
      .createQueryBuilder("p")
      .where("p.integrationAccountId = :a", { a: integrationAccountId })
      .andWhere("p.domitsPropertyId = :d", { d: domitsPropertyId })
      .andWhere("p.externalPropertyId = :e", { e: externalPropertyId })
      .getOne();

    // A second live external property would keep selling with availability Domits no longer
    // updates, so it is refused instead of saved next to the first (design note D2).
    const resultingStatus = status ?? existing?.status ?? "ACTIVE";
    if (IN_USE_STATUSES.includes(resultingStatus)) {
      const inUseElsewhere = await client
        .getRepository(ChannelIntegrationProperty)
        .createQueryBuilder("p")
        .where("p.integrationAccountId = :a", { a: integrationAccountId })
        .andWhere("p.domitsPropertyId = :d", { d: domitsPropertyId })
        // A claim row (PROVISIONING) has no external id yet; NULL <> :e is not true in SQL, so name it.
        .andWhere("(p.externalPropertyId IS NULL OR p.externalPropertyId <> :e)", { e: externalPropertyId })
        .andWhere("p.status IN (:...inUse)", { inUse: IN_USE_STATUSES })
        .getOne();
      if (inUseElsewhere) throw new MappingConflictError(inUseElsewhere.externalPropertyId);
    }

    const now = Date.now();

    if (existing) {
      await client
        .createQueryBuilder()
        .update(ChannelIntegrationProperty)
        .set({
          externalPropertyName: externalPropertyName ?? existing.externalPropertyName,
          status: status ?? existing.status,
          updatedAt: now,
        })
        .where("id = :id", { id: existing.id })
        .execute();

      return {
        ...existing,
        externalPropertyName: externalPropertyName ?? existing.externalPropertyName,
        status: status ?? existing.status,
        updatedAt: now,
      };
    }

    const row = {
      id: randomUUID(),
      integrationAccountId,
      domitsPropertyId,
      externalPropertyId,
      externalPropertyName: externalPropertyName ?? null,
      status: status ?? "ACTIVE",
      createdAt: now,
      updatedAt: now,
    };

    await client.createQueryBuilder().insert().into(ChannelIntegrationProperty).values(row).execute();
    return row;
  }

  async findInUseByAccountAndListing(integrationAccountId, domitsPropertyId) {
    const client = await Database.getInstance();
    const row = await client
      .getRepository(ChannelIntegrationProperty)
      .createQueryBuilder("p")
      .where("p.integrationAccountId = :a", { a: integrationAccountId })
      .andWhere("p.domitsPropertyId = :d", { d: domitsPropertyId })
      .andWhere("p.status IN (:...inUse)", { inUse: IN_USE_STATUSES })
      .getOne();
    return row ?? null;
  }

  // Reserves a listing before Channex is called (design note D2). It does not look first: two
  // simultaneous claims are decided by the partial unique key, and the loser's error reaches the caller.
  async insertClaim({ id, integrationAccountId, domitsPropertyId, now }) {
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .insert()
      .into(ChannelIntegrationProperty)
      .values({
        id,
        integrationAccountId,
        domitsPropertyId,
        externalPropertyId: null,
        externalPropertyName: null,
        status: "PROVISIONING",
        createdAt: now,
        updatedAt: now,
      })
      .execute();
  }

  // Look before create (design note D2): a Channex property is only adopted when no in-use mapping uses it.
  async isExternalPropertyInUse(externalPropertyId) {
    const client = await Database.getInstance();
    const count = await client
      .getRepository(ChannelIntegrationProperty)
      .createQueryBuilder("p")
      .where("p.externalPropertyId = :e", { e: externalPropertyId })
      .andWhere("p.status IN (:...inUse)", { inUse: IN_USE_STATUSES })
      .getCount();
    return count > 0;
  }

  // Saved before the next Channex call, so a later attempt continues from this property.
  async setClaimExternalProperty(claimId, externalPropertyId, externalPropertyName) {
    const client = await Database.getInstance();
    await client
      .createQueryBuilder()
      .update(ChannelIntegrationProperty)
      .set({ externalPropertyId, externalPropertyName, updatedAt: Date.now() })
      .where("id = :id", { id: claimId })
      .andWhere("status = :s", { s: "PROVISIONING" })
      .execute();
  }

  // Runs on the caller's transaction, together with the full sync (design note D2).
  async activateClaim(manager, claimId) {
    await manager
      .createQueryBuilder()
      .update(ChannelIntegrationProperty)
      .set({ status: "ACTIVE", updatedAt: Date.now() })
      .where("id = :id", { id: claimId })
      .andWhere("status = :s", { s: "PROVISIONING" })
      .execute();
  }

  async listByAccountId(integrationAccountId) {
    const client = await Database.getInstance();
    return client
      .getRepository(ChannelIntegrationProperty)
      .createQueryBuilder("p")
      .where("p.integrationAccountId = :a", { a: integrationAccountId })
      .orderBy("p.updatedAt", "DESC")
      .getMany();
  }

  async queryActivePropertiesWhere(whereClause, whereParams) {
    const client = await Database.getInstance();
    return client
      .getRepository(ChannelIntegrationProperty)
      .createQueryBuilder("p")
      .where(whereClause, whereParams)
      .andWhere("p.status = :s", { s: "ACTIVE" })
      .orderBy("p.updatedAt", "DESC")
      .getMany();
  }

  async findByExternalPropertyId(externalPropertyId) {
    return this.queryActivePropertiesWhere("p.externalPropertyId = :e", { e: externalPropertyId });
  }

  async listActiveByDomitsPropertyId(domitsPropertyId) {
    return this.queryActivePropertiesWhere("p.domitsPropertyId = :d", { d: domitsPropertyId });
  }

  // Same "mapped to Channex" rule as the ARI outbox (channexAriOutboxWriter.isMappedToChannex).
  async findActiveChannexMappingByExternalPropertyId(externalPropertyId) {
    const client = await Database.getInstance();
    const row = await client
      .getRepository(ChannelIntegrationProperty)
      .createQueryBuilder("p")
      .innerJoin(ChannelIntegrationAccount, "a", "a.id = p.integrationAccountId")
      .where("p.externalPropertyId = :e", { e: externalPropertyId })
      .andWhere("UPPER(p.status) = :s", { s: "ACTIVE" })
      .andWhere("UPPER(a.channel) = :c", { c: "CHANNEX" })
      .orderBy("p.updatedAt", "DESC")
      .getOne();
    return row ?? null;
  }
}

export default IntegrationPropertyRepository;
