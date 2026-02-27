import { PricingMapping } from "../../util/mapping/pricing.js";
import Database from "database";

export class PropertyPricingRepository {
  constructor(systemManager) {
    this.systemManager = systemManager;
    this.weekendRateColumnSupported = null;
  }

  parseRoomRate(pricing) {
    const roomRate = Number(pricing?.roomRate ?? pricing?.roomrate);
    if (!Number.isFinite(roomRate) || roomRate < 2) {
      throw new TypeError("Pricing roomRate must be a number greater than or equal to 2.");
    }
    return Math.trunc(roomRate);
  }

  parseCleaningValue(pricing, fallback = 0) {
    const cleaningInput = pricing?.cleaning;
    const hasCleaningInput = cleaningInput !== undefined && cleaningInput !== null;
    if (!hasCleaningInput) {
      return fallback;
    }

    const parsedCleaning = Number(cleaningInput);
    if (!Number.isFinite(parsedCleaning) || parsedCleaning < 0) {
      throw new TypeError("Pricing cleaning must be a number greater than or equal to 0.");
    }
    return Math.trunc(parsedCleaning);
  }

  parseWeekendRate(pricing, fallback) {
    const weekendInput =
      pricing?.weekendRate ??
      pricing?.weekendrate ??
      pricing?.weekendPrice ??
      pricing?.weekendprice;

    if (weekendInput === undefined || weekendInput === null || weekendInput === "") {
      return fallback;
    }

    const weekendRate = Number(weekendInput);
    if (!Number.isFinite(weekendRate) || weekendRate < 2) {
      throw new TypeError("Pricing weekendRate must be a number greater than or equal to 2.");
    }

    return Math.trunc(weekendRate);
  }

  async supportsWeekendRateColumn(client) {
    if (this.weekendRateColumnSupported === true) {
      return true;
    }

    const result = await client.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'property_pricing'
          AND table_schema = ANY(current_schemas(true))
          AND lower(column_name) = 'weekendrate'
        LIMIT 1
      `
    );

    const weekendRateSupported = Array.isArray(result) && result.length > 0;
    this.weekendRateColumnSupported = weekendRateSupported;
    return weekendRateSupported;
  }

  async getPricingById(id) {
    const client = await Database.getInstance();
    const hasWeekendRateColumn = await this.supportsWeekendRateColumn(client);

    const rows = await client.query(
      `
        SELECT
          property_id,
          roomrate,
          cleaning,
          ${hasWeekendRateColumn ? "weekendrate" : "roomrate AS weekendrate"}
        FROM property_pricing
        WHERE property_id = $1
        LIMIT 1
      `,
      [id]
    );

    const result = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    return result ? PricingMapping.mapDatabaseEntryToPricing(result) : null;
  }

  async create(pricing) {
    const client = await Database.getInstance();
    const hasWeekendRateColumn = await this.supportsWeekendRateColumn(client);
    const roomRateValue = this.parseRoomRate(pricing);
    const cleaningValue = this.parseCleaningValue(pricing, 0);
    const weekendRateValue = this.parseWeekendRate(pricing, roomRateValue);

    if (hasWeekendRateColumn) {
      await client.query(
        `
          INSERT INTO property_pricing (property_id, cleaning, roomrate, weekendrate)
          VALUES ($1, $2, $3, $4)
        `,
        [pricing.property_id, cleaningValue, roomRateValue, weekendRateValue]
      );
    } else {
      await client.query(
        `
          INSERT INTO property_pricing (property_id, cleaning, roomrate)
          VALUES ($1, $2, $3)
        `,
        [pricing.property_id, cleaningValue, roomRateValue]
      );
    }

    const result = await this.getPricingById(pricing.property_id);
    return result ? result : null;
  }

  async upsertPricingByPropertyId(propertyId, pricing) {
    const client = await Database.getInstance();
    const hasWeekendRateColumn = await this.supportsWeekendRateColumn(client);
    const existingPricing = await this.getPricingById(propertyId);

    const roomRateValue = this.parseRoomRate(pricing);
    const cleaningValue = this.parseCleaningValue(pricing, existingPricing?.cleaning ?? 0);
    const weekendRateValue = this.parseWeekendRate(
      pricing,
      existingPricing?.weekendRate ?? roomRateValue
    );

    if (existingPricing) {
      if (hasWeekendRateColumn) {
        await client.query(
          `
            UPDATE property_pricing
            SET roomrate = $2, cleaning = $3, weekendrate = $4
            WHERE property_id = $1
          `,
          [propertyId, roomRateValue, cleaningValue, weekendRateValue]
        );
      } else {
        await client.query(
          `
            UPDATE property_pricing
            SET roomrate = $2, cleaning = $3
            WHERE property_id = $1
          `,
          [propertyId, roomRateValue, cleaningValue]
        );
      }
    } else if (hasWeekendRateColumn) {
      await client.query(
        `
          INSERT INTO property_pricing (property_id, roomrate, cleaning, weekendrate)
          VALUES ($1, $2, $3, $4)
        `,
        [propertyId, roomRateValue, cleaningValue, weekendRateValue]
      );
    } else {
      await client.query(
        `
          INSERT INTO property_pricing (property_id, roomrate, cleaning)
          VALUES ($1, $2, $3)
        `,
        [propertyId, roomRateValue, cleaningValue]
      );
    }

    return await this.getPricingById(propertyId);
  }
}
