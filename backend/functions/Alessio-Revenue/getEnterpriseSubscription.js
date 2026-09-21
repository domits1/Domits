const { getActivePropertyCount } = require('./activePropertyCalculator');
const EnterpriseRatePlan = require('database/models/EnterpriseRatePlan');

exports.handler = async (event) => {
  const enterpriseId = event.pathParameters.enterpriseId;

  const plan = await EnterpriseRatePlan.findOne({
    where: { enterprise_id: enterpriseId, status: 'active' }
  });

  const activeProperties = await getActivePropertyCount(enterpriseId);
  const pricePerProperty = plan ? Number.parseFloat(plan.price_per_property) : 49.00;
  const estimatedMonthlyCost = activeProperties * pricePerProperty;

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      enterpriseId,
      planName: "Enterprise",
      pricePerProperty,
      currency: plan ? plan.currency : 'USD',
      activeProperties,
      estimatedMonthlyCost,
      nextBillingDate: "2026-10-01"
    })
  };
};