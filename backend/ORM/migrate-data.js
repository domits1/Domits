#!/usr/bin/env node

/**
 * Data Migration Script for PostgreSQL
 * 
 * This script resets the PostgreSQL main schema and migrates data from JSON files
 * using the PropertyHandler create functions to ensure proper data handling.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import { PropertyService } from '../functions/PropertyHandler/business/service/propertyService.js';
import { PropertyBuilder } from '../functions/PropertyHandler/business/service/propertyBuilder.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DataMigrator {
    constructor() {
        this.propertyService = new PropertyService();
        this.propertyBuilder = new PropertyBuilder();
    }

    /**
     * Load JSON data from a file
     */
    loadJsonData(filePath) {
        try {
            if (!existsSync(filePath)) {
                console.warn(`Data file not found: ${filePath}`);
                return null;
            }
            const data = readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error loading JSON data from ${filePath}:`, error.message);
            return null;
        }
    }

    /**
     * Transform data to match the expected structure
     */
    transformPropertyData(data) {
        // Ensure the data structure matches what the PropertyBuilder expects
        const transformed = {
            property: {
                id: data.property.id || this.generateUUID(),
                hostId: data.property.hostId || "ce93f377-9ac0-46c2-9d45-cf20d33dcc33",
                title: data.property.title,
                subtitle: data.property.subtitle,
                description: data.property.description,
                guestCapacity: data.property.guestCapacity,
                registrationNumber: data.property.registrationNumber,
                status: data.property.status || "ACTIVE",
                createdAt: data.property.createdAt || Date.now(),
                updatedAt: data.property.updatedAt || Date.now()
            },
            propertyAmenities: data.propertyAmenities || [],
            propertyAvailability: data.propertyAvailability || [],
            propertyAvailabilityRestrictions: data.propertyAvailabilityRestrictions || [],
            propertyCheckIn: data.propertyCheckIn || {},
            propertyGeneralDetails: data.propertyGeneralDetails || [],
            propertyImages: data.propertyImages || [],
            propertyLocation: data.propertyLocation || {},
            propertyPricing: data.propertyPricing || {},
            propertyRules: data.propertyRules || [],
            propertyType: data.propertyType || {},
            propertyTechnicalDetails: data.propertyTechnicalDetails || null
        };

        return transformed;
    }

    /**
     * Generate a simple UUID
     */
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Migrate a single property
     */
    async migrateProperty(propertyData) {
        try {
            console.log(`Migrating property: ${propertyData.property.title}`);
            
            // Transform the data to match expected structure
            const transformedData = this.transformPropertyData(propertyData);
            
            // Build the property object using PropertyBuilder
            let builder = await this.propertyBuilder.addBasePropertyInfo(
                transformedData.property, 
                transformedData.propertyType.property_type, 
                transformedData.property.hostId
            );

            builder = builder
                .addAvailability(transformedData.propertyAvailability)
                .addCheckIn(transformedData.propertyCheckIn)
                .addLocation(transformedData.propertyLocation)
                .addPricing(transformedData.propertyPricing)
                .addImages(transformedData.propertyImages)
                .addPropertyType(transformedData.propertyType);

            builder = await builder.addAmenities(transformedData.propertyAmenities);
            builder = await builder.addGeneralDetails(transformedData.propertyGeneralDetails);
            builder = await builder.addRules(transformedData.propertyRules);
            builder = await builder.addAvailabilityRestrictions(transformedData.propertyAvailabilityRestrictions);

            if (transformedData.propertyType.property_type === "Boat" || transformedData.propertyType.property_type === "Camper") {
                if (transformedData.propertyTechnicalDetails) {
                    builder = await builder.addTechnicalDetails(transformedData.propertyTechnicalDetails);
                }
            }

            const property = builder.build();
            
            // Use PropertyService to create the property directly
            await this.propertyService.create(property);
            
            console.log(`✅ Successfully migrated property: ${propertyData.property.title}`);
            console.log(`   Property ID: ${property.property.id}`);
            return true;
            
        } catch (error) {
            console.error(`❌ Error migrating property: ${propertyData.property.title}`, error.message);
            console.error('   Stack trace:', error.stack);
            return false;
        }
    }

    /**
     * Run the migration
     */
    async migrate() {
        console.log('🚀 Starting PostgreSQL data migration...');
        
        // Load data from various sources
        const dataSources = [
            join(__dirname, '../../frontend/web/src/features/hostonboarding/stores/data/mockData.json'),
            join(__dirname, 'data/sample-properties.json'), // We'll create this
            // Add more data sources as needed
        ];

        let totalMigrated = 0;
        let totalFailed = 0;

        for (const dataSource of dataSources) {
            const data = this.loadJsonData(dataSource);
            if (!data) continue;

            console.log(`\n📂 Processing data from: ${dataSource}`);

            // Handle different data structures
            if (Array.isArray(data)) {
                // Array of properties
                for (const propertyData of data) {
                    const success = await this.migrateProperty(propertyData);
                    if (success) {
                        totalMigrated++;
                    } else {
                        totalFailed++;
                    }
                }
            } else if (data.property) {
                // Single property object
                const success = await this.migrateProperty(data);
                if (success) {
                    totalMigrated++;
                } else {
                    totalFailed++;
                }
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`   ✅ Successfully migrated: ${totalMigrated} properties`);
        console.log(`   ❌ Failed migrations: ${totalFailed} properties`);
        console.log('🎉 Migration completed!');
    }
}

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const migrator = new DataMigrator();
    migrator.migrate().catch(console.error);
}

export { DataMigrator };