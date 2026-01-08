import { DynamicPriceService } from './business/service/dynamicPriceService.js';

async function testDatabase() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 DATABASE CONNECTION TEST');
  console.log('='.repeat(60) + '\n');
  const service = new DynamicPriceService();
  const TEST_PROPERTY_ID = 'YOUR_PROPERTY_ID_HERE'; 

  console.log(`📍 Testing with property ID: ${TEST_PROPERTY_ID}\n`);

  try {
    console.log('📝 TEST 1: Saving pricing data...');
    const testPricing = {
      '2025-01-25': 150,
      '2025-01-26': 200,
      '2025-01-27': 175
    };

    console.log('   Prices to save:', testPricing);

    const saveResult = await service.updatePricing(TEST_PROPERTY_ID, testPricing);
    const calendarData = await service.getCalendarData(TEST_PROPERTY_ID);

    const pricesMatch = JSON.stringify(testPricing) === JSON.stringify(calendarData.pricing);

    if (pricesMatch) {
      console.log('   ✅ SUCCESS: Prices match!');
    } else {
      console.log('   ❌ FAIL: Prices do NOT match!');
      console.log('   Difference:');
      Object.keys(testPricing).forEach(date => {
        const expected = testPricing[date];
        const actual = calendarData.pricing[date];
        if (expected !== actual) {
          console.log(`     ${date}: expected ${expected}, got ${actual}`);
        }
      });
    }
    await service.updatePricing(TEST_PROPERTY_ID, {});

  } catch (error) {
    process.exit(1);
  }

  process.exit(0);
}
testDatabase();
