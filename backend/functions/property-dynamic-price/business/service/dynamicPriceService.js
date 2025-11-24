import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SystemManagerRepository } from "../../data/repository/systemManagerRepository.js";
import { PropertyAvailabilityRepository } from "../../data/repository/propertyAvailabilityRepository.js";
import { PropertyPricingRepository } from "../../data/repository/propertyPricingRepository.js";
import { PropertyRepository } from "../../data/repository/propertyRepository.js";
import { NotFoundException } from "../../util/exception/NotFoundException.js";

export class DynamicPriceService {

  constructor(dynamoDbClient = new DynamoDBClient({}), systemManagerRepository = new SystemManagerRepository()) {
    this.propertyRepository = new PropertyRepository(systemManagerRepository);
    this.propertyAvailabilityRepository = new PropertyAvailabilityRepository(systemManagerRepository);
    this.propertyPricingRepository = new PropertyPricingRepository(systemManagerRepository);
  }

  /**
   * Get all calendar data for a property
   * Returns: { blocked: [], maintenance: [{date, note}], pricing: {} }
   */
  async getCalendarData(propertyId) {
    // Get blocked and maintenance dates
    const availability = await this.propertyAvailabilityRepository.getBlockedAndMaintenanceByPropertyId(propertyId);

    // Get custom pricing
    const customPricing = await this.propertyPricingRepository.getCustomPricingByPropertyId(propertyId);

    return {
      blocked: availability.blocked,
      maintenance: availability.maintenance,
      pricing: customPricing
    };
  }

  /**
   * Save calendar data (POST - create new)
   * Expects: { availability: { blocked: [], maintenance: [] }, pricing: {} }
   */
  async saveCalendarData(propertyId, data) {
    // First, verify property exists
    const property = await this.propertyRepository.getPropertyById(propertyId);
    if (!property) {
      throw new NotFoundException(`Property with id ${propertyId} not found`);
    }

    const results = {
      availability: null,
      pricing: null
    };

    // Save availability if provided
    if (data.availability) {
      results.availability = await this.updateAvailability(
        propertyId,
        data.availability.blocked || [],
        data.availability.maintenance || []
      );
    }

    // Save pricing if provided
    if (data.pricing && Object.keys(data.pricing).length > 0) {
      results.pricing = await this.updatePricing(propertyId, data.pricing);
    }

    return results;
  }

  /**
   * Update calendar data (PATCH - modify existing)
   * Expects: { availability: { blocked: [], maintenance: [] }, pricing: {} }
   */
  async updateCalendarData(propertyId, data) {
    // Same as save for now - both replace existing data
    return await this.saveCalendarData(propertyId, data);
  }

  /**
   * Update availability (blocked and maintenance dates)
   */
  async updateAvailability(propertyId, blockedDates, maintenanceDates) {
    // Delete existing availability entries for this property
    await this.propertyAvailabilityRepository.deleteByPropertyId(propertyId);

    // Create new availability entries
    const availabilityPromises = [];

    // Add blocked dates
    for (const dateStr of blockedDates) {
      availabilityPromises.push(
        this.propertyAvailabilityRepository.createBlocked({
          property_id: propertyId,
          date: dateStr,
          status: 'blocked'
        })
      );
    }

    // Add maintenance dates (can be string or object with note)
    for (const item of maintenanceDates) {
      const dateStr = typeof item === 'string' ? item : item.date;
      const note = typeof item === 'object' ? item.note : '';

      availabilityPromises.push(
        this.propertyAvailabilityRepository.createMaintenance({
          property_id: propertyId,
          date: dateStr,
          note: note,
          status: 'maintenance'
        })
      );
    }

    await Promise.all(availabilityPromises);
    return { success: true, blockedCount: blockedDates.length, maintenanceCount: maintenanceDates.length };
  }

  /**
   * Update pricing (custom per-date pricing)
   */
  async updatePricing(propertyId, pricingByDate) {
    // Delete existing custom pricing for this property
    await this.propertyPricingRepository.deleteCustomPricingByPropertyId(propertyId);

    // Create new pricing entries
    const pricingPromises = [];
    for (const [dateStr, price] of Object.entries(pricingByDate)) {
      pricingPromises.push(
        this.propertyPricingRepository.createCustomPrice({
          property_id: propertyId,
          date: dateStr,
          price: price
        })
      );
    }

    await Promise.all(pricingPromises);
    return { success: true, priceCount: Object.keys(pricingByDate).length };
  }
}
