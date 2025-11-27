import { DynamicPriceService } from './business/service/dynamicPriceService.js';

/**
 * Quick database test to verify pricing save/retrieve works
 * Run this to test if the database is correctly saving prices
 */
async function testDatabase() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 DATABASE CONNECTION TEST');
  console.log('='.repeat(60) + '\n');

  const service = new DynamicPriceService();

  // IMPORTANT: Replace with a real property ID from your database
  const TEST_PROPERTY_ID = 'YOUR_PROPERTY_ID_HERE'; // ⚠️ CHANGE THIS

  console.log(`📍 Testing with property ID: ${TEST_PROPERTY_ID}\n`);

  try {
    // Test 1: Save pricing data
    console.log('📝 TEST 1: Saving pricing data...');
    const testPricing = {
      '2025-01-25': 150,
      '2025-01-26': 200,
      '2025-01-27': 175
    };

    console.log('   Prices to save:', testPricing);

    const saveResult = await service.updatePricing(TEST_PROPERTY_ID, testPricing);
    console.log('   ✅ Save result:', saveResult);

    // Test 2: Retrieve pricing data
    console.log('\n📖 TEST 2: Retrieving pricing data...');
    const calendarData = await service.getCalendarData(TEST_PROPERTY_ID);
    console.log('   Retrieved data:', JSON.stringify(calendarData, null, 2));

    // Test 3: Verify prices match
    console.log('\n🔍 TEST 3: Verifying data integrity...');
    console.log('   Expected pricing:', testPricing);
    console.log('   Retrieved pricing:', calendarData.pricing);

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

    // Test 4: Clean up (delete test data)
    console.log('\n🧹 TEST 4: Cleaning up test data...');
    await service.updatePricing(TEST_PROPERTY_ID, {});
    console.log('   ✅ Test data cleaned up');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(60));
    console.error('\nError:', error.message);
    console.error('\nStack:', error.stack);
    console.error('\n' + '='.repeat(60) + '\n');
    process.exit(1);
  }

  process.exit(0);
}

// Run the test
testDatabase();
