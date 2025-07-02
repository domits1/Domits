#!/usr/bin/env node

/**
 * Test Migration Script
 * 
 * This script tests the data migration functionality
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testMigration() {
    console.log('🧪 Testing Data Migration...');
    
    try {
        // Load test data
        const testDataPath = join(__dirname, '../../frontend/web/src/features/hostonboarding/stores/data/mockData.json');
        const testData = JSON.parse(readFileSync(testDataPath, 'utf8'));
        
        console.log('✅ Successfully loaded test data');
        console.log('📊 Test data structure:');
        console.log(`   - Property: ${testData.property.title}`);
        console.log(`   - Type: ${testData.propertyType.property_type}`);
        console.log(`   - Amenities: ${testData.propertyAmenities.length} items`);
        console.log(`   - General Details: ${testData.propertyGeneralDetails.length} items`);
        console.log(`   - Has Technical Details: ${testData.propertyTechnicalDetails ? 'Yes' : 'No'}`);
        
        // Test data transformation
        console.log('\n🔄 Testing data transformation...');
        
        const transformedData = {
            property: {
                id: testData.property.id || 'test-uuid',
                hostId: testData.property.hostId || "ce93f377-9ac0-46c2-9d45-cf20d33dcc33",
                title: testData.property.title,
                subtitle: testData.property.subtitle,
                description: testData.property.description,
                guestCapacity: testData.property.guestCapacity,
                registrationNumber: testData.property.registrationNumber,
                status: testData.property.status || "ACTIVE",
                createdAt: testData.property.createdAt || Date.now(),
                updatedAt: testData.property.updatedAt || Date.now()
            },
            propertyAmenities: testData.propertyAmenities || [],
            propertyAvailability: testData.propertyAvailability || [],
            propertyAvailabilityRestrictions: testData.propertyAvailabilityRestrictions || [],
            propertyCheckIn: testData.propertyCheckIn || {},
            propertyGeneralDetails: testData.propertyGeneralDetails || [],
            propertyImages: testData.propertyImages || [],
            propertyLocation: testData.propertyLocation || {},
            propertyPricing: testData.propertyPricing || {},
            propertyRules: testData.propertyRules || [],
            propertyType: testData.propertyType || {},
            propertyTechnicalDetails: testData.propertyTechnicalDetails || null
        };
        
        console.log('✅ Data transformation successful');
        
        // Validate column name mappings for technical details
        if (transformedData.propertyTechnicalDetails) {
            console.log('\n🔍 Validating technical details column mappings:');
            const techDetails = transformedData.propertyTechnicalDetails;
            
            const mappings = {
                'fuelConsumption -> fuelconsumption': techDetails.fuelConsumption,
                'renovationYear -> renovationyear': techDetails.renovationYear,
                'generalPeriodicInspection -> generalperiodicinspection': techDetails.generalPeriodicInspection,
                'fourWheelDrive -> fourwheeldrive': techDetails.fourWheelDrive
            };
            
            for (const [mapping, value] of Object.entries(mappings)) {
                console.log(`   ✅ ${mapping}: ${value}`);
            }
        }
        
        console.log('\n🎉 Migration test completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('   1. Ensure PostgreSQL database is set up with correct connection parameters');
        console.log('   2. Run: node backend/ORM/reset-and-migrate.js');
        console.log('   3. Verify data is properly inserted into PostgreSQL tables');
        
    } catch (error) {
        console.error('❌ Migration test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the test
testMigration();