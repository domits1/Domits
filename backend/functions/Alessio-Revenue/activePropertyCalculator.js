const { Property } = require('../../ORM/models/Property.js');
const { EnterpriseRatePlan } = require('../../ORM/models/EnterpriseRatePlan.js');

const DEFAULT_PRICE_PER_PROPERTY = 49.00;

async function getActivePropertyCount(enterpriseId) {
  return await Property.count({
    where: {
      enterprise_id: enterpriseId,
      status: 'active',
      is_deleted: false
    }
  });
}

async function getEnterpriseBillingDetails(enterpriseId) {
  // 1. Haal het actieve tariefplan op uit de database
  const ratePlan = await EnterpriseRatePlan.findOne({
    where: {
      enterprise_id: enterpriseId,
      status: 'active'
    }
  });

  const pricePerProperty = ratePlan ? parseFloat(ratePlan.price_per_property) : DEFAULT_PRICE_PER_PROPERTY;

  const activeProperties = await getActivePropertyCount(enterpriseId);

  return {
    activeProperties,
    pricePerProperty,
    estimatedMonthlyCost: activeProperties * pricePerProperty
  };
}

module.exports = {
  getActivePropertyCount,
  getEnterpriseBillingDetails
};