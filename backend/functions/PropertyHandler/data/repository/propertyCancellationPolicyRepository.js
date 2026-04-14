import Database from "database";
import { Property_CancellationPolicy } from "database/models/Property_CancellationPolicy";

export class PropertyCancellationPolicyRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
  }

  async getCancellationPolicyByPropertyId(propertyId) {
    const client = await Database.getInstance();
    const result = await client
      .getRepository(Property_CancellationPolicy)
      .createQueryBuilder("policy")
      .where("policy.property_id = :propertyId", { propertyId })
      .getOne();
    return result || null;
  }

  async updateCancellationPolicy(propertyId, policyType) {
    const client = await Database.getInstance();
    const now = Date.now();

    const existing = await this.getCancellationPolicyByPropertyId(propertyId);

    if (existing) {
      await client
        .createQueryBuilder()
        .update(Property_CancellationPolicy)
        .set({
          policy_type: policyType,
          updated_at: now,
        })
        .where("property_id = :propertyId", { propertyId })
        .execute();
    } else {
      await client
        .createQueryBuilder()
        .insert()
        .into(Property_CancellationPolicy)
        .values({
          property_id: propertyId,
          policy_type: policyType,
          created_at: now,
          updated_at: now,
        })
        .execute();
    }

    return await this.getCancellationPolicyByPropertyId(propertyId);
  }
}
