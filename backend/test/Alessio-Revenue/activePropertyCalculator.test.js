const { getActivePropertyCount } = require('../../functions/Alessio-Revenue/activePropertyCalculator');
const { Property } = require('../../ORM/models/Property.js');

jest.mock('../../ORM/models/Property.js', () => ({
  Property: {
    count: jest.fn()
  }
}));

describe('Enterprise Active Property Counting', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should call Property.count with correct active property filter and calculate monthly total', async () => {
    // Mock Property.count to return 300 active properties
    Property.count.mockResolvedValue(300);

    const enterpriseId = 'test_enterprise_123';
    const activeCount = await getActivePropertyCount(enterpriseId);

    const pricePerProperty = 49;
    const totalCost = activeCount * pricePerProperty;

    // Verify Property.count was called with active status criteria
    expect(Property.count).toHaveBeenCalledWith({
      where: {
        enterprise_id: enterpriseId,
        status: 'active',
        is_deleted: false
      }
    });

    // Verify property count and calculation
    expect(activeCount).toBe(300);
    expect(totalCost).toBe(14700);
  });

  test('should return 0 when an enterprise has no active properties', async () => {
    Property.count.mockResolvedValue(0);

    const activeCount = await getActivePropertyCount('empty_enterprise');
    expect(activeCount).toBe(0);
    expect(activeCount * 49).toBe(0);
  });

  test('should handle large property counts correctly', async () => {
    Property.count.mockResolvedValue(1000);

    const activeCount = await getActivePropertyCount('large_enterprise');
    expect(activeCount).toBe(1000);
    expect(activeCount * 49).toBe(49000);
  });
});
