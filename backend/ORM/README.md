# PostgreSQL Schema Reset and Data Migration

This directory contains scripts and tools for resetting the PostgreSQL main schema and migrating data from JSON files to the database.

## Overview

The migration system addresses the issue of column name mismatches between the PostgreSQL schema and ORM models by:

1. **Fixing Schema Inconsistencies**: Updated `schema.psql` to use lowercase column names that match the ORM models
2. **Data Migration Scripts**: Created scripts that use PropertyHandler create functions to ensure proper data handling
3. **Column Name Mapping**: Proper transformation of camelCase field names to lowercase database column names

## Key Fixes Applied

### Column Name Mismatches Fixed

The following column name mismatches between `schema.psql` and ORM models have been resolved:

| Original Schema (camelCase) | Fixed Schema (lowercase) | ORM Model Field |
|----------------------------|-------------------------|-----------------|
| `fourWheelDrive`           | `fourwheeldrive`        | `fourwheeldrive` |
| `fuelConsumption`          | `fuelconsumption`       | `fuelconsumption` |
| `renovationYear`           | `renovationyear`        | `renovationyear` |
| `generalPeriodicInspection` | `generalperiodicinspection` | `generalperiodicinspection` |

### Schema Changes

- Updated `property_technicaldetails` table column names to match ORM model expectations
- Fixed `height` field to be nullable as defined in the ORM model
- Maintained all indexes and constraints

## Files

### Core Migration Scripts

- **`schema.psql`** - Updated PostgreSQL schema with fixed column names
- **`migrate-data.js`** - Main migration script using PropertyHandler create functions
- **`reset-and-migrate.js`** - Complete schema reset and data migration process
- **`mock-migrate.js`** - Demonstration script that shows migration process without database connection
- **`test-migration.js`** - Test script to validate data transformation

### Data Files

- **`data/sample-properties.json`** - Sample property data for migration
- **Frontend mock data** - Uses existing `frontend/web/src/features/hostonboarding/stores/data/mockData.json`

## Usage

### Option 1: Mock Migration (Demo)

To see how the migration works without a database connection:

```bash
cd backend
node ORM/mock-migrate.js
```

This will show you exactly what data would be inserted into each table.

### Option 2: Test Data Validation

To test data transformation and validation:

```bash
cd backend
node ORM/test-migration.js
```

### Option 3: Full Migration (Production)

1. **Set up PostgreSQL database connection**:
   ```bash
   export DB_HOST=your-postgresql-host
   export DB_PORT=5432
   export DB_NAME=your-database-name
   export DB_USER=your-username
   export DB_PASS=your-password
   ```

2. **Configure AWS credentials** (for SystemManager access):
   ```bash
   export AWS_ACCESS_KEY_ID=your-access-key
   export AWS_SECRET_ACCESS_KEY=your-secret-key
   export AWS_REGION=your-region
   ```

3. **Reset schema**:
   ```bash
   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f backend/ORM/schema.psql
   ```

4. **Run migration**:
   ```bash
   cd backend
   node ORM/reset-and-migrate.js
   ```

## Migration Process

The migration follows this logical approach as suggested in the issue:

1. **Schema Reset**: Drops and recreates the main schema with correct column names
2. **Data Loading**: Reads property data from JSON files
3. **Data Transformation**: Converts camelCase field names to lowercase database column names
4. **Property Creation**: Uses PropertyHandler create functions to ensure proper validation and relationships
5. **Batch Processing**: Processes multiple properties and data sources

## Data Sources

The migration system can handle multiple data sources:

- Frontend mock data (`mockData.json`)
- Sample properties (`sample-properties.json`)
- Additional JSON files can be added to the `dataSources` array

## Technical Details

### PropertyHandler Integration

The migration uses the existing PropertyHandler business logic:

- **PropertyBuilder**: Constructs property objects with all related data
- **PropertyService**: Handles database insertion with proper relationships
- **Repository Pattern**: Uses existing repository classes for data access
- **Validation**: Leverages existing validation logic

### Column Name Transformation

For technical details, the migration handles this transformation:

```javascript
const techDetails = {
    property_id: data.property_id,
    fuelconsumption: data.fuelConsumption,      // camelCase -> lowercase
    renovationyear: data.renovationYear,        // camelCase -> lowercase
    generalperiodicinspection: data.generalPeriodicInspection,  // camelCase -> lowercase
    fourwheeldrive: data.fourWheelDrive         // camelCase -> lowercase
};
```

## Error Handling

The migration system includes comprehensive error handling:

- Database connection issues
- Data validation errors
- Missing required fields
- Property creation failures

Each error is logged with context to help with debugging.

## Testing

Run the test suite to verify migration functionality:

```bash
cd backend
npm test
```

Or run the specific migration tests:

```bash
node ORM/test-migration.js
node ORM/mock-migrate.js
```

## Extending the Migration

To add new data sources:

1. Add JSON file to `backend/ORM/data/` directory
2. Update `dataSources` array in `migrate-data.js`
3. Ensure data structure matches expected format

To handle new property types:

1. Update PropertyBuilder logic if needed
2. Add new technical detail mappings
3. Update schema if new tables are required

## Troubleshooting

### Common Issues

1. **AWS Credentials Error**: Ensure AWS credentials are configured for SystemManager access
2. **Database Connection Error**: Verify PostgreSQL connection parameters
3. **Column Name Mismatch**: Check that schema.psql has been updated with lowercase column names
4. **Missing Data**: Verify JSON data files exist and have correct structure

### Logs

The migration provides detailed logging:
- Property processing status
- Database insertion details
- Error messages with stack traces
- Summary statistics

## Production Deployment

1. Backup existing database before running migration
2. Test migration on staging environment first
3. Monitor logs during migration process
4. Verify data integrity after migration
5. Update application configuration if needed

## Support

For issues related to:
- Database schema: Check `schema.psql` and ORM models
- Data transformation: Review `migrate-data.js` transformation logic
- PropertyHandler integration: Check PropertyService and PropertyBuilder classes