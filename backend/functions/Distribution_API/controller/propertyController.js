import PropertyService from "../business/service/propertyService.js";
import BadRequestException from "../util/exception/badRequestException.js"

const propertyService = new PropertyService();

export class PropertyController {

  async get(event) {
    try {
      if (typeof event === 'string') {
        event = JSON.parse(event);
      }
      
      if (!event.queryStringParameters?.propertyId)
        throw new BadRequestException("No propertyId was given.");
      
      return await propertyService.getPropertyListingDetails(event.queryStringParameters);

    } catch (error) {
      console.error(error);
      return;
    }
  }
}