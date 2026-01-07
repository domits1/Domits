import NotFoundException from "../util/exception/NotFoundException.js";
import Database from "database";
import { Property_Pricing } from "database/models/Property_Pricing";
class LambdaRepository {
  async getPropertiesFromHostId(host_Id) {
    const response = await fetch(
      `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/bookingEngine/byHostId?hostId=${host_Id}`
    );

    const receivedData = await response.json();
    if (receivedData === "No property found.") {
      throw new NotFoundException("User has no active properties.");
    }

    const properties = receivedData.map((property) => ({
      id: property.property.id,
      title: property.property.title,
      rate: property.propertyPricing.roomRate,
      city: property.propertyLocation.city,
      country: property.propertyLocation.country,
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