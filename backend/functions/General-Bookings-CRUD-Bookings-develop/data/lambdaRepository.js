import NotFoundException from "../util/exception/NotFoundException.js";
import Database from "database";
import { Property_Pricing } from "database/models/Property_Pricing";
import { Property_Rule } from "database/models/Property_Rule";
class LambdaRepository {
  extractPropertyCards(payload) {
    if (Array.isArray(payload)) {
      return payload;
    }

    if (Array.isArray(payload?.properties)) {
      return payload.properties;
    }

    if (payload === "No property found." || payload?.message === "No property found.") {
      return [];
    }

    return null;
  }

  async getPropertiesFromHostId(host_Id) {
    const response = await fetch(
      `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byHostId?hostId=${host_Id}`
    );

    const receivedData = await response.json();
    const propertyCards = this.extractPropertyCards(receivedData);

    if (!response.ok || propertyCards === null || propertyCards.length < 1) {
      throw new NotFoundException("User has no active properties.");
    }

    const client = await Database.getInstance();
    const propertyIds = propertyCards.map((p) => p.property.id);

    const allRules = propertyIds.length
      ? await client
          .getRepository(Property_Rule)
          .createQueryBuilder("pr")
          .where("pr.property_id IN (:...ids)", { ids: propertyIds })
          .getMany()
      : [];

    const rulesByPropertyId = allRules.reduce((acc, r) => {
      (acc[r.property_id] = acc[r.property_id] || []).push({ rule: r.rule, value: r.value });
      return acc;
    }, {});

    const properties = propertyCards.map((property) => ({
      id: property.property.id,
      title: property.property.title,
      rate: property.propertyPricing.roomRate,
      city: property.propertyLocation.city,
      country: property.propertyLocation.country,
      rules: rulesByPropertyId[property.property.id] || [],
    }));

    return properties;
  }

  async getPropertyPricingById(id) {
    const client = await Database.getInstance();
    const result = await client
      .getRepository(Property_Pricing)
      .createQueryBuilder("property_pricing")
      .where("property_pricing.property_id = :property_id", { property_id: id })
      .getMany();

    if (result.length === 0) {
      throw new NotFoundException("Unable to fetch property pricing data from the property_pricing table");
    }

    return {
      pricing: result,
    };
  }
}
export default LambdaRepository;
