const {
  getActivePropertyCount,
  getEnterpriseBillingDetails
} = require('../../functions/Alessio-Revenue/activePropertyCalculator');
const { Property } = require('../../ORM/models/Property.js');
const { EnterpriseRatePlan } = require('../../ORM/models/EnterpriseRatePlan.js');

jest.mock('../../ORM/models/Property.js', () => ({
  Property: {
    count: jest.fn()
  }
}));

jest.mock('../../ORM/models/EnterpriseRatePlan.js', () => ({
  EnterpriseRatePlan: {
    findOne: jest.fn()
  }
}));

describe('Enterprise Active Property & Billing Calculation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should count active properties correctly', async () => {
    Property.count.mockResolvedValue(10);

    const count = await getActivePropertyCount('ent_123');

    expect(Property.count).toHaveBeenCalledWith({
      where: {
        enterprise_id: 'ent_123',
        status: 'active',
        is_deleted: false
      }
    });
    expect(count).toBe(10);
  });

  test('should calculate total with a dynamic price from the database (e.g. $35/property)', async () => {
    Property.count.mockResolvedValue(100);
    EnterpriseRatePlan.findOne.mockResolvedValue({ price_per_property: 35.00 });

    const result = await getEnterpriseBillingDetails('ent_custom_rate');

    expect(result.activeProperties).toBe(100);
    expect(result.pricePerProperty).toBe(35.00);
    expect(result.estimatedMonthlyCost).toBe(3500); // 100 * $35
  });

  test('should fallback to default rate of $49 if no plan is found', async () => {
    Property.count.mockResolvedValue(5);
    EnterpriseRatePlan.findOne.mockResolvedValue(null);

    const result = await getEnterpriseBillingDetails('ent_default');

    expect(result.activeProperties).toBe(5);
    expect(result.pricePerProperty).toBe(49.00);
    expect(result.estimatedMonthlyCost).toBe(245); // 5 * $49
  });
});