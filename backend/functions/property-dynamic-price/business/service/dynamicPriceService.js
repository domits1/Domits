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
  async getCalendarData(propertyId) {
    const availability = await this.propertyAvailabilityRepository.getBlockedAndMaintenanceByPropertyId(propertyId);
    const customPricing = await this.propertyPricingRepository.getCustomPricingByPropertyId(propertyId);
    return {
      blocked: availability.blocked,
      maintenance: availability.maintenance,
      pricing: customPricing
    };
  }
  async saveCalendarData(propertyId, data) {
    const property = await this.propertyRepository.getPropertyById(propertyId);
    if (!property) {
      throw new NotFoundException(`Property with id ${propertyId} not found`);
    }
    const results = {
      availability: null,
      pricing: null
    };
    if (data.availability) {
      results.availability = await this.updateAvailability(
        propertyId,
        data.availability.blocked || [],
        data.availability.maintenance || []
      );
    }
    if (data.pricing && Object.keys(data.pricing).length > 0) {
      results.pricing = await this.updatePricing(propertyId, data.pricing);
    }

    return results;
  }
  async updateCalendarData(propertyId, data) {
    return await this.saveCalendarData(propertyId, data);
  }
  async updateAvailability(propertyId, blockedDates, maintenanceDates) {
    await this.propertyAvailabilityRepository.deleteByPropertyId(propertyId);
    const availabilityPromises = [];
    for (const dateStr of blockedDates) {
      availabilityPromises.push(
        this.propertyAvailabilityRepository.createBlocked({
          property_id: propertyId,
          date: dateStr,
          status: 'blocked'
        })
      );
    }
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
  async updatePricing(propertyId, pricingByDate) {
    await this.propertyPricingRepository.deleteCustomPricingByPropertyId(propertyId);
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
