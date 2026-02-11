import PropertyRepository from "../../data/propertyRepository.js";

class PropertyService {
  constructor() {
    this.propertyRepo = new PropertyRepository();
  }

  async getPropertyListingDetails(event) {
    return await this.propertyRepo.getListingDetailsByPropertyId(event.propertyId);
  }
}

export default PropertyService;
