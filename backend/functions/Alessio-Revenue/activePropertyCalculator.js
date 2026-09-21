import Database from "database";
import { Property } from "database/models/Property";
import { EnterpriseRatePlan } from "database/models/EnterpriseRatePlan";

const DEFAULT_PRICE_PER_PROPERTY_CENTS = 4900;
const DEFAULT_CURRENCY = "EUR";

async function getActivePropertyCount(enterpriseId) {
  const client = await Database.getInstance();
  const propertyRepository = client.getRepository(Property);

  return propertyRepository.count({
    where: {
      enterpriseid: enterpriseId,
      status: "ACTIVE",
      is_deleted: false,
    },
  });
}

async function getEnterpriseRatePlan(enterpriseId) {
  const client = await Database.getInstance();
  const ratePlanRepository = client.getRepository(EnterpriseRatePlan);

  return ratePlanRepository.findOne({
    where: {
      enterprise_id: enterpriseId,
      status: "active",
    },
    order: {
      effective_from: "DESC",
    },
  });
}

async function getEnterpriseBillingDetails(enterpriseId) {
  const [activeProperties, ratePlan] = await Promise.all([
    getActivePropertyCount(enterpriseId),
    getEnterpriseRatePlan(enterpriseId),
  ]);

  const pricePerPropertyCents = ratePlan
    ? Math.round(Number(ratePlan.price_per_property) * 100)
    : DEFAULT_PRICE_PER_PROPERTY_CENTS;

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
  getActivePropertyCount,
  getEnterpriseBillingDetails,
};