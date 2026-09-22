import Database from "database";
import { Property } from "database/models/Property";
import { EnterpriseRatePlan } from "database/models/EnterpriseRatePlan";

const DEFAULT_PRICE_PER_PROPERTY_CENTS = 4900;
const DEFAULT_CURRENCY = "EUR";

async function getActivePropertyCount(enterpriseId) {
  const client = await Database.getInstance();
  const propertyRepository = client.getRepository(Property);

  return propertyRepository
    .createQueryBuilder("property")
    .where("property.enterpriseid = :enterpriseId", { enterpriseId })
    .andWhere("property.status = :status", { status: "ACTIVE" })
    .andWhere("property.is_deleted = :isDeleted", { isDeleted: false })
    .getCount();
}

async function getEnterpriseRatePlan(enterpriseId) {
  const client = await Database.getInstance();
  const ratePlanRepository = client.getRepository(EnterpriseRatePlan);

  return ratePlanRepository
    .createQueryBuilder("ratePlan")
    .where("ratePlan.enterprise_id = :enterpriseId", { enterpriseId })
    .andWhere("ratePlan.status = :status", { status: "ACTIVE" })
    .andWhere("ratePlan.effective_from <= CURRENT_TIMESTAMP")
    .andWhere(
      "(ratePlan.effective_until IS NULL OR ratePlan.effective_until >= CURRENT_TIMESTAMP)"
    )
    .orderBy("ratePlan.effective_from", "DESC")
    .getOne();
}

async function authorizeEnterpriseAccess(enterpriseId, hostId) {
  const client = await Database.getInstance();
  const propertyRepository = client.getRepository(Property);

  const ownedEnterpriseProperty = await propertyRepository
    .createQueryBuilder("property")
    .where("property.enterpriseid = :enterpriseId", { enterpriseId })
    .andWhere("property.hostid = :hostId", { hostId })
    .getOne();

  if (!ownedEnterpriseProperty) {
    const error = new Error("You do not have access to this enterprise.");
    error.statusCode = 403;
    throw error;
  }
}

async function getEnterpriseBillingDetails(enterpriseId, hostId) {
  await authorizeEnterpriseAccess(enterpriseId, hostId);

  const [activeProperties, ratePlan] = await Promise.all([
    getActivePropertyCount(enterpriseId),
    getEnterpriseRatePlan(enterpriseId),
  ]);

  const pricePerPropertyCents =
    ratePlan?.price_per_property_cents ?? DEFAULT_PRICE_PER_PROPERTY_CENTS;

  const estimatedMonthlyCostCents =
    activeProperties * pricePerPropertyCents;

  return {
    activeProperties,
    pricePerProperty: pricePerPropertyCents / 100,
    currency: ratePlan?.currency ?? DEFAULT_CURRENCY,
    estimatedMonthlyCost: estimatedMonthlyCostCents / 100,
  };
}

export {
  authorizeEnterpriseAccess,
  getActivePropertyCount,
  getEnterpriseBillingDetails,
};