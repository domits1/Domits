import Database from "database";
import { Property } from "database/models/Property";
import NotFoundException from "../util/exception/NotFoundException.js";

class PropertyRepository {
  constructor() {}

  async getPropertyById(id) {
    // TEST mode: Return mock property
    if (process.env.TEST === "true") {
      return {
        hostId: "test-host-123",
        title: "Test Property",
      };
    }

    // PROD mode: Query real database
    const client = await Database.getInstance();
    const result = await client
      .getRepository(Property)
      .createQueryBuilder("property")
      .where("property.id = :id", { id: id })
      .getOne();
    if (result) {
      return {
        hostId: result.hostid,
        title: result.title,
      };
    } else {
      throw new NotFoundException("Property is inactive or does not exist.");
    }
  }
}

export default PropertyRepository;
